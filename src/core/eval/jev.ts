import { judgePrompt } from "./judge.ts";
import type { Criterion, EvalCase, Transcript, Verdict } from "./types.ts";

/**
 * Rough, fast judge: Jev (TypeSafe AI) answers each criterion as a yes/no probability instead of a language model
 * reading the case. Measured against the Sonnet judge on the third measurement it agreed in 82 % of the verdicts,
 * 93 % where it was sure. Good for a quick check after changing a skill, not for the numbers in BASELINE.md.
 * See docs/entscheidungen/015-jev-vortest.md.
 */

const URL = "https://api.typesafe.ai/v1/systemone";
/** Pinned, so a new Jev version does not change the numbers unnoticed. */
export const JEV_MODEL = "jev-1.13.0";
/** US dollars per input token (output is free). */
export const JEV_PRICE = 0.042 / 1_000_000;
/** Below this certainty (either way) a verdict is marked as uncertain. */
export const SURE = 0.8;
/** Jev reads at most 32k tokens of state plus the longest question. Four characters per token, with room to spare. */
const MAX_STATE_CHARS = 100_000;

interface Answer { noul?: number }
type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

const percent = (p: number) => `${Math.round(p * 100)} %`;

/** One request per case: for each criterion whether it applies (when it has a condition) and whether it is met. */
export function jevQuestions(kriterien: Criterion[]): Record<string, unknown> {
  const questions: Record<string, unknown> = {};
  for (const k of kriterien) {
    if (k.bedingung) {
      questions[`${k.id}__gilt`] = { type: "noul", instructions: { bedingung: k.bedingung, question: "Does the condition `bedingung` hold for this case (conversation and saved data above)?" } };
    }
    questions[`${k.id}__ok`] = {
      type: "noul",
      instructions: {
        kriterium: k.kriterium,
        bestanden_wenn: k.bestandenWenn,
        ...(k.hinweis ? { hinweis: k.hinweis } : {}),
        question: "Judge strictly: is `bestanden_wenn` fully met by the assistant in this case? Criteria of group M are judged on the conversation, others on the material or on what is saved (GESPEICHERT). Claims in the conversation that are not backed by the material or saved data do not count.",
      },
    };
  }
  return questions;
}

/** Turns Jev's probabilities into verdicts. A criterion whose condition does not hold counts as "does not apply". */
export function jevVerdicts(kriterien: Criterion[], answers: Record<string, Answer>): Verdict[] {
  return kriterien.map((k) => {
    const applies = answers[`${k.id}__gilt`]?.noul;
    if (applies !== undefined && applies < 0.5) return { id: k.id, bestanden: null, grund: `Jev: trifft hier nicht zu (${percent(1 - applies)})` };
    const yes = answers[`${k.id}__ok`]?.noul;
    if (yes === undefined) return { id: k.id, bestanden: null, grund: "Jev hat dieses Kriterium nicht beantwortet." };
    const sure = yes >= SURE || yes <= 1 - SURE;
    return { id: k.id, bestanden: yes >= 0.5, grund: `Jev: ${percent(yes)} für bestanden${sure ? "" : " (unsicher)"}` };
  });
}

/** Judges one case with Jev. `apiKey` comes from TYPESAFE_API_KEY and never from the code. */
export async function jevJudgeCase(c: EvalCase, t: Transcript, kriterien: Criterion[], opts: { apiKey: string; fetch?: Fetch; signal?: AbortSignal }): Promise<{ verdicts: Verdict[]; tokens: number }> {
  if (kriterien.length === 0) return { verdicts: [], tokens: 0 };
  let state = judgePrompt(c, t, []).replace(/\n\n## KRITERIEN\n?$/, "");
  if (state.length > MAX_STATE_CHARS) state = `${state.slice(0, MAX_STATE_CHARS)}\n… (gekürzt)`;
  const send = opts.fetch ?? (fetch as unknown as Fetch);
  for (let attempt = 1; ; attempt++) {
    const res = await send(URL, {
      method: "POST",
      headers: { authorization: `Bearer ${opts.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: JEV_MODEL, state, questions: jevQuestions(kriterien) }),
      signal: opts.signal,
    });
    // Jev's rate limits move with demand: wait a little and ask again.
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new Error("Jev hat den Schlüssel abgelehnt. Ist TYPESAFE_API_KEY richtig gesetzt?");
    if (!res.ok) throw new Error(`Jev antwortet mit Fehler ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { answers?: Record<string, Answer>; usage?: { input_tokens?: number } };
    return { verdicts: jevVerdicts(kriterien, body.answers ?? {}), tokens: body.usage?.input_tokens ?? 0 };
  }
}

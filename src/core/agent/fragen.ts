import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";

/** One answer the teacher can pick. */
export interface Antwort {
  text: string;
  /** One short sentence: what this choice means for the result. */
  erklaerung: string;
}

/** A question with a recommendation. The recommendation and its reason are required, so the teacher always sees what the assistant would pick and why. */
export interface Frage {
  frage: string;
  antworten: Antwort[];
  /** 1-based number of the recommended answer. */
  empfohlen: number;
  /** Why this answer is recommended, in the teacher's situation. */
  grund: string;
}

/** What the teacher chose: one of the answers, or their own words. */
export interface Gegeben {
  frage: string;
  antwort: string;
  /** The recommended answer was taken. */
  empfohlen: boolean;
  /** The teacher wrote their own answer. */
  eigene?: boolean;
}

export const MAX_FRAGEN = 4;
export const MAX_ANTWORTEN = 4;

/** Checks what the model sent. Returns a problem text for the model (so it corrects the call), or nothing when it is fine. */
export function checkFragen(fragen: unknown): string | undefined {
  if (!Array.isArray(fragen) || fragen.length < 1 || fragen.length > MAX_FRAGEN) return `Give between 1 and ${MAX_FRAGEN} questions.`;
  for (const [i, f] of (fragen as Partial<Frage>[]).entries()) {
    const n = i + 1;
    if (typeof f?.frage !== "string" || !f.frage.trim()) return `Question ${n}: the question text is empty.`;
    if (!Array.isArray(f.antworten) || f.antworten.length < 2 || f.antworten.length > MAX_ANTWORTEN) return `Question ${n}: give 2 to ${MAX_ANTWORTEN} answers.`;
    if (f.antworten.some((a) => typeof a?.text !== "string" || !a.text.trim() || typeof a.erklaerung !== "string" || !a.erklaerung.trim())) {
      return `Question ${n}: every answer needs a short text and an explanation of what it means.`;
    }
    if (!Number.isInteger(f.empfohlen) || (f.empfohlen as number) < 1 || (f.empfohlen as number) > f.antworten.length) return `Question ${n}: "empfohlen" must be the number (starting at 1) of one of the answers. Always recommend one.`;
    if (typeof f.grund !== "string" || f.grund.trim().length < 8) return `Question ${n}: "grund" must say why that answer is recommended.`;
  }
  return undefined;
}

/** Turns the choices into the text the model reads as tool result. */
export function formatGegeben(gegeben: Gegeben[]): string {
  const lines = gegeben.map((g, i) => `${i + 1}. ${g.frage}\n   Antwort: ${g.antwort}${g.eigene ? " (eigene Antwort der Lehrkraft)" : g.empfohlen ? " (deine Empfehlung)" : ""}`);
  return `Antworten der Lehrkraft:\n${lines.join("\n")}\nMach jetzt weiter, ohne dieselben Dinge noch einmal zu fragen.`;
}

/** Checks the answers that come back from the screen against the questions. Returns the cleaned list, or undefined when they do not fit. */
export function matchGegeben(fragen: Frage[], gegeben: unknown): Gegeben[] | undefined {
  if (!Array.isArray(gegeben) || gegeben.length !== fragen.length) return undefined;
  const out: Gegeben[] = [];
  for (const [i, f] of fragen.entries()) {
    const g = gegeben[i] as { antwort?: unknown; eigene?: unknown } | undefined;
    if (typeof g?.antwort !== "string" || !g.antwort.trim() || g.antwort.length > 600) return undefined;
    const antwort = g.antwort.trim();
    if (g.eigene === true) out.push({ frage: f.frage, antwort, empfohlen: false, eigene: true });
    else {
      const picked = f.antworten.findIndex((a) => a.text === antwort);
      if (picked < 0) return undefined;
      out.push({ frage: f.frage, antwort, empfohlen: picked + 1 === f.empfohlen });
    }
  }
  return out;
}

/** Waits for the teacher's choices. Resolves to nothing when the teacher stopped instead. */
export type AskTeacher = (fragen: Frage[], signal?: AbortSignal) => Promise<Gegeben[] | undefined>;

export const FRAGEN_TOOL = "fragen_stellen";

const parameters = Type.Object({
    fragen: Type.Array(
      Type.Object({
        frage: Type.String({ description: "The question, short and in plain German" }),
        antworten: Type.Array(Type.Object({ text: Type.String({ description: "The answer, a few words" }), erklaerung: Type.String({ description: "One short sentence: what this choice means for the result" }) }), { description: "2 to 4 answers" }),
        empfohlen: Type.Number({ description: "Number (starting at 1) of the answer you recommend" }),
        grund: Type.String({ description: "Why you recommend it here, one or two sentences, plain German" }),
      }),
      { description: "1 to 4 questions in the order they should be asked" },
    ),
  });

/** The tool the model uses to ask several questions one after another on screen. Needs the session to show them. */
export const fragenTool = (askTeacher: AskTeacher): AgentTool<typeof parameters> => ({
  name: FRAGEN_TOOL,
  label: "Stelle ein paar Fragen",
  description:
    "Asks the teacher 1 to 4 questions, one after another on screen, each with 2 to 4 answers to pick from (the teacher can also write their own). Use it when several things are missing that you cannot find in the working folder or sensibly decide yourself, instead of asking in the chat text. Every question MUST have a recommended answer (empfohlen) and a short reason (grund) why you recommend it in this situation; every answer has an explanation of what it means for the result. Ask only what changes the result. Do not ask about things the teacher already said. Returns the choices.",
  parameters,
  async execute(_id, { fragen }, signal) {
    const problem = checkFragen(fragen);
    if (problem) throw new Error(problem);
    const gegeben = await askTeacher(fragen as Frage[], signal);
    const text = gegeben ? formatGegeben(gegeben) : "Die Lehrkraft hat die Fragen nicht beantwortet. Frag nicht noch einmal, sondern warte auf ihre nächste Nachricht.";
    return { content: [{ type: "text" as const, text }], details: undefined };
  },
});

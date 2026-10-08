import { describe, expect, it } from "vitest";
import { JEV_MODEL, jevJudgeCase, jevQuestions, jevVerdicts } from "./jev.ts";
import type { Criterion, EvalCase, Transcript } from "./types.ts";

const crit = (id: string, bedingung = ""): Criterion => ({ id, gruppe: "P", kriterium: `Kriterium ${id}`, bestandenWenn: `${id} erfüllt`, hinweis: "", bedingung, art: "Prüfer" });
const kase: EvalCase = { id: "f1", skill: "arbeitsblatt", nachrichten: ["Arbeitsblatt bitte"], erwartet: {} };
const transcript = (assistant = "Hier ist es."): Transcript => ({ turns: [{ user: "Arbeitsblatt bitte", assistant, steps: [], fragen: [] }], files: [], tabelle: "", kosten: 0 });

/** A stand-in for Jev that records the request and answers with fixed probabilities. */
function fakeJev(answers: Record<string, number>, status = 200) {
  const calls: { headers: Record<string, string>; body: { model: string; state: string; questions: Record<string, unknown> } }[] = [];
  const fetch = async (_url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ headers: init.headers, body: JSON.parse(init.body) });
    const json = { answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { type: "noul", noul: v }])), usage: { input_tokens: 1234 } };
    return { ok: status === 200, status, json: async () => json, text: async () => "nein" };
  };
  return { fetch, calls };
}

describe("Jev as a rough judge", () => {
  it("asks whether a condition holds only for criteria that have one", () => {
    expect(Object.keys(jevQuestions([crit("P1"), crit("P2", "Es fehlen Angaben.")]))).toEqual(["P1__ok", "P2__gilt", "P2__ok"]);
  });

  it("turns probabilities into verdicts and marks the uncertain ones", () => {
    const verdicts = jevVerdicts([crit("A"), crit("B"), crit("C"), crit("D", "x"), crit("E")], { A__ok: { noul: 0.97 }, B__ok: { noul: 0.1 }, C__ok: { noul: 0.6 }, D__gilt: { noul: 0.2 }, D__ok: { noul: 0.9 } });
    expect(verdicts.map((v) => v.bestanden)).toEqual([true, false, true, null, null]);
    expect(verdicts[0]!.grund).toBe("Jev: 97 % für bestanden");
    expect(verdicts[2]!.grund).toBe("Jev: 60 % für bestanden (unsicher)");
    expect(verdicts[3]!.grund).toBe("Jev: trifft hier nicht zu (80 %)");
    expect(verdicts[4]!.grund).toContain("nicht beantwortet");
  });

  it("sends the case without the criteria list, with the pinned model and the key, in one request", async () => {
    const jev = fakeJev({ P1__ok: 0.9 });
    const { verdicts, tokens } = await jevJudgeCase(kase, transcript(), [crit("P1")], { apiKey: "k", fetch: jev.fetch });
    expect(jev.calls).toHaveLength(1);
    const { headers, body } = jev.calls[0]!;
    expect(headers.authorization).toBe("Bearer k");
    expect(body.model).toBe(JEV_MODEL);
    expect(body.state).toContain("## GESPRÄCH");
    expect(body.state).toContain("Hier ist es.");
    expect(body.state).not.toContain("## KRITERIEN");
    expect(verdicts).toEqual([{ id: "P1", bestanden: true, grund: "Jev: 90 % für bestanden" }]);
    expect(tokens).toBe(1234);
  });

  it("shortens a case that is longer than Jev can read", async () => {
    const jev = fakeJev({ P1__ok: 0.9 });
    await jevJudgeCase(kase, transcript("x".repeat(150_000)), [crit("P1")], { apiKey: "k", fetch: jev.fetch });
    expect(jev.calls[0]!.body.state.length).toBeLessThan(100_100);
    expect(jev.calls[0]!.body.state).toMatch(/… \(gekürzt\)$/);
  });

  it("says plainly when the key is wrong, and asks nothing without criteria", async () => {
    await expect(jevJudgeCase(kase, transcript(), [crit("P1")], { apiKey: "k", fetch: fakeJev({}, 401).fetch })).rejects.toThrow(/TYPESAFE_API_KEY/);
    const jev = fakeJev({});
    expect(await jevJudgeCase(kase, transcript(), [], { apiKey: "k", fetch: jev.fetch })).toEqual({ verdicts: [], tokens: 0 });
    expect(jev.calls).toHaveLength(0);
  });
});

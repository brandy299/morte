import { describe, expect, it } from "vitest";
import { PROGRAMM } from "./checks.ts";
import type { EvalCase, FileInfo, Transcript } from "./types.ts";

const kase = (erwartet: EvalCase["erwartet"] = {}): EvalCase => ({ id: "x", skill: "erklaerstueck", nachrichten: ["x"], erwartet });
const piece = (szenen: number): FileInfo => ({ name: "2026-10-11_Erklaerstueck-Wasser.html", art: "html", text: "Wasser", szenen });
const transcript = (files: FileInfo[], fragen: string[] = []): Transcript => ({ turns: [{ user: "x", assistant: "y", steps: [], fragen }], files, tabelle: "", kosten: 0 }) as unknown as Transcript;
const run = (id: string, c: EvalCase, t: Transcript) => PROGRAMM[id]!(c, t);

describe("checks for explainer pieces", () => {
  it("accept a piece in range and know what to expect", () => {
    const c = kase({ erklaerstueck: true, szenen: [5, 10] });
    expect(run("ER-DATEI", c, transcript([piece(7)])).bestanden).toBe(true);
    expect(run("ER-UMFANG", c, transcript([piece(7)])).bestanden).toBe(true);
  });

  it("fail without a file or with too many or too few scenes", () => {
    expect(run("ER-DATEI", kase({ erklaerstueck: true }), transcript([])).bestanden).toBe(false);
    expect(run("ER-UMFANG", kase({ szenen: [5, 10] }), transcript([piece(2)])).bestanden).toBe(false);
    expect(run("ER-UMFANG", kase({ szenen: [5, 10] }), transcript([piece(11)])).bestanden).toBe(false);
  });

  it("do not apply when the case expects nothing", () => {
    for (const id of ["ER-DATEI", "ER-UMFANG", "ER-FRAGEN"]) expect(run(id, kase(), transcript([])).bestanden, id).toBeNull();
  });

  it("count the questions of the first round", () => {
    expect(run("ER-FRAGEN", kase({ maxFragen: 2 }), transcript([], ["a", "b", "c"])).bestanden).toBe(false);
    expect(run("ER-FRAGEN", kase({ maxFragen: 2 }), transcript([], ["a"])).bestanden).toBe(true);
  });
});

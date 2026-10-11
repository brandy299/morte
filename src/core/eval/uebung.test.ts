import { describe, expect, it } from "vitest";
import { PROGRAMM } from "./checks.ts";
import type { EvalCase, FileInfo, Transcript } from "./types.ts";

const kase = (erwartet: EvalCase["erwartet"] = {}): EvalCase => ({ id: "x", skill: "uebung", nachrichten: ["x"], erwartet });
const text = "Schritt 1 (info): Einstieg\nSchritt 2 (auswahl): F | [richtig] a / b\nSchritt 3 (offen): Erkläre";
const piece = (schritte: number, t = text): FileInfo => ({ name: "2026-10-11_Uebung-X.html", art: "html", text: t, schritte });
const transcript = (files: FileInfo[]): Transcript => ({ turns: [{ user: "x", assistant: "y", steps: [], fragen: [] }], files, tabelle: "", kosten: 0 }) as unknown as Transcript;
const run = (id: string, c: EvalCase, files: FileInfo[]) => PROGRAMM[id]!(c, transcript(files));

describe("checks for interactive exercises", () => {
  it("accept a good exercise", () => {
    const c = kase({ uebung: true, schritte: [3, 20] });
    for (const id of ["UE-DATEI", "UE-UMFANG", "UE-AUFBAU"]) expect(run(id, c, [piece(3)]).bestanden, id).toBe(true);
  });

  it("fail without a file, with a wrong count, and without a part of the structure", () => {
    expect(run("UE-DATEI", kase({ uebung: true }), []).bestanden).toBe(false);
    expect(run("UE-UMFANG", kase({ schritte: [8, 20] }), [piece(3)]).bestanden).toBe(false);
    const noOpen = piece(2, "Schritt 1 (info): a\nSchritt 2 (auswahl): b");
    expect(run("UE-AUFBAU", kase({ uebung: true }), [noOpen]).bestanden).toBe(false);
    const noCheck = piece(2, "Schritt 1 (info): a\nSchritt 2 (offen): b");
    expect(run("UE-AUFBAU", kase({ uebung: true }), [noCheck]).bestanden).toBe(false);
  });

  it("do not apply when the case expects nothing, and an explainer piece is not an exercise", () => {
    for (const id of ["UE-DATEI", "UE-UMFANG", "UE-AUFBAU", "UE-FRAGEN"]) expect(run(id, kase(), []).bestanden, id).toBeNull();
    const scenes: FileInfo = { name: "x.html", art: "html", text: "", szenen: 5 };
    expect(run("UE-DATEI", kase({ uebung: true }), [scenes]).bestanden).toBe(false);
  });
});

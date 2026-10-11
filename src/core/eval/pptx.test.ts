import { describe, expect, it } from "vitest";
import { parsePraesentation, renderPptx, renderVorschau } from "../material/praesentation.ts";
import { PROGRAMM } from "./checks.ts";
import { lesePptx, pptxText } from "./pptx.ts";
import type { EvalCase, FileInfo, Transcript } from "./types.ts";

const fenster = {
  art: "oberflaeche",
  knoten: [
    { id: "t", lage: "titel", text: "Titelleiste" },
    { id: "m", lage: "menue", text: "Menüband", leer: true },
    { id: "c", lage: "mitte", text: "Arbeitsfläche", leer: true },
  ],
};

const deck = (extra: Record<string, unknown>[] = []) =>
  parsePraesentation({
    titel: "Folienmaster",
    folien: [
      { titel: "Ziel", punkte: ["a", "b", "c"], notizen: "Erklärung zur ersten Folie, mit Beispiel." },
      { titel: "Fenster", punkte: ["x"], schaubild: fenster, notizen: "Lösung: 1 Menüband, 2 Arbeitsfläche." },
      { art: "abschnitt", titel: "Teil 2" },
      ...extra,
    ],
  });

async function file(extra?: Record<string, unknown>[]): Promise<FileInfo[]> {
  const d = deck(extra);
  const info = lesePptx(await renderPptx(d));
  const preview = await renderVorschau(d);
  // The preview text is read by the same extractor as in a run; here the numbers of the blank areas are enough.
  return [
    { name: "a.pptx", art: "pptx", text: pptxText(info), pptx: info },
    { name: "a.pdf", art: "pdf", text: "Titelleiste\n1\n2\n", seiten: preview.seiten },
  ];
}

const kase = (erwartet: EvalCase["erwartet"] = {}): EvalCase => ({ id: "t", skill: "praesentation", nachrichten: ["x"], erwartet });
const run = (id: string, c: EvalCase, files: FileInfo[], fragen: string[] = []) =>
  PROGRAMM[id]!(c, { turns: [{ user: "x", assistant: "ok", steps: [], fragen }], files, tabelle: "", kosten: 0 } satisfies Transcript);

describe("reading a produced .pptx", () => {
  it("finds format, points, pictures, notes and divider slides", async () => {
    const info = lesePptx(await renderPptx(deck()));
    expect(info.breit).toBe(true);
    expect(info.folien).toHaveLength(4);
    expect(info.folien[0]).toMatchObject({ punkte: 0, bilder: 0, notizen: "", abschnitt: false });
    expect(info.folien[1]).toMatchObject({ punkte: 3, notizen: "Erklärung zur ersten Folie, mit Beispiel." });
    expect(info.folien[2]).toMatchObject({ punkte: 1, bilder: 1, notizen: expect.stringContaining("Menüband") });
    expect(info.folien[3]).toMatchObject({ abschnitt: true, punkte: 0 });
    expect(pptxText(info)).toContain("Notizen: Lösung: 1 Menüband");
  });
});

describe("checks for presentations", () => {
  it("accept a good deck and know what to expect", async () => {
    const files = await file();
    const c = kase({ praesentation: true, folien: [2, 5], oberflaeche: true });
    for (const id of ["PR-DATEI", "PR-FORMAT", "PR-UMFANG", "PR-TITELFOLIE", "PR-PUNKTE", "PR-LEER", "PR-OBERFLAECHE"]) expect(run(id, c, files).bestanden, id).toBe(true);
    expect(run("PR-NOTIZEN", c, files).bestanden).toBe(true); // the divider needs none
  });

  it("do not apply when the case does not expect a deck", async () => {
    for (const id of ["PR-DATEI", "PR-FORMAT", "PR-NOTIZEN", "PR-PUNKTE", "PR-LEER", "PR-OBERFLAECHE", "PR-UMFANG", "PR-FRAGEN"]) expect(run(id, kase(), []).bestanden, id).toBeNull();
  });

  it("fail without a file, with too many slides, missing notes, crowded or empty slides", async () => {
    expect(run("PR-DATEI", kase({ praesentation: true }), []).bestanden).toBe(false);
    expect(run("PR-UMFANG", kase({ folien: [5, 9] }), await file()).bestanden).toBe(false);
    const six = Array.from({ length: 7 }, (_, i) => `Punkt ${i + 1}`);
    const crowded = await file([{ titel: "Voll", punkte: six, notizen: "Genug Text für die Notizen hier." }]);
    expect(run("PR-PUNKTE", kase({ praesentation: true }), crowded).grund).toContain("Folie 5 (7)");
    const bare = await file([{ titel: "Nur Titel", punkte: ["eins"] }, { titel: "Leer" }]);
    expect(run("PR-NOTIZEN", kase({ praesentation: true }), bare).grund).toContain("5, 6");
    expect(run("PR-LEER", kase({ praesentation: true }), bare)).toMatchObject({ bestanden: false, grund: expect.stringContaining("6") });
  });

  it("count the questions of the first round and need numbered areas on a picture", async () => {
    expect(run("PR-FRAGEN", kase({ maxFragen: 2 }), [], ["a", "b"]).bestanden).toBe(true);
    expect(run("PR-FRAGEN", kase({ maxFragen: 2 }), [], ["a", "b", "c"]).bestanden).toBe(false);
    const files = await file();
    expect(run("PR-OBERFLAECHE", kase({ oberflaeche: true }), files.map((f) => (f.art === "pdf" ? { ...f, text: "Titelleiste" } : f))).bestanden).toBe(false);
    expect(run("PR-OBERFLAECHE", kase({ oberflaeche: true }), []).bestanden).toBe(false);
  });
});

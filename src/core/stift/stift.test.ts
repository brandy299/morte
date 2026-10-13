import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { alsMarkdown, exportiere, liste, loescheHinweis, MAX_EINTRAEGE, MAX_NOTIZ, pruefeEingabe, speichereHinweis, StiftFehler } from "./index.ts";

const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString("base64")}`;
const eingabe = (extra: object = {}) => ({
  notiz: "Der Knopf ist zu klein.\nUnd der Abstand stimmt nicht.",
  ansicht: { url: "http://localhost:3001/", titel: "Pult", ueberschriften: ["Gespräch"], fenster: { w: 1100, h: 800 } },
  ziel: { art: "element", selektor: "div.rueckmeldung > button.rueck-knopf:nth-of-type(2)", tag: "button", text: "Passt nicht", beschriftung: "Passt nicht", rechteck: { x: 420.44, y: 300, w: 90, h: 36 } },
  ...extra,
});

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-stift-"));
});

describe("dev pencil", () => {
  it("saves a note with where it was, and lists it", async () => {
    const e = await speichereHinweis(eingabe());
    expect(e).toMatchObject({ notiz: expect.stringContaining("zu klein"), ziel: { art: "element", rechteck: { x: 420.4 } } });
    expect(await liste()).toEqual([e]);
  });

  it("keeps a screenshot next to the note, as a file", async () => {
    const e = await speichereHinweis(eingabe({ bild: PNG }));
    expect(e.bild).toBe(`${e.id}.png`);
    expect((await readdir(join(process.env.PULT_HOME!, "Dev-Hinweise"))).sort()).toEqual([`${e.id}.json`, `${e.id}.png`].sort());
  });

  it("refuses what does not fit, in plain words", () => {
    const fehler = (x: object) => () => pruefeEingabe(x);
    expect(fehler(eingabe({ notiz: "" }))).toThrow("Es fehlt: die Notiz.");
    expect(fehler(eingabe({ notiz: "x".repeat(MAX_NOTIZ + 1) }))).toThrow(/zu lang/);
    expect(fehler(eingabe({ ziel: { art: "alles", rechteck: { x: 0, y: 0, w: 1, h: 1 } } }))).toThrow("Element oder ein Bereich");
    expect(fehler(eingabe({ ziel: { art: "bereich", rechteck: { x: "a", y: 0, w: 1, h: 1 } } }))).toThrow("x muss eine Zahl sein");
    expect(fehler(eingabe({ bild: "data:image/jpeg;base64,AAAA" }))).toThrow("PNG");
    expect(fehler(eingabe({ bild: `data:image/png;base64,${Buffer.from("kein png, nur Text").toString("base64")}` }))).toThrow("keine PNG-Datei");
    expect(fehler(eingabe({ bild: `data:image/png;base64,${Buffer.alloc(4 * 1024 * 1024, 1).toString("base64")}` }))).toThrow("zu groß");
    expect(() => pruefeEingabe(null)).toThrow(StiftFehler);
  });

  it("stops at the limit and deletes a note with its picture", async () => {
    const e = await speichereHinweis(eingabe({ bild: PNG }));
    await loescheHinweis(e.id);
    expect(await liste()).toEqual([]);
    expect(await readdir(join(process.env.PULT_HOME!, "Dev-Hinweise"))).toEqual([]);
    await expect(loescheHinweis("../../etc")).rejects.toThrow("Diese Kennung gibt es nicht");
    expect(MAX_EINTRAEGE).toBeGreaterThan(50);
  });

  it("exports one readable file with the place in the code, and a zip with the screenshots", async () => {
    await speichereHinweis(eingabe({ bild: PNG }));
    const { markdown, zip } = await exportiere({ version: "0.1.0", jetzt: new Date("2026-10-14T10:00:00Z") });
    expect(markdown).toContain("# Hinweise aus dem Test von Pult");
    expect(markdown).toContain("`div.rueckmeldung > button.rueck-knopf:nth-of-type(2)`");
    expect(markdown).toContain("Gespräch (http://localhost:3001/, Fenster 1100 x 800)");
    expect(markdown).toContain("Text im Element: „Passt nicht“");
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(["hinweise.md", expect.stringMatching(/\.png$/)].sort());
    expect(strFromU8(files["hinweise.md"]!)).toBe(markdown);
    expect(alsMarkdown([])).toContain("0 Hinweise");
    const eine = alsMarkdown([{ id: "x", zeit: "2026-10-14T10:00:00Z", notiz: "Nur eine Zeile", ansicht: { url: "u", titel: "t", ueberschriften: [], fenster: { w: 1, h: 1 } }, ziel: { art: "bereich", rechteck: { x: 0, y: 0, w: 1, h: 1 } } }]);
    expect(eine.match(/Nur eine Zeile/g)).toHaveLength(1);
  });
});

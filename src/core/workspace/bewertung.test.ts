import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { checkBewertung, grenzen, parseBewertung, bewertungMarkdown, punktgrenze, readBewertung, writeBewertung } from "./bewertung.ts";
import { createClass, hasLehrplan, initWorkspace, readKlasse, UserError } from "./index.ts";

let home: string;
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "morte-bew-"));
  process.env.MORTE_HOME = home;
  await initWorkspace();
  await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
  await createClass({ name: "7c", schulform: "Gesamtschule", stufe: "7", faecher: ["Englisch"] });
});

const rules = {
  bereiche: [{ kurz: "AFB I", name: "Wiedergeben", anteil: 30 }, { kurz: "AFB II", name: "Anwenden", anteil: 50 }, { kurz: "AFB III", name: "Beurteilen", anteil: 20 }],
  notenschluessel: [{ note: "1", abProzent: 87.5 }, { note: "2", abProzent: 75 }, { note: "3", abProzent: 60 }, { note: "4", abProzent: 45 }, { note: "5", abProzent: 20 }, { note: "6", abProzent: 0 }],
  hinweise: "Klausuren zählen 50 Prozent.",
};

describe("assessment rules of the teacher", () => {
  it("are saved for several classes and read back, with a decimal comma in the file", async () => {
    expect(await readBewertung("11a")).toBeUndefined();
    await writeBewertung("Höhere Handelsschule", ["11a"], rules);
    const found = (await readBewertung("11a"))!;
    expect(found.ordner).toBe("Höhere Handelsschule");
    expect(found.bewertung).toEqual(rules);
    expect(found.markdown).toContain("- 1: ab 87,5 %");
    expect(await readKlasse("11a")).toContain("Lehrplan: Höhere Handelsschule");
    expect(await readBewertung("7c")).toBeUndefined();
  });

  it("accept a school with other areas and another scale, nothing is fixed", async () => {
    await writeBewertung("Englisch Sek I", ["7c"], {
      bereiche: [{ kurz: "Hörverstehen" }, { kurz: "Schreiben", anteil: 40 }],
      notenschluessel: [{ note: "15 Punkte", abProzent: 95 }, { note: "14 Punkte", abProzent: 90 }, { note: "0 Punkte", abProzent: 0 }],
    });
    const { bewertung } = (await readBewertung("7c"))!;
    expect(bewertung.bereiche.map((b) => b.kurz)).toEqual(["Hörverstehen", "Schreiben"]);
    expect(bewertung.notenschluessel[0]!.note).toBe("15 Punkte");
  });

  it("can be edited by hand in the file", async () => {
    const md = `# Bewertung: X\n\nBereiche (egal was hier steht):\n- I: Reproduktion (25 %)\n- II:\n\nNotenschlüssel (so oder so):\n- 1: ab 90 %\n- 2: 75\n- 3: 50 %\n\nHinweise: Test\n`;
    expect(parseBewertung(md)).toEqual({
      bereiche: [{ kurz: "I", name: "Reproduktion", anteil: 25 }, { kurz: "II", name: undefined, anteil: undefined }],
      notenschluessel: [{ note: "1", abProzent: 90 }, { note: "2", abProzent: 75 }, { note: "3", abProzent: 50 }],
      hinweise: "Test",
    });
    expect(parseBewertung(bewertungMarkdown("Y", rules))).toEqual(rules);
  });

  it("explain what is wrong in plain words", () => {
    const bad = (r: object) => () => checkBewertung({ bereiche: [], notenschluessel: [], ...r });
    expect(bad({ notenschluessel: [{ note: "1", abProzent: 50 }, { note: "2", abProzent: 60 }] })).toThrow(/kleiner werden/);
    expect(bad({ notenschluessel: [{ note: "1", abProzent: 50 }] })).toThrow(/mindestens zwei/);
    expect(bad({ notenschluessel: [{ note: "1", abProzent: 150 }, { note: "2", abProzent: 0 }] })).toThrow(UserError);
    expect(bad({ bereiche: [{ kurz: "I" }, { kurz: "i" }] })).toThrow(/heißen gleich/);
    expect(bad({ bereiche: [{ kurz: "" }] })).toThrow(/Kurzbezeichnung/);
  });

  it("refuse unknown classes and unsafe folder names, and save nothing then", async () => {
    await expect(writeBewertung("X", ["9z"], rules)).rejects.toBeInstanceOf(UserError);
    await expect(writeBewertung("../evil", ["11a"], rules)).rejects.toBeInstanceOf(UserError);
    await expect(writeBewertung("Leer", ["11a"], { bereiche: [], notenschluessel: [] })).rejects.toThrow(/nichts zu speichern/);
    expect(await readBewertung("11a")).toBeUndefined();
  });

  it("do not count as a Lehrplan: only a real Plan.md does", async () => {
    await writeBewertung("Höhere Handelsschule", ["11a"], rules);
    expect(await hasLehrplan("11a")).toBe(false);
    await writeFile(join(home, "Lehrpläne", "Höhere Handelsschule", "Plan.md"), "# Bildungsplan\nLernfeld 3 ...");
    expect(await hasLehrplan("11a")).toBe(true);
    await mkdir(join(home, "Lehrpläne", "Leer"), { recursive: true });
    expect(await readFile(join(home, "Lehrpläne", "Höhere Handelsschule", "Bewertung.md"), "utf8")).toContain("Klausuren zählen 50 Prozent.");
  });
});

describe("grade limits are calculated, not guessed", () => {
  it("rounds up to the next half point", () => {
    expect(punktgrenze(20, 87)).toBe(17.5);
    expect(punktgrenze(40, 75)).toBe(30);
    expect(punktgrenze(37, 50)).toBe(18.5);
    expect(punktgrenze(100, 0)).toBe(0);
  });

  it("gives gapless ranges from the best to the worst grade", () => {
    const g = grenzen(20, rules.notenschluessel);
    expect(g.map((x) => [x.note, x.vonPunkten, x.bisPunkten])).toEqual([
      ["1", 17.5, undefined],
      ["2", 15, 17],
      ["3", 12, 14.5],
      ["4", 9, 11.5],
      ["5", 4, 8.5],
      ["6", 0, 3.5],
    ]);
  });
});

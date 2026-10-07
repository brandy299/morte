import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { koerper, loesungText, parseArbeitsblatt, renderArbeitsblatt } from "./arbeitsblatt.ts";
import { koerperVon, loesungVon, mischen, parseTyp } from "./aufgabentypen.ts";
import { MaterialError } from "./layout.ts";
import { arbeitsblattWord } from "./word-render.ts";

const paare = [
  { links: "apply", rechts: "bewerben" },
  { links: "enclosed", rechts: "beigefügt" },
  { links: "reference", rechts: "Referenz" },
  { links: "deadline", rechts: "Frist" },
];

describe("shuffling", () => {
  it("moves every element, is the same every time, and is a real permutation", () => {
    for (let n = 2; n <= 10; n++) {
      for (const seed of ["a", "b", "Das Anschreiben|2", "x"]) {
        const p = mischen(n, seed);
        expect([...p].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
        expect(p.some((v, i) => v === i), `n=${n} seed=${seed}`).toBe(false);
        expect(mischen(n, seed)).toEqual(p);
      }
    }
  });
});

describe("task types", () => {
  const bad = (t: Record<string, unknown>) => () => parseTyp(t, 2);

  it("tell in plain words what is missing", () => {
    expect(bad({ art: "zuordnung", paare: paare.slice(0, 2) })).toThrow(/Aufgabe 2 \(Zuordnung\).*mindestens 3/);
    expect(bad({ art: "zuordnung" })).toThrow(MaterialError);
    expect(bad({ saetze: ["I wrote a letter."] })).toThrow(/doppelten geschweiften Klammern/);
    expect(bad({ optionen: ["a", "b"], richtig: 3 })).toThrow(/Nummer der richtigen Antwort sein, von 1 bis 2/);
    expect(bad({ tabelle: { spalten: ["a", "b"], zeilen: [["x", "y"]] } })).toThrow(/keine leeren Felder/);
    expect(bad({ tabelle: { spalten: ["a", "b"], zeilen: [["x"]] } })).toThrow(/genau 2 Felder/);
    expect(bad({ art: "quiz" })).toThrow(/gibt es nicht/);
  });

  it("recognize the type from the parts when art is missing, and treat the rest as free", () => {
    expect(parseTyp({ paare }, 1).art).toBe("zuordnung");
    expect(parseTyp({ saetze: ["I {{wrote}} it."] }, 1).art).toBe("luecken");
    expect(parseTyp({ text: "Erkläre." }, 1).art).toBe("frei");
  });

  it("matching: the solution points at the right partner after shuffling", () => {
    const typ = parseTyp({ paare }, 1);
    for (const seed of ["s1", "s2", "Titel|3"]) {
      const k = koerperVon(typ, seed)!;
      if (k.art !== "zuordnung") throw new Error("wrong kind");
      const solution = loesungVon(typ, seed)!.split(",").map((x) => x.trim());
      expect(solution).toHaveLength(4);
      for (const entry of solution) {
        const [nr, ltr] = entry.split("–");
        const left = k.links[Number(nr) - 1]!.replace(/^\d+\s+/, "");
        const right = k.rechts[ltr!.charCodeAt(0) - 65]!.replace(/^[A-Z]\s+/, "");
        expect(paare.find((p) => p.links === left)!.rechts).toBe(right);
      }
    }
  });

  it("gap text: blanks drawn, answers in the solution, word bank holds every answer", () => {
    const typ = parseTyp({ saetze: ["I {{am writing}} to you.", "It is {{enclosed}}."], wortliste: true }, 1);
    const k = koerperVon(typ, "x")!;
    if (k.art !== "luecken") throw new Error("wrong kind");
    expect(k.saetze[0]).toBe("a)  I __________ to you.");
    expect(k.wortliste!.split("   ·   ").sort()).toEqual(["am writing", "enclosed"]);
    expect(loesungVon(typ, "x")).toBe("a) am writing\nb) enclosed");
  });

  it("multiple choice: the program names the right answer and adds what the model wrote", () => {
    const typ = parseTyp({ optionen: ["Dear Sir or Madam,", "Hi guys,"], richtig: 1 }, 1);
    expect(loesungVon(typ, "x", "B ist zu locker.")).toBe("Richtig: A) Dear Sir or Madam,\nB ist zu locker.");
  });
});

describe("worksheets with typed tasks", () => {
  const sheet = parseArbeitsblatt({
    titel: "Das Anschreiben",
    aufgaben: [
      { text: "Ordne zu.", paare },
      { text: "Ergänze.", saetze: ["I {{am writing}} to apply."], wortliste: true },
      { text: "Wähle.", optionen: ["Dear Sir or Madam,", "Hi guys,"], richtig: 1 },
      { text: "Ergänze die Tabelle.", tabelle: { spalten: ["Englisch", "Deutsch"], zeilen: [["application", ""], ["", "Lebenslauf"]], loesung: [["application", "Bewerbung"], ["CV", "Lebenslauf"]] } },
    ],
  });

  it("always get a solution from the program, so a teacher's copy exists without the model writing one", () => {
    expect(sheet.aufgaben.every((_, i) => loesungText(sheet, i))).toBe(true);
    expect(koerper(sheet, 0)?.art).toBe("zuordnung");
  });

  it("show every part in the PDF, and the solution only in the teacher's copy", async () => {
    const file = async (lehrer: boolean) => {
      const f = join(await mkdtemp(join(tmpdir(), "pult-pdf-")), "a.pdf");
      await writeFile(f, (await renderArbeitsblatt(sheet, { lehrerexemplar: lehrer })).pdf);
      return f;
    };
    let student: string;
    let teacher: string;
    try {
      student = execFileSync("pdftotext", ["-layout", await file(false), "-"]).toString();
      teacher = execFileSync("pdftotext", ["-layout", await file(true), "-"]).toString();
    } catch {
      return; // no poppler here
    }
    for (const part of ["apply", "bewerben", "Frist", "__________", "am writing", "Dear Sir or Madam", "Englisch", "Lebenslauf"]) expect(student, part).toContain(part);
    expect(student).not.toContain("Richtig:");
    expect(student).not.toContain("Bewerbung");
    expect(teacher).toContain("Richtig: A) Dear Sir or Madam,");
    expect(teacher).toContain("Bewerbung");
  });

  it("show every part in the Word file too", async () => {
    const f = join(await mkdtemp(join(tmpdir(), "pult-word-")), "a.docx");
    await writeFile(f, await arbeitsblattWord(sheet));
    const text = (await mammoth.extractRawText({ path: f })).value;
    for (const part of ["apply", "bewerben", "Frist", "am writing", "Dear Sir or Madam", "Englisch", "Lebenslauf"]) expect(text, part).toContain(part);
    expect(text).not.toContain("Richtig:");
  });
});

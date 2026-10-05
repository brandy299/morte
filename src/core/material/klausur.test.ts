import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gesamtpunkte, parseKlausur, renderErwartungshorizont, renderKlausur, verteilung } from "./klausur.ts";
import { MaterialError } from "./layout.ts";

const tool = (cmd: string) => {
  try {
    execFileSync(cmd, ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const hasPoppler = tool("pdftotext") && tool("pdftoppm");
const toFile = async (pdf: Buffer) => {
  const file = join(await mkdtemp(join(tmpdir(), "morte-k-")), "k.pdf");
  await writeFile(file, pdf);
  return file;
};
const text = async (pdf: Buffer, page?: number) =>
  execFileSync("pdftotext", [...(page ? ["-f", String(page), "-l", String(page)] : []), await toFile(pdf), "-"]).toString();

const rules = {
  bereiche: [{ kurz: "I", name: "Wiedergeben", anteil: 30 }, { kurz: "II", name: "Anwenden", anteil: 40 }, { kurz: "III", name: "Gestalten", anteil: 30 }],
  notenschluessel: [{ note: "1", abProzent: 87 }, { note: "2", abProzent: 73 }, { note: "3", abProzent: 59 }, { note: "4", abProzent: 45 }, { note: "5", abProzent: 18 }, { note: "6", abProzent: 0 }],
};
const sample = {
  titel: "Klausur 1: Bewerbung", fach: "Business English", klasse: "11a", datum: "04.11.", dauer: "90 Minuten", hilfsmittel: "Wörterbuch",
  hinweise: "Schreibe leserlich.",
  aufgaben: [
    { titel: "Anzeige verstehen", einstieg: "Die Firma Nordlicht GmbH sucht eine Assistenz im Einkauf.", teile: [
      { text: "Nenne drei Anforderungen.", punkte: 3, bereich: "I", zeilen: 3, erwartung: "Je 1 P.: Teamfähigkeit, Englisch, Tabellen." },
      { text: "Erkläre, warum Teamfähigkeit wichtig ist.", punkte: 4, bereich: "ii", zeilen: 4, erwartung: "2 P. Zusammenarbeit, 2 P. Beispiel." } ] },
    { titel: "Bewerbung schreiben", teile: [{ text: "Schreibe ein Anschreiben.", punkte: 13, bereich: "III", zeilen: 12, erwartung: "Inhalt 5, Sprache 5, Aufbau 3." }] },
  ],
};

describe("parseKlausur", () => {
  it("accepts good content and matches areas to the teacher's labels, ignoring case", () => {
    const k = parseKlausur(sample, rules);
    expect(k.aufgaben[0]!.teile[1]!.bereich).toBe("II");
    expect(gesamtpunkte(k)).toBe(20);
  });

  it("works without any rules: no areas, no scale", () => {
    const free = JSON.parse(JSON.stringify(sample));
    for (const a of free.aufgaben) for (const t of a.teile) delete t.bereich;
    const k = parseKlausur(free);
    expect(k.bereiche).toEqual([]);
    expect(k.notenschluessel).toEqual([]);
  });

  it("names the allowed areas when one is wrong or missing", () => {
    const wrong = JSON.parse(JSON.stringify(sample));
    wrong.aufgaben[0].teile[0].bereich = "AFB IV";
    expect(() => parseKlausur(wrong, rules)).toThrow(/Aufgabe 1a: Den Bereich „AFB IV“ gibt es in der Bewertung nicht. Erlaubt sind: I, II, III/);
    const missing = JSON.parse(JSON.stringify(sample));
    delete missing.aufgaben[1].teile[0].bereich;
    expect(() => parseKlausur(missing, rules)).toThrow(/Aufgabe 2: Es fehlt der Bereich/);
  });

  it("insists on points and an expected answer for every sub-task", () => {
    const bad = (change: (s: any) => void) => {
      const s = JSON.parse(JSON.stringify(sample));
      change(s);
      return () => parseKlausur(s, rules);
    };
    expect(bad((s) => (s.aufgaben[0].teile[0].punkte = 0))).toThrow(/Punkte/);
    expect(bad((s) => (s.aufgaben[0].teile[0].punkte = 2.3))).toThrow(/halben Schritten/);
    expect(bad((s) => delete s.aufgaben[0].teile[0].erwartung)).toThrow(/erwartete Leistung von Aufgabe 1a/);
    expect(bad((s) => (s.aufgaben = []))).toThrow(MaterialError);
    expect(bad((s) => delete s.titel)).toThrow(/Titel/);
  });
});

describe("verteilung", () => {
  it("sums points per area in the teacher's order and shows the intended share", () => {
    const v = verteilung(parseKlausur(sample, rules));
    expect(v.map((x) => [x.kurz, x.punkte, Math.round(x.anteil), x.soll])).toEqual([["I", 3, 15, 30], ["II", 4, 20, 40], ["III", 13, 65, 30]]);
  });
});

describe("rendering", () => {
  it("draws the exam with facts, score boxes and a total for the grader", async () => {
    if (!hasPoppler) return;
    const { pdf, pages } = await renderKlausur(parseKlausur(sample, rules));
    expect(pages).toBeGreaterThanOrEqual(1);
    const t = await text(pdf);
    expect(t.replace(/\s+/g, "")).toContain("BUSINESSENGLISH");
    for (const part of ["Klausur 1: Bewerbung", "90 Minuten", "Wörterbuch", "20 möglich", "Nenne drei Anforderungen.", "/ 13", "Gesamt: ______ / 20 Punkte"]) {
      expect(t).toContain(part);
    }
    expect(t).not.toContain("Teamfähigkeit, Englisch"); // the answers must never be in the exam
  });

  it("draws the answer key with the calculated grade limits", async () => {
    if (!hasPoppler) return;
    const { pdf } = await renderErwartungshorizont(parseKlausur(sample, rules));
    const t = await text(pdf);
    expect(t.replace(/\s+/g, "")).toContain("ERWARTUNGSHORIZONT");
    for (const part of ["Teamfähigkeit, Englisch", "Verteilung auf die Bereiche", "30 %", "17,5 bis 20", "15 bis 17", "0 bis 3,5"]) {
      expect(t).toContain(part);
    }
  });

  it("says so when there is no grading scale, instead of inventing one", async () => {
    if (!hasPoppler) return;
    const { pdf } = await renderErwartungshorizont(parseKlausur(sample, { bereiche: rules.bereiche }));
    const t = await text(pdf);
    expect(t).toContain("Kein Notenschlüssel hinterlegt");
    expect(t).not.toContain("Ab Prozent");
  });

  it("never leaves a task heading alone at the bottom of a page, and numbers pages", async () => {
    if (!hasPoppler) return;
    const many = {
      titel: "Lang",
      aufgaben: Array.from({ length: 6 }, (_, i) => ({
        titel: `Kopf${i + 1}`,
        teile: [{ text: `Frage${i + 1} ${"Erkläre genau. ".repeat(6)}`, punkte: 5, zeilen: 12, erwartung: "Antwort" }],
      })),
    };
    const { pdf, pages } = await renderKlausur(parseKlausur(many));
    expect(pages).toBeGreaterThan(1);
    for (let p = 1; p <= pages; p++) {
      const t = await text(pdf, p);
      const heads = [...t.matchAll(/Kopf(\d)/g)].map((m) => m[1]);
      const questions = [...t.matchAll(/Frage(\d)/g)].map((m) => m[1]);
      expect(heads.sort(), `page ${p}`).toEqual(questions.sort());
      expect(t).toContain(`Seite ${p} von ${pages}`);
    }
  });

  it("uses only gray values", async () => {
    if (!hasPoppler) return;
    for (const render of [renderKlausur, renderErwartungshorizont]) {
      const { pdf, pages } = await render(parseKlausur(sample, rules));
      const file = await toFile(pdf);
      for (let p = 1; p <= pages; p++) {
        const ppm = execFileSync("pdftoppm", ["-r", "40", "-f", String(p), "-l", String(p), file], { maxBuffer: 50_000_000 });
        const body = ppm.subarray(ppm.indexOf("\n255\n") + 5);
        let colored = 0;
        for (let i = 0; i + 2 < body.length; i += 3) if (body[i] !== body[i + 1] || body[i + 1] !== body[i + 2]) colored++;
        expect(colored).toBe(0);
      }
    }
  });
});

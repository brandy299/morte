import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { parseArbeitsblatt } from "./arbeitsblatt.ts";
import { parseKlausur } from "./klausur.ts";
import { parseLernsituation } from "./lernsituation.ts";
import { parseVerlauf } from "./verlauf.ts";
import { arbeitsblattWord, erwartungshorizontWord, klausurWord, lernsituationWord, verlaufWord } from "./word-render.ts";

/** Reads a Word file back as plain text, the way a teacher's Word would show it. */
async function textOf(buffer: Buffer): Promise<string> {
  const file = join(await mkdtemp(join(tmpdir(), "pult-word-")), "x.docx");
  await writeFile(file, buffer);
  return (await mammoth.extractRawText({ path: file })).value;
}

const rules = { bereiche: [{ kurz: "I", name: "Wiedergeben" }, { kurz: "II", name: "Anwenden" }], notenschluessel: [{ note: "1", abProzent: 90 }, { note: "3", abProzent: 0 }] };
const exam = parseKlausur(
  {
    titel: "Klausur Bewerbung", fach: "Business English", klasse: "11a", dauer: "45 Minuten", hinweise: "Neue Seite je Aufgabe.",
    aufgaben: [{ titel: "Anschreiben", einstieg: "Du bewirbst dich.", teile: [
      { text: "Nenne zwei Bestandteile.", punkte: 2, bereich: "I", zeilen: 2, erwartung: "Je 1 P.: Anschreiben, Lebenslauf." },
      { text: "Begründe die Individualität.", punkte: 4, bereich: "II", zeilen: 3, erwartung: "2 P. Firma, 2 P. Begründung." },
    ] }],
  },
  rules,
);

describe("Word files", () => {
  const sheet = parseArbeitsblatt({
    titel: "Zellbezüge", fach: "Informationswirtschaft", klasse: "11a", niveau: "Basis", einleitung: "Löse die Aufgaben.", merkkasten: { titel: "Merke", text: "Relativ ändert sich." },
    aufgaben: [{ text: "Schreibe die Formel.", hilfe: "Denk an die Zeile.", punkte: 2, zeilen: 2, loesung: "=A2+B2" }],
  });

  it("worksheet: student copy has the fields and no answers, the teacher's copy has the answers", async () => {
    const student = await textOf(await arbeitsblattWord(sheet));
    expect(student).toContain("Zellbezüge");
    expect(student).toContain("Name");
    expect(student).toContain("Tipp: Denk an die Zeile.");
    expect(student).toContain("2 P.");
    expect(student).not.toContain("=A2+B2");
    const teacher = await textOf(await arbeitsblattWord(sheet, { lehrerexemplar: true }));
    expect(teacher).toContain("=A2+B2");
    expect(teacher).toContain("Lösung für die Lehrkraft".toUpperCase());
    expect(teacher).not.toContain("Name");
  });

  it("lesson plan: every phase with its times", async () => {
    const t = await textOf(
      await verlaufWord(parseVerlauf({
        titel: "Zellbezüge verstehen", dauer: 45, lernziele: ["Bezüge unterscheiden"],
        phasen: [{ minuten: 10, phase: "Einstieg", inhalt: "Fehlerbeispiel" }, { minuten: 35, phase: "Erarbeitung", inhalt: "Partnerarbeit" }],
      })),
    );
    expect(t).toContain("0–10 min");
    expect(t).toContain("10–45 min");
    expect(t).toContain("45 Minuten");
    expect(t).toContain("Bezüge unterscheiden");
  });

  it("exam and answer key: tasks, points, grade limits and the distribution come from the same calculation as the PDFs", async () => {
    const klausur = await textOf(await klausurWord(exam));
    expect(klausur).toContain("Anschreiben");
    expect(klausur).toContain("/ 4");
    expect(klausur).toContain("Gesamt: ______ / 6 Punkte");
    expect(klausur).not.toContain("Je 1 P.: Anschreiben");
    const ehz = await textOf(await erwartungshorizontWord(exam));
    expect(ehz).toContain("Je 1 P.: Anschreiben, Lebenslauf.");
    expect(ehz).toContain("I  Wiedergeben");
    expect(ehz).toContain("5,5 bis 6"); // grade 1 from 90 % of 6 points, in half steps, as in the PDF
  });

  it("series: the students' page comes first, then the plan with every lesson", async () => {
    const t = await textOf(
      await lernsituationWord(parseLernsituation({
        titel: "Bewerbung", handlungssituation: "Du arbeitest bei einer Firma.", auftrag: "Schreibt eine Bewerbung.", ziele: ["Anzeigen auswerten"],
        ablauf: [{ thema: "Stellenanzeigen", phase: "Informieren" }, { thema: "Anschreiben", phase: "Durchführen" }],
      })),
    );
    expect(t.indexOf("Euer Auftrag")).toBeLessThan(t.indexOf("Steckbrief"));
    expect(t).toContain("Stellenanzeigen");
    expect(t).toContain("2 Stunden");
  });

  describe("formulas", () => {
    const formulaSheet = () =>
      parseArbeitsblatt({
        titel: "Zinsen", fach: "Mathematik", klasse: "11b",
        einleitung: "Es gilt:\n\\[K_n = K_0 \\cdot \\left(1 + \\frac{p}{100}\\right)^n\\]\nMehr Text.",
        merkkasten: { titel: "pq-Formel", text: "Für \\(x^2 + px + q = 0\\) gilt:\n$$x_{1,2} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}$$" },
        aufgaben: [
          { text: "Berechne \\(\\frac{3}{4} + \\frac{1}{8}\\) und \\(\\sqrt{50}\\).", hilfe: "Es ist \\(50 = 25 \\cdot 2\\).", punkte: 2, zeilen: 1, loesung: "\\(\\frac{7}{8}\\)" },
          { text: "Kaputt: \\(\\frac{1}{2\\) und 5 $ sowie =SUMME($A$1:$A$5).", zeilen: 1 },
        ],
      });
    const files = async (b: Buffer) => unzipSync(new Uint8Array(b));
    const xml = async (b: Buffer) => strFromU8((await files(b))["word/document.xml"]!);

    it("formulas become pictures with the LaTeX as alternative text, in the text and in boxes, hints and answers", async () => {
      const key = await arbeitsblattWord(formulaSheet(), { lehrerexemplar: true });
      const doc = await xml(key);
      const alt = [...doc.matchAll(/<wp:docPr [^>]*descr="([^"]*)"/g)].map((m) => m[1]!.replaceAll("&amp;", "&"));
      for (const tex of ["K_n = K_0 \\cdot \\left(1 + \\frac{p}{100}\\right)^n", "x^2 + px + q = 0", "\\frac{3}{4} + \\frac{1}{8}", "\\sqrt{50}", "50 = 25 \\cdot 2", "\\frac{7}{8}"]) expect(alt).toContain(tex);
      const png = Object.keys(await files(key)).filter((n) => n.startsWith("word/media/") && n.endsWith(".png"));
      expect(png.length).toBeGreaterThanOrEqual(6);
      const text = await textOf(key);
      expect(text).not.toContain("\\sqrt"); // no raw LaTeX in the text (the broken one in task 2 stays raw on purpose)
      expect(text).not.toContain("\\cdot");
    });

    it("a formula in a sentence sits on the text line, a formula on its own line stands centered in a paragraph of its own", async () => {
      const doc = await xml(await arbeitsblattWord(formulaSheet()));
      expect(doc).toMatch(/<w:position w:val="-\d+"\/>/); // lowered by its depth: the fraction in the task
      const own = [...doc.matchAll(/<w:p>(?:(?!<\/w:p>).)*?<w:jc w:val="center"\/>(?:(?!<\/w:p>).)*?<\/w:p>/g)].filter((m) => m[0].includes("<w:drawing>"));
      expect(own.length).toBe(2); // Zinsformel and pq-Formel
      expect(own.every((m) => !m[0].includes("<w:t"))).toBe(true); // nothing but the picture
    });

    it("pictures are sharp: at least 300 dpi", async () => {
      const f = await files(await arbeitsblattWord(formulaSheet()));
      const doc = strFromU8(f["word/document.xml"]!);
      const rel = strFromU8(f["word/_rels/document.xml.rels"]!);
      const m = /<wp:extent cx="(\d+)" cy="\d+"\/>(?:(?!<\/w:drawing>).)*?<wp:docPr [^>]*descr="K_n[^"]*"(?:(?!<\/w:drawing>).)*?r:embed="(rId\d+)"/s.exec(doc)!;
      const target = new RegExp(`Id="${m[2]}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${m[2]}"`).exec(rel)!;
      const data = f[`word/${target[1] ?? target[2]}`]!;
      const widthPx = new DataView(data.buffer, data.byteOffset).getUint32(16); // PNG header: width
      const inches = Number(m[1]) / 914400;
      expect(widthPx / inches).toBeGreaterThanOrEqual(300);
    });

    it("wrong LaTeX, prices and Excel references stay text and break nothing", async () => {
      const t = await textOf(await arbeitsblattWord(formulaSheet()));
      expect(t).toContain("\\(\\frac{1}{2\\) und 5 $ sowie =SUMME($A$1:$A$5).");
    });

    it("text without a formula gives the same file as before: a dollar sign alone does not change it", async () => {
      const plain = parseArbeitsblatt({ titel: "Preise", fach: "INWI", einleitung: "Kosten 5 $ und \\$ 10.", aufgaben: [{ text: "=SUMME($A$1:$A$5)", zeilen: 1 }] });
      const doc = await xml(await arbeitsblattWord(plain));
      expect(doc).toContain("Kosten 5 $ und \\$ 10.");
      expect(doc).not.toContain("<w:drawing>");
    });

    it("exam answer key and cells of tables take formulas too", async () => {
      const k = parseKlausur(
        { titel: "Klausur", fach: "Mathematik", klasse: "11b", aufgaben: [{ titel: "pq", teile: [{ text: "Löse \\(x^2 + 2x - 8 = 0\\).", punkte: 4, bereich: "I", zeilen: 3, erwartung: "\\[x_{1,2} = -1 \\pm \\sqrt{9}\\]\nalso \\(x_1 = 2\\)." }] }] },
        rules,
      );
      for (const buf of [await klausurWord(k), await erwartungshorizontWord(k)]) {
        const doc = await xml(buf);
        expect(doc).toContain("<w:drawing>");
        expect(await textOf(buf)).not.toContain("\\sqrt");
      }
    });
  });
});

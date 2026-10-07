import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
});

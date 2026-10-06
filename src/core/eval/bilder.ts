/**
 * Pictures for test cases that attach a photo. They are drawn here from invented worksheets, so no real material,
 * no real names and no copyright are involved. A drawn sheet is cleaner than a phone photo: crooked, shadowed or
 * handwritten pictures are not covered by these tests.
 */
import { parseArbeitsblatt, renderArbeitsblatt } from "../material/arbeitsblatt.ts";
import { readPdf } from "../lehrplan/pdf.ts";
import { readMaterialText } from "../material/read.ts";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SHEETS: Record<string, unknown> = {
  telephoning: {
    titel: "Telephoning: Making a Call",
    fach: "Business English",
    klasse: "11a",
    einleitung: "Work with the phrases you need to make and take a business call.",
    aufgaben: [
      { text: "Match the phrases with their German meaning.", paare: [{ links: "May I speak to Ms Hartmann, please?", rechts: "Kann ich bitte mit Frau Hartmann sprechen?" }, { links: "I'm afraid she is not available.", rechts: "Leider ist sie nicht erreichbar." }, { links: "Could you hold the line, please?", rechts: "Würden Sie bitte in der Leitung bleiben?" }, { links: "I'll put you through.", rechts: "Ich verbinde Sie." }] },
      { text: "Complete the dialogue with the words from the box.", saetze: ["Good morning, Meyer Trading, how can I {{help}} you?", "I'd like to {{speak}} to the sales manager.", "One moment, please. I'll {{put}} you through."], wortliste: true },
      { text: "Choose the best reply.", optionen: ["Yes, speaking.", "No, I don't like phones.", "Please call the weather."], richtig: 1 },
      { text: "Write two sentences you would say to leave a message.", zeilen: 3 },
    ],
  },
  rechnung: {
    titel: "Kurz gecheckt: Die Rechnung",
    fach: "Wirtschaft",
    klasse: "10b",
    aufgaben: [
      { text: "Welche Angabe muss auf einer Rechnung stehen?", optionen: ["Rechnungsnummer", "Lieblingsfarbe des Kunden", "Wetter am Liefertag"], richtig: 1 },
      { text: "Was bedeutet „netto“ bei einem Preis?", optionen: ["Preis ohne Umsatzsteuer", "Preis mit Umsatzsteuer", "Preis nach Rabatt und Skonto"], richtig: 1 },
      { text: "Ergänze die Rechnung.", tabelle: { spalten: ["Posten", "Betrag in Euro"], zeilen: [["Warenwert netto", "100,00"], ["Umsatzsteuer 19 %", ""], ["Rechnungsbetrag brutto", ""]] } },
    ],
  },
};

export interface Bild {
  data: string;
  mimeType: string;
  /** What is written on the picture, so the judge can compare. */
  text: string;
}

export async function fixtureBild(name: string): Promise<Bild> {
  const raw = SHEETS[name];
  if (!raw) throw new Error(`Das Testbild „${name}“ gibt es nicht.`);
  const { pdf } = await renderArbeitsblatt(parseArbeitsblatt(raw));
  const dir = await mkdtemp(join(tmpdir(), "morte-bild-"));
  try {
    const file = join(dir, "blatt.pdf");
    await writeFile(file, pdf);
    const doc = await readPdf(pdf);
    try {
      return { data: (await doc.renderPage(1, 1400)).toString("base64"), mimeType: "image/png", text: await readMaterialText(file) };
    } finally {
      await doc.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export const bildNamen = () => Object.keys(SHEETS);

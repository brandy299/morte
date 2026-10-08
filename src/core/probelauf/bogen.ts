import { AlignmentType, BorderStyle, CheckBox, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, type ParagraphChild } from "docx";
import { PAGE_W, SANS_W, SERIF_W } from "../material/word.ts";

/**
 * The feedback sheet for the trial run (docs/probelauf.md). A Word file with ticking boxes (content controls) and free fields,
 * to fill in on the screen or on paper. `npm run bogen` writes it to docs/probelauf-rueckmeldebogen.docx.
 */

/** The sentence about privacy. It stands in the guide and at the top of the sheet. */
export const DATENSCHUTZ_SATZ = "Prüfe, dass kein Schülername und keine Note im Gespräch steht, bevor du es schickst.";

interface Frage {
  frage: string;
  /** Answers to tick. Empty: only a free field. */
  auswahl?: string[];
  /** Free field below, with this hint. */
  frei?: string;
  /** Height of the free field in mm. */
  hoehe?: number;
}

export const FRAGEN: Frage[] = [
  { frage: "Womit hast du gearbeitet?", auswahl: ["Windows", "Mac"], frei: "Welches Modell und welcher Anbieter? (Steht in den Einstellungen unter „KI-Anbieter“.)", hoehe: 12 },
  { frage: "Was wolltest du erstellen?", auswahl: ["Arbeitsblatt", "Klausur", "Reihe oder Stunde planen", "Verständnis-Check", "etwas anderes"], frei: "Thema und Klasse oder Kurs, in einem Satz (ohne Namen):", hoehe: 12 },
  { frage: "Hast du das Ergebnis so verwendet?", auswahl: ["ja", "ja, mit kleinen Änderungen", "ja, mit großen Änderungen", "nein"] },
  { frage: "Was musstest du ändern?", frei: "Zum Beispiel Aufgaben, Aufbau, Ton, Fehler im Inhalt:", hoehe: 30 },
  { frage: "Hat Pult unnötig nachgefragt?", auswahl: ["nie", "manchmal", "oft"] },
  { frage: "Gab es etwas, das du nicht verstanden hast?", frei: "Ein Wort, ein Knopf, eine Meldung, ein Schritt:", hoehe: 24 },
  { frage: "Würdest du Pult nächste Woche wieder benutzen?", auswahl: ["ja", "vielleicht", "nein"], frei: "Warum?", hoehe: 20 },
  { frage: "Was hast du vermisst?", frei: "Etwas, das Pult nicht konnte oder das dir gefehlt hat:", hoehe: 24 },
];

const INK = "111111";
const SOFT = "555555";
const LINE = "999999";
const twip = (mm: number) => Math.round(mm * 56.7);
const text = (t: string, o: { bold?: boolean; size?: number; color?: string; font?: string; italics?: boolean } = {}) =>
  new TextRun({ text: t, font: o.font ?? SANS_W, size: o.size ?? 22, bold: o.bold, italics: o.italics, color: o.color ?? INK });

const box = () => new CheckBox({ checked: false });

function choices(answers: string[]): Paragraph {
  const children: ParagraphChild[] = [];
  answers.forEach((a, i) => children.push(box(), text(`  ${a}`), ...(i < answers.length - 1 ? [text("        ")] : [])));
  return new Paragraph({ spacing: { before: 40, after: 80 }, children });
}

function field(hint: string, heightMm: number): (Paragraph | Table)[] {
  const border = { style: BorderStyle.SINGLE, size: 4, color: LINE } as const;
  return [
    new Paragraph({ spacing: { after: 40 }, children: [text(hint, { size: 19, color: SOFT, italics: true })] }),
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      rows: [new TableRow({ height: { value: twip(heightMm), rule: "atLeast" }, children: [new TableCell({ width: { size: PAGE_W, type: WidthType.DXA }, borders: { top: border, bottom: border, left: border, right: border }, children: [new Paragraph({ children: [] })] })] })],
    }),
  ];
}

export async function rueckmeldebogenWord(): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { after: 60 }, children: [text("Pult: Rückmeldung zum Probelauf", { font: SERIF_W, bold: true, size: 38 })] }),
    new Paragraph({ spacing: { after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 6 } }, children: [] }),
    new Paragraph({
      spacing: { after: 140 },
      shading: { type: ShadingType.CLEAR, fill: "EEEEEE", color: "auto" },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: INK, space: 8 } },
      indent: { left: 160, right: 80 },
      children: [text("Datenschutz: ", { bold: true }), text("Keine Schülernamen, keine Noten und keine Fotos von Klassenarbeiten, weder hier noch im Gespräch, das du mitschickst. "), text(DATENSCHUTZ_SATZ)],
    }),
    new Paragraph({ spacing: { after: 160 }, children: [text("Du kannst am Bildschirm ankreuzen und schreiben oder den Bogen ausdrucken. Fülle für jede Aufgabe, die du ausprobiert hast, einen Bogen aus. Ein paar Stichworte genügen.", { color: SOFT })] }),
    new Paragraph({ spacing: { after: 160 }, tabStops: [{ type: "left", position: twip(70) }], children: [text("Dein Name: ______________________"), text("\tDatum: ______________")] }),
  ];
  FRAGEN.forEach((f, i) => {
    children.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 40 }, children: [text(`${i + 1}. `, { bold: true }), text(f.frage, { bold: true })] }));
    if (f.auswahl) children.push(choices(f.auswahl));
    if (f.frei) children.push(...field(f.frei, f.hoehe ?? 20));
  });
  children.push(
    new Paragraph({ spacing: { before: 260 }, alignment: AlignmentType.LEFT, children: [text("Schicke Yannik diesen Bogen und das Gespräch (im Gespräch oben auf „Gespräch exportieren“ klicken). ", { color: SOFT }), text(DATENSCHUTZ_SATZ, { color: SOFT })] }),
  );
  const file = new Document({
    title: "Pult: Rückmeldung zum Probelauf",
    creator: "Pult",
    styles: { default: { document: { run: { font: SANS_W, size: 22, color: INK } } } },
    sections: [{ properties: { page: { size: { width: twip(210), height: twip(297) }, margin: { top: twip(15), bottom: twip(15), left: twip(16), right: twip(16) } } }, children }],
  });
  return Buffer.from(await Packer.toBuffer(file));
}

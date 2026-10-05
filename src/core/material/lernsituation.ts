/**
 * Lernsituation (or any planned series): the model delivers structured content, this file draws one PDF.
 * Page 1 is the situation for the students, so it can be handed out. After it comes the overview for the teacher.
 */
import type { AblaufSchritt } from "../workspace/index.ts";
import { INK, MaterialError, SANS, SERIF, SOFT, mm, newSheet, printable, str, table, type Sheet } from "./layout.ts";

export interface Lernsituation {
  titel: string;
  fach?: string;
  klasse?: string;
  lernfeld?: string;
  zeitraum?: string;
  /** The situation the students act in, written for them. */
  handlungssituation: string;
  /** The task that follows from the situation, written for the students. */
  auftrag?: string;
  /** What the students hand in or present at the end. */
  handlungsprodukt?: string;
  ziele: string[];
  leistungsnachweis?: string;
  ablauf: (AblaufSchritt & { datum?: string; stunde?: string })[];
  fuss?: string;
}

export function parseLernsituation(raw: unknown): Lernsituation {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.ablauf) || o.ablauf.length === 0) throw new MaterialError("Es fehlt: mindestens eine geplante Stunde.");
  if (o.ablauf.length > 40) throw new MaterialError("Mehr als 40 Stunden sind für eine Reihe zu viele. Teile sie auf.");
  const ziele = Array.isArray(o.ziele) ? o.ziele.map((z, i) => str(z, `Ziel ${i + 1}`, 300, true)!) : [];
  if (ziele.length > 10) throw new MaterialError("Mehr als 10 Ziele sind zu viele. Fasse sie zusammen.");
  return {
    titel: str(o.titel, "der Titel", 80, true)!,
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    lernfeld: str(o.lernfeld, "das Lernfeld", 120),
    zeitraum: str(o.zeitraum, "der Zeitraum", 60),
    handlungssituation: str(o.handlungssituation, "die Handlungssituation", 3000, true)!,
    auftrag: str(o.auftrag, "der Arbeitsauftrag", 1500),
    handlungsprodukt: str(o.handlungsprodukt, "das Handlungsprodukt", 300),
    ziele,
    leistungsnachweis: str(o.leistungsnachweis, "der Leistungsnachweis", 200),
    ablauf: o.ablauf.map((s, i) => {
      const r = (s ?? {}) as Record<string, unknown>;
      const at = `Stunde ${i + 1}`;
      return {
        thema: str(r.thema, `das Thema von ${at}`, 120, true)!,
        phase: str(r.phase, `die Phase von ${at}`, 40),
        inhalt: str(r.inhalt, `der Inhalt von ${at}`, 600),
        produkt: str(r.produkt, `das Ergebnis von ${at}`, 200),
        datum: str(r.datum, `das Datum von ${at}`, 20),
        stunde: str(r.stunde, `die Stunde von ${at}`, 20),
      };
    }),
    fuss: str(o.fuss, "der Fußtext", 200),
  };
}

/** Label and value in one line, the label small and gray. */
function fact(sheet: Sheet, label: string, value: string): void {
  const { doc, left, width } = sheet;
  const labelW = mm(46);
  const h = sheet.height(value, SANS, 10.5, width - labelW);
  sheet.room(h + 6);
  doc.font(SANS).fontSize(7.5).fillColor(SOFT).text(printable(label).toUpperCase(), left, sheet.y + 2.5, { width: labelW, characterSpacing: 1, lineBreak: false });
  doc.font(SANS).fontSize(10.5).fillColor(INK).text(printable(value), left + labelW, sheet.y, { width: width - labelW, lineGap: 2.5 });
  sheet.y += h + 6;
}

export async function renderLernsituation(l: Lernsituation): Promise<{ pdf: Buffer; pages: number }> {
  const sheet = newSheet(l.titel);
  const kicker = [l.fach, l.klasse, l.lernfeld].filter(Boolean).join(" · ");

  // For the students: situation, task, product.
  sheet.header({ kicker: kicker || "Lernsituation", title: l.titel });
  for (const part of l.handlungssituation.split(/\n\s*\n/)) sheet.paragraph(part.trim(), { gap: mm(3.5) });
  sheet.y += mm(2.5);
  if (l.auftrag) sheet.box({ title: "Euer Auftrag", text: l.auftrag });
  if (l.handlungsprodukt) sheet.box({ title: "Am Ende steht", text: l.handlungsprodukt });

  // For the teacher, on a new page.
  sheet.doc.addPage();
  sheet.y = mm(15);
  sheet.header({ kicker: [kicker, "Planung"].filter(Boolean).join(" · "), title: "Steckbrief" });
  if (l.lernfeld) fact(sheet, "Lernfeld", l.lernfeld);
  if (l.zeitraum) fact(sheet, "Zeitraum", l.zeitraum);
  fact(sheet, "Umfang", `${l.ablauf.length} ${l.ablauf.length === 1 ? "Stunde" : "Stunden"}`);
  if (l.handlungsprodukt) fact(sheet, "Handlungsprodukt", l.handlungsprodukt);
  if (l.leistungsnachweis) fact(sheet, "Leistungsnachweis", l.leistungsnachweis);
  if (l.ziele.length) fact(sheet, "Ziele", l.ziele.map((z) => `- ${z}`).join("\n"));
  sheet.y += mm(4);

  sheet.paragraph("Ablauf", { font: SERIF, size: 13, gap: mm(2.5) });
  const withPhase = l.ablauf.some((s) => s.phase);
  const withDate = l.ablauf.some((s) => s.datum || s.stunde);
  const cols = [
    { title: "Nr.", share: 0.07, bold: true },
    ...(withPhase ? [{ title: "Phase", share: 0.16 }] : []),
    { title: "Thema und Inhalt", share: 0 },
    { title: "Ergebnis", share: 0.22 },
    ...(withDate ? [{ title: "Termin", share: 0.13 }] : []),
  ];
  cols.find((c) => c.share === 0)!.share = 1 - cols.reduce((n, c) => n + c.share, 0);
  table(
    sheet,
    cols,
    l.ablauf.map((s, i) => [
      String(i + 1),
      ...(withPhase ? [s.phase ?? ""] : []),
      s.inhalt ? `${s.thema}\n${s.inhalt}` : s.thema,
      s.produkt ?? "",
      ...(withDate ? [[s.datum, s.stunde].filter(Boolean).join(" ")] : []),
    ]),
  );
  return sheet.finish(l.fuss);
}

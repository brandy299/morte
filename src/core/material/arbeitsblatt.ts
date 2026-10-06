/**
 * Worksheet: the model delivers structured content, this file turns it into a fixed layout.
 * The look lives in layout.ts (shared by all material), so it does not depend on how good the chosen model is.
 */
import { koerperVon, loesungVon, parseTyp, type Koerper, type Typ } from "./aufgabentypen.ts";
import { BOX, INK, LINE, MaterialError, SANS, SANS_BOLD, SANS_BOLD_ITALIC, SANS_ITALIC, SOFT, mm, newSheet, printable, str, type Sheet } from "./layout.ts";

export { MaterialError, printable };

export interface Aufgabe {
  text: string;
  /** A short hint for students, printed below the task. */
  hilfe?: string;
  punkte?: number;
  /** Writing lines below the task. 0 = no lines. */
  zeilen?: number;
  /** Expected answer. Only the teacher's copy shows it. For typed tasks the program adds the solution itself. */
  loesung?: string;
  /** Matching, gap text, multiple choice, table, or free text. */
  typ: Typ;
}

/** Seed for shuffling, so the same task always looks the same. */
const seedOf = (a: Pick<Arbeitsblatt, "titel">, i: number) => `${a.titel}|${i}`;
export const koerper = (a: Arbeitsblatt, i: number): Koerper | undefined => koerperVon(a.aufgaben[i]!.typ, seedOf(a, i));
/** The solution text of task `i` for the teacher's copy: made by the program for typed tasks, plus what the model wrote. */
export const loesungText = (a: Arbeitsblatt, i: number): string | undefined => loesungVon(a.aufgaben[i]!.typ, seedOf(a, i), a.aufgaben[i]!.loesung);

export interface Arbeitsblatt {
  titel: string;
  fach?: string;
  klasse?: string;
  /** Level of a differentiated version, e.g. "Basis". Shown in the header. */
  niveau?: string;
  einleitung?: string;
  merkkasten?: { titel?: string; text: string };
  aufgaben: Aufgabe[];
  /** Small print in the footer, e.g. "Ohne hinterlegten Lehrplan erstellt". */
  fuss?: string;
}

/** Checks content from the model before anything is drawn. */
export function parseArbeitsblatt(raw: unknown): Arbeitsblatt {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.aufgaben) || o.aufgaben.length === 0) throw new MaterialError("Es fehlt: mindestens eine Aufgabe.");
  if (o.aufgaben.length > 20) throw new MaterialError("Mehr als 20 Aufgaben passen nicht auf ein Arbeitsblatt.");
  const aufgaben = o.aufgaben.map((a, i): Aufgabe => {
    const t = (a ?? {}) as Record<string, unknown>;
    const zeilen = t.zeilen === undefined ? 0 : Number(t.zeilen);
    const punkte = t.punkte === undefined ? undefined : Number(t.punkte);
    if (!Number.isInteger(zeilen) || zeilen < 0 || zeilen > 15) throw new MaterialError(`Aufgabe ${i + 1}: Die Zahl der Schreibzeilen muss zwischen 0 und 15 liegen.`);
    if (punkte !== undefined && (!Number.isFinite(punkte) || punkte < 0 || punkte > 100)) throw new MaterialError(`Aufgabe ${i + 1}: Die Punkte sind nicht gültig.`);
    return { text: str(t.text, `Text von Aufgabe ${i + 1}`, 2000, true)!, hilfe: str(t.hilfe, `Hilfe zu Aufgabe ${i + 1}`, 500), punkte, zeilen, loesung: str(t.loesung, `Lösung zu Aufgabe ${i + 1}`, 1500), typ: parseTyp(t, i + 1) };
  });
  const mk = o.merkkasten as Record<string, unknown> | undefined;
  return {
    titel: str(o.titel, "der Titel", 120, true)!,
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    niveau: str(o.niveau, "das Niveau", 40),
    einleitung: str(o.einleitung, "die Einleitung", 1500),
    merkkasten: mk ? { titel: str(mk.titel, "der Titel des Merkkastens", 60), text: str(mk.text, "der Text des Merkkastens", 1500, true)! } : undefined,
    aufgaben,
    fuss: str(o.fuss, "der Fußtext", 200),
  };
}


// ---------- Layout ----------

const FS = 10.5;
const ROW = mm(6.5);

/** Height of the parts of a typed task, drawn in `drawBody`. Both use the same measures, so nothing is cut off. */
function bodyHeight(sheet: Sheet, k: Koerper, w: number): number {
  if (k.art === "zuordnung") {
    const colW = (w - mm(10)) / 2;
    return k.links.reduce((n, l, i) => n + Math.max(sheet.height(l, SANS, FS, colW - mm(11)), sheet.height(k.rechts[i]!, SANS, FS, colW), ROW) + mm(2), 0);
  }
  if (k.art === "luecken") {
    return k.saetze.reduce((n, t) => n + sheet.height(t, SANS, FS, w) + mm(3.5), 0) + (k.wortliste ? sheet.height(k.wortliste, SANS_BOLD, 10, w - mm(8)) + mm(8) : 0);
  }
  if (k.art === "auswahl") return k.optionen.reduce((n, o) => n + sheet.height(o, SANS, FS, w - mm(4)) + mm(1.5), 0);
  const colW = w / k.spalten.length;
  return mm(7) + k.zeilen.reduce((n, r) => n + Math.max(...r.map((c) => sheet.height(c || " ", SANS, 10, colW - mm(4))), mm(5)) + mm(4.5), 0);
}

function drawBody(sheet: Sheet, k: Koerper, x: number, y0: number, w: number): void {
  const { doc } = sheet;
  let y = y0;
  if (k.art === "zuordnung") {
    const gap = mm(10);
    const colW = (w - gap) / 2;
    for (const [i, l] of k.links.entries()) {
      const hl = sheet.height(l, SANS, FS, colW - mm(11));
      const hr = sheet.height(k.rechts[i]!, SANS, FS, colW);
      const h = Math.max(hl, hr, ROW);
      doc.font(SANS).fontSize(FS).fillColor(INK).text(printable(l), x, y + 1, { width: colW - mm(11), lineGap: 2.5 });
      doc.save().moveTo(x + colW - mm(8), y + h - 1).lineTo(x + colW, y + h - 1).lineWidth(0.8).strokeColor(LINE).stroke().restore();
      doc.font(SANS).fontSize(FS).fillColor(INK).text(printable(k.rechts[i]!), x + colW + gap, y + 1, { width: colW, lineGap: 2.5 });
      y += h + mm(2);
    }
  } else if (k.art === "luecken") {
    for (const t of k.saetze) {
      const h = sheet.height(t, SANS, FS, w);
      doc.font(SANS).fontSize(FS).fillColor(INK).text(printable(t), x, y, { width: w, lineGap: 2.5 });
      y += h + mm(3.5);
    }
    if (k.wortliste) {
      const h = sheet.height(k.wortliste, SANS_BOLD, 10, w - mm(8)) + mm(5);
      doc.save().roundedRect(x, y, w, h, 4).lineWidth(0.8).strokeColor(LINE).stroke().restore();
      doc.font(SANS_BOLD).fontSize(10).fillColor(INK).text(printable(k.wortliste), x + mm(4), y + mm(2.5), { width: w - mm(8), lineGap: 2.5 });
    }
  } else if (k.art === "auswahl") {
    for (const o of k.optionen) {
      const h = sheet.height(o, SANS, FS, w - mm(4));
      doc.font(SANS).fontSize(FS).fillColor(INK).text(printable(o), x + mm(4), y, { width: w - mm(4), lineGap: 2.5 });
      y += h + mm(1.5);
    }
  } else {
    const colW = w / k.spalten.length;
    doc.save().rect(x, y, w, mm(7)).fill(BOX).restore();
    for (const [c, name] of k.spalten.entries()) doc.font(SANS_BOLD).fontSize(9).fillColor(INK).text(printable(name), x + c * colW + mm(2), y + mm(2), { width: colW - mm(4), lineBreak: false });
    y += mm(7);
    for (const row of k.zeilen) {
      const h = Math.max(...row.map((c) => sheet.height(c || " ", SANS, 10, colW - mm(4))), mm(5)) + mm(4.5);
      for (const [c, cell] of row.entries()) doc.font(SANS).fontSize(10).fillColor(INK).text(printable(cell), x + c * colW + mm(2), y + mm(2), { width: colW - mm(4), lineGap: 2 });
      doc.save().moveTo(x, y + h).lineTo(x + w, y + h).lineWidth(0.6).strokeColor(LINE).stroke().restore();
      y += h;
    }
    doc.save().lineWidth(0.6).strokeColor(LINE);
    for (let c = 1; c < k.spalten.length; c++) doc.moveTo(x + c * colW, y0 + mm(7)).lineTo(x + c * colW, y).stroke();
    doc.restore();
  }
}

/** True when at least one task has an expected answer, so a teacher's copy makes sense. */
export const hasLoesungen = (a: Arbeitsblatt) => a.aufgaben.some((_, i) => loesungText(a, i));

/** `lehrerexemplar` draws the expected answers instead of the writing lines, and no fields for the name. */
export async function renderArbeitsblatt(a: Arbeitsblatt, opts: { lehrerexemplar?: boolean } = {}): Promise<{ pdf: Buffer; pages: number }> {
  const key = opts.lehrerexemplar === true;
  const sheet = newSheet(key ? `${a.titel} (Lösung)` : a.titel);
  const { doc, left, width } = sheet;

  sheet.header({
    kicker: [a.fach, a.klasse, a.niveau, key ? "Lösung für die Lehrkraft" : undefined].filter(Boolean).join(" · "),
    title: a.titel,
    fields: key ? undefined : ["Name:", "Datum:"],
  });
  if (a.einleitung) sheet.paragraph(a.einleitung);
  if (a.merkkasten) sheet.box({ title: a.merkkasten.titel, text: a.merkkasten.text });

  const numW = mm(7.5);
  const textX = left + numW + mm(4);
  const textW = width - numW - mm(4);
  const lineH = mm(8.5);
  for (const [i, t] of a.aufgaben.entries()) {
    const punkteW = t.punkte ? 44 : 0;
    const textH = sheet.height(t.text, SANS, 10.5, textW - punkteW);
    const hilfeH = t.hilfe ? sheet.height(`Tipp: ${t.hilfe}`, SANS_ITALIC, 9.5, textW) + 4 : 0;
    const body = koerper(a, i);
    const bodyH = body ? bodyHeight(sheet, body, textW) + mm(2) : 0;
    const answer = key ? (loesungText(a, i) ?? "—") : undefined;
    const answerH = answer ? sheet.height(answer, SANS, 10, textW - mm(8)) + mm(5) : 0;
    const linesH = key ? answerH : t.zeilen ? t.zeilen * lineH + mm(2) : 0;
    const h = Math.max(numW, textH + hilfeH + bodyH + linesH);
    sheet.room(h + mm(5));
    const y = sheet.y;
    doc.save().roundedRect(left, y, numW, numW, mm(1.8)).fill(INK).restore();
    doc.font(SANS_BOLD).fontSize(10).fillColor("#ffffff").text(String(i + 1), left, y + numW / 2 - 5.5, { width: numW, align: "center", lineBreak: false });
    doc.font(SANS).fontSize(10.5).fillColor(INK).text(printable(t.text), textX, y + 2, { width: textW - punkteW, lineGap: 2.5 });
    if (t.punkte) {
      const label = `${t.punkte} P.`;
      const px = left + width - 40;
      doc.save().roundedRect(px, y + 1, 40, 15, 7.5).lineWidth(0.8).strokeColor(LINE).stroke().restore();
      doc.font(SANS).fontSize(8.5).fillColor(SOFT).text(label, px, y + 5, { width: 40, align: "center", lineBreak: false });
    }
    let by = y + 2 + textH + 2;
    if (t.hilfe) {
      doc.font(SANS_BOLD_ITALIC).fontSize(9.5).fillColor(SOFT).text("Tipp: ", textX, by, { continued: true, width: textW, lineGap: 2.5 });
      doc.font(SANS_ITALIC).text(printable(t.hilfe));
      by += hilfeH - 2;
    }
    if (body) {
      by += mm(1.5);
      drawBody(sheet, body, textX, by, textW);
      by += bodyH - mm(1.5);
    }
    if (answer) {
      by += mm(1.5);
      doc.save().rect(textX, by, textW, answerH).fill(BOX).restore();
      doc.save().rect(textX, by, 3, answerH).fill(INK).restore();
      doc.font(SANS).fontSize(10).fillColor(INK).text(printable(answer), textX + mm(5), by + mm(2.5), { width: textW - mm(8), lineGap: 2 });
    } else if (t.zeilen) {
      by += mm(2);
      for (let n = 1; n <= t.zeilen; n++) {
        const ly = by + n * lineH - 2;
        doc.save().moveTo(textX, ly).lineTo(left + width, ly).lineWidth(0.7).strokeColor(LINE).stroke().restore();
      }
    }
    sheet.y = y + h + mm(5);
  }

  return sheet.finish(a.fuss);
}

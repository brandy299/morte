/**
 * Worksheet: the model delivers structured content, this file turns it into a fixed layout.
 * The look lives in layout.ts (shared by all material), so it does not depend on how good the chosen model is.
 */
import { INK, LINE, MaterialError, SANS, SANS_BOLD, SANS_BOLD_ITALIC, SANS_ITALIC, SOFT, mm, newSheet, printable, str } from "./layout.ts";

export { MaterialError, printable };

export interface Aufgabe {
  text: string;
  /** A short hint for students, printed below the task. */
  hilfe?: string;
  punkte?: number;
  /** Writing lines below the task. 0 = no lines. */
  zeilen?: number;
}

export interface Arbeitsblatt {
  titel: string;
  fach?: string;
  klasse?: string;
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
    return { text: str(t.text, `Text von Aufgabe ${i + 1}`, 2000, true)!, hilfe: str(t.hilfe, `Hilfe zu Aufgabe ${i + 1}`, 500), punkte, zeilen };
  });
  const mk = o.merkkasten as Record<string, unknown> | undefined;
  return {
    titel: str(o.titel, "der Titel", 120, true)!,
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    einleitung: str(o.einleitung, "die Einleitung", 1500),
    merkkasten: mk ? { titel: str(mk.titel, "der Titel des Merkkastens", 60), text: str(mk.text, "der Text des Merkkastens", 1500, true)! } : undefined,
    aufgaben,
    fuss: str(o.fuss, "der Fußtext", 200),
  };
}


// ---------- Layout ----------

export async function renderArbeitsblatt(a: Arbeitsblatt): Promise<{ pdf: Buffer; pages: number }> {
  const sheet = newSheet(a.titel);
  const { doc, left, width } = sheet;

  sheet.header({ kicker: [a.fach, a.klasse].filter(Boolean).join(" · "), title: a.titel, fields: ["Name:", "Datum:"] });
  if (a.einleitung) sheet.paragraph(a.einleitung);
  if (a.merkkasten) sheet.box({ title: a.merkkasten.titel, text: a.merkkasten.text });

  const numW = mm(9);
  const textX = left + numW + mm(4);
  const textW = width - numW - mm(4);
  const lineH = mm(8.5);
  for (const [i, t] of a.aufgaben.entries()) {
    const punkteW = t.punkte ? 44 : 0;
    const textH = sheet.height(t.text, SANS, 10.5, textW - punkteW);
    const hilfeH = t.hilfe ? sheet.height(`Tipp: ${t.hilfe}`, SANS_ITALIC, 9.5, textW) + 4 : 0;
    const linesH = t.zeilen ? t.zeilen * lineH + mm(2) : 0;
    const h = Math.max(numW, textH + hilfeH + linesH);
    sheet.room(h + mm(6));
    const y = sheet.y;
    doc.save().roundedRect(left, y, numW, numW, mm(2.2)).fill(INK).restore();
    doc.font(SANS_BOLD).fontSize(11).fillColor("#ffffff").text(String(i + 1), left, y + numW / 2 - 6, { width: numW, align: "center", lineBreak: false });
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
    if (t.zeilen) {
      by += mm(2);
      for (let n = 1; n <= t.zeilen; n++) {
        const ly = by + n * lineH - 2;
        doc.save().moveTo(textX, ly).lineTo(left + width, ly).lineWidth(0.7).strokeColor(LINE).stroke().restore();
      }
    }
    sheet.y = y + h + mm(6);
  }

  return sheet.finish(a.fuss);
}

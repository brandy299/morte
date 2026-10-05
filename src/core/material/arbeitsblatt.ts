/**
 * Worksheet: the model delivers structured content, this file turns it into a fixed layout.
 * The look lives here (and only here), so it does not depend on how good the chosen model is.
 * Everything is black, white and gray on purpose: many schools do not print in color.
 * The PDF is drawn directly (pdfkit), so nothing has to be installed next to the app.
 */
import PDFDocument from "pdfkit";


export class MaterialError extends Error {}

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

const str = (v: unknown, what: string, max: number, required = false): string | undefined => {
  if (v === undefined || v === null || v === "") {
    if (required) throw new MaterialError(`Es fehlt: ${what}.`);
    return undefined;
  }
  if (typeof v !== "string") throw new MaterialError(`${what} muss Text sein.`);
  const t = v.trim();
  if (t.length > max) throw new MaterialError(`${what} ist zu lang (höchstens ${max} Zeichen).`);
  return t || undefined;
};

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

const mm = (v: number) => (v * 72) / 25.4;
const PAGE = { w: 595.28, h: 841.89 };
const M = { top: mm(15), bottom: mm(18), left: mm(16), right: mm(16) };
const INK = "#111111";
const SOFT = "#555555";
const LINE = "#999999";
const BOX = "#ececec";

// pdfkit's built-in fonts (Times, Helvetica) only know Western European text (Windows-1252).
const REPLACE: Record<string, string> = {
  "→": "->", "←": "<-", "↔": "<->", "•": "-", "’": "'", "‘": "'", "‚": ",", "−": "-", "×": "x", "✓": "ok", "✔": "ok", "–": "-", "—": "-", "\u00a0": " ", "\t": " ",
};
const WIN1252_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/** Keeps text printable in the standard fonts. Anything it cannot draw becomes "?" instead of garbage. */
export function printable(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    const ok = c === 0x0a || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN1252_EXTRA.includes(ch);
    // "–" and "—" are fine in Windows-1252 but map them to "-" for a calm look in the tasks.
    out += REPLACE[ch] ?? (ok ? ch : "?");
  }
  return out;
}

const SERIF = "Times-Bold";
const SANS = "Helvetica";
const SANS_BOLD = "Helvetica-Bold";
const SANS_ITALIC = "Helvetica-Oblique";
const SANS_BOLD_ITALIC = "Helvetica-BoldOblique";

export async function renderArbeitsblatt(a: Arbeitsblatt): Promise<{ pdf: Buffer; pages: number }> {
  const doc = new PDFDocument({
    size: "A4",
    margins: M,
    bufferPages: true,
    info: { Title: printable(a.titel), Producer: "morte" },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => doc.on("end", resolve));

  const left = M.left;
  const width = PAGE.w - M.left - M.right;
  const limit = PAGE.h - M.bottom;
  let y = M.top;
  const room = (h: number) => {
    if (y + h > limit) {
      doc.addPage();
      y = M.top;
    }
  };
  const height = (text: string, font: string, size: number, w: number) => {
    doc.font(font).fontSize(size);
    return doc.heightOfString(printable(text), { width: w, lineGap: 2.5 });
  };

  // Header: heavy rule, subject line, title, fields for name and date, thin rule.
  const fieldsW = mm(62);
  const titleW = width - fieldsW - mm(8);
  doc.save().rect(left, y, width, 3).fill(INK).restore();
  y += mm(7);
  const kopf = [a.fach, a.klasse].filter(Boolean).join(" · ");
  const headTop = y;
  if (kopf) {
    doc.font(SANS).fontSize(8).fillColor(SOFT).text(printable(kopf).toUpperCase(), left, y, { width: titleW, characterSpacing: 1.1, lineBreak: false });
    y += 13;
  }
  doc.font(SERIF).fontSize(22).fillColor(INK).text(printable(a.titel), left, y, { width: titleW, lineGap: 1 });
  const titleBottom = doc.y;
  const fx = left + width - fieldsW;
  for (const [i, label] of ["Name:", "Datum:"].entries()) {
    const fy = headTop + 6 + i * mm(9);
    doc.font(SANS).fontSize(9).fillColor(SOFT).text(label, fx, fy, { lineBreak: false });
    doc.save().moveTo(fx, fy + 14).lineTo(fx + fieldsW, fy + 14).lineWidth(0.8).strokeColor("#777777").stroke().restore();
  }
  y = Math.max(titleBottom, headTop + 6 + mm(9) + 16) + mm(5);
  doc.save().moveTo(left, y).lineTo(left + width, y).lineWidth(1).strokeColor(INK).stroke().restore();
  y += mm(7);

  if (a.einleitung) {
    const h = height(a.einleitung, SANS, 11, width);
    room(h);
    doc.font(SANS).fontSize(11).fillColor(INK).text(printable(a.einleitung), left, y, { width, lineGap: 2.5 });
    y += h + mm(6);
  }

  if (a.merkkasten) {
    const pad = mm(4);
    const inner = width - 2 * pad - 4;
    const titleH = a.merkkasten.titel ? height(a.merkkasten.titel, SERIF, 11, inner) + 4 : 0;
    const textH = height(a.merkkasten.text, SANS, 10.5, inner);
    const h = titleH + textH + 2 * pad;
    room(h);
    doc.save().rect(left, y, width, h).fill(BOX).rect(left, y, 4, h).fill(INK).restore();
    let ty = y + pad;
    if (a.merkkasten.titel) {
      doc.font(SERIF).fontSize(11).fillColor(INK).text(printable(a.merkkasten.titel), left + 4 + pad, ty, { width: inner });
      ty += titleH;
    }
    doc.font(SANS).fontSize(10.5).fillColor(INK).text(printable(a.merkkasten.text), left + 4 + pad, ty, { width: inner, lineGap: 2.5 });
    y += h + mm(7);
  }

  const numW = mm(9);
  const textX = left + numW + mm(4);
  const textW = width - numW - mm(4);
  const lineH = mm(8.5);
  for (const [i, t] of a.aufgaben.entries()) {
    const punkteW = t.punkte ? 44 : 0;
    const textH = height(t.text, SANS, 10.5, textW - punkteW);
    const hilfeH = t.hilfe ? height(`Tipp: ${t.hilfe}`, SANS_ITALIC, 9.5, textW) + 4 : 0;
    const linesH = t.zeilen ? t.zeilen * lineH + mm(2) : 0;
    const h = Math.max(numW, textH + hilfeH + linesH);
    room(h + mm(6));
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
    y += h + mm(6);
  }

  // Footer on every page: small note left, page number right. Margins are lifted so pdfkit does not add a page.
  const count = doc.bufferedPageRange().count;
  for (let p = 0; p < count; p++) {
    doc.switchToPage(p);
    doc.page.margins.bottom = 0;
    const fy = PAGE.h - mm(12);
    doc.font(SANS).fontSize(8).fillColor(SOFT);
    if (a.fuss) doc.text(printable(a.fuss), left, fy, { width: width / 2, lineBreak: false });
    doc.text(`morte - Seite ${p + 1} von ${count}`, left + width / 2, fy, { width: width / 2, align: "right", lineBreak: false });
  }

  doc.end();
  await done;
  return { pdf: Buffer.concat(chunks), pages: count };
}

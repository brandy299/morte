/**
 * Shared look of all Pult material: page, header, footer, fonts, tables.
 * Every material type (worksheet, exam, answer key) draws through this file, so they look like one family.
 * Everything is black, white and gray on purpose: many schools do not print in color.
 * The PDF is drawn directly (pdfkit), so nothing has to be installed next to the app.
 */
import PDFDocument from "pdfkit";

export class MaterialError extends Error {}

/** Checks a text value from the model before anything is drawn. */
export const str = (v: unknown, what: string, max: number, required = false): string | undefined => {
  if (v === undefined || v === null || v === "") {
    if (required) throw new MaterialError(`Es fehlt: ${what}.`);
    return undefined;
  }
  if (typeof v !== "string") throw new MaterialError(`${what} muss Text sein.`);
  const t = v.trim();
  if (t.length > max) throw new MaterialError(`${what} ist zu lang (höchstens ${max} Zeichen).`);
  return t || undefined;
};

export const mm = (v: number) => (v * 72) / 25.4;
export const PAGE = { w: 595.28, h: 841.89 };
export const M = { top: mm(15), bottom: mm(18), left: mm(16), right: mm(16) };
export const INK = "#111111";
export const SOFT = "#555555";
export const LINE = "#999999";
export const BOX = "#ececec";

export const SERIF = "Times-Bold";
export const SANS = "Helvetica";
export const SANS_BOLD = "Helvetica-Bold";
export const SANS_ITALIC = "Helvetica-Oblique";
export const SANS_BOLD_ITALIC = "Helvetica-BoldOblique";

// pdfkit's built-in fonts (Times, Helvetica) only know Western European text (Windows-1252).
const REPLACE: Record<string, string> = {
  "→": "->", "←": "<-", "↔": "<->", "•": "-", "’": "'", "‘": "'", "‚": ",", "−": "-", "×": "x", "✓": "ok", "✔": "ok", "–": "-", "—": "-", " ": " ", "\t": " ",
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

/** Number with a German decimal comma, without trailing zeros: 2.5 -> "2,5". */
/** The Pult mark (small cut), drawn as a vector in the footer. Source: design/logo/pult-zeichen-klein.svg */
const MARK = {
  d: "M41.76 12.64 L214.24 58.86 L214.24 86.56 A85.12 85.12 0 0 1 129.12 171.68 L91.04 171.68 L91.04 236.64 L41.76 236.64 Z M91.04 76.86 L91.04 122.4 L129.12 122.4 A35.84 35.84 0 0 0 164.96 86.56 L164.96 96.67 Z",
  x: 41.76,
  y: 12.64,
  w: 172.48,
  h: 224,
};

export const num = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export interface Sheet {
  doc: PDFKit.PDFDocument;
  left: number;
  width: number;
  /** Current vertical position. Drawing code moves it down. */
  y: number;
  /** Starts a new page when `h` does not fit anymore. */
  room(h: number): void;
  height(text: string, font: string, size: number, w: number): number;
  /** Draws the page header: heavy rule, small kicker line, title, optional write-in fields, thin rule. */
  header(opts: { kicker?: string; title: string; fields?: string[] }): void;
  /** Writes a text block at the current position and moves down. Splits nothing, call `room` first. */
  paragraph(text: string, opts?: { font?: string; size?: number; color?: string; width?: number; x?: number; gap?: number }): void;
  /** A gray box with a heavy left edge and an optional title. */
  box(opts: { title?: string; text: string }): void;
  /** Footer on every page, then ends the document. */
  finish(note?: string): Promise<{ pdf: Buffer; pages: number }>;
}

export function newSheet(title: string): Sheet {
  const doc = new PDFDocument({ size: "A4", margins: M, bufferPages: true, info: { Title: printable(title), Producer: "Pult" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => doc.on("end", resolve));
  const left = M.left;
  const width = PAGE.w - M.left - M.right;
  const limit = PAGE.h - M.bottom;

  const sheet: Sheet = {
    doc,
    left,
    width,
    y: M.top,
    room(h) {
      if (sheet.y + h > limit) {
        doc.addPage();
        sheet.y = M.top;
      }
    },
    height(text, font, size, w) {
      doc.font(font).fontSize(size);
      return doc.heightOfString(printable(text), { width: w, lineGap: 2.5 });
    },
    header({ kicker, title: heading, fields = [] }) {
      const fieldsW = fields.length ? mm(62) : 0;
      const titleW = width - fieldsW - (fields.length ? mm(8) : 0);
      doc.save().rect(left, sheet.y, width, 3).fill(INK).restore();
      sheet.y += mm(7);
      const headTop = sheet.y;
      if (kicker) {
        doc.font(SANS).fontSize(8).fillColor(SOFT).text(printable(kicker).toUpperCase(), left, sheet.y, { width: titleW, characterSpacing: 1.1, lineBreak: false });
        sheet.y += 13;
      }
      doc.font(SERIF).fontSize(22).fillColor(INK).text(printable(heading), left, sheet.y, { width: titleW, lineGap: 1 });
      const titleBottom = doc.y;
      const fx = left + width - fieldsW;
      for (const [i, label] of fields.entries()) {
        const fy = headTop + 6 + i * mm(9);
        doc.font(SANS).fontSize(9).fillColor(SOFT).text(label, fx, fy, { lineBreak: false });
        doc.save().moveTo(fx, fy + 14).lineTo(fx + fieldsW, fy + 14).lineWidth(0.8).strokeColor("#777777").stroke().restore();
      }
      const fieldsBottom = fields.length ? headTop + 6 + (fields.length - 1) * mm(9) + 16 : 0;
      sheet.y = Math.max(titleBottom, fieldsBottom) + mm(5);
      doc.save().moveTo(left, sheet.y).lineTo(left + width, sheet.y).lineWidth(1).strokeColor(INK).stroke().restore();
      sheet.y += mm(7);
    },
    paragraph(text, o = {}) {
      const font = o.font ?? SANS;
      const size = o.size ?? 11;
      const w = o.width ?? width;
      const h = sheet.height(text, font, size, w);
      sheet.room(h);
      doc.font(font).fontSize(size).fillColor(o.color ?? INK).text(printable(text), o.x ?? left, sheet.y, { width: w, lineGap: 2.5 });
      sheet.y += h + (o.gap ?? mm(6));
    },
    box({ title: boxTitle, text }) {
      const pad = mm(4);
      const inner = width - 2 * pad - 4;
      const titleH = boxTitle ? sheet.height(boxTitle, SERIF, 11, inner) + 4 : 0;
      const textH = sheet.height(text, SANS, 10.5, inner);
      const h = titleH + textH + 2 * pad;
      sheet.room(h);
      doc.save().rect(left, sheet.y, width, h).fill(BOX).rect(left, sheet.y, 4, h).fill(INK).restore();
      let ty = sheet.y + pad;
      if (boxTitle) {
        doc.font(SERIF).fontSize(11).fillColor(INK).text(printable(boxTitle), left + 4 + pad, ty, { width: inner });
        ty += titleH;
      }
      doc.font(SANS).fontSize(10.5).fillColor(INK).text(printable(text), left + 4 + pad, ty, { width: inner, lineGap: 2.5 });
      sheet.y += h + mm(7);
    },
    async finish(note) {
      // Footer on every page: small note left, page number right. Margins are lifted so pdfkit does not add a page.
      const count = doc.bufferedPageRange().count;
      for (let p = 0; p < count; p++) {
        doc.switchToPage(p);
        doc.page.margins.bottom = 0;
        const fy = PAGE.h - mm(12);
        doc.font(SANS).fontSize(8).fillColor(SOFT);
        if (note) doc.text(printable(note), left, fy, { width: width / 2, lineBreak: false });
        const label = `Pult - Seite ${p + 1} von ${count}`;
        doc.text(label, left + width / 2, fy, { width: width / 2, align: "right", lineBreak: false });
        const s = 8.5 / MARK.h;
        const mx = left + width - doc.widthOfString(label) - 4 - MARK.w * s;
        doc.save().translate(mx - MARK.x * s, fy - 1 - MARK.y * s).scale(s).path(MARK.d).fill(SOFT, "even-odd").restore();
      }
      doc.end();
      await done;
      return { pdf: Buffer.concat(chunks), pages: count };
    },
  };
  return sheet;
}

export interface Column {
  title: string;
  /** Share of the table width. All columns together should add up to 1. */
  share: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
}

/**
 * Draws a table with a gray header row and thin rules. Rows never split across pages,
 * and the header row repeats on the next page.
 */
export function table(sheet: Sheet, columns: Column[], rows: string[][], opts: { size?: number } = {}): void {
  const { doc, left, width } = sheet;
  const size = opts.size ?? 9.5;
  const pad = 5;
  const xs: number[] = [];
  const ws = columns.map((c) => width * c.share);
  ws.reduce((x, w) => (xs.push(x), x + w), left);

  const drawHeader = () => {
    const h = 20;
    sheet.room(h + 24);
    doc.save().rect(left, sheet.y, width, h).fill(BOX).restore();
    for (const [i, c] of columns.entries()) {
      doc.font(SANS_BOLD).fontSize(8.5).fillColor(INK).text(printable(c.title), xs[i]! + pad, sheet.y + 6, { width: ws[i]! - 2 * pad, align: c.align ?? "left", lineBreak: false });
    }
    doc.save().moveTo(left, sheet.y + h).lineTo(left + width, sheet.y + h).lineWidth(1).strokeColor(INK).stroke().restore();
    sheet.y += h;
  };

  drawHeader();
  for (const row of rows) {
    const heights = row.map((cell, i) => sheet.height(cell, columns[i]!.bold ? SANS_BOLD : SANS, size, ws[i]! - 2 * pad));
    const h = Math.max(...heights) + 10;
    if (sheet.y + h > PAGE.h - M.bottom) {
      sheet.doc.addPage();
      sheet.y = M.top;
      drawHeader();
    }
    for (const [i, cell] of row.entries()) {
      doc.font(columns[i]!.bold ? SANS_BOLD : SANS).fontSize(size).fillColor(INK).text(printable(cell), xs[i]! + pad, sheet.y + 5, { width: ws[i]! - 2 * pad, align: columns[i]!.align ?? "left", lineGap: 2.5 });
    }
    doc.save().moveTo(left, sheet.y + h).lineTo(left + width, sheet.y + h).lineWidth(0.5).strokeColor(LINE).stroke().restore();
    sheet.y += h;
  }
  sheet.y += mm(6);
}

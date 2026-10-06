/**
 * Shared look of all Pult material: page, header, footer, fonts, tables.
 * Every material type (worksheet, exam, answer key) draws through this file, so they look like one family.
 * Everything is black, white and gray on purpose: many schools do not print in color.
 * The PDF is drawn directly (pdfkit), so nothing has to be installed next to the app.
 */
import { fileURLToPath } from "node:url";
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

// Fonts are bundled with the app (assets/fonts, SIL Open Font License), nothing is installed on the computer.
// Display = Fraunces (titles, Latin letters only). Sans = Source Sans 3 (body text, wide coverage: Latin, Greek, Cyrillic, math signs).
export const SERIF = "Display";
export const SANS = "Sans";
export const SANS_BOLD = "Sans-Bold";
export const SANS_SEMIBOLD = "Sans-Semibold";
export const SANS_ITALIC = "Sans-Italic";
export const SANS_BOLD_ITALIC = "Sans-BoldItalic";

const FONT_DIR = fileURLToPath(new URL("../../../assets/fonts/", import.meta.url));
const FONT_FILES: Record<string, string> = {
  [SERIF]: "Fraunces_600SemiBold.ttf",
  [SANS]: "SourceSans3_400Regular.ttf",
  [SANS_SEMIBOLD]: "SourceSans3_600SemiBold.ttf",
  [SANS_BOLD]: "SourceSans3_700Bold.ttf",
  [SANS_ITALIC]: "SourceSans3_400Regular_Italic.ttf",
  [SANS_BOLD_ITALIC]: "SourceSans3_700Bold_Italic.ttf",
};

/** Font name -> file, for drawing code that does not use pdfkit (pictures for Word files). */
export const fontFile = (name: string) => FONT_DIR + FONT_FILES[name]!;
export const FONT_NAMES = Object.keys(FONT_FILES);

let scratch: PDFKit.PDFDocument | undefined;
/** Width of a single line of text in points, measured with the real font. For laying out drawings. */
export function textWidth(text: string, font: string, size: number): number {
  if (!scratch) {
    scratch = new PDFDocument();
    registerFonts(scratch);
  }
  return scratch.font(font).fontSize(size).widthOfString(printable(text));
}

function registerFonts(doc: PDFKit.PDFDocument) {
  for (const [name, file] of Object.entries(FONT_FILES)) doc.registerFont(name, FONT_DIR + file);
}

/** Which characters a font can draw. Read from the font file once. */
type Covers = (codePoint: number) => boolean;
let coverage: { sans: Covers; display: Covers } | undefined;

function fontCoverage(): NonNullable<typeof coverage> {
  if (!coverage) {
    const doc = new PDFDocument();
    registerFonts(doc);
    const of = (name: string): Covers => {
      doc.font(name);
      // pdfkit keeps the parsed font file on its current font object.
      const font = (doc as unknown as { _font: { font: { hasGlyphForCodePoint(cp: number): boolean } } })._font.font;
      return (cp) => font.hasGlyphForCodePoint(cp);
    };
    coverage = { sans: of(SANS), display: of(SERIF) };
  }
  return coverage;
}

/** Characters that only disturb the layout. */
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff\ufe0f]/g;

/**
 * Prepares model text for drawing: normal spaces, no invisible characters,
 * and "?" for anything the body font cannot draw (for example emoji), instead of an empty box.
 */
export function printable(text: string): string {
  const { sans } = fontCoverage();
  let out = "";
  for (const ch of text.normalize("NFC").replace(INVISIBLE, "").replace(/[\u00a0\u2007\u202f\t]/g, " ")) {
    const cp = ch.codePointAt(0)!;
    out += cp === 0x0a || sans(cp) ? ch : "?";
  }
  return out;
}

/** The title font when it can draw every character of `text`, otherwise bold body font (titles in Greek or Cyrillic). */
export function displayFont(text: string): string {
  const { display } = fontCoverage();
  return [...printable(text)].every((ch) => ch === "\n" || display(ch.codePointAt(0)!)) ? SERIF : SANS_BOLD;
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
  registerFonts(doc);
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
      // One quiet line on top: the kicker on the left, the write-in fields (name, date) on the right. Then the title, then a thin rule.
      const slots = fields.map((label) => ({ label, w: /datum/i.test(label) ? mm(32) : mm(54) }));
      const fieldsW = slots.reduce((n, f) => n + f.w + mm(4), 0);
      const rowTop = sheet.y;
      if (kicker) {
        doc.font(SANS).fontSize(7.5).fillColor(SOFT).text(printable(kicker).toUpperCase(), left, rowTop + 4, { width: width - fieldsW - mm(4), characterSpacing: 1.1, lineBreak: false, ellipsis: true });
      }
      let fx = left + width - fieldsW + mm(4);
      for (const f of slots) {
        const label = f.label.replace(/:\s*$/, "");
        doc.font(SANS).fontSize(8.5).fillColor(SOFT).text(label, fx, rowTop + 3, { lineBreak: false });
        const lx = fx + doc.widthOfString(label) + 4;
        doc.save().moveTo(lx, rowTop + 12).lineTo(fx + f.w, rowTop + 12).lineWidth(0.6).strokeColor("#888888").stroke().restore();
        fx += f.w + mm(4);
      }
      sheet.y = rowTop + (kicker || slots.length ? mm(7.5) : 0);
      doc.font(displayFont(heading)).fontSize(19).fillColor(INK).text(printable(heading), left, sheet.y, { width, lineGap: 1 });
      sheet.y = doc.y + mm(3);
      doc.save().moveTo(left, sheet.y).lineTo(left + width, sheet.y).lineWidth(0.7).strokeColor(INK).stroke().restore();
      sheet.y += mm(6);
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
      const pad = mm(3.2);
      const inner = width - 2 * pad - 4;
      const titleH = boxTitle ? sheet.height(boxTitle, displayFont(boxTitle), 11, inner) + 4 : 0;
      const textH = sheet.height(text, SANS, 10.5, inner);
      const h = titleH + textH + 2 * pad;
      sheet.room(h);
      doc.save().rect(left, sheet.y, width, h).fill(BOX).rect(left, sheet.y, 4, h).fill(INK).restore();
      let ty = sheet.y + pad;
      if (boxTitle) {
        doc.font(displayFont(boxTitle)).fontSize(11).fillColor(INK).text(printable(boxTitle), left + 4 + pad, ty, { width: inner });
        ty += titleH;
      }
      doc.font(SANS).fontSize(10.5).fillColor(INK).text(printable(text), left + 4 + pad, ty, { width: inner, lineGap: 2.5 });
      sheet.y += h + mm(6);
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
        const label = `Pult · Seite ${p + 1} von ${count}`;
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

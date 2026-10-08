/**
 * Shared look of all Pult material: page, header, footer, fonts, tables.
 * Every material type (worksheet, exam, answer key) draws through this file, so they look like one family.
 * Everything is black, white and gray on purpose: many schools do not print in color.
 * The PDF is drawn directly (pdfkit), so nothing has to be installed next to the app.
 */
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { schulkopf, type Schulkopf } from "../schule/index.ts";
import SVGtoPDF from "svg-to-pdfkit";
import { FORMEL_SCHRIFT, formelSvg, setFormelSchrift } from "./formel.ts";
import { klartext, setzeSatz, type Maße, type SatzOptionen } from "./formel-satz.ts";

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

// Text inside formulas is measured in the body font, the same as it is drawn.
setFormelSchrift((t) => textWidth(t, SANS, 1));

export function registerFonts(doc: PDFKit.PDFDocument) {
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

/** Room for the school head: the logo fits into this box, whatever its shape. */
export const SCHOOL_LOGO_BOX = { w: mm(44), h: mm(13) };
const SCHOOL_GAP = mm(3.5);

/** Size of a logo in points when it is fitted into the box (never larger than the box, never distorted). */
export function logoSize(w: number, h: number): { w: number; h: number } {
  const scale = Math.min(SCHOOL_LOGO_BOX.w / w, SCHOOL_LOGO_BOX.h / h);
  return { w: w * scale, h: h * scale };
}

/**
 * Draws the school head at the current position: logo on the left, the name next to it, a thin rule below.
 * Returns how far the drawing moved down, so the title and the kicker line below it never overlap.
 */
function schoolHead(sheet: Sheet, school: Schulkopf): number {
  const { doc, left, width } = sheet;
  const logo = school.logo ? logoSize(school.logo.width, school.logo.height) : undefined;
  const nameX = left + (logo ? logo.w + mm(4) : 0);
  const nameW = width - (nameX - left);
  let name: { text: string; size: number; h: number } | undefined;
  if (school.name) {
    // Two lines at most. A long name gets smaller, and as a last resort ends with "…".
    const text = printable(school.name);
    for (const size of [11, 9.5, 8.5]) {
      doc.font(SANS_SEMIBOLD).fontSize(size);
      const h = doc.heightOfString(text, { width: nameW, lineGap: 1 });
      const oneLine = doc.currentLineHeight(true) + 1;
      name = { text, size, h: Math.min(h, oneLine * 2) };
      if (h <= oneLine * 2 + 0.01) break;
    }
  }
  const rowH = Math.max(logo?.h ?? 0, name?.h ?? 0);
  const top = sheet.y;
  if (logo && school.logo) doc.image(school.logo.png, left, top + (rowH - logo.h) / 2, { width: logo.w, height: logo.h });
  if (name) {
    doc.font(SANS_SEMIBOLD).fontSize(name.size).fillColor(INK).text(name.text, nameX, top + (rowH - name.h) / 2, { width: nameW, height: name.h, lineGap: 1, ellipsis: true });
  }
  const ruleY = top + rowH + SCHOOL_GAP / 2;
  doc.save().moveTo(left, ruleY).lineTo(left + width, ruleY).lineWidth(0.5).strokeColor(LINE).stroke().restore();
  return rowH + SCHOOL_GAP + mm(1);
}

export interface Lead { text: string; font: string }
export interface TextOptions {
  font?: string;
  size?: number;
  color?: string;
  width?: number;
  lineGap?: number;
  align?: "left" | "center" | "right";
  lead?: Lead;
}

/** Measures text with the real fonts of a document, for the line breaking of text with formulas. */
function measures(doc: PDFKit.PDFDocument): Maße {
  const fontOf = (name: string) => (doc.font(name) as unknown as { _font: { ascender: number } })._font;
  return {
    breite: (t, f, s) => doc.font(f).fontSize(s).widthOfString(t),
    ascent: (f, s) => (fontOf(f).ascender / 1000) * s,
    zeile: (f, s) => doc.font(f).fontSize(s).currentLineHeight(true),
  };
}

/** Sets the text with formulas, or `undefined` when the text has none. */
function formulaBlock(doc: PDFKit.PDFDocument, text: string, o: SatzOptionen) {
  return setzeSatz(text, { ...o, clean: printable }, measures(doc));
}

export interface Sheet {
  doc: PDFKit.PDFDocument;
  left: number;
  width: number;
  /** Current vertical position. Drawing code moves it down. */
  y: number;
  /** Starts a new page when `h` does not fit anymore. */
  room(h: number): void;
  /** Height of a text block as `text` draws it, with formulas. `lead` is a label in front, as for `text`. */
  height(text: string, font: string, size: number, w: number, o?: { lineGap?: number; lead?: Lead }): number;
  /**
   * Draws a text block at x, y and returns its height. Formulas (`\\( \\)`, `$ $`, `\\[ \\]`) are set as formulas, everything else
   * goes through pdfkit as before. Splits nothing, call `room` first.
   */
  text(text: string, x: number, y: number, o?: TextOptions): number;
  /** Draws the page header: heavy rule, small kicker line, title, optional write-in fields, thin rule. */
  header(opts: { kicker?: string; title: string; fields?: string[] }): void;
  /** Writes a text block at the current position and moves down. Breaks to the next page between paragraphs (blank lines). */
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
    height(text, font, size, w, o = {}) {
      const lineGap = o.lineGap ?? 2.5;
      const rich = formulaBlock(doc, text, { font, size, width: w, lineGap, lead: o.lead });
      if (rich) return rich.hoehe;
      doc.font(font).fontSize(size);
      return doc.heightOfString(printable(o.lead ? `${o.lead.text} ${klartext(text)}` : klartext(text)!), { width: w, lineGap });
    },
    text(text, x, y, o = {}) {
      const font = o.font ?? SANS;
      const size = o.size ?? 11;
      const color = o.color ?? INK;
      const w = o.width ?? width;
      const lineGap = o.lineGap ?? 2.5;
      const rich = formulaBlock(doc, text, { font, size, width: w, lineGap, align: o.align, lead: o.lead });
      if (!rich) {
        const plain = klartext(text)!;
        if (o.lead) {
          // The label and the text continue on the same line, each in its own font.
          doc.font(o.lead.font).fontSize(size).fillColor(color).text(`${o.lead.text} `, x, y, { continued: true, width: w, lineGap });
          doc.font(font).text(printable(plain), { align: o.align });
        } else doc.font(font).fontSize(size).fillColor(color).text(printable(plain), x, y, { width: w, lineGap, align: o.align });
        return sheet.height(text, font, size, w, { lineGap, lead: o.lead });
      }
      for (const op of rich.ops) {
        if (op.t === "text") doc.font(op.font).fontSize(size).fillColor(color).text(op.text, x + op.x, y + op.y, { lineBreak: false });
        // Letters that MathJax has no shape for (umlauts, euro) come as text in the family "serif": they are drawn in the body font.
        else SVGtoPDF(doc, formelSvg(op.g, op.size), x + op.x, y + op.y, { assumePt: true, fontCallback: (family) => (family === FORMEL_SCHRIFT ? SANS : SANS) });
      }
      return rich.hoehe;
    },
    header({ kicker, title: heading, fields = [] }) {
      const school = schulkopf();
      if (school) sheet.y += schoolHead(sheet, school);
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
      // Each paragraph finds its own room, so a long text continues on the next page instead of leaving
      // the current one empty. A paragraph taller than a whole page is split at its lines, without extra space.
      const paras = text.split(/\n\s*\n/).filter((p) => p.trim());
      const parts = paras.flatMap((p, i) => {
        const after = i === paras.length - 1 ? (o.gap ?? mm(6)) : mm(3);
        if (sheet.height(p, font, size, w) <= limit - M.top) return [{ text: p, after }];
        const lines = p.split("\n");
        return lines.map((l, j) => ({ text: l, after: j === lines.length - 1 ? after : 2.5 }));
      });
      for (const part of parts) {
        const h = sheet.height(part.text, font, size, w);
        sheet.room(h);
        sheet.text(part.text, o.x ?? left, sheet.y, { font, size, color: o.color, width: w });
        sheet.y += h + part.after;
      }
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
      sheet.text(text, left + 4 + pad, ty, { size: 10.5, width: inner });
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
      sheet.text(cell, xs[i]! + pad, sheet.y + 5, { font: columns[i]!.bold ? SANS_BOLD : SANS, size, width: ws[i]! - 2 * pad, align: columns[i]!.align ?? "left" });
    }
    doc.save().moveTo(left, sheet.y + h).lineTo(left + width, sheet.y + h).lineWidth(0.5).strokeColor(LINE).stroke().restore();
    sheet.y += h;
  }
  sheet.y += mm(6);
}

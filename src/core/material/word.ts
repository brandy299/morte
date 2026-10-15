/**
 * Building blocks for Word files (.docx). The same idea as layout.ts for PDFs: the content comes from the model,
 * the look is fixed here. Gray only, so it prints well, and every part stays editable in Word.
 * The fonts are ones every Word has (Georgia for headings, Calibri for text), so nothing needs to be embedded.
 */
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeightRule, ImageRun, LeaderType, LineRuleType, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TabStopType, TextRun, VerticalAlign, WidthType,
  type IParagraphOptions, type ParagraphChild,
} from "docx";
import type { Koerper } from "./aufgabentypen.ts";
import { formelTeile, mightHaveFormula, setzeFormel, type Gesetzt } from "./formel.ts";
import { anzeigeZeilen, MATH_SCALE } from "./formel-satz.ts";
import { szeneVon } from "./schaubild.ts";
import { formelAlsPng, szeneAlsPng } from "./schaubild-zeichnen.ts";
import { logoSize, printable } from "./layout.ts";
import { schulkopf, type Schulkopf } from "../schule/index.ts";

export const SERIF_W = "Georgia";
export const SANS_W = "Calibri";
const INK = "111111";
const SOFT = "555555";
const LINE = "999999";
const BOX = "EEEEEE";

const twip = (mm: number) => Math.round(mm * 56.7);
export const PAGE_W = twip(210 - 32); // text width between the margins

type Block = Paragraph | Table;

/** Empty line between two gray boxes. Without it, Word draws neighbouring shaded paragraphs as one block. */
const gap = () => new Paragraph({ spacing: { before: 0, after: 80, line: 120 }, children: [new TextRun({ text: "", size: 8 })] });

/** Text as Word wants it: only characters the fonts can show, line breaks as breaks. */
interface RunStyle { font: string; size: number; color?: string; bold?: boolean; italics?: boolean }
const lines = (text: string, run: RunStyle): ParagraphChild[] =>
  printable(text).split(/\r?\n/).map((l, i) => new TextRun({ ...run, text: l, break: i === 0 ? undefined : 1 }));

// ---------- Formulas ----------
// Word gets each formula as a picture (Issue #21): it looks the same in every Word, but cannot be edited there.
// The drawing is the same MathJax setting as in the PDF (formel.ts), only turned into a PNG.

/** Pixels per point of the formula pictures: 600 dpi, sharp in print and at 200 % zoom. */
const FORMEL_DPI = 600 / 72;
/** docx sizes pictures in pixels at 96 dpi. */
const PX = 96 / 72;

/** One set formula as a picture. In a sentence it is lowered by its depth, so it sits on the baseline of the text. */
function formelBild(g: Gesetzt, size: number, tex: string, inSentence: boolean): ImageRun {
  const depth = Math.round(g.tief * size * 2); // half points, the unit Word lowers a run by
  return new ImageRun({
    type: "png",
    data: formelAlsPng(g, size, FORMEL_DPI),
    transformation: { width: g.breite * size * PX, height: (g.hoch + g.tief) * size * PX },
    altText: { name: "Formel", title: "Formel", description: tex },
    // Word reads the lowering in half points. The type of the library wants a unit, but older Word only reads the plain number.
    ...(inSentence && depth > 0 ? { run: { position: String(-depth) as `${number}pt` } } : {}),
  });
}

/** A paragraph's worth of runs, or a formula on its own line. */
type Stueck = { children: ParagraphChild[]; formel: boolean };

/**
 * Text with formulas, cut into pieces: runs for one paragraph, and each formula on its own line as a piece of its own.
 * `width` is the room of the paragraph in twips. A formula in a sentence that is wider than that goes on its own line, as in the PDF.
 * Wrong LaTeX stays raw text. Text without a formula gives one piece with exactly the runs it had before.
 */
function stuecke(text: string, run: RunStyle, width: number): Stueck[] {
  if (!mightHaveFormula(text)) return [{ children: lines(text, run), formel: false }];
  const teile = formelTeile(text);
  if (teile.every((t) => "text" in t)) return [{ children: lines(text, run), formel: false }]; // a dollar sign, no formula: as before
  const size = (run.size / 2) * MATH_SCALE;
  const room = width / 20;
  const out: Stueck[] = [];
  let cur: ParagraphChild[] = [];
  let fresh = true; // nothing written in the current paragraph yet
  const addText = (t: string) =>
    printable(t).split(/\r?\n/).forEach((l, i) => {
      cur.push(new TextRun({ ...run, text: l, break: i === 0 || fresh ? undefined : 1 }));
      fresh = false;
    });
  for (const [i, t] of teile.entries()) {
    if ("text" in t) {
      // Line breaks next to a formula on its own line belong to that line, not to the text.
      let s = t.text;
      if (teile[i - 1] && "tex" in teile[i - 1]! && cur.length === 0) s = s.replace(/^\s+/, "");
      if (teile[i + 1] && "tex" in teile[i + 1]!) s = s.replace(/[ \t]*\r?\n\s*$/, "");
      if (s) addText(s);
      continue;
    }
    const inline = t.anzeige ? undefined : setzeFormel(t.tex, false);
    if (inline && inline.breite * size <= room) {
      cur.push(formelBild(inline, size, t.tex, true));
      fresh = false;
      continue;
    }
    const set = (inline || t.anzeige) && anzeigeZeilen(t.tex, room, run.size / 2, t.anzeige);
    if (!set) {
      addText(t.roh);
      continue;
    }
    if (cur.length) out.push({ children: cur, formel: false });
    out.push({ children: set.flatMap(({ g, scale }, j) => [...(j ? [new TextRun({ text: "", break: 1 })] : []), formelBild(g, size * scale, t.tex, false)]), formel: true });
    cur = [];
    fresh = true;
  }
  if (cur.length || out.length === 0) out.push({ children: cur, formel: false });
  return out;
}

/**
 * Text with formulas as paragraphs. `base` are the options of a text paragraph; a formula on its own line keeps the indent,
 * shading and edge (so a gray box stays one box), but stands centered. `lead` and `tail` go into the first text paragraph (a task number, points).
 */
function absaetze(text: string, run: RunStyle, width: number, base: Omit<IParagraphOptions, "children">, lead: ParagraphChild[] = [], tail: ParagraphChild[] = []): Paragraph[] {
  const parts = stuecke(text, run, width);
  const plain = parts.length === 1 && !parts[0]!.formel && !parts[0]!.children.some((c) => c instanceof ImageRun);
  if (plain) return [new Paragraph({ ...base, children: [...lead, ...parts[0]!.children, ...tail] })];
  if (parts[0]!.formel && (lead.length || tail.length)) parts.unshift({ children: [], formel: false });
  const firstText = parts.findIndex((p) => !p.formel);
  const indent = base.indent as { left?: number; right?: number } | undefined;
  // A line spacing without its rule is read as "exactly" by LibreOffice and cuts the pictures off. Word reads it as "auto" anyway.
  const line = base.spacing?.line === undefined ? {} : { line: base.spacing.line, lineRule: LineRuleType.AUTO };
  return parts.map((p, i) => {
    const last = i === parts.length - 1;
    const before = i === 0 ? base.spacing?.before : p.formel ? 80 : 40;
    const after = last ? (p.formel ? Math.max(base.spacing?.after ?? 0, 80) : base.spacing?.after) : p.formel ? 80 : 0;
    const keepNext = last ? base.keepNext : true;
    if (!p.formel) {
      // Only the first paragraph carries the task number; the ones after it start at the indent, without hanging.
      const own = i === firstText ? {} : { indent: indent && { left: indent.left, right: indent.right } };
      return new Paragraph({ ...base, ...own, spacing: { ...base.spacing, ...line, before, after }, keepNext, children: i === firstText ? [...lead, ...p.children, ...tail] : p.children });
    }
    return new Paragraph({ ...base, spacing: { before, after }, keepNext, tabStops: undefined, alignment: AlignmentType.CENTER, indent: indent && { left: indent.left, right: indent.right }, children: p.children });
  });
}

export interface WordDoc {
  add(...blocks: Block[]): void;
  /** Kicker, title, optional write-in line for name and date. */
  header(opts: { kicker?: string; title: string; fields?: boolean }): void;
  paragraph(text: string, opts?: { size?: number; color?: string; bold?: boolean; italic?: boolean; font?: string; after?: number; indent?: number }): void;
  heading(text: string): void;
  /** Gray box with a heavy left edge and an optional title. */
  box(opts: { title?: string; text: string }): void;
  /** Row of small facts, e.g. "45 Minuten · 14.10.". */
  facts(items: string[]): void;
  /** One numbered task: number, text, optional hint, points, lines or answer. */
  task(opts: { nr: string; text: string; hilfe?: string; punkte?: string; zeilen?: number; antwort?: string; indent?: boolean; koerper?: Koerper; loesungsansicht?: boolean }): void;
  table(columns: { title: string; share: number; bold?: boolean; right?: boolean }[], rows: string[][], opts?: { noHeader?: boolean; minHeight?: number }): void;
  pageBreak(): void;
  build(footnote?: string): Promise<Buffer>;
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;

/** The school head for the header of the first page: logo and name side by side, a thin rule below. Same box for the logo as in the PDF. */
function schoolHeader(school: Schulkopf): Header {
  const logo = school.logo ? logoSize(school.logo.width, school.logo.height) : undefined;
  const px = (pt: number) => Math.round((pt * 96) / 72);
  const cell = (width: number, children: Paragraph[]) =>
    new TableCell({ width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }, margins: { top: 0, bottom: 0, left: 0, right: 80 }, children });
  const logoW = logo ? Math.round(logo.w * 20) + twip(4) : 0;
  const cells: TableCell[] = [];
  if (logo && school.logo) {
    cells.push(cell(logoW, [new Paragraph({ children: [new ImageRun({ type: "png", data: school.logo.png, transformation: { width: px(logo.w), height: px(logo.h) }, altText: { name: "Schullogo", description: "Logo der Schule", title: "Schullogo" } })] })]));
  }
  if (school.name) {
    cells.push(cell(PAGE_W - logoW, [new Paragraph({ children: [new TextRun({ text: printable(school.name), font: SANS_W, size: 22, bold: true, color: INK })] })]));
  }
  return new Header({
    children: [
      new Table({ width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: cells.length === 2 ? [logoW, PAGE_W - logoW] : [PAGE_W], borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER }, rows: [new TableRow({ children: cells })] }),
      new Paragraph({ spacing: { before: 60, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 1 } }, children: [] }),
    ],
  });
}

export function newWord(title: string): WordDoc {
  const children: Block[] = [];
  const doc: WordDoc = {
    add: (...b) => void children.push(...b),
    header({ kicker, title: heading, fields }) {
      const small = (text: string) => new TextRun({ text, font: SANS_W, size: 17, color: SOFT });
      // Kicker on the left, name and date on the right, in one line: the same quiet header as the PDF.
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 60 },
          tabStops: fields
            ? [
                { type: TabStopType.LEFT, position: PAGE_W - twip(92) },
                { type: TabStopType.RIGHT, position: PAGE_W - twip(38), leader: LeaderType.UNDERSCORE },
                { type: TabStopType.LEFT, position: PAGE_W - twip(34) },
                { type: TabStopType.RIGHT, position: PAGE_W, leader: LeaderType.UNDERSCORE },
              ]
            : [],
          children: [
            new TextRun({ text: printable(kicker ?? "").toUpperCase(), font: SANS_W, size: 15, color: SOFT, characterSpacing: 30 }),
            ...(fields ? [small("\tName"), small("\t"), small("\tDatum"), small("\t")] : []),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 6 } },
          children: [new TextRun({ text: printable(heading), font: SERIF_W, size: 38, bold: true, color: INK })],
        }),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
      );
    },
    paragraph(text, o = {}) {
      children.push(
        ...absaetze(text, { font: o.font ?? SANS_W, size: Math.round((o.size ?? 10.5) * 2), color: o.color ?? INK, bold: o.bold, italics: o.italic }, PAGE_W - (o.indent ?? 0), {
          spacing: { after: o.after ?? 120, line: 276 },
          indent: o.indent ? { left: o.indent } : undefined,
        }),
      );
    },
    heading(text) {
      children.push(new Paragraph({ spacing: { before: 200, after: 100 }, keepNext: true, children: [new TextRun({ text: printable(text), font: SERIF_W, size: 26, bold: true, color: INK })] }));
    },
    box({ title: boxTitle, text }) {
      const shade = { type: ShadingType.CLEAR, fill: BOX, color: "auto" } as const;
      const edge = { left: { style: BorderStyle.SINGLE, size: 24, color: INK, space: 8 } };
      if (boxTitle) {
        children.push(new Paragraph({ shading: shade, border: edge, keepNext: true, spacing: { before: 60, after: 0 }, indent: { left: 160, right: 80 }, children: [new TextRun({ text: printable(boxTitle), font: SERIF_W, size: 22, bold: true, color: INK })] }));
      }
      const parts = text.split(/\n/);
      parts.forEach((part, i) =>
        children.push(
          ...absaetze(part, { font: SANS_W, size: 21, color: INK }, PAGE_W - 240, {
            shading: shade,
            border: edge,
            spacing: { before: i === 0 && !boxTitle ? 60 : 0, after: i === parts.length - 1 ? 40 : 0, line: 276 },
            indent: { left: 160, right: 80 },
          }),
        ),
      );
      children.push(gap());
    },
    facts(items) {
      if (items.length) doc.paragraph(items.join("   ·   "), { color: SOFT, after: 160 });
    },
    task({ nr, text, hilfe, punkte, zeilen = 0, antwort, indent, koerper, loesungsansicht }) {
      const left = twip(11);
      const tabs = [{ type: TabStopType.LEFT, position: left }, { type: TabStopType.RIGHT, position: PAGE_W }];
      children.push(
        ...absaetze(
          text,
          { font: SANS_W, size: 21, color: INK },
          PAGE_W - left,
          { keepNext: Boolean(hilfe || zeilen || antwort || koerper), spacing: { before: indent ? 40 : 160, after: 60, line: 276 }, indent: { left, hanging: left }, tabStops: tabs },
          [new TextRun({ text: `${nr}\t`, font: SANS_W, size: 22, bold: true, color: INK })],
          punkte ? [new TextRun({ text: `\t${punkte}`, font: SANS_W, size: 17, color: SOFT })] : [],
        ),
      );
      if (hilfe) {
        children.push(
          ...absaetze(
            hilfe,
            { font: SANS_W, size: 19, italics: true, color: SOFT },
            PAGE_W - left,
            { spacing: { after: 60 }, indent: { left }, keepNext: Boolean(zeilen || antwort) },
            [new TextRun({ text: "Tipp: ", font: SANS_W, size: 19, bold: true, italics: true, color: SOFT })],
          ),
        );
      }
      if (koerper) {
        if (koerper.art === "schaubild") {
          // The diagram is a picture in the Word file (the same drawing as in the PDF), 450 points wide.
          const scene = szeneVon(koerper.schaubild, 450, loesungsansicht === true);
          const px = 96 / 72;
          children.push(
            new Paragraph({
              keepNext: Boolean(koerper.schaubild.titel || koerper.wortliste),
              spacing: { before: 80, after: 80 },
              indent: { left },
              children: [new ImageRun({ type: "png", data: szeneAlsPng(scene), transformation: { width: Math.round((scene.w + 4 / 3) * px), height: Math.round((scene.h + 14 / 3) * px) }, altText: { title: koerper.schaubild.titel ?? "Schaubild", description: koerper.schaubild.titel ?? "Schaubild", name: "Schaubild" } })],
            }),
          );
          if (koerper.schaubild.titel) doc.paragraph(koerper.schaubild.titel, { indent: left, italic: true, size: 9, color: SOFT, after: 100 });
          if (koerper.wortliste && !loesungsansicht) doc.paragraph(`Wörter:   ${koerper.wortliste}`, { indent: left, bold: true, size: 10, after: 120 });
        } else if (koerper.art === "zuordnung") {
          doc.table(
            [{ title: "", share: 0.5 }, { title: "", share: 0.5 }],
            koerper.links.map((l, i) => [`${l}      ____`, koerper.rechts[i]!]),
            { noHeader: true, minHeight: 380 },
          );
        } else if (koerper.art === "luecken") {
          for (const t of koerper.saetze) doc.paragraph(t, { indent: left, after: 100 });
          if (koerper.wortliste) doc.paragraph(`Wörter:   ${koerper.wortliste}`, { indent: left, bold: true, size: 10, after: 120 });
        } else if (koerper.art === "auswahl") {
          for (const o of koerper.optionen) doc.paragraph(o, { indent: left + twip(4), after: 40 });
        } else {
          const share = 1 / koerper.spalten.length;
          doc.table(koerper.spalten.map((title) => ({ title, share })), koerper.zeilen, { minHeight: 440 });
        }
      }
      if (antwort) {
        const shade = { type: ShadingType.CLEAR, fill: BOX, color: "auto" } as const;
        const edge = { left: { style: BorderStyle.SINGLE, size: 24, color: INK, space: 6 } };
        const parts = antwort.split(/\n/);
        parts.forEach((part, i) =>
          children.push(...absaetze(part, { font: SANS_W, size: 20, color: INK }, PAGE_W - left - 200, { shading: shade, border: edge, spacing: { before: i === 0 ? 40 : 0, after: i === parts.length - 1 ? 40 : 0 }, indent: { left: left + 140, right: 60 } })),
        );
        children.push(gap());
      }
      for (let i = 0; i < zeilen; i++) {
        // A tab with an underscore leader draws one full line per paragraph. (Paragraph borders would merge into a single line.)
        children.push(new Paragraph({ spacing: { before: 300, after: 0 }, indent: { left }, tabStops: [{ type: TabStopType.RIGHT, position: PAGE_W, leader: LeaderType.UNDERSCORE }], children: [new TextRun({ text: "\t", font: SANS_W, size: 21, color: LINE })] }));
      }
    },
    pageBreak() {
      children.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 0 }, children: [] }));
    },
    table(columns, rows, opts = {}) {
      const widths = columns.map((c) => Math.round(PAGE_W * c.share));
      const cell = (text: string, i: number, head: boolean) =>
        new TableCell({
          width: { size: widths[i]!, type: WidthType.DXA },
          margins: { top: 70, bottom: 70, left: 90, right: 90 },
          shading: head ? { type: ShadingType.CLEAR, fill: BOX, color: "auto" } : undefined,
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.SINGLE, size: head ? 8 : 4, color: head ? INK : LINE },
          },
          // One paragraph per line, as before. A formula on its own line gets a paragraph of its own, centered in the cell.
          children: text.split(/\r?\n/).flatMap((l) =>
            absaetze(l, { font: SANS_W, size: head ? 17 : 19, bold: head || columns[i]!.bold, color: INK }, widths[i]! - 180, { alignment: columns[i]!.right ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: 20 } }),
          ),
        });
      children.push(
        new Table({
          width: { size: PAGE_W, type: WidthType.DXA },
          columnWidths: widths,
          rows: [
            ...(opts.noHeader ? [] : [new TableRow({ tableHeader: true, cantSplit: true, children: columns.map((c, i) => cell(c.title, i, true)) })]),
            ...rows.map((r) => new TableRow({ cantSplit: true, height: opts.minHeight ? { value: opts.minHeight, rule: HeightRule.ATLEAST } : undefined, children: r.map((t, i) => cell(t, i, false)) })),
          ],
        }),
        new Paragraph({ spacing: { after: 160 }, children: [] }),
      );
    },
    async build(footnote) {
      const school = schulkopf();
      const footer = () =>
        new Footer({
          children: [
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: PAGE_W }],
              children: [
                new TextRun({ text: printable(footnote ?? ""), font: SANS_W, size: 15, color: SOFT }),
                new TextRun({ text: "\tPult · Seite ", font: SANS_W, size: 15, color: SOFT }),
                new TextRun({ children: [PageNumber.CURRENT], font: SANS_W, size: 15, color: SOFT }),
                new TextRun({ text: " von ", font: SANS_W, size: 15, color: SOFT }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: SANS_W, size: 15, color: SOFT }),
              ],
            }),
          ],
        });
      const file = new Document({
        title: printable(title),
        creator: "Pult",
        styles: { default: { document: { run: { font: SANS_W, size: 21, color: INK } } } },
        sections: [
          {
            // The school head belongs on the first page only, like the PDF. Word wants "different first page" for that.
            properties: { ...(school ? { titlePage: true } : {}), page: { size: { width: twip(210), height: twip(297) }, margin: { top: twip(15), bottom: twip(18), left: twip(16), right: twip(16) } } },
            ...(school ? { headers: { first: schoolHeader(school) } } : {}),
            footers: { default: footer(), ...(school ? { first: footer() } : {}) },
            children,
          },
        ],
      });
      return Buffer.from(await Packer.toBuffer(file));
    },
  };
  return doc;
}

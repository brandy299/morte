/**
 * Building blocks for Word files (.docx). The same idea as layout.ts for PDFs: the content comes from the model,
 * the look is fixed here. Gray only, so it prints well, and every part stays editable in Word.
 * The fonts are ones every Word has (Georgia for headings, Calibri for text), so nothing needs to be embedded.
 */
import {
  AlignmentType, BorderStyle, Document, Footer, LeaderType, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TabStopType, TextRun, WidthType,
  type ParagraphChild,
} from "docx";
import { printable } from "./layout.ts";

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
  task(opts: { nr: string; text: string; hilfe?: string; punkte?: string; zeilen?: number; antwort?: string; indent?: boolean }): void;
  table(columns: { title: string; share: number; bold?: boolean; right?: boolean }[], rows: string[][], opts?: { noHeader?: boolean }): void;
  pageBreak(): void;
  build(footnote?: string): Promise<Buffer>;
}

export function newWord(title: string): WordDoc {
  const children: Block[] = [];
  const doc: WordDoc = {
    add: (...b) => void children.push(...b),
    header({ kicker, title: heading, fields }) {
      children.push(
        new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 24, color: INK, space: 6 } }, spacing: { before: 0, after: 40 }, children: kicker ? [new TextRun({ text: printable(kicker).toUpperCase(), font: SANS_W, size: 16, color: SOFT, characterSpacing: 30 })] : [] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: printable(heading), font: SERIF_W, size: 48, bold: true, color: INK })] }),
      );
      if (fields) {
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 160 },
            tabStops: [
              { type: TabStopType.LEFT, position: twip(88), leader: LeaderType.UNDERSCORE },
              { type: TabStopType.LEFT, position: twip(100) },
              { type: TabStopType.RIGHT, position: PAGE_W, leader: LeaderType.UNDERSCORE },
            ],
            children: [new TextRun({ text: "Name: ", font: SANS_W, size: 20, color: SOFT }), new TextRun({ text: "\t\tDatum: ", font: SANS_W, size: 20, color: SOFT }), new TextRun({ text: "\t", font: SANS_W, size: 20 })],
          }),
        );
      }
      children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 4 } }, spacing: { after: 200 }, children: [] }));
    },
    paragraph(text, o = {}) {
      children.push(
        new Paragraph({
          spacing: { after: o.after ?? 120, line: 276 },
          indent: o.indent ? { left: o.indent } : undefined,
          children: lines(text, { font: o.font ?? SANS_W, size: Math.round((o.size ?? 10.5) * 2), color: o.color ?? INK, bold: o.bold, italics: o.italic }),
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
          new Paragraph({
            shading: shade,
            border: edge,
            spacing: { before: i === 0 && !boxTitle ? 60 : 0, after: i === parts.length - 1 ? 40 : 0, line: 276 },
            indent: { left: 160, right: 80 },
            children: lines(part, { font: SANS_W, size: 21, color: INK }),
          }),
        ),
      );
      children.push(gap());
    },
    facts(items) {
      if (items.length) doc.paragraph(items.join("   ·   "), { color: SOFT, after: 160 });
    },
    task({ nr, text, hilfe, punkte, zeilen = 0, antwort, indent }) {
      const left = twip(11);
      const tabs = [{ type: TabStopType.LEFT, position: left }, { type: TabStopType.RIGHT, position: PAGE_W }];
      children.push(
        new Paragraph({
          keepNext: Boolean(hilfe || zeilen || antwort),
          spacing: { before: indent ? 40 : 160, after: 60, line: 276 },
          indent: { left, hanging: left },
          tabStops: tabs,
          children: [
            new TextRun({ text: `${nr}\t`, font: SANS_W, size: 22, bold: true, color: INK }),
            ...lines(text, { font: SANS_W, size: 21, color: INK }),
            ...(punkte ? [new TextRun({ text: `\t${punkte}`, font: SANS_W, size: 17, color: SOFT })] : []),
          ],
        }),
      );
      if (hilfe) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            indent: { left },
            keepNext: Boolean(zeilen || antwort),
            children: [new TextRun({ text: "Tipp: ", font: SANS_W, size: 19, bold: true, italics: true, color: SOFT }), ...lines(hilfe, { font: SANS_W, size: 19, italics: true, color: SOFT })],
          }),
        );
      }
      if (antwort) {
        const shade = { type: ShadingType.CLEAR, fill: BOX, color: "auto" } as const;
        const edge = { left: { style: BorderStyle.SINGLE, size: 24, color: INK, space: 6 } };
        const parts = antwort.split(/\n/);
        parts.forEach((part, i) =>
          children.push(new Paragraph({ shading: shade, border: edge, spacing: { before: i === 0 ? 40 : 0, after: i === parts.length - 1 ? 40 : 0 }, indent: { left: left + 140, right: 60 }, children: lines(part, { font: SANS_W, size: 20, color: INK }) })),
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
          children: printable(text).split(/\r?\n/).map(
            (l) => new Paragraph({ alignment: columns[i]!.right ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: 20 }, children: [new TextRun({ text: l, font: SANS_W, size: head ? 17 : 19, bold: head || columns[i]!.bold, color: INK })] }),
          ),
        });
      children.push(
        new Table({
          width: { size: PAGE_W, type: WidthType.DXA },
          columnWidths: widths,
          rows: [
            ...(opts.noHeader ? [] : [new TableRow({ tableHeader: true, cantSplit: true, children: columns.map((c, i) => cell(c.title, i, true)) })]),
            ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false)) })),
          ],
        }),
        new Paragraph({ spacing: { after: 160 }, children: [] }),
      );
    },
    async build(footnote) {
      const file = new Document({
        title: printable(title),
        creator: "morte",
        styles: { default: { document: { run: { font: SANS_W, size: 21, color: INK } } } },
        sections: [
          {
            properties: { page: { size: { width: twip(210), height: twip(297) }, margin: { top: twip(15), bottom: twip(18), left: twip(16), right: twip(16) } } },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    tabStops: [{ type: TabStopType.RIGHT, position: PAGE_W }],
                    children: [
                      new TextRun({ text: printable(footnote ?? ""), font: SANS_W, size: 15, color: SOFT }),
                      new TextRun({ text: "\tmorte · Seite ", font: SANS_W, size: 15, color: SOFT }),
                      new TextRun({ children: [PageNumber.CURRENT], font: SANS_W, size: 15, color: SOFT }),
                      new TextRun({ text: " von ", font: SANS_W, size: 15, color: SOFT }),
                      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: SANS_W, size: 15, color: SOFT }),
                    ],
                  }),
                ],
              }),
            },
            children,
          },
        ],
      });
      return Buffer.from(await Packer.toBuffer(file));
    },
  };
  return doc;
}

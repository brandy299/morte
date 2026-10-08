import { formelStuecke, formelTeile, mightHaveFormula, setzeFormel, warnFormel, type Gesetzt } from "./formel.ts";

/**
 * Lays out a text block with formulas: breaks lines, puts formulas in a sentence on the baseline of the text and
 * lets the line grow when a formula is taller. Knows nothing about pdfkit; layout.ts measures text and draws the result.
 */

/** Smallest scale for a formula that is too wide for its column. Below this it is hard to read, so it breaks instead. */
export const MIN_SCALE = 0.7;
/** Formulas are drawn a little larger than the font size, because the maths font has a smaller x-height than the body font. */
export const MATH_SCALE = 1.06;

export interface Maße {
  /** Width of one line of text in points. */
  breite(text: string, font: string, size: number): number;
  /** Distance from the top of a text line to its baseline. */
  ascent(font: string, size: number): number;
  /** Height of one line of this font, as the PDF library sets it (without extra line gap). */
  zeile(font: string, size: number): number;
}

export interface SatzOptionen {
  font: string;
  size: number;
  width: number;
  lineGap: number;
  align?: "left" | "center" | "right";
  /** A label in front of the first line, in its own font (for example "Tipp:"). */
  lead?: { text: string; font: string };
  /** Prepares a piece of plain text for drawing (the caller's `printable`). Formulas are not passed through it. */
  clean?: (text: string) => string;
}

export type Op = { t: "text"; text: string; font: string; x: number; y: number } | { t: "formel"; g: Gesetzt; size: number; x: number; y: number };

export interface Satz {
  ops: Op[];
  hoehe: number;
}

/** The text with `\$` turned into `$`, when it holds no formula. `undefined` when it does. */
export function klartext(text: string): string | undefined {
  if (!mightHaveFormula(text)) return text;
  const teile = formelTeile(text);
  return teile.every((t): t is { text: string } => "text" in t) ? teile.map((t) => t.text).join("") : undefined;
}

interface Atom {
  w: number;
  asc: number;
  desc: number;
  op: (x: number, top: number) => Op;
}
type Chunk = { atoms: Atom[]; w: number };
type Strom = { chunk: Chunk } | { space: true } | { umbruch: true } | { anzeige: { g: Gesetzt; scale: number }[] };

/** Lines of a formula on its own: one line when it fits, scaled down to MIN_SCALE, else broken at operators. `undefined` when nothing fits. */
export function anzeigeZeilen(tex: string, width: number, size: number, anzeige: boolean, setze = setzeFormel): { g: Gesetzt; scale: number }[] | undefined {
  const fit = (g: Gesetzt) => {
    const w = g.breite * size * MATH_SCALE;
    if (w <= width) return 1;
    return width / w >= MIN_SCALE ? width / w : undefined;
  };
  const whole = setze(tex, anzeige);
  if (!whole) return undefined;
  const s0 = fit(whole);
  if (s0 !== undefined) return [{ g: whole, scale: s0 }];

  const stuecke = formelStuecke(tex);
  if (stuecke.length < 2) return undefined;
  const lines: string[] = [];
  let cur = stuecke[0]!;
  for (const next of stuecke.slice(1)) {
    const joined = setze(`${cur} ${next}`, anzeige);
    if (joined && joined.breite * size * MATH_SCALE <= width) cur = `${cur} ${next}`;
    else {
      lines.push(cur);
      cur = next;
    }
  }
  lines.push(cur);
  const set: { g: Gesetzt; scale: number }[] = [];
  for (const line of lines) {
    const g = setze(line, anzeige);
    const s = g && fit(g);
    if (!g || s === undefined) return undefined;
    set.push({ g, scale: s });
  }
  return set;
}

/** Lays the text out. `undefined` when the text has no formula, then the caller draws it the usual way. */
export function setzeSatz(text: string, o: SatzOptionen, m: Maße, setze = setzeFormel): Satz | undefined {
  if (!mightHaveFormula(text)) return undefined;
  const teile = formelTeile(text);
  if (teile.every((t) => "text" in t)) return undefined;

  const { font, size, width, lineGap } = o;
  const clean = o.clean ?? ((t: string) => t);
  const textAsc = m.ascent(font, size);
  const textLine = m.zeile(font, size);
  const spaceW = m.breite(" ", font, size);
  const wordAtom = (word: string, f = font): Atom => ({
    w: m.breite(word, f, size),
    asc: m.ascent(f, size),
    desc: m.zeile(f, size) - m.ascent(f, size),
    op: (x, top) => ({ t: "text", text: word, font: f, x, y: top }),
  });

  // 1. A stream of words, spaces, forced breaks and formulas on their own line. Atoms without a space between them stay together.
  const strom: Strom[] = [];
  let chunk: Chunk | undefined;
  const add = (a: Atom) => {
    chunk ??= { atoms: [], w: 0 };
    chunk.atoms.push(a);
    chunk.w += a.w;
  };
  const endChunk = () => {
    if (chunk) strom.push({ chunk });
    chunk = undefined;
  };
  const addText = (s: string) => {
    for (const piece of clean(s).split(/(\n|[ \t]+)/)) {
      if (piece === "") continue;
      if (piece === "\n") {
        endChunk();
        strom.push({ umbruch: true });
      } else if (/^[ \t]+$/.test(piece)) {
        endChunk();
        strom.push({ space: true });
      } else add(wordAtom(piece));
    }
  };
  if (o.lead) {
    add(wordAtom(clean(o.lead.text), o.lead.font));
    endChunk();
    strom.push({ space: true });
  }
  for (const t of teile) {
    if ("text" in t) {
      addText(t.text);
      continue;
    }
    const sz = size * MATH_SCALE;
    const g = t.anzeige ? undefined : setze(t.tex, false);
    if (g && g.breite * sz <= width) {
      add({
        w: g.breite * sz,
        asc: g.hoch * sz,
        desc: g.tief * sz,
        op: (x, top) => ({ t: "formel", g, size: sz, x, y: top }),
      });
      continue;
    }
    // On its own line: written so, or too wide for a line of text. Wrong LaTeX (setzeFormel has reported it) stays raw text.
    const lines = !t.anzeige && !g ? undefined : anzeigeZeilen(t.tex, width, size, true, setze);
    if (lines) {
      endChunk();
      strom.push({ anzeige: lines });
    } else {
      // Never a missing formula: the raw text, also when it is too wide even broken at its operators.
      if (g || (t.anzeige && setze(t.tex, true))) warnFormel("zu breit für die Spalte");
      addText(t.roh);
    }
  }
  endChunk();

  // 2. Lines. `cursor` is the vertical position from the top of the block.
  const ops: Op[] = [];
  let cursor = 0;
  let line: { items: { atom: Atom; x: number }[]; w: number } = { items: [], w: 0 };
  const shift = (w: number) => (o.align === "center" ? (width - w) / 2 : o.align === "right" ? width - w : 0);
  const flush = (force = false) => {
    if (line.items.length === 0 && !force) return;
    const asc = Math.max(textAsc, ...line.items.map((i) => i.atom.asc));
    const desc = Math.max(textLine - textAsc, ...line.items.map((i) => i.atom.desc));
    const dx = shift(line.w);
    for (const { atom, x } of line.items) ops.push(atom.op(dx + x, cursor + asc - atom.asc));
    cursor += asc + desc + lineGap;
    line = { items: [], w: 0 };
  };
  const place = (c: Chunk, withSpace: boolean) => {
    let x = line.w + (withSpace && line.items.length ? spaceW : 0);
    for (const atom of c.atoms) {
      line.items.push({ atom, x });
      x += atom.w;
    }
    line.w = x;
  };
  for (const s of strom) {
    if ("umbruch" in s) flush(true);
    else if ("space" in s) continue; // spaces are put in front of the next word when it fits
    else if ("anzeige" in s) {
      flush();
      cursor += size * 0.3;
      const blockW = Math.max(...s.anzeige.map((l) => l.g.breite * size * MATH_SCALE * l.scale));
      for (const [i, l] of s.anzeige.entries()) {
        const sz = size * MATH_SCALE * l.scale;
        const x = (width - blockW) / 2;
        ops.push({ t: "formel", g: l.g, size: sz, x, y: cursor });
        cursor += (l.g.hoch + l.g.tief) * sz + lineGap;
      }
      cursor += size * 0.3;
    } else {
      const c = s.chunk;
      if (line.items.length && line.w + spaceW + c.w > width) flush();
      place(c, true);
    }
  }
  flush();
  return { ops, hoehe: cursor };
}

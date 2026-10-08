import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import "mathjax-full/js/input/tex/base/BaseConfiguration.js";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";
import "mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js";
import "mathjax-full/js/input/tex/cancel/CancelConfiguration.js";
import "mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js";
import "mathjax-full/js/input/tex/upgreek/UpgreekConfiguration.js";
import "mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration.js";

/**
 * Formulas in model text. The model writes LaTeX between \( \) or $ $ (in a sentence) and \[ \] or $$ $$ (on their own line).
 * This file finds them and turns them into vector drawings (MathJax, SVG). It does not know about PDF: layout.ts places the drawings.
 */

export type Teil = { text: string } | { tex: string; anzeige: boolean; roh: string };

/**
 * A model that writes `\frac` or `\text` with a single backslash inside JSON sends a form feed or a tab instead
 * (`\f`, `\t`, `\b`, `\r` are JSON escapes). Such a control character in front of a letter is the backslash and the letter again.
 * Also `\neq`, `\nabla`, `\not`, `\neg` (a line feed in front of those endings). Plain spaces and line breaks stay as they are.
 */
export const repariereSteuerzeichen = (tex: string): string =>
  tex.replace(/\f(?=[a-zA-Z])/g, "\\f").replace(/\x08(?=[a-zA-Z])/g, "\\b").replace(/\t(?=[a-zA-Z])/g, "\\t").replace(/\r(?=[a-zA-Z])/g, "\\r").replace(/\n(?=(?:eq|abla|ot|eg|ewline)(?![a-zA-Z]))/g, "\\n");

const isSpace = (ch: string | undefined) => ch === undefined || /\s/.test(ch);

/**
 * Splits text into plain text and formulas.
 *
 * - `\(…\)` and `$…$` are formulas in a sentence, `\[…\]` and `$$…$$` stand on their own line. `\$` is a dollar sign.
 * - `$` follows the rule of Pandoc, so money stays text: after the opening `$` no space (and no full stop or comma), before the closing `$` no space,
 *   after the closing `$` no digit. A `$…$` formula never spans a line break, does not open right behind a letter or digit,
 *   and a `$` inside that cannot close it cancels the formula. That keeps Excel references like `$A$1:$A$5` and prices as text.
 * - Whatever does not close stays text.
 */
export function formelTeile(text: string): Teil[] {
  const parts: Teil[] = [];
  let plain = "";
  const flush = () => {
    if (plain) parts.push({ text: plain });
    plain = "";
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    if (rest.startsWith("\\$")) {
      plain += "$";
      i += 2;
      continue;
    }
    // [opening, closing, on its own line, may span lines]
    let form: { open: string; close: string; anzeige: boolean } | undefined;
    if (rest.startsWith("\\[")) form = { open: "\\[", close: "\\]", anzeige: true };
    else if (rest.startsWith("\\(")) form = { open: "\\(", close: "\\)", anzeige: false };
    else if (rest.startsWith("$$")) form = { open: "$$", close: "$$", anzeige: true };
    else if (rest.startsWith("$") && !isSpace(text[i + 1]) && !/[.,;:!?)\]}]/.test(text[i + 1]!) && !/[\p{L}\p{N}]/u.test(text[i - 1] ?? "")) form = { open: "$", close: "$", anzeige: false };
    if (form) {
      const from = i + form.open.length;
      const end = findClose(text, from, form.open, form.close);
      if (end >= 0) {
        const tex = repariereSteuerzeichen(text.slice(from, end)).trim();
        if (tex) {
          flush();
          parts.push({ tex, anzeige: form.anzeige, roh: text.slice(i, end + form.close.length) });
          i = end + form.close.length;
          continue;
        }
      }
    }
    plain += text[i];
    i++;
  }
  flush();
  return parts;
}

function findClose(text: string, from: number, open: string, close: string): number {
  for (let j = from; j < text.length; j++) {
    if (text[j] === "\\") {
      // `\$` inside a formula is a dollar sign for LaTeX, not the end. Any other escape is skipped as a pair.
      j++;
      if (open !== "$" && open !== "$$" && text.startsWith(close, j - 1)) return j - 1;
      continue;
    }
    if (open === "$" && text[j] === "\n") return -1;
    if ((open === "$" || open === "$$") && text.startsWith(close, j)) {
      // A `$` in the middle that cannot close the formula means this is no formula: Excel references like $A$1:$A$5, or two prices.
      if (open === "$" && (isSpace(text[j - 1]) || /\d/.test(text[j + 1] ?? "") || text[j + 1] === "$")) return -1;
      return j;
    }
  }
  return -1;
}

/** True when the text could hold a formula. Cheap check before the real split. */
export const mightHaveFormula = (text: string) => /\$|\\\(|\\\[/.test(text);

// ---------- MathJax ----------

/** A set formula in units of the font size (1 = the font size). `body` is the inside of the SVG, `box` its viewBox in 1/1000. */
export interface Gesetzt {
  breite: number;
  /** Height above the baseline. */
  hoch: number;
  /** Depth below the baseline. */
  tief: number;
  body: string;
  box: [number, number, number, number];
}

const INK = "#111111";

type Convert = (tex: string, display: boolean) => string;
const cache = new Map<string, Gesetzt | null>();
let convert: Convert | undefined;

/** Family name in the SVG for text inside formulas (`\text{…}`, letters MathJax has no shape for). The drawing code maps it to the body font. */
export const FORMEL_SCHRIFT = "Sans";

/** Width of a string in the body font, as a share of the font size. Set by layout.ts, which knows the font. The default is a rough guess. */
let textBreite: (text: string) => number = (text) => text.length * 0.5;
export function setFormelSchrift(measure: (text: string) => number): void {
  textBreite = measure;
  cache.clear();
}

function converter(): Convert {
  if (!convert) {
    const adaptor = liteAdaptor();
    // MathJax measures text it cannot take from its own font with the adaptor. The lite adaptor guesses; here it is the real width in the body font.
    (adaptor as unknown as { nodeSize: (node: unknown, em: number) => [number, number] }).nodeSize = (node, em) => {
      // The result is a share of `em`, which MathJax passes as 1000 (the units of its drawing).
      const size = parseFloat(adaptor.getAttribute(node as never, "font-size") ?? String(em)) || em;
      return [(textBreite(adaptor.textContent(node as never)) * size) / em, 0];
    };
    RegisterHTMLHandler(adaptor);
    // Only packages for school maths. No colors (the sheets are grey), no links, no loading of further packages, and no "noundefined":
    // an unknown command must be an error we can see, not red text.
    const input = new TeX({
      packages: ["base", "ams", "boldsymbol", "cancel", "mathtools", "upgreek", "textmacros"],
      formatError: (_jax: unknown, err: Error) => {
        throw err;
      },
    });
    // Words inside a formula (\text{für x > 0}) are set in the body font, so umlauts and the euro sign look like the text around them.
    input.postFilters.add(({ data }: { data: { root: { walkTree: (fn: (node: any) => void) => void } } }) => {
      data.root.walkTree((node) => {
        if (node.isKind("mtext")) {
          node.attributes.set("mathvariant", "-explicitFont");
          node.attributes.set("fontfamily", FORMEL_SCHRIFT);
        }
      });
    }, -5);
    const doc = mathjax.document("", { InputJax: input, OutputJax: new SVG({ fontCache: "none" }) });
    convert = (tex, display) => adaptor.outerHTML(adaptor.firstChild(doc.convert(tex, { display }) as never) as never);
  }
  return convert;
}

let warn: (reason: string) => void = (reason) => console.warn(`Formel nicht gesetzt: ${reason}`);
/** Reports a formula that was not set. The formula itself is never part of the message. */
export const warnFormel = (reason: string) => warn(reason);
/** Replaces the warning (tests). The formula itself is never part of the message. */
export function onFormelWarning(fn: (reason: string) => void): void {
  warn = fn;
}


/** Sets one formula. `undefined` when the LaTeX is wrong, so the caller can show the raw text instead. */
export function setzeFormel(tex: string, anzeige: boolean): Gesetzt | undefined {
  const key = `${anzeige ? "D" : "I"}${tex}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit ?? undefined;
  let result: Gesetzt | null = null;
  try {
    const svg = converter()(tex, anzeige);
    const box = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(svg)?.slice(1, 5).map(Number) as Gesetzt["box"] | undefined;
    if (!box || box.some((n) => !Number.isFinite(n)) || svg.includes("data-mjx-error")) throw new Error("kein gültiges Ergebnis");
    result = {
      breite: box[2] / 1000,
      hoch: -box[1] / 1000,
      tief: (box[1] + box[3]) / 1000,
      body: svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replaceAll("currentColor", INK),
      box,
    };
  } catch (err) {
    // The message of MathJax names the kind of mistake ("Missing close brace"), not the content of the formula.
    // (TexError of MathJax is not an Error subclass, so read `message` directly.)
    const message = (err as { message?: unknown } | undefined)?.message;
    warn(typeof message === "string" ? message.split("\n")[0]!.slice(0, 80) : "unbekannter Fehler");
  }
  cache.set(key, result);
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return result ?? undefined;
}

/** SVG text of a set formula at a font size in points. Text characters that MathJax has no letter for use the font family "serif", which the drawing code maps. */
export function formelSvg(g: Gesetzt, size: number): string {
  const [x, y, w, h] = g.box;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${(g.breite * size).toFixed(3)}" height="${((g.hoch + g.tief) * size).toFixed(3)}" viewBox="${x} ${y} ${w} ${h}">${g.body}</svg>`;
}

// ---------- Break a long formula ----------

/** Symbols before which a long formula may break, when they stand outside any brackets. */
const BREAK_BEFORE = [/^[=+\-]/, /^\\(pm|mp|cdot|times|le|ge|leq|geq|neq|approx|Rightarrow|rightarrow)(?![a-zA-Z])/];

/** Cuts LaTeX into pieces at operators outside of brackets, each next piece starting with its operator. */
export function formelStuecke(tex: string): string[] {
  const pieces: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < tex.length) {
    const rest = tex.slice(i);
    if (rest.startsWith("\\left") || rest.startsWith("\\begin")) depth++;
    else if (rest.startsWith("\\right") || rest.startsWith("\\end")) depth = Math.max(0, depth - 1);
    else if (tex[i] === "{" || tex[i] === "[") depth++;
    else if (tex[i] === "}" || tex[i] === "]") depth = Math.max(0, depth - 1);
    else if (tex[i] === "\\" && /^\\[{}[\]()|,;: !]/.test(rest)) {
      i += 2;
      continue;
    } else if (depth === 0 && i > start && BREAK_BEFORE.some((re) => re.test(rest)) && !/([=+\-]|\\(pm|mp|cdot|times|le|ge|leq|geq|neq|approx))$/.test(tex.slice(start, i).trim())) {
      pieces.push(tex.slice(start, i).trim());
      start = i;
    }
    i++;
  }
  pieces.push(tex.slice(start).trim());
  return pieces.filter(Boolean);
}

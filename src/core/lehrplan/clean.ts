import type { PdfPage, PdfRow } from "./pdf.ts";

/** Digits become "#", so "Seite 8 von 22" and "Seite 9 von 22" count as the same line. */
const shape = (text: string) => text.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();

/** "Seite 8 von 22", "8 / 22", "Page 3", or only a number. */
const PAGE_NUMBER = /(^|\s)(seite|page|s\.)\s*\d+|\b\d+\s*(von|\/|of)\s*\d+\b|^\d{1,4}$/i;

/**
 * Removes page headers and footers: lines in the top or bottom band of a page that come back on many pages
 * (ministry name, file name, "Seite 8 von 22"). Only identical lines count, and only page numbers may differ by digits,
 * so repeated table headers or "Lernfeld 1", "Lernfeld 2" stay.
 */
export function dropRepeated(pages: PdfPage[]): PdfPage[] {
  if (pages.length < 3) return pages;
  const band = (page: PdfPage, row: PdfRow) => row.y > page.height * 0.9 || row.y < page.height * 0.1;
  // A repeated line with several columns is a table header, not page furniture (unless it carries the page number).
  const keep = (row: PdfRow) => row.text.includes("\t") && !PAGE_NUMBER.test(row.text);
  const key = (row: PdfRow) => (PAGE_NUMBER.test(row.text) ? shape(row.text) : row.text.replace(/\s+/g, " ").trim().toLowerCase());
  const seen = new Map<string, number>();
  for (const page of pages) {
    const onPage = new Set(page.rows.filter((r) => band(page, r)).map(key));
    for (const k of onPage) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const limit = Math.max(3, Math.ceil(pages.length * 0.5));
  return pages.map((page) => {
    const rows = page.rows.filter((r) => keep(r) || !(band(page, r) && (seen.get(key(r)) ?? 0) >= limit));
    return { ...page, rows, chars: rows.reduce((c, r) => c + r.text.replace(/\s/g, "").length, 0) };
  });
}

const CONNECTORS = /^(und|oder|bzw\.?|sowie|u\.|bis|statt|noch|wie)\b/i;

/** Joins words that were split at the end of a line ("Anwen-" + "dungsmodelle"), but not "Berufs-" + "und Bildungs…". */
export function dehyphenate(text: string): string {
  return text.replace(/(\p{L}{2})-\n(?=(\p{Ll}))(?!(?:und|oder|bzw|sowie)\b)/gu, "$1");
}

/** Plain text of a page, line by line. Table columns are separated by tabs. */
export const pageText = (page: PdfPage) => page.rows.map((r) => r.text).join("\n");

/** Most common font size, weighted by characters: the body text size. */
function bodySize(rows: PdfRow[]): number {
  const weight = new Map<number, number>();
  for (const r of rows) weight.set(r.size, (weight.get(r.size) ?? 0) + r.text.length);
  return [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12;
}

const BULLET = /^[−–—•·▪●○◦*-]\s+/;

/**
 * Safety net when the model cannot be used for a part of the plan: the text unchanged, in simple Markdown.
 * Larger lines become headings, dashes become list items, wrapped lines are joined, tabs turn into " | ".
 */
export function fallbackMarkdown(pages: PdfPage[]): string {
  const rows = pages.flatMap((p) => p.rows);
  if (rows.length === 0) return "";
  const body = bodySize(rows);
  const heading = [...new Set(rows.filter((r) => r.size >= body * 1.12 && !r.text.includes("\t") && r.text.length < 120).map((r) => r.size))].sort((a, b) => b - a);
  const out: string[] = [];
  let paragraph = "";
  const flush = () => {
    if (paragraph) out.push(paragraph, "");
    paragraph = "";
  };
  for (const [i, row] of rows.entries()) {
    const level = heading.indexOf(row.size);
    if (level >= 0 && !row.text.includes("\t") && row.text.length < 120) {
      flush();
      out.push(`${"#".repeat(Math.min(level + 1, 4))} ${row.text}`, "");
      continue;
    }
    if (row.text.includes("\t")) {
      flush();
      out.push(row.text.split("\t").join(" | "), "");
      continue;
    }
    const prev = rows[i - 1];
    const gap = prev ? prev.y - row.y : 0;
    const newBlock = BULLET.test(row.text) || (prev && gap > row.size * 1.9);
    if (newBlock) flush();
    paragraph = paragraph ? `${paragraph}\n${row.text}` : BULLET.test(row.text) ? row.text.replace(BULLET, "- ") : row.text;
  }
  flush();
  return dehyphenate(out.join("\n"))
    .replace(/(?<!\n)\n(?!\n)/g, " ") // lines of one paragraph become one line
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

const WORD = /[\p{L}\p{N}]{4,}/gu;
const words = (text: string) => new Set(text.toLowerCase().match(WORD) ?? []);

/**
 * How faithful a conversion is, in both directions. `kept` is the share of the source's longer words that show up
 * in the model's version (nothing left out). `own` is the share of the model's words that were in the source
 * (nothing added). Words split at a line end are joined first, so a correct join does not count as a loss.
 */
export function fidelity(source: string, converted: string): { kept: number; own: number } {
  const src = words(dehyphenate(source).replace(/\t/g, " "));
  const out = words(converted.replace(/\|/g, " "));
  const share = (a: Set<string>, b: Set<string>) => {
    if (a.size === 0) return 1;
    let hit = 0;
    for (const w of a) if (b.has(w)) hit++;
    return hit / a.size;
  };
  return { kept: share(src, out), own: share(out, src) };
}

/** Kept share only. */
export const coverage = (source: string, converted: string) => fidelity(source, converted).kept;

/**
 * Makes heading levels consistent across parts that were converted separately. Numbered headings ("3.3 Kurshalbjahr")
 * take their level from the numbering, others keep the model's level but never jump more than one level deeper.
 * All headings start at level 2, because the file's own title is level 1.
 */
export function normalizeHeadings(markdown: string): string {
  let prev = 0;
  let fenced = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (/^```/.test(line)) fenced = !fenced;
      const m = !fenced && /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
      if (!m) return line;
      const number = /^(\d+(?:\.\d+)*)\.?(\s|$)/.exec(m[2]!);
      let level = number ? number[1]!.split(".").length : m[1]!.length;
      level = Math.min(level, prev + 1);
      prev = level;
      return `${"#".repeat(Math.min(level + 1, 6))} ${m[2]}`;
    })
    .join("\n");
}

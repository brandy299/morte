import type { PdfPage, PdfRow } from "./pdf.ts";

/** Digits become "#", so "Seite 8 von 22" and "Seite 9 von 22" count as the same line. */
const shape = (text: string) => text.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();

/**
 * Removes page headers and footers: lines in the top or bottom band of a page that come back on many pages
 * (ministry name, file name, "Seite 8 von 22").
 */
export function dropRepeated(pages: PdfPage[]): PdfPage[] {
  if (pages.length < 3) return pages;
  const band = (page: PdfPage, row: PdfRow) => row.y > page.height * 0.88 || row.y < page.height * 0.1;
  const seen = new Map<string, number>();
  for (const page of pages) {
    const onPage = new Set(page.rows.filter((r) => band(page, r)).map((r) => shape(r.text)));
    for (const s of onPage) seen.set(s, (seen.get(s) ?? 0) + 1);
  }
  const limit = Math.max(3, Math.ceil(pages.length * 0.4));
  return pages.map((page) => {
    const rows = page.rows.filter((r) => !(band(page, r) && (seen.get(shape(r.text)) ?? 0) >= limit));
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
const words = (text: string) => new Set((text.toLowerCase().match(WORD) ?? []));

/**
 * Share of the source's longer words that show up in the model's version. Low values mean the model left things out.
 * Words split at a line end are joined first, so a correct join does not count as a loss.
 */
export function coverage(source: string, converted: string): number {
  const src = words(dehyphenate(source).replace(/\t/g, " "));
  if (src.size === 0) return 1;
  const out = words(converted.replace(/\|/g, " "));
  let hit = 0;
  for (const w of src) if (out.has(w)) hit++;
  return hit / src.size;
}

import { coverage, dehyphenate, dropRepeated, fallbackMarkdown, pageText } from "./clean.ts";
import { LehrplanError, type PdfFile, type PdfPage } from "./pdf.ts";

/** A model request. Pictures are base64 PNG. */
export interface AskRequest {
  system: string;
  text: string;
  images?: { data: string; mimeType: string }[];
}
export type Ask = (request: AskRequest, signal?: AbortSignal) => Promise<string>;

export interface Progress {
  done: number;
  total: number;
  /** What happens right now, in plain German. */
  label: string;
}

/** Pages with fewer characters than this count as scans and are read from a picture. */
const SCAN_BELOW = 40;
/** About 2,500 tokens of text per request. */
const CHUNK_CHARS = 9000;
/** A converted part must keep at least this share of the source's words, otherwise the plain text is used. */
const MIN_COVERAGE = 0.9;

export interface Chunk {
  /** First and last page, 1-based. */
  from: number;
  to: number;
  kind: "text" | "scan";
  pages: PdfPage[];
}

export function chunksOf(pages: PdfPage[]): Chunk[] {
  const chunks: Chunk[] = [];
  let current: Chunk | undefined;
  let size = 0;
  for (const page of pages) {
    if (page.chars < SCAN_BELOW) {
      current = undefined;
      chunks.push({ from: page.n, to: page.n, kind: "scan", pages: [page] });
      continue;
    }
    if (!current || size + page.chars > CHUNK_CHARS) {
      current = { from: page.n, to: page.n, kind: "text", pages: [] };
      chunks.push(current);
      size = 0;
    }
    current.pages.push(page);
    current.to = page.n;
    size += page.chars;
  }
  return chunks;
}

export interface Estimate {
  pages: number;
  scanned: number;
  requests: number;
  /** Rough token counts for the cost note. Four characters per token. */
  inputTokens: number;
  outputTokens: number;
}

export function estimate(pdf: PdfFile): Estimate {
  const pages = dropRepeated(pdf.pages);
  const chunks = chunksOf(pages);
  let input = 0;
  let output = 0;
  for (const c of chunks) {
    if (c.kind === "scan") {
      input += 1600 + 350;
      output += 900;
    } else {
      const tokens = Math.ceil(c.pages.reduce((n, p) => n + p.chars, 0) / 3.6);
      input += tokens + 350;
      output += Math.ceil(tokens * 1.15);
    }
  }
  return { pages: pdf.pages.length, scanned: chunks.filter((c) => c.kind === "scan").length, requests: chunks.length, inputTokens: input, outputTokens: output };
}

const SYSTEM_TEXT = `Du wandelst Text aus einem Lehrplan oder Bildungsplan (PDF) in sauberes Markdown um.
Wichtigste Regel: Gib den Inhalt vollständig und wörtlich wieder. Nichts kürzen, nichts ergänzen, nichts umformulieren, nichts erklären.
- Überschriften werden mit # markiert (Gliederungsnummern wie "3.3" bleiben im Text).
- Aufzählungen werden zu Listen mit "- ".
- Im Text trennt ein Tabulatorzeichen Spalten einer Tabelle. Mache daraus eine Markdown-Tabelle. Zeilen, die in einer Spalte weitergehen, gehören zur Zelle darüber.
- Silbentrennung am Zeilenende wird zusammengefügt ("Anwen-" und "dungsmodelle" werden zu "Anwendungsmodelle").
- Seitenzahlen, Kopf- und Fußzeilen lässt du weg.
Antworte nur mit dem Markdown, ohne Einleitung und ohne Codeblock.`;

const SYSTEM_SCAN = `Du liest die Seite eines Lehrplans oder Bildungsplans, die als Bild vorliegt, und gibst ihren Text als sauberes Markdown wieder.
Wichtigste Regel: vollständig und wörtlich. Nichts kürzen, nichts ergänzen, nichts umformulieren, nichts erklären.
- Überschriften mit #, Aufzählungen mit "- ", Tabellen als Markdown-Tabellen.
- Seitenzahlen, Kopf- und Fußzeilen lässt du weg.
- Was du nicht lesen kannst, schreibst du als [unleserlich]. Rate nie.
Antworte nur mit dem Markdown, ohne Einleitung und ohne Codeblock.`;

/** Removes a code fence the model may have put around its answer. */
export const unfence = (s: string) => s.trim().replace(/^```(?:markdown|md)?\s*\n/i, "").replace(/\n```\s*$/, "").trim();

export interface ConvertResult {
  markdown: string;
  pages: number;
  /** Plain-German notes for the teacher, e.g. parts that were taken over as plain text. */
  warnings: string[];
}

const pageRange = (c: Chunk) => (c.from === c.to ? `Seite ${c.from}` : `Seiten ${c.from} bis ${c.to}`);

/**
 * Turns the plan into Markdown. Text comes from the PDF's text layer, the model only formats it.
 * Pages without text are read from a picture. A part the model changed too much is replaced by the plain text,
 * so nothing is lost and nothing is invented.
 */
export async function convertPdf(
  pdf: PdfFile,
  ask: Ask,
  opts: { onProgress?: (p: Progress) => void; signal?: AbortSignal } = {},
): Promise<ConvertResult> {
  const pages = dropRepeated(pdf.pages);
  const chunks = chunksOf(pages);
  if (pages.every((p) => p.chars < SCAN_BELOW) && chunks.length > 40) {
    throw new LehrplanError("Das PDF besteht aus Bildern und ist sehr lang. Bitte teile es in kleinere Teile.");
  }
  const parts: string[] = [];
  const warnings: string[] = [];
  for (const [i, chunk] of chunks.entries()) {
    if (opts.signal?.aborted) throw new LehrplanError("Abgebrochen.");
    opts.onProgress?.({ done: i, total: chunks.length, label: `Ich lese ${pageRange(chunk)} von ${pdf.pages.length}` });
    if (chunk.kind === "scan") {
      let md = "";
      try {
        const png = await pdf.renderPage(chunk.from);
        md = unfence(await ask({ system: SYSTEM_SCAN, text: "Gib den Text dieser Seite als Markdown wieder.", images: [{ data: png.toString("base64"), mimeType: "image/png" }] }, opts.signal));
      } catch (err) {
        if (opts.signal?.aborted) throw new LehrplanError("Abgebrochen.");
        warnings.push(`${pageRange(chunk)}: Die Seite konnte nicht gelesen werden.`);
        continue;
      }
      if (md.length < 5 || /\[unleserlich\]/.test(md)) warnings.push(`${pageRange(chunk)}: Teile der Seite sind schlecht lesbar. Bitte prüfe sie im Plan.`);
      if (md) parts.push(md);
      continue;
    }
    const source = chunk.pages.map(pageText).join("\n\n");
    let md = "";
    try {
      md = unfence(await ask({ system: SYSTEM_TEXT, text: source }, opts.signal));
    } catch {
      if (opts.signal?.aborted) throw new LehrplanError("Abgebrochen.");
    }
    if (md && coverage(source, md) >= MIN_COVERAGE && md.length >= dehyphenate(source).length * 0.5) {
      parts.push(md);
    } else {
      parts.push(fallbackMarkdown(chunk.pages));
      warnings.push(`${pageRange(chunk)}: Ich habe den Text unverändert übernommen, ohne ihn schön zu gliedern.`);
    }
  }
  opts.onProgress?.({ done: chunks.length, total: chunks.length, label: "Fertig" });
  const markdown = parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!markdown) throw new LehrplanError("Im PDF habe ich keinen Text gefunden.");
  return { markdown, pages: pdf.pages.length, warnings };
}

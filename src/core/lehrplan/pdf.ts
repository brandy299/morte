import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

export class LehrplanError extends Error {}

/** One line of a page. Words far apart (table columns) are separated by a tab. */
export interface PdfRow {
  text: string;
  /** Baseline height above the bottom edge, in points. */
  y: number;
  /** Font size in points. */
  size: number;
}

export interface PdfPage {
  n: number;
  height: number;
  rows: PdfRow[];
  /** Number of readable characters. Few means a scan without a text layer. */
  chars: number;
}

export interface PdfFile {
  pages: PdfPage[];
  /** Draws page `n` (1-based) as a PNG, for pages without text. */
  renderPage(n: number, width?: number): Promise<Buffer>;
  close(): Promise<void>;
}

interface Item {
  str: string;
  x: number;
  y: number;
  w: number;
  size: number;
}

/**
 * Left edges of table columns: x positions where at least three lines begin, clearly right of the page's left edge
 * (so bullet indents do not count). A piece that starts exactly there, behind other text, begins a new column.
 */
function columnAnchors(lines: Item[][]): number[] {
  if (lines.length < 3) return [];
  const left = Math.min(...lines.map((l) => l[0]!.x));
  const starts = lines.map((l) => l[0]!.x).filter((x) => x > left + 60);
  const anchors: number[] = [];
  for (const x of starts) {
    if (anchors.some((a) => Math.abs(a - x) <= 2)) continue;
    if (starts.filter((o) => Math.abs(o - x) <= 2).length >= 3) anchors.push(x);
  }
  return anchors;
}

/** Groups text pieces into lines. Pieces on (nearly) the same baseline belong together, even across table columns. */
export function rowsFromItems(items: Item[]): PdfRow[] {
  const pieces = items.filter((i) => i.str.trim() !== "").sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Item[][] = [];
  for (const piece of pieces) {
    const line = lines.at(-1);
    const tolerance = Math.max(2.5, piece.size * 0.45);
    if (line && Math.abs(line[0]!.y - piece.y) <= tolerance) line.push(piece);
    else lines.push([piece]);
  }
  for (const line of lines) line.sort((a, b) => a.x - b.x);
  const anchors = columnAnchors(lines);
  return lines.map((line) => {
    let text = "";
    let end = line[0]!.x;
    for (const [i, p] of line.entries()) {
      if (i > 0) {
        const gap = p.x - end;
        const size = Math.max(p.size, 6);
        const startsColumn = gap > 1 && anchors.some((a) => Math.abs(a - p.x) <= 2);
        text += startsColumn || gap > Math.max(size * 1.6, 14) ? "\t" : gap > size * 0.12 && !/\s$/.test(text) && !/^\s/.test(p.str) ? " " : "";
      }
      text += p.str;
      end = p.x + p.w;
    }
    const size = Math.max(...line.map((p) => p.size));
    return { text: text.replace(/[  ]+/g, " ").replace(/ ?\t ?/g, "\t").trim(), y: line[0]!.y, size: Math.round(size * 10) / 10 };
  });
}

const fontDir = () => join(dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")), "standard_fonts") + "/";

export async function readPdf(buffer: Uint8Array): Promise<PdfFile> {
  let task;
  let doc;
  try {
    task = getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: false,
      verbosity: 0,
      standardFontDataUrl: pathToFileURL(fontDir()).href,
    });
    doc = await task.promise;
  } catch (err) {
    const name = (err as { name?: string }).name;
    throw new LehrplanError(
      name === "PasswordException" ? "Das PDF ist mit einem Passwort geschützt. Bitte nimm eine Kopie ohne Passwort." : "Dieses PDF kann ich nicht öffnen. Ist die Datei beschädigt?",
    );
  }
  const pages: PdfPage[] = [];
  let n = 0;
  try {
    for (n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const height = page.getViewport({ scale: 1 }).height;
      const content = await page.getTextContent();
      const items = content.items.flatMap((it) =>
        "str" in it
          ? [{ str: it.str, x: it.transform[4]!, y: it.transform[5]!, w: it.width, size: Math.abs(it.transform[3]!) || it.height }]
          : [],
      );
      const rows = rowsFromItems(items);
      pages.push({ n, height, rows, chars: rows.reduce((c, r) => c + r.text.replace(/\s/g, "").length, 0) });
      page.cleanup();
    }
  } catch {
    await task.destroy();
    throw new LehrplanError(`Seite ${n} dieses PDFs kann ich nicht lesen. Ist die Datei beschädigt?`);
  }
  return {
    pages,
    async renderPage(n, width = 1200) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context as unknown as CanvasRenderingContext2D, canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
      page.cleanup();
      return canvas.toBuffer("image/png");
    },
    close: () => task.destroy(),
  };
}

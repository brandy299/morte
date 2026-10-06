import mammoth from "mammoth";
import { unzipSync } from "fflate";
import * as XLSX from "xlsx";
import { readPdf } from "../lehrplan/pdf.ts";

/** Thrown with a message in plain German that can be shown to the teacher as is. */
export class AnhangError extends Error {}

export interface Extract {
  /** Short German word for the kind of file, for display ("Word", "Tabelle", …). */
  art: string;
  text: string;
  /** "3 Seiten", "2 Blätter" and the like, for display. */
  info?: string;
  /** True when the text was cut because the file is longer. */
  gekuerzt: boolean;
  /** Pages of a scanned PDF as PNG, because they hold no readable text. */
  scanSeiten?: Buffer[];
}

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_CHARS = 15000;
const MAX_SCAN_PAGES = 4;
const MAX_UNZIPPED = 60 * 1024 * 1024;
const SHEETS = 3;
const ROWS = 200;
const COLS = 30;

/** File endings the chat accepts as attachment (besides images). */
export const FILE_EXTENSIONS = ["pdf", "docx", "odt", "rtf", "txt", "md", "html", "htm", "csv", "tsv", "xlsx", "xlsm", "xlsb", "xls", "ods", "pptx", "odp"];
const OLD_OFFICE: Record<string, string> = { doc: "Word", ppt: "PowerPoint" };

export function extensionOf(name: string): string {
  return /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";
}

const ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function tidy(s: string): string {
  return s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Text files: UTF-8, else Windows-1252 (what Excel writes for German CSV files). */
function decodeText(buf: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|tr|table|ul|ol|section)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text);
}

function rtfToText(rtf: string): string {
  let s = rtf.replace(/\{\\\*[^{}]*\}/g, "").replace(/\{\\(fonttbl|colortbl|stylesheet|info|pict)[\s\S]*?\}\}?/g, "");
  s = s
    .replace(/\\'([0-9a-f]{2})/gi, (_, h: string) => new TextDecoder("windows-1252").decode(Uint8Array.of(parseInt(h, 16))))
    .replace(/\\u(-?\d+)\??/g, (_, n: string) => String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)))
    .replace(/\\(par|line|row)\b ?/g, "\n")
    .replace(/\\(tab|cell)\b ?/g, "\t")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/\\([\\{}])/g, "$1")
    .replace(/[{}]/g, "");
  return s;
}

/** Unzips with a size guard, so a prepared archive cannot fill the memory. */
function unzip(buf: Buffer, wanted: (name: string) => boolean): Record<string, Uint8Array> {
  let total = 0;
  try {
    return unzipSync(buf, {
      filter: (f) => {
        if (!wanted(f.name)) return false;
        total += f.originalSize;
        if (total > MAX_UNZIPPED) throw new AnhangError("Diese Datei ist entpackt zu groß.");
        return true;
      },
    });
  } catch (e) {
    if (e instanceof AnhangError) throw e;
    throw new AnhangError("Diese Datei lässt sich nicht öffnen. Vielleicht ist sie beschädigt.");
  }
}

const utf8 = (b: Uint8Array) => new TextDecoder().decode(b);

function odfXmlToText(xml: string): string {
  return decodeEntities(
    xml
      .replace(/<text:s\s+text:c="(\d+)"\s*\/>/g, (_, n: string) => " ".repeat(Math.min(Number(n), 20)))
      .replace(/<text:s\s*\/>/g, " ")
      .replace(/<text:tab\s*\/>/g, "\t")
      .replace(/<text:line-break\s*\/>/g, "\n")
      .replace(/<\/text:(p|h)>/g, "\n")
      .replace(/<\/table:table-cell>/g, " | ")
      .replace(/<\/table:table-row>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  ).replace(/ \| \n/g, "\n");
}

function odt(buf: Buffer): { text: string; info?: string } {
  const files = unzip(buf, (n) => n === "content.xml");
  const xml = files["content.xml"];
  if (!xml) throw new AnhangError("Das ist keine gültige OpenDocument-Datei.");
  return { text: odfXmlToText(utf8(xml).replace(/<office:automatic-styles[\s\S]*?<\/office:automatic-styles>/, "")) };
}

function odp(buf: Buffer): { text: string; info?: string } {
  const xml = utf8(unzip(buf, (n) => n === "content.xml")["content.xml"] ?? new Uint8Array());
  const slides = xml.split(/<draw:page\s[^>]*>/).slice(1);
  if (slides.length === 0) throw new AnhangError("Das ist keine gültige Präsentation.");
  return { text: slides.map((s, i) => `Folie ${i + 1}\n${odfXmlToText(s)}`).join("\n"), info: `${slides.length} ${slides.length === 1 ? "Folie" : "Folien"}` };
}

function pptx(buf: Buffer): { text: string; info?: string } {
  const files = unzip(buf, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const slides = Object.keys(files).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10));
  if (slides.length === 0) throw new AnhangError("Das ist keine gültige Präsentation.");
  const text = slides
    .map((name, i) => `Folie ${i + 1}\n${decodeEntities(utf8(files[name]!).replace(/<\/a:p>/g, "\n").replace(/<a:br\s*\/>/g, "\n").replace(/<\/a:tc>/g, " | ").replace(/<[^>]+>/g, ""))}`)
    .join("\n");
  return { text, info: `${slides.length} ${slides.length === 1 ? "Folie" : "Folien"}` };
}

function sheets(buf: Buffer): { text: string; info?: string } {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(buf, { type: "buffer", sheetRows: ROWS + 1, dense: true });
  } catch {
    throw new AnhangError("Diese Tabelle lässt sich nicht öffnen. Vielleicht ist sie beschädigt oder mit einem Passwort geschützt.");
  }
  const names = book.SheetNames;
  const parts: string[] = [];
  for (const name of names.slice(0, SHEETS)) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name]!, { header: 1, raw: false, blankrows: false, defval: "" });
    const lines = rows.slice(0, ROWS).map((r) => r.slice(0, COLS).map((c) => String(c).replace(/\s+/g, " ").trim()).join(" | ").replace(/( \| )+$/, ""));
    const more = rows.length > ROWS ? `\n[… weitere Zeilen nicht gezeigt]` : "";
    parts.push(`Blatt: ${name}\n${lines.filter(Boolean).join("\n")}${more}`);
  }
  if (names.length > SHEETS) parts.push(`[… ${names.length - SHEETS} weitere Blätter nicht gezeigt]`);
  return { text: parts.join("\n\n"), info: `${names.length} ${names.length === 1 ? "Blatt" : "Blätter"}` };
}

async function pdf(buf: Buffer): Promise<Extract> {
  let file;
  try {
    file = await readPdf(buf);
  } catch {
    throw new AnhangError("Diese PDF-Datei lässt sich nicht öffnen. Vielleicht ist sie beschädigt oder mit einem Passwort geschützt.");
  }
  try {
    const n = file.pages.length;
    const info = `${n} ${n === 1 ? "Seite" : "Seiten"}`;
    const text = file.pages.map((p) => p.rows.map((r) => r.text.replace(/\t+/g, " | ")).join("\n")).join("\n\n");
    if (text.replace(/\s/g, "").length >= 20) return { art: "PDF", text, info, gekuerzt: false };
    // A scan without text layer: hand over the first pages as pictures.
    const scanSeiten: Buffer[] = [];
    for (let i = 1; i <= Math.min(n, MAX_SCAN_PAGES); i++) scanSeiten.push(await file.renderPage(i, 1400));
    return { art: "PDF (Scan)", text: "", info, gekuerzt: n > MAX_SCAN_PAGES, scanSeiten };
  } finally {
    await file.close();
  }
}

/** Reads the text out of a file the teacher gave us. Throws {@link AnhangError} in plain German when that is not possible. */
export async function extractFile(buf: Buffer, name: string): Promise<Extract> {
  const ext = extensionOf(name);
  if (buf.length > MAX_FILE_BYTES) throw new AnhangError("Die Datei ist größer als 25 MB. Bitte nimm eine kleinere.");
  if (buf.length === 0) throw new AnhangError("Die Datei ist leer.");
  if (OLD_OFFICE[ext]) throw new AnhangError(`Das alte ${OLD_OFFICE[ext]}-Format (.${ext}) kann ich nicht lesen. Bitte speichere die Datei in ${OLD_OFFICE[ext]} als .${ext}x ab oder als PDF.`);
  if (!FILE_EXTENSIONS.includes(ext)) throw new AnhangError(`Dateien vom Typ .${ext || "?"} kann ich nicht lesen. Geht: PDF, Word, Excel, OpenOffice, PowerPoint, Text und CSV.`);

  let result: Extract;
  if (ext === "pdf") result = await pdf(buf);
  else {
    let art = "Text";
    let part: { text: string; info?: string };
    if (ext === "docx") {
      art = "Word";
      part = { text: (await mammoth.extractRawText({ buffer: buf }).catch(() => { throw new AnhangError("Diese Word-Datei lässt sich nicht öffnen. Vielleicht ist sie beschädigt."); })).value };
    } else if (ext === "odt") {
      art = "OpenOffice";
      part = odt(buf);
    } else if (ext === "odp") {
      art = "Präsentation";
      part = odp(buf);
    } else if (ext === "pptx") {
      art = "Präsentation";
      part = pptx(buf);
    } else if (["xlsx", "xlsm", "xlsb", "xls", "ods"].includes(ext)) {
      art = "Tabelle";
      part = sheets(buf);
    } else if (ext === "csv" || ext === "tsv") {
      art = "Tabelle";
      part = { text: decodeText(buf) };
    } else if (ext === "html" || ext === "htm") part = { text: htmlToText(decodeText(buf)) };
    else if (ext === "rtf") {
      art = "Text";
      part = { text: rtfToText(decodeText(buf)) };
    } else part = { text: decodeText(buf) };
    result = { art, text: part.text, info: part.info, gekuerzt: false };
  }

  if (!result.scanSeiten) {
    const text = tidy(result.text);
    if (text.replace(/\s/g, "").length < 2) throw new AnhangError("In dieser Datei steht kein lesbarer Text.");
    result.gekuerzt = text.length > MAX_CHARS;
    result.text = result.gekuerzt ? `${text.slice(0, MAX_CHARS)}\n[… gekürzt, die Datei ist länger]` : text;
  }
  return result;
}

export interface SentFile {
  name: string;
  text: string;
}

export const MAX_FILES = 5;
export const MAX_TOTAL_CHARS = 80000;

/** Puts the files' text behind the question, each in a marked block, so the model knows where the teacher's own words end. */
export function withFiles(question: string, files: SentFile[]): string {
  if (files.length === 0) return question;
  const blocks = files.map((f) => `<datei name="${f.name.replace(/[<>"\r\n]/g, "_").slice(0, 120)}">\n${f.text.replace(/<\/datei>/gi, "</ datei>")}\n</datei>`);
  return `${question}\n\n${blocks.join("\n\n")}`;
}

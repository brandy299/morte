import { readFile } from "node:fs/promises";
import mammoth from "mammoth";
import { readPdf } from "../lehrplan/pdf.ts";

const MAX_CHARS = 12000;

/**
 * Text of a material file, so the assistant can build on it (differentiate, prepare a lesson).
 * PDFs, Word files (.docx) and plain text can be read. Other types are listed but not opened, and the answer says so in plain words.
 */
export async function readMaterialText(path: string): Promise<string> {
  const ext = /\.([A-Za-z0-9]+)$/.exec(path)?.[1]?.toLowerCase();
  let text: string;
  if (ext === "txt") text = await readFile(path, "utf8");
  else if (ext === "docx") {
    text = (await mammoth.extractRawText({ path })).value;
    if (text.replace(/\s/g, "").length < 10) return "Diese Word-Datei enthält keinen lesbaren Text.";
  } else if (ext === "pdf") {
    const pdf = await readPdf(await readFile(path));
    try {
      text = pdf.pages.map((p) => p.rows.map((r) => r.text.replace(/\t+/g, " | ")).join("\n")).join("\n\n");
      if (text.replace(/\s/g, "").length < 20) return "Diese Datei enthält keinen lesbaren Text (vermutlich ein Scan). Bitte die Lehrkraft, das Blatt als Bild in den Chat zu legen.";
    } finally {
      await pdf.close();
    }
  } else return `Dateien vom Typ .${ext} kann ich nicht lesen. Bitte die Lehrkraft, kurz zu sagen, was darin steht, oder die Seite als Bild in den Chat zu legen.`;
  text = text.trim();
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n[… gekürzt, die Datei ist länger]` : text;
}

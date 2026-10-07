import { readFile } from "node:fs/promises";
import { AnhangError, extractFile } from "../anhang/extract.ts";

/**
 * Text of a material file, so the assistant can build on it (differentiate, prepare a lesson).
 * Reads everything the chat accepts as attachment; the answer says in plain words when a file cannot be read.
 */
export async function readMaterialText(path: string): Promise<string> {
  try {
    const result = await extractFile(await readFile(path), path);
    if (result.scanSeiten) return "Diese Datei enthält keinen lesbaren Text (vermutlich ein Scan). Bitte die Lehrkraft, das Blatt als Bild oder PDF in den Chat zu legen.";
    return result.text;
  } catch (e) {
    if (e instanceof AnhangError) return e.message;
    throw e;
  }
}

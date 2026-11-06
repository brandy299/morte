import { mkdir, readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { AnhangError, extensionOf, extractFile, FILE_EXTENSIONS } from "../anhang/extract.ts";

/** Plain-German problem with the chosen folder, shown to the teacher as it is. */
export class ArbeitsordnerError extends Error {}

/** Files the assistant may write: plain text only. Material (PDF, Word) is made by the material tools. */
export const SCHREIBBAR = ["txt", "md", "csv", "html"];
const MAX_SCHREIBEN = 1_000_000;
const MAX_EINTRAEGE = 200;

/** Checks a folder the teacher picked and returns its real path. The whole disk or the whole user folder is too much. */
export async function pruefeOrdner(pfad: string): Promise<string> {
  const typed = pfad.trim().replace(/^~(?=$|[/\\])/, homedir());
  if (!typed || !isAbsolute(typed)) throw new ArbeitsordnerError("Bitte wähle den Ordner über den Knopf aus.");
  let real: string;
  try {
    real = await realpath(typed);
    if (!(await stat(real)).isDirectory()) throw new Error();
  } catch {
    throw new ArbeitsordnerError("Diesen Ordner finde ich nicht.");
  }
  if (dirname(real) === real || real === (await realpath(homedir()).catch(() => homedir()))) {
    throw new ArbeitsordnerError("Das ist zu viel auf einmal. Wähle einen Ordner, in dem du gerade arbeitest, zum Beispiel einen Unterordner in Dokumente.");
  }
  return real;
}

/**
 * Turns a path from the assistant into a path inside the chosen folder.
 * Anything outside is refused, also through `..` and through links that lead out of the folder.
 */
export async function aufloesen(wurzel: string, rel: string): Promise<string> {
  const echteWurzel = await realpath(wurzel).catch(() => {
    throw new ArbeitsordnerError("Der gewählte Ordner ist nicht mehr da. Bitte wähle ihn neu.");
  });
  if (isAbsolute(rel)) throw new ArbeitsordnerError("Bitte nur Pfade innerhalb des gewählten Ordners angeben, ohne Laufwerk oder Schrägstrich am Anfang.");
  const ziel = resolve(echteWurzel, rel || ".");
  const drin = (p: string) => p === echteWurzel || p.startsWith(echteWurzel + sep);
  if (!drin(ziel)) throw new ArbeitsordnerError("Dieser Pfad liegt außerhalb des gewählten Ordners.");
  // The deepest part that exists must really be inside (a link could point out).
  let existierend = ziel;
  for (;;) {
    try {
      if (!drin(await realpath(existierend))) throw new ArbeitsordnerError("Dieser Pfad liegt außerhalb des gewählten Ordners.");
      break;
    } catch (err) {
      if (err instanceof ArbeitsordnerError) throw err;
      const oben = dirname(existierend);
      if (oben === existierend) throw new ArbeitsordnerError("Diesen Pfad finde ich nicht.");
      existierend = oben;
    }
  }
  return ziel;
}

export interface Eintrag {
  name: string;
  ordner: boolean;
  bytes?: number;
}

export async function auflisten(wurzel: string, rel = ""): Promise<{ eintraege: Eintrag[]; mehr: number }> {
  const dir = await aufloesen(wurzel, rel);
  let namen;
  try {
    namen = await readdir(dir, { withFileTypes: true });
  } catch {
    throw new ArbeitsordnerError("Diesen Ordner kann ich nicht öffnen.");
  }
  const sichtbar = namen.filter((d) => !d.name.startsWith(".") && d.name !== "node_modules").sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name, "de"));
  const eintraege = await Promise.all(
    sichtbar.slice(0, MAX_EINTRAEGE).map(async (d): Promise<Eintrag> => (d.isDirectory() ? { name: d.name, ordner: true } : { name: d.name, ordner: false, bytes: (await stat(join(dir, d.name)).catch(() => undefined))?.size })),
  );
  return { eintraege, mehr: Math.max(0, sichtbar.length - MAX_EINTRAEGE) };
}

/** Text of a file in the chosen folder (PDF, Word, Excel, text and the other types the chat reads too). */
export async function lesen(wurzel: string, rel: string): Promise<{ text: string; info?: string; gekuerzt: boolean }> {
  const datei = await aufloesen(wurzel, rel);
  if (!(await stat(datei).catch(() => undefined))?.isFile()) throw new ArbeitsordnerError("Diese Datei finde ich nicht.");
  try {
    const { text, info, gekuerzt } = await extractFile(await readFile(datei), basename(datei));
    return { text, info, gekuerzt };
  } catch (err) {
    if (err instanceof AnhangError) throw new ArbeitsordnerError(err.message);
    throw err;
  }
}

/** Writes a text file. Without `ersetzen` an existing file is never touched. */
export async function schreiben(wurzel: string, rel: string, text: string, ersetzen = false): Promise<{ pfad: string; neu: boolean }> {
  if (!rel.trim() || rel.endsWith("/") || rel.endsWith("\\")) throw new ArbeitsordnerError("Bitte einen Dateinamen angeben.");
  const ext = extensionOf(rel);
  if (!SCHREIBBAR.includes(ext)) throw new ArbeitsordnerError(`Ich schreibe hier nur Textdateien (${SCHREIBBAR.map((e) => "." + e).join(", ")}). Fertige Arbeitsblätter und Klausuren erstelle ich mit den Material-Werkzeugen.`);
  if (text.length > MAX_SCHREIBEN) throw new ArbeitsordnerError("Der Text ist zu lang für eine Datei.");
  const datei = await aufloesen(wurzel, rel);
  const gibtEs = Boolean(await stat(datei).catch(() => undefined));
  if (gibtEs && !ersetzen) throw new ArbeitsordnerError("Diese Datei gibt es schon. Ich überschreibe nichts, ohne zu fragen: Nimm einen anderen Namen oder ersetze sie mit dem Werkzeug zum Ersetzen.");
  if (gibtEs && !(await stat(datei)).isFile()) throw new ArbeitsordnerError("Das ist ein Ordner, keine Datei.");
  await mkdir(dirname(datei), { recursive: true });
  // The folders were just created, so check again that nothing leads out.
  await aufloesen(wurzel, rel);
  await writeFile(datei, text, { encoding: "utf8", flag: ersetzen ? "w" : "wx" });
  return { pfad: relative(await realpath(wurzel), datei).split(sep).join("/"), neu: !gibtEs };
}

export const LESBAR = FILE_EXTENSIONS;

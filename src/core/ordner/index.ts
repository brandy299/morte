import { execFile } from "node:child_process";
import { cp, mkdir, readdir, stat, writeFile, unlink, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { dataDir, dataDirFixed, defaultDataDir, pointerFile } from "../paths.ts";

/** Plain-German problem with a folder, shown to the teacher as it is. */
export class OrdnerError extends Error {}

/** Opens the data folder in Finder, Explorer or the file manager. The path is always the data folder, never input from outside. */
export async function openDataDir(platform: NodeJS.Platform = process.platform): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  const [cmd, args] = platform === "darwin" ? ["open", [dir]] : platform === "win32" ? ["explorer.exe", [dir]] : ["xdg-open", [dir]];
  await new Promise<void>((done, fail) => {
    // explorer.exe reports exit code 1 even when it worked.
    execFile(cmd!, args as string[], (err) => (err && platform !== "win32" ? fail(new OrdnerError("Ich konnte den Ordner nicht öffnen. Du findest ihn unter: " + dir)) : done()));
  });
}

/** Lets the teacher pick a folder in the system dialog. Only macOS has one that needs nothing installed; elsewhere the path is typed. */
export async function pickFolder(): Promise<string | undefined> {
  if (process.platform !== "darwin") return undefined;
  return new Promise((done) => {
    execFile("osascript", ["-e", 'POSIX path of (choose folder with prompt "Wo sollen deine Pult-Daten liegen?")'], (err, out) => done(err ? undefined : out.trim().replace(/\/$/, "") || undefined));
  });
}

export interface OrdnerInfo {
  pfad: string;
  /** Fixed by PULT_HOME, cannot be changed here. */
  fest: boolean;
  standard: string;
  plattform: NodeJS.Platform;
  /** The system dialog for choosing a folder exists. */
  waehlen: boolean;
}

export const ordnerInfo = (): OrdnerInfo => ({ pfad: dataDir(), fest: dataDirFixed(), standard: defaultDataDir(), plattform: process.platform, waehlen: process.platform === "darwin" });

async function isEmptyOrMissing(dir: string): Promise<boolean> {
  try {
    return (await readdir(dir)).length === 0;
  } catch {
    return true;
  }
}

/**
 * Moves the data to another folder: copies everything, then remembers the new place. The old folder stays untouched,
 * so nothing can get lost. The new place counts after the next start of the app.
 */
export async function changeDataDir(target: string): Promise<{ pfad: string }> {
  if (dataDirFixed()) throw new OrdnerError("Der Ordner ist von außen festgelegt und lässt sich hier nicht ändern.");
  const typed = target.trim().replace(/^~(?=$|\/)/, homedir());
  if (!typed || !isAbsolute(typed)) throw new OrdnerError("Bitte gib den ganzen Pfad an, zum Beispiel /Users/name/Dokumente/pult-daten.");
  const wanted = resolve(typed);
  const current = resolve(dataDir());
  if (wanted === current) throw new OrdnerError("Das ist schon der aktuelle Ordner.");
  const inside = (a: string, b: string) => !relative(a, b).startsWith("..") && relative(a, b) !== "";
  if (inside(current, wanted) || inside(wanted, current)) throw new OrdnerError("Der neue Ordner darf nicht im alten liegen und der alte nicht im neuen.");
  if (!(await isEmptyOrMissing(wanted))) throw new OrdnerError("Der neue Ordner ist nicht leer. Bitte nimm einen neuen oder leeren Ordner, damit nichts vermischt wird.");
  try {
    await mkdir(wanted, { recursive: true });
    const probe = join(wanted, ".schreibtest");
    await writeFile(probe, "ok");
    await unlink(probe);
  } catch {
    throw new OrdnerError("In diesen Ordner darf ich nicht schreiben. Bitte wähle einen anderen.");
  }
  try {
    if ((await stat(current).catch(() => undefined))?.isDirectory()) await cp(current, wanted, { recursive: true });
  } catch {
    await rm(wanted, { recursive: true, force: true }).catch(() => {});
    throw new OrdnerError("Das Kopieren hat nicht geklappt. Deine Daten im alten Ordner sind unverändert.");
  }
  await writeFile(pointerFile(), wanted, "utf8");
  return { pfad: wanted };
}

/** Goes back to the standard folder (the data there stays as it is). */
export async function resetDataDir(): Promise<void> {
  if (dataDirFixed()) throw new OrdnerError("Der Ordner ist von außen festgelegt und lässt sich hier nicht ändern.");
  await unlink(pointerFile()).catch(() => {});
}

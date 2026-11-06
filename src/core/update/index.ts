import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The program folder (two levels up from src/core/update). */
const root = () => join(import.meta.dirname, "..", "..", "..");
const stampFile = () => join(root(), ".pult-stand");
const API = () => process.env.PULT_UPDATE_API ?? "https://api.github.com/repos/brandy299/morte/commits/main";

export interface UpdateInfo {
  /** A newer version is on GitHub and this folder may be replaced. */
  verfuegbar: boolean;
  /** Short ids, for the "Nenne das bei einer Fehlermeldung" line. Empty when unknown. */
  aktuell: string;
  neu: string;
  /** Set when updating from inside the app is not possible (development folder) or the check failed. */
  hinweis?: string;
}

export class UpdateError extends Error {}

const short = (sha: string) => sha.slice(0, 7);

/** Development folders (with git history) are updated with git, never overwritten by the updater. */
export const istEntwicklungsordner = () => existsSync(join(root(), ".git"));

/** The installed desktop app (PULT_APP is set by electron/main.mjs). Its files are part of the program and are replaced by a new download, not by this updater. */
export const istProgramm = () => process.env.PULT_APP === "1";
const PROGRAMM_HINWEIS = "Pult ist als Programm installiert. Eine neue Version lädst du auf der Download-Seite herunter und installierst sie einfach darüber. Deine Daten bleiben.";

export const installedSha = (): string => {
  try {
    return readFileSync(stampFile(), "utf8").trim();
  } catch {
    return "";
  }
};

/** Asks GitHub for the newest version on main. */
export async function latestSha(): Promise<string> {
  const res = await fetch(API(), {
    headers: { accept: "application/vnd.github.sha", "user-agent": "pult-update" },
    signal: AbortSignal.timeout(8000),
  });
  const sha = (await res.text()).trim();
  if (!res.ok || !/^[0-9a-f]{40}$/.test(sha)) throw new UpdateError("GitHub hat nicht richtig geantwortet.");
  return sha;
}

export async function checkUpdate(): Promise<UpdateInfo> {
  const aktuell = installedSha();
  if (istProgramm()) return { verfuegbar: false, aktuell: short(aktuell), neu: "", hinweis: PROGRAMM_HINWEIS };
  if (istEntwicklungsordner()) return { verfuegbar: false, aktuell: short(aktuell), neu: "", hinweis: "Das ist ein Entwicklungsordner. Dort wird mit git aktualisiert." };
  let neu: string;
  try {
    neu = await latestSha();
  } catch {
    return { verfuegbar: false, aktuell: short(aktuell), neu: "", hinweis: "Ich konnte nicht nachsehen. Prüfe deine Internetverbindung." };
  }
  // Without a stamp (installed before this feature) we cannot know, so we offer the update once.
  return { verfuegbar: neu !== aktuell, aktuell: short(aktuell), neu: short(neu) };
}

/**
 * Starts the updater as its own process, so it can replace the files while the server is not running.
 * The caller must stop the server right after this returns.
 */
export async function startUpdate(): Promise<void> {
  if (istProgramm()) throw new UpdateError(PROGRAMM_HINWEIS);
  if (istEntwicklungsordner()) throw new UpdateError("Das ist ein Entwicklungsordner. Dort wird mit git aktualisiert.");
  const sha = await latestSha().catch(() => {
    throw new UpdateError("Ich konnte nicht nachsehen. Prüfe deine Internetverbindung.");
  });
  const child = spawn(process.execPath, [join(root(), "scripts", "aktualisieren.mjs"), sha, String(process.env.PORT ?? 3001)], {
    cwd: root(),
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

import { readFileSync } from "node:fs";
import { rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Small file in the user's home that remembers a data folder chosen in the settings. Not inside the data folder itself. */
export const pointerFile = () => join(homedir(), ".pult-ordner");
/** The same file under the old name of the app ("morte"). Still read, and renamed once at start. */
const legacyPointerFile = () => join(homedir(), ".morte-ordner");

export const defaultDataDir = () => join(homedir(), "pult-daten");

/** The folder set from outside: PULT_HOME, or the old MORTE_HOME of earlier versions. */
const envHome = () => process.env.PULT_HOME || process.env.MORTE_HOME || undefined;

/** True when the folder is fixed by the environment (PULT_HOME) and cannot be changed in the settings. */
export const dataDirFixed = () => Boolean(envHome());

/** Per-user data folder, outside the repo. One folder per user keeps multi-user setups possible later. */
export function dataDir(): string {
  const fixed = envHome();
  if (fixed) return fixed;
  for (const file of [pointerFile(), legacyPointerFile()]) {
    try {
      const chosen = readFileSync(file, "utf8").trim();
      if (chosen) return chosen;
    } catch {
      // Not there.
    }
  }
  return defaultDataDir();
}

/**
 * The app was called "morte" before. Moves the old data folder and the old pointer file once, so nothing a teacher made is left behind.
 * Does nothing when a folder is set explicitly or the new folder already exists.
 */
export async function moveLegacyDataDir(): Promise<void> {
  if (envHome()) return;
  const exists = (p: string) => stat(p).then(() => true, () => false);
  if (!(await exists(pointerFile())) && (await exists(legacyPointerFile()))) {
    await writeFile(pointerFile(), readFileSync(legacyPointerFile(), "utf8"), "utf8");
    await unlink(legacyPointerFile()).catch(() => {});
  }
  const legacy = join(homedir(), "morte-daten");
  if (!(await exists(dataDir())) && (await exists(legacy))) await rename(legacy, dataDir());
}

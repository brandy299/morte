import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Small file in the user's home that remembers a data folder chosen in the settings. Not inside the data folder itself. */
export const pointerFile = () => join(homedir(), ".morte-ordner");

export const defaultDataDir = () => join(homedir(), "morte-daten");

/** True when the folder is fixed by the environment (MORTE_HOME) and cannot be changed in the settings. */
export const dataDirFixed = () => Boolean(process.env.MORTE_HOME);

/** Per-user data folder, outside the repo. One folder per user keeps multi-user setups possible later. */
export function dataDir(): string {
  if (process.env.MORTE_HOME) return process.env.MORTE_HOME;
  try {
    const chosen = readFileSync(pointerFile(), "utf8").trim();
    if (chosen) return chosen;
  } catch {
    // No folder chosen yet.
  }
  return defaultDataDir();
}

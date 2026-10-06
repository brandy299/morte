import { rename, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Per-user data folder, outside the repo. One folder per user keeps multi-user setups possible later. */
export function dataDir(): string {
  return process.env.PULT_HOME ?? join(homedir(), "pult-daten");
}

/**
 * The app was called "morte" before. Moves the old data folder once, so nothing a teacher made is left behind.
 * Does nothing when a folder is set explicitly or the new folder already exists.
 */
export async function moveLegacyDataDir(): Promise<void> {
  if (process.env.PULT_HOME) return;
  const exists = (p: string) => stat(p).then(() => true, () => false);
  const legacy = join(homedir(), "morte-daten");
  if (!(await exists(dataDir())) && (await exists(legacy))) await rename(legacy, dataDir());
}

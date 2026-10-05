import { homedir } from "node:os";
import { join } from "node:path";

/** Per-user data folder, outside the repo. One folder per user keeps multi-user setups possible later. */
export function dataDir(): string {
  return process.env.MORTE_HOME ?? join(homedir(), "morte-daten");
}

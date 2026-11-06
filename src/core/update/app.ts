import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize } from "node:path";
import { unzipSync } from "fflate";
import { UpdateError } from "./errors.ts";

/**
 * Updates of the desktop app. The installed program (Electron, the libraries) stays; only Pult's own code
 * (src, skills, assets, the built page) is replaced by a small package from the "code" release on GitHub.
 * It lands next to the data in a folder of its own, and the app starts from there. When the libraries or the
 * app shell changed (the "basis" differs), a new installation is needed and the button says so.
 */

export interface CodeManifest {
  sha: string;
  /** Hash of package-lock.json and the shell version. Must match the installed program. */
  basis: string;
  /** SHA-256 of code.zip. */
  pruefsumme: string;
}

const BASE = () => process.env.PULT_CODE_URL ?? "https://github.com/brandy299/morte/releases/download/code";
export const RELEASES_SEITE = "https://github.com/brandy299/morte/releases";

export async function ladeManifest(): Promise<CodeManifest> {
  const res = await fetch(`${BASE()}/code.json`, { signal: AbortSignal.timeout(8000) });
  const m = (await res.json().catch(() => undefined)) as Partial<CodeManifest> | undefined;
  if (!res.ok || !m || !/^[0-9a-f]{40}$/.test(m.sha ?? "") || typeof m.basis !== "string" || !/^[0-9a-f]{64}$/.test(m.pruefsumme ?? "")) {
    throw new UpdateError("GitHub hat nicht richtig geantwortet.");
  }
  return m as CodeManifest;
}

/** What the installed program is made of, set by electron/main.mjs. */
export const installierteBasis = () => process.env.PULT_BASIS ?? "";

/**
 * Downloads the code package, checks it and puts it in place as the folder the app starts from at the next start.
 * Nothing is touched before the package is complete and checked.
 */
export async function ladeCode(manifest: CodeManifest): Promise<void> {
  const ziel = process.env.PULT_CODE_DIR;
  const bibliotheken = process.env.PULT_NODE_MODULES;
  if (!ziel || !bibliotheken) throw new UpdateError("Das Aktualisieren geht hier nicht.");
  if (manifest.basis !== installierteBasis()) throw new UpdateError("Diese Version braucht eine neue Installation.");

  const res = await fetch(`${BASE()}/code.zip`, { signal: AbortSignal.timeout(180000) }).catch(() => undefined);
  if (!res?.ok) throw new UpdateError("Ich konnte die neue Version nicht laden. Prüfe deine Internetverbindung.");
  const zip = Buffer.from(await res.arrayBuffer());
  if (createHash("sha256").update(zip).digest("hex") !== manifest.pruefsumme) throw new UpdateError("Der Download ist beschädigt. Versuche es später noch einmal.");

  const dateien = unzipSync(new Uint8Array(zip));
  if (!dateien["package.json"]) throw new UpdateError("Der Download sieht nicht richtig aus.");
  const neu = join(ziel, "neu");
  await rm(neu, { recursive: true, force: true });
  for (const [name, inhalt] of Object.entries(dateien)) {
    const sauber = normalize(name);
    if (name.endsWith("/") || isAbsolute(sauber) || sauber.startsWith("..")) continue;
    const datei = join(neu, sauber);
    await mkdir(dirname(datei), { recursive: true });
    await writeFile(datei, inhalt);
  }
  // The libraries stay where the program put them; the new code finds them through this link.
  await symlink(bibliotheken, join(neu, "node_modules"), "junction");
  await writeFile(join(neu, ".pult-stand"), manifest.sha);
  await writeFile(join(neu, ".basis"), `${manifest.basis}/${process.env.PULT_APP_VERSION ?? ""}`);

  // Only now the old code is swapped.
  const aktuell = join(ziel, "aktuell");
  const alt = join(ziel, "alt");
  await rm(alt, { recursive: true, force: true });
  if (existsSync(aktuell)) await rename(aktuell, alt);
  await rename(neu, aktuell);
  await rm(alt, { recursive: true, force: true });
}

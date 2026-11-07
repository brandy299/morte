import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { mkdir, readdir, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
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
  /** Version of the program (package.json), names the release with the installers. */
  version?: string;
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
  // Every version gets a folder of its own (named by its commit): the one the app runs from cannot be replaced while it runs (Windows).
  const ordner = join(ziel, manifest.sha);
  await rm(ordner, { recursive: true, force: true });
  for (const [name, inhalt] of Object.entries(dateien)) {
    const sauber = normalize(name);
    if (name.endsWith("/") || isAbsolute(sauber) || sauber.startsWith("..")) continue;
    const datei = join(ordner, sauber);
    await mkdir(dirname(datei), { recursive: true });
    await writeFile(datei, inhalt);
  }
  // The libraries stay where the program put them; the new code finds them through this link.
  await symlink(bibliotheken, join(ordner, "node_modules"), "junction");
  await writeFile(join(ordner, ".pult-stand"), manifest.sha);
  await writeFile(join(ordner, ".basis"), `${manifest.basis}/${process.env.PULT_APP_VERSION ?? ""}`);

  // Only now the app is pointed to the new folder (a small file, replaced in one step).
  await writeFile(join(ziel, "aktuell.neu"), manifest.sha);
  await rename(join(ziel, "aktuell.neu"), join(ziel, "aktuell.txt"));
  // Older folders (also those of earlier app versions) go if they can; the one still running cannot be deleted and goes next time.
  for (const name of await readdir(ziel).catch(() => [] as string[])) {
    if (name === manifest.sha || !/^([0-9a-f]{40}|aktuell|neu|alt)$/.test(name)) continue;
    // Unlink the link to the libraries first, so removing the folder can never reach the libraries themselves.
    await unlink(join(ziel, name, "node_modules")).catch(() => {});
    await rm(join(ziel, name), { recursive: true, force: true }).catch(() => {});
  }
}

/** Where the installer of a version lies and under which name, for this computer. Undefined: no installer for this system. */
export function installerFuer(version: string, plattform = process.platform, arch = process.arch): { name: string; url: string } | undefined {
  const ende = plattform === "win32" && arch === "x64" ? "win-x64.exe" : plattform === "darwin" ? `mac-${arch === "arm64" ? "arm64" : "x64"}.dmg` : undefined;
  if (!ende || !/^\d+\.\d+\.\d+$/.test(version)) return undefined;
  const name = `Pult-${version}-${ende}`;
  const base = process.env.PULT_RELEASE_URL ?? "https://github.com/brandy299/morte/releases/download";
  return { name, url: `${base}/v${version}/${name}` };
}

/** Downloads the installer of the new version and checks it against the checksum list of the release. */
export async function ladeInstaller(version: string, plattform = process.platform, arch = process.arch): Promise<string> {
  const inst = installerFuer(version, plattform, arch);
  if (!inst) throw new UpdateError("Für diesen Computer gibt es keine automatische Aktualisierung.");
  const base = inst.url.slice(0, inst.url.lastIndexOf("/"));
  const get = (url: string, ms: number) => fetch(url, { signal: AbortSignal.timeout(ms) }).catch(() => undefined);
  const sums = await get(`${base}/SHA256SUMS.txt`, 15000);
  if (!sums?.ok) throw new UpdateError("Die neue Version ist noch nicht fertig. Versuche es in ein paar Minuten noch einmal.");
  const erwartet = (await sums.text()).split(/\r?\n/).map((z) => z.trim().split(/\s+/)).find(([, n]) => n?.replace(/^\*/, "") === inst.name)?.[0];
  if (!erwartet || !/^[0-9a-f]{64}$/i.test(erwartet)) throw new UpdateError("Die neue Version ist noch nicht fertig. Versuche es in ein paar Minuten noch einmal.");
  const res = await get(inst.url, 600000);
  if (!res?.ok) throw new UpdateError("Ich konnte die neue Version nicht laden. Prüfe deine Internetverbindung.");
  const datei = Buffer.from(await res.arrayBuffer());
  if (createHash("sha256").update(datei).digest("hex") !== erwartet.toLowerCase()) throw new UpdateError("Der Download ist beschädigt. Versuche es später noch einmal.");
  const ziel = join(process.env.PULT_CODE_DIR ?? tmpdir(), "installer");
  await rm(ziel, { recursive: true, force: true });
  await mkdir(ziel, { recursive: true });
  const pfad = join(ziel, inst.name);
  await writeFile(pfad, datei);
  return pfad;
}

/**
 * Starts the installation of a downloaded installer so that it runs after this app has closed, and starts the new Pult at the end.
 * The file comes from our own download, not from a browser, so neither Windows nor macOS puts a "from the internet" mark on it.
 * Returns false when it cannot be done here (the app lies where it may not be changed); then the installer is opened for a click.
 */
export function installiere(pfad: string, plattform = process.platform): boolean {
  const abgekoppelt = (cmd: string, args: string[], verbatim = false) => spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true, windowsVerbatimArguments: verbatim }).unref();
  if (plattform === "win32") {
    // The program has to be closed first; the installer of electron-builder then installs for this user and starts Pult again.
    abgekoppelt("cmd.exe", ["/d", "/s", "/c", `"ping -n 4 127.0.0.1 >nul & "${pfad}" /S --force-run"`], true);
    return true;
  }
  if (plattform === "darwin") {
    // …/Pult.app/Contents/MacOS/Pult → …/Pult.app
    const app = /^(.*\.app)\/Contents\//.exec(process.execPath)?.[1];
    if (!app) return false;
    const skript = [
      "mnt=$(mktemp -d)",
      `while kill -0 ${process.ppid} 2>/dev/null; do sleep 1; done`,
      `if hdiutil attach "$1" -nobrowse -quiet -mountpoint "$mnt" && [ -d "$mnt/Pult.app" ]; then`,
      `  rm -rf "$2.neu" && cp -R "$mnt/Pult.app" "$2.neu" && rm -rf "$2" && mv "$2.neu" "$2" && xattr -dr com.apple.quarantine "$2" 2>/dev/null`,
      `  hdiutil detach "$mnt" -quiet`,
      `  open "$2"`,
      "else open \"$1\"; fi",
    ].join("\n");
    abgekoppelt("/bin/sh", ["-c", skript, "sh", pfad, app]);
    return true;
  }
  return false;
}

// Updates Pult in place: waits until the old server has stopped, downloads the new version, replaces the program files
// (installed parts, own Node.js copy and all user data stay) and starts Pult again.
// Started by the server (src/core/update) with: node scripts/aktualisieren.mjs <commit> <port>. Only Node built-ins here.
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [sha, port = "3001"] = process.argv.slice(2);
const log = join(tmpdir(), "pult-update.log");
const note = (text) => appendFileSync(log, `${new Date().toISOString()} ${text}\n`);
const KEEP = new Set(["node_modules", "node"]);
const source = process.env.PULT_QUELLE ?? `https://codeload.github.com/brandy299/morte/tar.gz/${sha}`;

/** Waits until nothing answers on the port any more (the old server is gone). */
async function waitForStop() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      return;
    }
  }
}

async function replaceFiles() {
  if (!/^[0-9a-f]{40}$/.test(sha ?? "") || existsSync(join(root, ".git"))) throw new Error("Update nicht erlaubt.");
  const tmp = mkdtempSync(join(tmpdir(), "pult-update-"));
  try {
    const res = await fetch(source, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`Download: ${res.status}`);
    const archive = join(tmp, "pult.tar.gz");
    writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
    const fresh = join(tmp, "neu");
    mkdirSync(fresh);
    // tar ships with macOS, Linux and Windows 10 or newer.
    if (spawnSync("tar", ["-xzf", archive, "-C", fresh, "--strip-components=1"]).status !== 0) throw new Error("Auspacken hat nicht geklappt.");
    if (!existsSync(join(fresh, "package.json"))) throw new Error("Der Download sieht nicht richtig aus.");
    // Only from here on is the old version touched.
    for (const name of readdirSync(root)) if (!KEEP.has(name)) rmSync(join(root, name), { recursive: true, force: true });
    cpSync(fresh, root, { recursive: true });
    writeFileSync(join(root, ".pult-stand"), sha);
    try {
      chmodSync(join(root, "Pult starten.command"), 0o755);
    } catch {
      // Not there on every system.
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function restart() {
  if (process.env.PULT_UPDATE_OHNE_START) return;
  const win = process.platform === "win32";
  const [cmd, args] = win
    ? ["cmd", ["/c", "start", "", join(root, "Pult starten.bat")]]
    : process.platform === "darwin"
      ? ["open", [join(root, "Pult starten.command")]]
      : [process.execPath, [join(root, "scripts", "los.mjs")]];
  spawn(cmd, args, { cwd: root, detached: true, stdio: "ignore" }).unref();
}

await waitForStop();
try {
  await replaceFiles();
  note(`ok ${sha}`);
} catch (e) {
  // Nothing was replaced (or the copy broke half way); start whatever is there so the teacher is not left with a dead page.
  note(`Fehler: ${e instanceof Error ? e.message : e}`);
}
restart();

// Builds the package for testers: `npm run zip`. Result: pult-<version>-<date>-<commit>.zip in the project folder.
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { anleitungenBauen } from "../src/release/anleitungen.ts";
import { paketDateien, zipPaket } from "../src/release/paket.ts";
import pkg from "../package.json" with { type: "json" };

const win = process.platform === "win32";
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });

if (git("status", "--porcelain").trim()) console.log("Achtung: Es gibt Änderungen, die noch nicht gespeichert (committet) sind. Sie kommen mit in die ZIP-Datei.\n");

console.log("Baue die Oberfläche …");
if (spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: win }).status !== 0) {
  console.error("Der Aufbau hat nicht geklappt.");
  process.exit(1);
}

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const tracked = git("ls-files", "-z").split("\0").filter(Boolean);
const paths = [...paketDateien(tracked), ...walk("dist").map((p) => p.split("\\").join("/"))];
const files: { path: string; data: Uint8Array }[] = paths.map((path) => ({ path, data: readFileSync(path) }));

// The guides as single HTML files in the main folder: they open by double click, with the pictures inside.
for (const a of anleitungenBauen()) files.push({ path: a.ziel, data: a.data });

const name = `pult-${pkg.version}-${new Date().toISOString().slice(0, 10)}-${git("rev-parse", "--short", "HEAD").trim()}.zip`;
writeFileSync(name, zipPaket("pult", files));
console.log(`\nFertig: ${name} (${(statSync(name).size / 1024 / 1024).toFixed(1)} MB, ${files.length} Dateien)`);
console.log("Schick diese Datei an deine Tester, am besten als Link (Cloud-Ordner). Die Anleitungen liegen darin als „Anleitung.html“ und „OpenRouter einrichten.html“.");

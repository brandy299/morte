// Builds the small update package for the desktop app: Pult's own code without the libraries and without the app shell.
// Output: code-paket/code.zip and code-paket/code.json (commit, "basis", checksum). The app only takes it when its basis matches
// (same libraries and shell as the installed program), see src/core/update/app.ts. Needs `npm run build` first.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "code-paket");
const SKIP = (rel) => /\.test\.ts$/.test(rel) || /\.map$/.test(rel);

function walk(dir, files = {}) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (!SKIP(relative(root, full))) files[relative(root, full).split("\\").join("/")] = new Uint8Array(readFileSync(full));
  }
  return files;
}

if (!existsSync(join(root, "dist", "web", "index.html"))) throw new Error("Erst `npm run build` ausführen.");
const files = {};
for (const dir of ["src", "skills", "assets", "dist/web"]) walk(join(root, dir), files);
files["package.json"] = new Uint8Array(readFileSync(join(root, "package.json")));

const huelle = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).pultHuelle ?? 0;
// Must be computed exactly as in electron/main.mjs. Line endings are ignored: Windows checks files out with CRLF.
const basis = createHash("sha256").update(readFileSync(join(root, "package-lock.json"), "utf8").replace(/\r\n/g, "\n")).update(`\n${huelle}`).digest("hex");
const sha = process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

mkdirSync(out, { recursive: true });
const zip = Buffer.from(zipSync(files, { level: 9 }));
writeFileSync(join(out, "code.zip"), zip);
writeFileSync(join(out, "code.json"), JSON.stringify({ sha, version: JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version, basis, pruefsumme: createHash("sha256").update(zip).digest("hex") }, null, 2) + "\n");
console.log(`code.zip: ${(zip.length / 1e6).toFixed(1)} MB, ${Object.keys(files).length} Dateien, Stand ${sha.slice(0, 7)}`);

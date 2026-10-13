/**
 * The package for testers: one zip with everything Pult needs, the finished web page included,
 * so the tester skips the build step. Node.js and `npm install` are still needed on their computer
 * (some libraries bring parts that differ per system, so node_modules cannot travel in the zip).
 */
import { zipSync, type Zippable } from "fflate";

/** Files from `git ls-files` that a tester does not need. */
const SKIP = [/^evals\//, /^\.claude\//, /^\.github\//, /^design\//, /^docs\//, /^README\.md$/, /\.test\.ts$/, /^vitest\.config\.ts$/, /^\.gitignore$/, /^\.gitattributes$/, /^CLAUDE\.md$/, /^ROADMAP\.md$/, /^Paket bauen\./];

export const paketDateien = (tracked: string[]): string[] => tracked.filter((f) => !SKIP.some((re) => re.test(f)));

const isScript = (path: string) => /\.(command|sh)$/.test(path);
const isBatch = (path: string) => /\.bat$/.test(path);

/** Windows batch files need CRLF line ends, whatever the checkout did. */
export const crlf = (text: string) => text.replace(/\r?\n/g, "\r\n");

/**
 * Zip with one folder `root/` inside, so unpacking makes one tidy folder.
 * Scripts get the executable bit (Mac and Linux), batch files get CRLF.
 */
export function zipPaket(root: string, files: { path: string; data: Uint8Array }[]): Uint8Array {
  const entries: Zippable = {};
  for (const f of files) {
    const data = isBatch(f.path) ? new TextEncoder().encode(crlf(new TextDecoder().decode(f.data))) : f.data;
    // os 3 = Unix; the upper 16 bits of the attribute carry the file mode.
    entries[`${root}/${f.path}`] = [data, isScript(f.path) ? { os: 3, attrs: (0o100755 << 16) >>> 0 } : { os: 3, attrs: (0o100644 << 16) >>> 0 }];
  }
  return zipSync(entries, { level: 6 });
}

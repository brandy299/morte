/**
 * Symbols for explainer pieces: a hand-picked set of outline icons from Tabler Icons (MIT, assets/symbole/LICENSE-Tabler.txt),
 * made by scripts/symbole-importieren.mjs. `d` is the drawing inside a 24x24 svg. No imports from the rest of animation/.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface Symbol { id: string; de: string; tags: string; d: string }

let cache: Symbol[] | undefined;
export function symbole(): Symbol[] {
  cache ??= JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/symbole/symbole.json", import.meta.url)), "utf8")) as Symbol[];
  return cache;
}
export const symbolMitId = (id: string) => symbole().find((s) => s.id === id);

/** One line per symbol for the assistant: id, German name and words to find it by. */
export const symbolZeile = (s: Symbol) => `${s.id}: ${s.de}${s.tags ? ` (${s.tags})` : ""}`;

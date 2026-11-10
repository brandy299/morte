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

const pngCache = new Map<string, Buffer>();
/** A symbol as a picture (png) in one color, for files that cannot draw svg themselves (PowerPoint slides). */
export async function symbolPng(id: string, farbe: string, px = 192): Promise<Buffer> {
  const key = `${id}|${farbe}|${px}`;
  const known = pngCache.get(key);
  if (known) return known;
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${farbe}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${symbolMitId(id)?.d ?? ""}</svg>`;
  const canvas = createCanvas(px, px);
  canvas.getContext("2d").drawImage(await loadImage(Buffer.from(svg)), 0, 0, px, px);
  const png = canvas.toBuffer("image/png");
  pngCache.set(key, png);
  return png;
}

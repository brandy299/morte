/**
 * The catalog of looks for explainer pieces beyond the six hand-made ones. It is made by scripts/stile-importieren.mjs
 * from the open design systems of nexu-io/open-design (Apache-2.0, see assets/stile/NOTICE.md): colors, corner radius,
 * hard shadow and the kind of the headline font. Pure data, no code from there. No imports from the rest of animation/.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface KatalogStil {
  id: string;
  name: string;
  kategorie: string;
  beschreibung: string;
  bg: string;
  ink: string;
  soft: string;
  accent: string;
  fills: [string, string, string];
  kante: number;
  schatten: number;
  rx: number;
  serif: boolean;
  schrift: string;
}

let cache: KatalogStil[] | undefined;
export function katalog(): KatalogStil[] {
  cache ??= JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/stile/katalog.json", import.meta.url)), "utf8")) as KatalogStil[];
  return cache;
}
export const katalogStil = (id: string) => katalog().find((s) => s.id === id);

/** Plain-words look of a catalog style for the assistant, so it can propose styles to a teacher. */
export function stilZeile(s: KatalogStil): string {
  const form = s.schatten ? "harte Schatten, dicke Kanten" : s.rx >= 16 ? "weich, stark gerundet" : s.rx <= 4 ? "eckig, klar" : "dezent gerundet";
  const grund = istDunkel(s.bg) ? "dunkler Hintergrund" : "heller Hintergrund";
  return `${s.id}: ${s.name} (${s.kategorie}); ${grund}, ${form}, ${s.serif ? "Serifenschrift" : "serifenlose Schrift"}${s.beschreibung ? `. ${s.beschreibung}` : ""}`;
}

export const istDunkel = (bg: string) => lum(bg) < 0.3;

function lum(h: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

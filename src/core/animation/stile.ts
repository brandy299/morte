/**
 * The looks of explainer pieces: a hand-picked set of themes from the open kit "html-ppt" (MIT, see assets/baukasten/NOTICE.md).
 * A theme is a small css file of variables (colors, corner radius, shadow) plus a few rules. This file knows their German
 * names, which font family the headline takes, and reads the main colors out of the css for other uses (slides, previews).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Headline font: Fraunces (serif), Source Sans 3 (sans) or the monospace font of the computer (mono). */
export type Schrift = "serif" | "sans" | "mono";
export interface Stil {
  id: string;
  name: string;
  /** How it looks and what it suits, in plain German, for the assistant and the teacher. */
  beschreibung: string;
  schrift: Schrift;
}

export const STILE: readonly Stil[] = [
  { id: "editorial-serif", name: "Editorial", schrift: "serif", beschreibung: "warmes Papierweiß, elegante Serifenschrift, ein dunkelroter Akzent; ruhig und hochwertig, für Deutsch, Geschichte, Politik, Wirtschaft" },
  { id: "minimal-white", name: "Klar", schrift: "sans", beschreibung: "reines Weiß, schwarze Schrift, viel Luft; schlicht und modern, passt zu allem" },
  { id: "swiss-grid", name: "Schweizer Raster", schrift: "sans", beschreibung: "Weiß mit feinem Raster, fette Schrift, Signalrot; streng und klar, für Mathe, Wirtschaft, Technik" },
  { id: "corporate-clean", name: "Sachlich", schrift: "sans", beschreibung: "Weiß und Dunkelblau; seriös wie ein Geschäftsbericht, für Wirtschaft, Recht, Berufskunde" },
  { id: "arctic-cool", name: "Kühl", schrift: "sans", beschreibung: "helles Blaugrau mit Blau; frisch und sachlich, für Naturwissenschaft und Technik" },
  { id: "sunset-warm", name: "Warm", schrift: "sans", beschreibung: "cremeweiß mit Orange; freundlich und einladend, für Sprachen, Gesellschaft, jüngere Klassen" },
  { id: "soft-pastel", name: "Pastell", schrift: "sans", beschreibung: "zartes Rosa und Flieder; weich und freundlich, für jüngere Klassen und soziale Themen" },
  { id: "academic-paper", name: "Wissenschaft", schrift: "serif", beschreibung: "Papierweiß, Serifenschrift, Dunkelblau; wie ein Fachaufsatz, für Oberstufe und Fachtheorie" },
  { id: "japanese-minimal", name: "Still", schrift: "serif", beschreibung: "fast leer, feine Serifenschrift, ein roter Punkt Farbe; sehr ruhig, für Texte, Ethik, Kunst" },
  { id: "magazine-bold", name: "Magazin", schrift: "serif", beschreibung: "sehr große Serifen-Überschriften auf Creme, Orange als Akzent; plakativ, für Einstiege und starke Aussagen" },
  { id: "midcentury", name: "Retro", schrift: "serif", beschreibung: "Sandfarben, Senfgelb und Braun wie in den Sechzigern; gemütlich, für Geschichte und Kultur" },
  { id: "bauhaus", name: "Bauhaus", schrift: "sans", beschreibung: "Creme mit Rot, Blau, Gelb und schwarzen Kanten; geometrisch, für Kunst, Technik, Gestaltung" },
  { id: "neo-brutalism", name: "Neo-Brutalismus", schrift: "sans", beschreibung: "dicke schwarze Kanten, harte Schatten, Knallgelb; laut und jung, für Jugendliche, Medien, Politik" },
  { id: "memphis-pop", name: "Pop", schrift: "sans", beschreibung: "bunte Punkte, Pink und Türkis, schwarze Kanten; verspielt, für jüngere Klassen und lockere Themen" },
  { id: "news-broadcast", name: "Nachrichten", schrift: "sans", beschreibung: "Weiß, Schwarz und Rot wie eine Nachrichtensendung, Überschriften in Großbuchstaben; für Politik und Aktuelles" },
  { id: "sharp-mono", name: "Schwarz-Weiß", schrift: "sans", beschreibung: "nur Schwarz und Weiß, harte Kanten, Großbuchstaben; streng, druckt überall gut" },
  { id: "blueprint", name: "Blaupause", schrift: "mono", beschreibung: "weiße Linien auf tiefem Blau mit Raster; wie ein Bauplan, für Technik und Naturwissenschaft" },
  { id: "engineering-whiteprint", name: "Technische Zeichnung", schrift: "mono", beschreibung: "Weiß mit feinem Raster und dunkelblauen Linien; präzise, für Technik, Physik, Informatik" },
  { id: "tokyo-night", name: "Nacht", schrift: "sans", beschreibung: "dunkles Blaugrau mit hellblauer Schrift; modern, gut im abgedunkelten Raum" },
  { id: "nord", name: "Nordisch", schrift: "sans", beschreibung: "dunkles Graublau mit Eisblau; ruhig und dunkel" },
  { id: "aurora", name: "Polarlicht", schrift: "sans", beschreibung: "Nachtblau mit leuchtenden Farbschleiern in Grün und Violett; stimmungsvoll, für Astronomie, Physik, Erdkunde" },
  { id: "glassmorphism", name: "Glas", schrift: "sans", beschreibung: "dunkler Grund mit Farbschimmer und durchscheinenden Karten; modern, für Informatik und Medien" },
  { id: "cyberpunk-neon", name: "Neon", schrift: "mono", beschreibung: "Schwarz mit leuchtendem Pink und Türkis; auffällig, für Jugendliche, Informatik, Medien" },
  { id: "terminal-green", name: "Terminal", schrift: "mono", beschreibung: "grüne Schrift auf Schwarz wie ein alter Computer; für Informatik" },
];
/** The look when none is chosen. */
export const STANDARD_STIL = "editorial-serif";

export const stil = (id: string): Stil | undefined => STILE.find((s) => s.id === id);
export const stilName = (id: string): string | undefined => stil(id)?.name;
/** One line per look for the assistant, so it can propose looks to a teacher. */
export const stilZeile = (s: Stil): string => `${s.id}: ${s.name}; ${s.beschreibung}`;

const datei = (name: string) => readFileSync(fileURLToPath(new URL(`../../../assets/baukasten/${name}`, import.meta.url)), "utf8");
const cache = new Map<string, string>();
const lesen = (name: string) => cache.get(name) ?? (cache.set(name, datei(name)), cache.get(name)!);
/** The shared rules of the kit (sizes, cards, grid). */
export const grundCss = () => lesen("base.css");
/** The css of one look. */
export const themeCss = (id: string) => lesen(`themes/${stil(id)?.id ?? STANDARD_STIL}.css`);

export interface Farben { bg: string; ink: string; soft: string; accent: string }
const variable = (css: string, name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`))?.[1]?.toLowerCase();
/** The main colors of a look, whether the headline is serif and whether the ground is dark. */
export function stilInfo(id: string): { farben: Farben; serif: boolean; dunkel: boolean } {
  const css = themeCss(id);
  const farben = { bg: variable(css, "bg") ?? "#ffffff", ink: variable(css, "text-1") ?? "#111111", soft: variable(css, "text-2") ?? "#555555", accent: variable(css, "accent") ?? "#111111" };
  return { farben, serif: (stil(id) ?? stil(STANDARD_STIL)!).schrift === "serif", dunkel: istDunkel(farben.bg) };
}

export const istDunkel = (bg: string) => lum(bg) < 0.3;
/** Contrast ratio of two colors (WCAG). */
export const kontrast = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

function lum(h: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

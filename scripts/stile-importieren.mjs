// Builds assets/stile/katalog.json from a local clone of nexu-io/open-design (Apache-2.0).
// Usage: node scripts/stile-importieren.mjs /path/to/open-design
// Reads only the plain tokens (colors, radius, shadow, font names) of the general style systems, no brands.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Pfad zum Klon von nexu-io/open-design fehlt");
const dir = join(root, "design-systems");

// Systems named after companies or games are left out: they do not belong in a classroom.
const AUS = new Set(["default", "application", "agentic", "mission-control", "pacman", "tetris", "totality-festival", "loom", "kami", "urdu", "material", "ant", "lingo", "levels", "clay", "tom-modern", "dashboard", "trading-terminal", "hud"]);
const KATEGORIEN = new Set(["Bold & Expressive", "Creative & Artistic", "Retro & Nostalgic", "Morphism & Effects", "Modern & Minimal", "Editorial & Print", "Editorial · Studio", "Editorial / Personal / Publication", "Layout & Structure", "Professional & Corporate", "Themed & Unique", "Starter"]);
const SERIF = /georgia|gelasio|playfair|lora|merriweather|cormorant|times|garamond|serif(?!.*sans)|fraunces|libre baskerville|crimson|source serif|noto serif|dm serif/i;

const hex = (s) => (/^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : /^#[0-9a-f]{3}$/i.test(s) ? "#" + [...s.slice(1)].map((c) => c + c).join("").toLowerCase() : null);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => toHex(rgb(a).map((v, i) => v * (1 - t) + rgb(b)[i] * t));
const lum = (h) => {
  const [r, g, b] = rgb(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
/** Moves `c` toward black (on light) or white (on dark) until it reads on `bg` with the given ratio. */
const lesbar = (c, bg, min, dark) => {
  for (let t = 0; t <= 1.001 && ratio(c, bg) < min; t += 0.05) c = mix(c, dark ? "#ffffff" : "#000000", 0.05);
  return ratio(c, bg) >= min ? c : dark ? "#ffffff" : "#000000";
};

const out = [];
for (const slug of readdirSync(dir).sort()) {
  if (AUS.has(slug)) continue;
  let manifest, css, design;
  try {
    manifest = JSON.parse(readFileSync(join(dir, slug, "manifest.json"), "utf8"));
    css = readFileSync(join(dir, slug, "tokens.css"), "utf8");
    design = readFileSync(join(dir, slug, "DESIGN.md"), "utf8");
  } catch {
    continue;
  }
  const kategorie = manifest.category ?? manifest.metadata?.category ?? "";
  if (!KATEGORIEN.has(kategorie)) continue;
  const tok = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
  // tokens.css is shared by whole families of styles, DESIGN.md has each style's own foundations. Foundations that equal
  // the generic defaults count as "not set" and fall back to tokens.css.
  const found = (name, standard) => {
    const v = hex(design.match(new RegExp(`^- \\*\\*${name}:\\*\\* \`(#[0-9a-fA-F]{3,6})\``, "m"))?.[1] ?? "");
    return v && v !== standard ? v : null;
  };
  const tokBg = hex(tok("bg") ?? ""), tokFg = hex(tok("fg") ?? ""), tokAccent = hex(tok("accent") ?? "");
  const flaeche = found("Surface", "#ffffff");
  const bg = flaeche ?? tokBg;
  const fg = found("Text", "#111827") ?? tokFg;
  const accent = found("Primary", "#3b82f6") ?? tokAccent;
  const zweite = found("Secondary", "#8b5cf6");
  const surface = flaeche ?? hex(tok("surface") ?? "") ?? bg;
  if (!bg || !fg || !accent) continue;
  const dark = lum(bg) < 0.3;
  const hart = (tok("elev-raised") ?? "").match(/^(\d+)px (\d+)px 0\b/);
  const rx = Math.min(24, parseInt(tok("radius-md") ?? "8", 10) || 0);
  const font = (tok("font-display") ?? tok("font-body") ?? "").split(",")[0].replace(/["']/g, "").trim();
  const beschreibung = (design.match(/^> (?!Category)(.+)$/m)?.[1] ?? "").trim();
  const accentZ = lesbar(accent, bg, 4.5, dark);
  const fuell = (c) => (dark ? mix(bg, "#ffffff", c) : mix(bg, accent, c));
  const fills = [surface === bg ? fuell(0.1) : surface, fuell(0.2), zweite ? mix(bg, zweite, dark ? 0.35 : 0.25) : mix(bg, dark ? "#ffffff" : fg, 0.1)];
  // The text color must read on the background and on every fill.
  let ink = fg;
  for (const f of [bg, ...fills]) ink = lesbar(ink, f, 7, dark);
  if ([bg, ...fills].some((f) => ratio(ink, f) < 7)) continue; // cannot be made readable
  out.push({
    id: slug,
    name: slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
    kategorie,
    beschreibung,
    bg, ink, soft: lesbar(hex(tok("fg-2") ?? "") ?? ink, bg, 4.5, dark), accent: accentZ, fills,
    kante: hart ? 5 : parseInt(tok("border-width") ?? "0", 10) || 2,
    schatten: hart ? Math.min(12, parseInt(hart[1], 10)) : 0,
    rx,
    serif: SERIF.test(font),
    schrift: font,
  });
}
// Styles that end up with the same look are listed once.
const gesehen = new Set();
for (let i = out.length - 1; i >= 0; i--) {
  const s = out[i];
  const key = [s.bg, s.accent, s.fills.join(), s.kante, s.schatten, s.rx, s.serif].join("|");
  if (gesehen.has(key)) out.splice(i, 1);
  gesehen.add(key);
}
mkdirSync("assets/stile", { recursive: true });
writeFileSync("assets/stile/katalog.json", JSON.stringify(out, null, 1) + "\n");
console.log(`${out.length} Stile geschrieben`);

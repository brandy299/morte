/**
 * Draws an explainer piece (see szene.ts) as ONE html file that runs offline in any browser:
 * an svg stage, fonts and anime.js inline. The timeline is planned here once; the page only plays it.
 * `window.seek(ms)` stops and shows any moment, so the same description always gives the same pictures (and a video can be cut from it later).
 * No random values and no clock in the picture.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { istDunkel, katalogStil } from "./stile.ts";
import { symbolMitId } from "./symbole.ts";
import { fontFile, SANS_BOLD, SERIF } from "../material/layout.ts";
import { H, KACHEL, stueckSetzen, W, type Box, type EigenStil, type Erklaerstueck, type GesetzteSzene, type Palette, type Stil, type Teil, type Tempo } from "./szene.ts";

/** The quiet backgrounds, as plain browser code that goes into the file. */
const hintergrundCode = () => readFileSync(fileURLToPath(new URL("../../../assets/animation/hintergrund.js", import.meta.url)), "utf8").replace(/<\/script/gi, "<\\/script");
/** The color each watercolor palette uses for lines and dots in the background. */
const TON: Record<Palette, keyof Farben> = { wasser: "wasser", wiese: "huegel", abend: "sonne" };

export interface Farben { bg: string; ink: string; soft: string; accent: string; fills: [string, string, string]; sonne: string; wolke: string; huegel: string; wasser: string; knopf?: string }
export const PALETTE: Record<Palette, Farben> = {
  wasser: { bg: "#f4efe6", ink: "#23201b", soft: "#5a5348", accent: "#2f6f8f", fills: ["#bcd5de", "#cfd8e3", "#a8bf9f"], sonne: "#efb04a", wolke: "#b7c5d6", huegel: "#6f9a73", wasser: "#5f97b4" },
  wiese: { bg: "#f6f1e3", ink: "#23201b", soft: "#5a5348", accent: "#3f6b4a", fills: ["#cfe0b8", "#e8dcb0", "#bcd5de"], sonne: "#e8a93c", wolke: "#c3ced9", huegel: "#7fa56a", wasser: "#6aa3b8" },
  abend: { bg: "#f3ebe4", ink: "#2a1f1c", soft: "#5f5049", accent: "#8a4a2a", fills: ["#e6c9c0", "#d9cfe6", "#f0d9a8"], sonne: "#e58a4a", wolke: "#cbbfdc", huegel: "#8a7a9c", wasser: "#7f93b8" },
};

/**
 * How a look draws. `filter`: watercolor wobble (wc), a light chalk wobble (kreide) or crisp. `kante`: outline width of boxes
 * and shapes, `schatten`: offset of the hard shadow behind boxes, `rx`: corner radius, `korn`: paper grain strength,
 * `serif`: Fraunces (otherwise Source Sans bold), `ton`: color of the background lines and dots.
 */
export interface StilDef { farben?: Farben; filter: "wc" | "kreide" | "keiner"; kante: number; schatten: number; rx: number; korn: number; serif: boolean; ton?: keyof Farben; ecken?: boolean }
export const STIL: Record<EigenStil, StilDef> = {
  wasserfarben: { filter: "wc", kante: 0, schatten: 0, rx: 14, korn: 0.45, serif: true },
  // Cream paper, thick dark outlines, hard offset shadows, loud flat colors (yellow, violet) after the open neobrutalism token set (Apache-2.0, nexu-io/open-design).
  brutalismus: { farben: { bg: "#fbf3d5", ink: "#1c293c", soft: "#3a4658", accent: "#432dd7", fills: ["#fdc800", "#c9c0ff", "#a8ecd0"], sonne: "#fdc800", wolke: "#c9c0ff", huegel: "#7ddba8", wasser: "#7a8cff" }, filter: "keiner", kante: 6, schatten: 10, rx: 4, korn: 0, serif: false, ton: "ink" },
  // Newsprint: warm white, hairlines, quiet grey-beige boxes, one dark red accent.
  zeitung: { farben: { bg: "#f7f4ee", ink: "#1a1a1a", soft: "#505050", accent: "#9b1c1c", fills: ["#e9e4d8", "#dcd6c8", "#efe9dc"], sonne: "#d9a441", wolke: "#c9ccd1", huegel: "#9aa088", wasser: "#8aa3b8" }, filter: "keiner", kante: 2, schatten: 0, rx: 0, korn: 0.18, serif: true },
  // Blueprint: white lines on deep blue.
  blaupause: { farben: { bg: "#12306b", ink: "#f4f8ff", soft: "#c5d5f5", accent: "#ffd166", fills: ["#1c3f86", "#244a96", "#173877"], sonne: "#ffd166", wolke: "#8fb3ee", huegel: "#7fd1b9", wasser: "#5aa9f0", knopf: "#1c3f86" }, filter: "keiner", kante: 3, schatten: 0, rx: 0, korn: 0, serif: false, ton: "ink" },
  // Technical book: warm grey, hairlines, small cross marks at the corners of boxes, one rust-orange accent.
  fachbuch: { farben: { bg: "#dedcd3", ink: "#1c1c1a", soft: "#4a4a45", accent: "#8a3510", fills: ["#e9e7de", "#e4e2d8", "#edebe3"], sonne: "#c4622b", wolke: "#a9aaa6", huegel: "#8d9283", wasser: "#7f8f96" }, filter: "keiner", kante: 1.5, schatten: 0, rx: 0, korn: 0.1, serif: true, ton: "soft", ecken: true },
  // Chalkboard: dark green-grey with chalk-white, slightly wobbly lines.
  kreide: { farben: { bg: "#26332d", ink: "#f2f0e6", soft: "#c9cfc4", accent: "#f6d365", fills: ["#33463d", "#3b4a52", "#463f3a"], sonne: "#f6d365", wolke: "#d6dde2", huegel: "#9fd1a0", wasser: "#8cc4e0", knopf: "#33463d" }, filter: "kreide", kante: 3, schatten: 0, rx: 12, korn: 0, serif: true, ton: "ink" },
};
/** Colors of the things drawn (sun, cloud, hill, water): fixed hues pulled toward the style's own background. */
const FORMFARBEN = { sonne: "#f2b134", wolke: "#c9d3e0", huegel: "#7fb08a", wasser: "#6aa6d6" };
/** A style of the catalog (stile.ts) as a look. */
function ausKatalog(id: string): StilDef | undefined {
  const k = katalogStil(id);
  if (!k) return undefined;
  const dunkel = istDunkel(k.bg);
  const zu = (c: string) => mixHex(c, k.bg, dunkel ? 0.35 : 0.3);
  return {
    farben: { bg: k.bg, ink: k.ink, soft: k.soft, accent: k.accent, fills: k.fills, sonne: zu(FORMFARBEN.sonne), wolke: zu(FORMFARBEN.wolke), huegel: zu(FORMFARBEN.huegel), wasser: zu(FORMFARBEN.wasser), knopf: dunkel ? k.fills[0] : undefined },
    filter: "keiner", kante: k.kante, schatten: k.schatten, rx: k.rx, korn: 0, serif: k.serif, ton: "soft",
  };
}
function mixHex(a: string, b: string, t: number): string {
  const c = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(c(a, i) * (1 - t) + c(b, i) * t).toString(16).padStart(2, "0")).join("");
}
/** The look to draw with: a hand-made one or one from the catalog. */
export const stilFuer = (id: Stil): StilDef => (STIL as Record<string, StilDef>)[id] ?? ausKatalog(id) ?? STIL.wasserfarben;
/** The colors of a piece: the palette for watercolor, the look's own otherwise. */
export const farbenFuer = (e: Pick<Erklaerstueck, "stil" | "palette">): Farben => stilFuer(e.stil).farben ?? PALETTE[e.palette];

/** Milliseconds: pause between two elements, how long one fades in, how long a finished scene stays. */
export const TAKT: Record<Tempo, { schritt: number; ein: number; halten: number }> = {
  ruhig: { schritt: 1100, ein: 700, halten: 2400 },
  mittel: { schritt: 800, ein: 600, halten: 1700 },
  zuegig: { schritt: 550, ein: 450, halten: 1100 },
};
const AUS = 500;

interface Schritt { id: string; at: number; dauer: number; art: "ein" | "pfeil" }
interface Ablauf { szenen: { id: string; start: number; ende: number; schritte: Schritt[] }[]; dauer: number }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => Math.round(v * 10) / 10;

/** One frame of the stage per scene; the title picture is scene 0. */
function planen(szenen: GesetzteSzene[], tempo: Tempo): Ablauf {
  const t = TAKT[tempo];
  const out: Ablauf["szenen"] = [];
  let start = 0;
  const alle = [{ id: "s0", n: 1 }, ...szenen.map((s, i) => ({ id: `s${i + 1}`, n: s.elemente.length + (s.titel ? 1 : 0) }))];
  alle.forEach((s, i) => {
    const schritte: Schritt[] = [];
    let at = start;
    if (i === 0) {
      schritte.push({ id: "s0t", at, dauer: t.ein, art: "ein" });
      at += t.schritt;
    } else {
      const sz = szenen[i - 1]!;
      if (sz.titel) (schritte.push({ id: `${s.id}t`, at, dauer: t.ein, art: "ein" }), (at += t.schritt));
      sz.elemente.forEach((e, j) => {
        schritte.push({ id: `${s.id}e${j}`, at, dauer: e.teil.k === "pfeil" ? t.ein * 1.6 : t.ein, art: e.teil.k === "pfeil" ? "pfeil" : "ein" });
        at += t.schritt;
      });
    }
    const ende = at - t.schritt + t.ein * 1.6 + t.halten + (i < alle.length - 1 ? AUS : 0);
    out.push({ id: s.id, start, ende, schritte });
    start = ende;
  });
  return { szenen: out, dauer: start };
}

const textSvg = (zeilen: string[], cx: number, top: number, size: number, fill: string, lead = 1.28) =>
  zeilen.map((z, i) => `<text x="${n(cx)}" y="${n(top + i * size * lead + size * 0.95)}" font-size="${size}" fill="${fill}" text-anchor="middle">${esc(z)}</text>`).join("");

const filterAttr = (st: StilDef) => (st.filter === "wc" ? ` filter="url(#wc)"` : st.filter === "kreide" ? ` filter="url(#line)"` : "");
/** Outline of boxes and shapes; the watercolor look has none (its dark rim comes from the filter). */
const kanteAttr = (st: StilDef, c: Farben) => (st.kante ? ` stroke="${c.ink}" stroke-width="${st.kante}" stroke-linejoin="round" vector-effect="non-scaling-stroke"` : "");

function formSvg(form: string, b: Box, c: Farben, st: StilDef): string {
  const sx = b.w / 180;
  const sy = b.h / 120;
  const k = kanteAttr(st, c);
  const hell = (col: string) => mixHex(col, "#ffffff", 0.5);
  const dunkler = (col: string) => mixHex(col, c.ink, 0.18);
  // The hard shadow is the same drawing in the ink color, shifted.
  const flach = (inner: string, fuell: string) => inner.replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${fuell}"`);
  const g = (inner: string) => {
    const hart = st.schatten ? `<g transform="translate(${n(st.schatten / sx)} ${n(st.schatten / sy)})">${flach(inner, c.ink)}</g>` : "";
    return `<g transform="translate(${n(b.x)} ${n(b.y)}) scale(${n(sx)} ${n(sy)})">${hart}<g${filterAttr(st)}>${inner}</g></g>`;
  };
  if (form === "sonne") {
    // Round sun with a lighter core and eight rays that do not touch it.
    const strahlen = Array.from({ length: 8 }, (_, i) => {
      const w = (i * Math.PI) / 4;
      const p = (r: number) => `${n(90 + Math.cos(w) * r)} ${n(60 + Math.sin(w) * r)}`;
      return `M${p(46)} L${p(58)}`;
    }).join(" ");
    return g(`<path d="${strahlen}" fill="none" stroke="${c.sonne}" stroke-width="9" stroke-linecap="round"/><circle cx="90" cy="60" r="34" fill="${c.sonne}"${k}/><circle cx="80" cy="50" r="12" fill="${hell(c.sonne)}" opacity=".55"/>`);
  }
  if (form === "wolke") {
    // One outline for the whole cloud, so no lines cross inside it.
    return g(`<path d="M44 96 C16 96 6 68 30 60 C28 34 58 24 76 40 C88 14 128 18 136 46 C164 42 178 74 150 96 Z" fill="${c.wolke}"${k}/><path d="M52 82 C60 74 74 74 82 80" fill="none" stroke="${hell(c.wolke)}" stroke-width="5" stroke-linecap="round"/>`);
  }
  if (form === "huegel") {
    // A back hill in a lighter tone and a front hill.
    return g(`<path d="M52 118 C80 36 130 22 160 62 C172 80 178 100 180 118 Z" fill="${hell(c.huegel)}"${k}/><path d="M0 118 C26 52 74 40 106 70 C128 90 152 104 180 118 Z" fill="${c.huegel}"${k}/><path d="M30 104 C44 84 62 78 78 84" fill="none" stroke="${dunkler(c.huegel)}" stroke-width="4" stroke-linecap="round" opacity=".6"/>`);
  }
  // water: a wavy surface and a body with light wave lines
  return g(`<path d="M0 40 Q22 18 45 40 T90 40 T135 40 T180 40 V92 Q180 108 164 108 H16 Q0 108 0 92 Z" fill="${c.wasser}"${k}/><path d="M18 62 Q38 48 58 62 T98 62 M92 84 Q112 70 132 84 T172 84" fill="none" stroke="${hell(c.wasser)}" stroke-width="5" stroke-linecap="round"/>`);
}

function teilSvg(t: Teil, nr: number, c: Farben, st: StilDef): string {
  if (t.k === "text") return textSvg(t.zeilen, t.x + t.w / 2, t.y, t.groesse, c.ink);
  if (t.k === "kasten") {
    const hoehe = t.zeilen.length * t.groesse * 1.28;
    const schatten = st.schatten ? `<rect x="${n(t.x + st.schatten)}" y="${n(t.y + st.schatten)}" width="${n(t.w)}" height="${n(t.h)}" rx="${st.rx}" fill="${c.ink}"/>` : "";
    const ecken = st.ecken ? [[t.x, t.y], [t.x + t.w, t.y], [t.x, t.y + t.h], [t.x + t.w, t.y + t.h]].map(([x, y]) => `<path d="M${n(x! - 9)} ${n(y!)} H${n(x! + 9)} M${n(x!)} ${n(y! - 9)} V${n(y! + 9)}" stroke="${c.ink}" stroke-width="1.5" fill="none"/>`).join("") : "";
    return `${schatten}<g${filterAttr(st)}><rect x="${n(t.x)}" y="${n(t.y)}" width="${n(t.w)}" height="${n(t.h)}" rx="${st.rx}" fill="${c.fills[nr % 3]}"${kanteAttr(st, c)}/></g>${textSvg(t.zeilen, t.x + t.w / 2, t.y + (t.h - hoehe) / 2, t.groesse, c.ink)}${ecken}`;
  }
  if (t.k === "zahl") {
    const z = `<text x="${n(t.x + t.w / 2)}" y="${n(t.y + t.groesse * 0.98)}" font-size="${t.groesse}" fill="${c.accent}" text-anchor="middle">${esc(t.zahl)}</text>`;
    return z + textSvg(t.zeilen, t.x + t.w / 2, t.y + t.groesse * 1.28, 26, c.ink);
  }
  if (t.k === "symbol") {
    // A tile in the style of the boxes with the outline icon in the middle, and the caption under it.
    const x = t.x + (t.w - KACHEL) / 2;
    const schatten = st.schatten ? `<rect x="${n(x + st.schatten)}" y="${n(t.y + st.schatten)}" width="${KACHEL}" height="${KACHEL}" rx="${Math.max(st.rx, 6)}" fill="${c.ink}"/>` : "";
    const kachel = `<rect x="${n(x)}" y="${n(t.y)}" width="${KACHEL}" height="${KACHEL}" rx="${Math.max(st.rx, 6)}" fill="${c.fills[nr % 3]}"${kanteAttr(st, c)}/>`;
    const gr = KACHEL * 0.62;
    const sz = gr / 24;
    const bild = `<g transform="translate(${n(x + (KACHEL - gr) / 2)} ${n(t.y + (KACHEL - gr) / 2)}) scale(${n(sz)})" fill="none" stroke="${c.ink}" stroke-width="${st.kante >= 4 ? 2 : 1.6}" stroke-linecap="round" stroke-linejoin="round">${symbolMitId(t.symbol)?.d ?? ""}</g>`;
    return `${schatten}<g${filterAttr(st)}>${kachel}</g>${bild}${t.zeilen.length ? textSvg(t.zeilen, t.x + t.w / 2, t.y + KACHEL + 10, 26, c.ink) : ""}`;
  }
  if (t.k === "form") return formSvg(t.form, t, c, st);
  const [x0, y0] = t.von;
  const [x1, y1] = t.nach;
  const a = Math.atan2(y1 - y0, x1 - x0);
  const head = (da: number) => `${n(x1 - 18 * Math.cos(a + da))} ${n(y1 - 18 * Math.sin(a + da))}`;
  const e = t.etikett;
  return (
    `<g${st.filter === "keiner" ? "" : ` filter="url(#line)"`} fill="none" stroke="${c.accent}" stroke-width="${st.kante > 4 ? 8 : 6}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path class="ar" pathLength="1" d="M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)}"/><path class="ah" d="M${head(-0.45)} L${n(x1)} ${n(y1)} L${head(0.45)}"/></g>` +
    (e ? `<g class="al"><rect x="${n(e.x)}" y="${n(e.y)}" width="${n(e.w)}" height="${n(e.h)}" rx="8" fill="${c.bg}" opacity=".92"/>${textSvg(e.zeilen, e.x + e.w / 2, e.y + 3, 24, c.ink)}</g>` : "")
  );
}

const css = (c: Farben, schrift: string, gewicht: number) => `
@font-face{font-family:"Fraunces";src:url(data:font/ttf;base64,${schrift}) format("truetype");font-weight:${gewicht}}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:${c.bg};color:${c.ink}}
body{display:flex;flex-direction:column;font-family:"Fraunces",Georgia,serif}
svg{display:block;flex:1;min-height:0;width:100%}
text{font-family:"Fraunces",Georgia,serif;font-weight:${gewicht}}
.g{transform-box:fill-box;transform-origin:center}
nav{display:flex;gap:10px;justify-content:center;padding:10px 16px;background:${c.bg}}
button{font:${gewicht} 18px "Fraunces",Georgia,serif;color:${c.ink};background:${c.knopf ?? "#fffaf0"};border:2px solid ${c.soft};border-radius:10px;padding:8px 18px;cursor:pointer;min-height:44px}
button:hover{filter:brightness(1.08)}
button:focus-visible{outline:3px solid ${c.accent};outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

/** The finished html file. */
export function renderHtml(e: Erklaerstueck): string {
  const c = farbenFuer(e);
  const st = stilFuer(e.stil);
  const szenen = stueckSetzen(e);
  const ablauf = planen(szenen, e.tempo);
  const schrift = readFileSync(fontFile(st.serif ? SERIF : SANS_BOLD)).toString("base64");
  const anime = readFileSync(fileURLToPath(new URL("../../../node_modules/animejs/dist/bundles/anime.umd.min.js", import.meta.url)), "utf8").replace(/<\/script/gi, "<\\/script");

  const titelBild = `<g id="s0" class="sc" opacity="0"><g id="s0t" opacity="0">${textSvg([e.titel], W / 2, H / 2 - 70, 70, c.ink)}${e.untertitel ? textSvg([e.untertitel], W / 2, H / 2 + 40, 34, c.soft) : ""}<rect x="${W / 2 - 80}" y="${H / 2 + 14}" width="160" height="6" rx="3" fill="${c.accent}"/></g></g>`;
  const bilder = szenen.map((s, i) => {
    const id = `s${i + 1}`;
    const titel = s.titel ? `<g id="${id}t" opacity="0">${textSvg(s.titel.zeilen, W / 2, s.titel.y, s.titel.groesse, c.ink)}</g>` : "";
    const teile = s.elemente.map((el, j) => `<g id="${id}e${j}" opacity="0">${teilSvg(el.teil, j, c, st)}</g>`).join("");
    return `<g id="${id}" class="sc" opacity="0">${titel}${teile}</g>`;
  });
  const mitHintergrund = e.hintergrund !== "keiner";
  const hintergrund = mitHintergrund
    ? `<foreignObject width="${W}" height="${H}" opacity=".75" pointer-events="none"><canvas xmlns="http://www.w3.org/1999/xhtml" id="hg" width="${W}" height="${H}" style="width:${W}px;height:${H}px;display:block"></canvas></foreignObject>`
    : "";
  const hintergrundFarben = { accent: c.accent, fills: c.fills, ton: c[st.farben ? (st.ton ?? "soft") : TON[e.palette]] };
  const lesetext = [e.titel, e.untertitel, ...e.szenen.flatMap((s) => [s.titel, ...s.elemente.map((x) => [x.text, x.zahl].filter(Boolean).join(": ") || undefined)])]
    .filter(Boolean)
    .map((t) => `<li>${esc(t!)}</li>`)
    .join("");

  const defs = `<defs>
<filter id="wc" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="4" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="14" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="1.1" result="soft"/><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="mott"/><feColorMatrix in="mott" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 -0.18" result="mottA"/><feComposite in="soft" in2="mottA" operator="in" result="body"/><feMorphology in="soft" operator="erode" radius="3" result="core"/><feGaussianBlur in="core" stdDeviation="6" result="coreB"/><feComposite in="soft" in2="coreB" operator="out" result="rim"/><feMerge><feMergeNode in="body"/><feMergeNode in="rim"/></feMerge></filter>
<filter id="line" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="2" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.55 -0.12"/></filter>
</defs>`;

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(e.titel)}</title>
<!-- Erstellt mit Pult. Enthält anime.js 4.5.0 (MIT, Julian Garnier) und die Schrift ${st.serif ? "Fraunces" : "Source Sans 3"} (SIL OFL 1.1). -->
<style>${css(c, schrift, st.serif ? 600 : 700)}</style></head>
<body>
<svg id="stage" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(e.titel)}" preserveAspectRatio="xMidYMid meet">
${defs}
<rect width="${W}" height="${H}" fill="${c.bg}"/>
${hintergrund}
${st.schatten ? `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="${c.ink}" stroke-width="6" pointer-events="none"/>` : ""}
${titelBild}
${bilder.join("\n")}
${st.korn ? `<rect width="${W}" height="${H}" filter="url(#grain)" style="mix-blend-mode:multiply" opacity="${st.korn}" pointer-events="none"/>` : ""}
</svg>
<nav aria-label="Steuerung"><button id="zurueck" type="button">Zurück</button><button id="spiel" type="button">Pause</button><button id="weiter" type="button">Weiter</button></nav>
<ul class="sr">${lesetext}</ul>
<script>${anime}</script>
${mitHintergrund ? `<script>${hintergrundCode()}</script>` : ""}
<script>
const PLAN=${JSON.stringify(ablauf)};
const TITEL=${JSON.stringify([e.titel, ...e.szenen.map((s) => s.titel ?? "")]).replace(/</g, "\\u003c")};
const {createTimeline}=anime;
const $=(s,r=document)=>r.querySelector(s);
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const starts=PLAN.szenen.map(s=>s.start);
const sicht=(el,v)=>{el.style.opacity=v;};
document.querySelectorAll(".ar").forEach(p=>{p.style.strokeDasharray="1";p.style.strokeDashoffset="1";});
document.querySelectorAll(".ah,.al").forEach(p=>sicht(p,0));
let tl=null,idx=0,aktuell=()=>0;
const spiel=$("#spiel");
// The background follows the timeline, not the clock: a paused or sought piece shows the same picture every time.
const HG=${JSON.stringify(mitHintergrund ? e.hintergrund : null)},HF=${JSON.stringify(hintergrundFarben)};
const hgc=HG?$("#hg").getContext("2d"):null;let hgT=-1;
function hgMalen(t){if(!hgc||t===hgT)return;hgT=t;hgc.setTransform(1,0,0,1,0,0);hgc.clearRect(0,0,${W},${H});hgc.globalAlpha=1;hgc.lineCap="butt";PULT_HINTERGRUND[HG](hgc,${W},${H},t,HF);hgc.globalAlpha=1;}
function zeige(i){
  idx=Math.max(0,Math.min(PLAN.szenen.length-1,i));
  PLAN.szenen.forEach((s,k)=>{const g=$("#"+s.id);g.style.display=k===idx?"":"none";sicht(g,k===idx?1:0);s.schritte.forEach(x=>{const e=$("#"+x.id);sicht(e,1);if(x.art==="pfeil"){const g2=$(".ar",e);g2.style.strokeDashoffset=0;e.querySelectorAll(".ah,.al").forEach(q=>sicht(q,1));}});});
}
if(reduced){
  spiel.hidden=true;zeige(0);hgMalen(0);
  $("#zurueck").onclick=()=>zeige(idx-1);$("#weiter").onclick=()=>zeige(idx+1);
  addEventListener("keydown",e=>{if(e.key==="ArrowRight")zeige(idx+1);if(e.key==="ArrowLeft")zeige(idx-1);});
  window.seek=()=>{};window.dauer=0;aktuell=()=>idx;
}else{
  tl=createTimeline({autoplay:false,defaults:{ease:"outQuad"}});
  PLAN.szenen.forEach((s,k)=>{
    tl.add("#"+s.id,{opacity:[0,1],duration:1},s.start);
    s.schritte.forEach(x=>{
      if(x.art==="pfeil"){
        tl.add("#"+x.id,{opacity:[0,1],duration:1},x.at)
          .add("#"+x.id+" .ar",{strokeDashoffset:[1,0],duration:x.dauer,ease:"inOutSine"},x.at)
          .add("#"+x.id+" .ah",{opacity:[0,1],duration:200},x.at+x.dauer-100)
          .add("#"+x.id+" .al",{opacity:[0,1],duration:300},x.at+x.dauer*.4);
      }else tl.add("#"+x.id,{opacity:[0,1],translateY:[14,0],duration:x.dauer},x.at);
    });
    if(k<PLAN.szenen.length-1)tl.add("#"+s.id,{opacity:[1,0],duration:${AUS}},s.ende-${AUS});
  });
  const zu=i=>{idx=Math.max(0,Math.min(starts.length-1,i));tl.seek(starts[idx]+1);};
  const spielen=()=>{if(tl.currentTime>=PLAN.dauer-1)tl.seek(0);tl.play();spiel.textContent="Pause";};
  const pause=()=>{tl.pause();spiel.textContent="Weiter spielen";};
  const jetzt=()=>{let k=0;starts.forEach((s,i)=>{if(tl.currentTime>=s)k=i;});return k;};
  spiel.onclick=()=>tl.paused?spielen():pause();
  $("#zurueck").onclick=()=>{const k=jetzt();zu(tl.currentTime-starts[k]>1500?k:k-1);};
  $("#weiter").onclick=()=>zu(jetzt()+1);
  addEventListener("keydown",e=>{if(e.key===" "&&e.target.tagName!=="BUTTON"){e.preventDefault();spiel.click();}if(e.key==="ArrowRight")$("#weiter").click();if(e.key==="ArrowLeft")$("#zurueck").click();});
  window.seek=ms=>{if(!tl.paused)pause();tl.seek(ms);hgMalen(Math.round(tl.currentTime)/1000);};aktuell=()=>{if(!tl.paused)pause();return jetzt();};window.dauer=PLAN.dauer;
  tl.seek(0);
  if(hgc){const malen=()=>{hgMalen(Math.round(tl.currentTime)/1000);requestAnimationFrame(malen);};malen();}
  document.fonts.ready.then(()=>{if(!new URLSearchParams(location.search).has("still"))spielen();});
}
// Pult's preview asks which scene is showing, so a teacher can leave a note on it. Standing alone, nobody asks.
addEventListener("message",e=>{if(!e.data||e.data.pult!=="szene?"||e.source!==parent)return;const n=aktuell();parent.postMessage({pult:"szene",n,titel:TITEL[n]||""},"*");});
window.ready=document.fonts.ready.then(()=>true);
</script>
</body></html>`;
}

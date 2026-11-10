/**
 * Slides for PowerPoint (.pptx) and the same slides as a PDF for the preview.
 * The layout of every slide is planned once (in points, 16:9) and then drawn twice, so preview and file agree.
 * See docs/entscheidungen/016-praesentationen.md.
 */
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { parseSzene, pruefeSymbole, type Punkt, type Szene as Folienszene } from "../animation/szene.ts";
import { kontrast, stilInfo, STILE } from "../animation/stile.ts";
import { symbolPng } from "../animation/symbole.ts";
import { schulkopf } from "../schule/index.ts";
import { MaterialError, printable, registerFonts, SANS, SANS_BOLD, SANS_ITALIC, SERIF, str, textWidth } from "./layout.ts";
import { parseSchaubild, szeneVon, umbrechen, type Schaubild, type Szene } from "./schaubild.ts";
import { zeichnePdf } from "./schaubild-zeichnen.ts";
import { zeichnePptx } from "./schaubild-pptx.ts";

export interface Folie {
  /** `abschnitt`: a divider between parts of the talk. `szene`: a designed slide in one of the layouts of the explainer pieces. */
  art: "inhalt" | "abschnitt" | "szene";
  titel: string;
  szene?: Folienszene;
  text?: string;
  punkte: string[];
  schaubild?: Schaubild;
  notizen?: string;
}

export interface Praesentation {
  titel: string;
  untertitel?: string;
  fach?: string;
  klasse?: string;
  /** Small print in the footer, e.g. "Ohne hinterlegten Lehrplan erstellt". */
  fuss?: string;
  /** The look (same names as for explainer pieces). Without one, the classic Pult look. */
  stil?: string;
  folien: Folie[];
}

export const MAX_FOLIEN = 40;
const MAX_PUNKTE = 7;

/** A diagram the class fills in: the key (number = text) goes into the speaker notes, since a slide has no teacher's copy. */
function mitLoesung(notizen: string | undefined, schaubild: Schaubild | undefined): string | undefined {
  const leer = schaubild?.knoten.filter((k) => k.leer) ?? [];
  if (leer.length === 0) return notizen;
  const loesung = `Lösung zum Beschriften: ${leer.map((k, i) => `${i + 1} = ${k.text}`).join("; ")}.`;
  return notizen ? `${notizen}
${loesung}` : loesung;
}

/** Looks a presentation can have: the same as explainer pieces. */
export const PRAESENTATION_STILE = STILE.map((s) => s.id);
function stilPruefen(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || !PRAESENTATION_STILE.includes(v)) throw new MaterialError(`Der Stil: „${String(v)}“ gibt es nicht. Such mit stile_vorschlagen einen heraus.`);
  return v;
}

export function parsePraesentation(raw: unknown): Praesentation {
  const o = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(o.folien) ? o.folien : [];
  if (list.length === 0) throw new MaterialError("Es fehlen die Folien.");
  if (list.length > MAX_FOLIEN) throw new MaterialError(`Höchstens ${MAX_FOLIEN} Folien.`);
  const unbekannt: string[] = [];
  const folien = list.map((f, i): Folie => {
    const nr = i + 2; // the title slide is slide 1
    const e = (f ?? {}) as Record<string, unknown>;
    if (e.layout !== undefined && e.layout !== null && e.layout !== "") {
      if ((Array.isArray(e.punkte) && e.punkte.length) || e.schaubild) throw new MaterialError(`Folie ${nr}: Mit einem Layout gibt es keine Stichpunkte (punkte) und kein Schaubild. Die Einträge stehen in „karten“.`);
      const szene = parseSzene({ ...e, punkte: e.karten }, `Folie ${nr}`, unbekannt);
      return { art: "szene", titel: szene.titel ?? "Merksatz", szene, punkte: [], notizen: str(e.notizen, `die Notizen zu Folie ${nr}`, 3000) };
    }
    const art = e.art === undefined ? "inhalt" : e.art;
    if (art !== "inhalt" && art !== "abschnitt") throw new MaterialError(`Folie ${nr}: Die Art „${String(art)}“ gibt es nicht. Erlaubt: inhalt, abschnitt.`);
    const punkte = (Array.isArray(e.punkte) ? e.punkte : []).map((p, j) => str(p, `Punkt ${j + 1} auf Folie ${nr}`, 200, true)!);
    if (punkte.length > MAX_PUNKTE) throw new MaterialError(`Folie ${nr} hat ${punkte.length} Punkte. Höchstens ${MAX_PUNKTE}, verteile den Rest auf eine weitere Folie.`);
    const text = str(e.text, `der Text auf Folie ${nr}`, 600);
    if (e.schaubild && (e.schaubild as Record<string, unknown>).wortliste === true) throw new MaterialError(`Folie ${nr}: Eine Wortliste gibt es in einer Präsentation nicht. Schreib die Wörter als Stichpunkte auf eine eigene Folie.`);
    const schaubild = e.schaubild ? parseSchaubild(e.schaubild, nr, `Folie ${nr}`, [diagrammBreite(punkte.length > 0 || !!text)]) : undefined;
    if (art === "abschnitt" && (punkte.length || schaubild)) throw new MaterialError(`Folie ${nr} ist ein Abschnitt. Sie hat nur einen Titel und höchstens einen kurzen Text.`);
    return { art, titel: str(e.titel, `der Titel von Folie ${nr}`, 100, true)!, text, punkte, schaubild, notizen: mitLoesung(str(e.notizen, `die Notizen zu Folie ${nr}`, 3000), schaubild) };
  });
  return {
    titel: str(o.titel, "der Titel", 120, true)!,
    untertitel: str(o.untertitel, "der Untertitel", 160),
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    fuss: str(o.fuss, "der Fußtext", 200),
    stil: stilPruefen(o.stil),
    folien: (pruefeSymbole(unbekannt), folien),
  };
}

// ---------- Plan (points, 16:9) ----------

const W = 960;
const H = 540;
const MX = 56;
const PAPER = "#f4efe6";
const INK = "#23201b";
const SOFT = "#5f574c";
const ACCENT = "#b4532a";
interface Look { paper: string; ink: string; soft: string; accent: string; titel: Font; flaeche: string; rand: string; radius: number; zeichen: string; aufAkzent: string }
const KLASSISCH: Look = { paper: PAPER, ink: INK, soft: SOFT, accent: ACCENT, titel: "serif", flaeche: "#fffdf9", rand: "#d8cfbf", radius: 6, zeichen: ACCENT, aufAkzent: "#ffffff" };
/** The colors and headline font of a presentation: the classic look, or the one of the chosen style. */
export function look(p: Pick<Praesentation, "stil">): Look {
  if (!p.stil) return KLASSISCH;
  const i = stilInfo(p.stil);
  return { paper: i.farben.bg, ink: i.farben.ink, soft: i.farben.soft, accent: i.farben.accent, titel: i.serif ? "serif" : "sans-bold", flaeche: i.flaeche, rand: i.rand, radius: Math.min(14, i.radius * 0.75), zeichen: i.zeichen, aufAkzent: i.aufAkzent };
}
/** Fonts in the .pptx: on every computer with PowerPoint, on Windows and Mac. The preview uses Pult's own fonts. */
const PPTX_SERIF = "Georgia";
const PPTX_SANS = "Calibri";
const LEAD = 1.25;
const ZOOM = 1.9;
/** Share of the slide width the text takes when a diagram stands beside it. */
const TEXTANTEIL = 0.44;
/** The width a diagram is laid out at: narrow when text stands beside it, wide when it has the slide to itself. */
const diagrammBreite = (mitText: boolean) => (mitText ? (W - 2 * MX) * (1 - TEXTANTEIL) - 32 : W - 2 * MX) / ZOOM;

type Font = "serif" | "sans" | "sans-bold" | "sans-italic";
const PDF_FONT: Record<Font, string> = { serif: SERIF, sans: SANS, "sans-bold": SANS_BOLD, "sans-italic": SANS_ITALIC };

type Teil =
  | { k: "rect"; x: number; y: number; w: number; h: number; fill: string; /** corner radius */ r?: number; /** edge color */ line?: string }
  | { k: "kreis"; x: number; y: number; d: number; fill: string; text: string; color: string; size: number }
  | { k: "symbol"; x: number; y: number; s: number; id: string; farbe: string }
  | { k: "pfad"; punkte: [number, number][]; farbe: string; breite: number; spitze: boolean }
  | { k: "text"; x: number; y: number; w: number; h: number; absaetze: string[]; font: Font; size: number; color: string; bullets?: boolean; align?: "left" | "center" | "right" }
  | { k: "bild"; x: number; y: number; w: number; h: number; png: Buffer }
  | { k: "schaubild"; x: number; y: number; scale: number; szene: Szene };

interface FolienPlan { teile: Teil[]; notizen?: string; /** a designed slide in one of the layouts */ layout?: boolean }

const lines = (t: string, w: number, size: number, font: Font) => umbrechen(t, w, size, PDF_FONT[font]).length;

/** Height of paragraphs at a size, with room for the bullet in front. */
function hoehe(absaetze: string[], w: number, size: number, font: Font, bullets: boolean): number {
  // The serif of the .pptx (Georgia) is wider than the one measured here, so serif text gets a little more room.
  const inner = (bullets ? w - size * 1.1 : w) * (font === "serif" ? 0.93 : 1);
  const n = absaetze.reduce((sum, a) => sum + lines(a, inner, size, font), 0);
  return n * size * LEAD + Math.max(0, absaetze.length - 1) * size * 0.45;
}

/** The largest of `sizes` at which the paragraphs fit into the box, or undefined. */
function passend(absaetze: string[], w: number, h: number, sizes: number[], font: Font, bullets = false): number | undefined {
  return sizes.find((s) => hoehe(absaetze, w, s, font, bullets) <= h);
}

function titelFolie(p: Praesentation): FolienPlan {
  const L = look(p);
  const teile: Teil[] = [{ k: "rect", x: 0, y: 0, w: W, h: H, fill: L.paper }, { k: "rect", x: 0, y: 0, w: 16, h: H, fill: L.accent }];
  const school = schulkopf();
  let top = 44;
  if (school) {
    let x = MX;
    if (school.logo) {
      const h = 40;
      const w = Math.min(160, (school.logo.width / school.logo.height) * h);
      teile.push({ k: "bild", x, y: top, w, h: (w / school.logo.width) * school.logo.height, png: school.logo.png });
      x += w + 14;
    }
    if (school.name) teile.push({ k: "text", x, y: top + 10, w: W - x - MX, h: 24, absaetze: [school.name], font: "sans-bold", size: 14, color: L.soft });
    top += 56;
  }
  const kicker = [p.fach, p.klasse].filter(Boolean).join(" · ");
  const w = W - 2 * MX - 40;
  const size = passend([p.titel], w, 180, [46, 42, 38, 34, 30], L.titel) ?? 30;
  const titelH = hoehe([p.titel], w, size, L.titel, false);
  let y = Math.max(top + 40, 230 - titelH / 2);
  if (kicker) teile.push({ k: "text", x: MX + 8, y: y - 34, w, h: 20, absaetze: [kicker.toUpperCase()], font: "sans", size: 13, color: L.soft });
  teile.push({ k: "text", x: MX + 8, y, w, h: titelH, absaetze: [p.titel], font: L.titel, size, color: L.ink });
  y += titelH + 18;
  if (p.untertitel) {
    const s = passend([p.untertitel], w, 80, [24, 22, 20, 18], "sans") ?? 18;
    teile.push({ k: "text", x: MX + 8, y, w, h: hoehe([p.untertitel], w, s, "sans", false), absaetze: [p.untertitel], font: "sans", size: s, color: L.soft });
  }
  if (p.fuss) teile.push({ k: "text", x: MX + 8, y: H - 34, w: W - 2 * MX - 80, h: 16, absaetze: [p.fuss], font: "sans", size: 10, color: L.soft });
  return { teile };
}

function fuss(p: Praesentation, nr: number): Teil[] {
  const L = look(p);
  const links = [[p.fach, p.klasse].filter(Boolean).join(" · ") || p.titel, p.fuss].filter(Boolean).join(" · ");
  return [
    { k: "text", x: MX, y: H - 34, w: W - 2 * MX - 80, h: 16, absaetze: [links], font: "sans", size: 10, color: L.soft },
    { k: "text", x: W - MX - 60, y: H - 34, w: 60, h: 16, absaetze: [String(nr)], font: "sans", size: 10, color: L.soft, align: "right" },
  ];
}

function abschnittFolie(p: Praesentation, f: Folie, nr: number): FolienPlan {
  const L = look(p);
  const teile: Teil[] = [{ k: "rect", x: 0, y: 0, w: W, h: H, fill: L.paper }, { k: "rect", x: MX, y: 200, w: 64, h: 5, fill: L.accent }];
  const w = W - 2 * MX;
  const size = passend([f.titel], w, 130, [40, 36, 32, 28], L.titel);
  if (!size) throw new MaterialError(`Folie ${nr}: Der Titel ist zu lang für eine Folie.`);
  const th = hoehe([f.titel], w, size, L.titel, false);
  teile.push({ k: "text", x: MX, y: 222, w, h: th, absaetze: [f.titel], font: L.titel, size, color: L.ink });
  if (f.text) {
    const s = passend([f.text], w, H - 300 - th, [22, 20, 18], "sans");
    if (!s) throw new MaterialError(`Folie ${nr}: Der Text ist zu lang. Ein Abschnitt hat höchstens zwei, drei Zeilen.`);
    teile.push({ k: "text", x: MX, y: 240 + th, w, h: hoehe([f.text], w, s, "sans", false), absaetze: [f.text], font: "sans", size: s, color: L.soft });
  }
  return { teile: [...teile, ...fuss(p, nr)], notizen: f.notizen };
}

function inhaltFolie(p: Praesentation, f: Folie, nr: number): FolienPlan {
  const L = look(p);
  const teile: Teil[] = [{ k: "rect", x: 0, y: 0, w: W, h: H, fill: L.paper }, { k: "rect", x: MX, y: 40, w: 40, h: 4, fill: L.accent }];
  const w = W - 2 * MX;
  const tSize = passend([f.titel], w, 90, [32, 28, 26], L.titel);
  if (!tSize) throw new MaterialError(`Folie ${nr}: Der Titel ist zu lang für eine Folie. Kürze ihn auf eine Zeile.`);
  const th = hoehe([f.titel], w, tSize, L.titel, false);
  teile.push({ k: "text", x: MX, y: 56, w, h: th, absaetze: [f.titel], font: L.titel, size: tSize, color: L.ink });
  const top = 56 + th + 24;
  const bottom = H - 50;
  const textual = [...(f.text ? [f.text] : []), ...f.punkte];
  const textW = f.schaubild && textual.length ? w * TEXTANTEIL : w;
  if (textual.length) {
    let y = top;
    const room = bottom - top;
    // Text and points share the room. One size for both, so the slide looks calm.
    const size = [26, 24, 22, 20, 18].find((s) => (f.text ? hoehe([f.text], textW, s, "sans", false) + s : 0) + hoehe(f.punkte, textW, s, "sans", true) <= room);
    if (!size) throw new MaterialError(`Folie ${nr} hat zu viel Text. Kürze die Punkte oder verteile sie auf zwei Folien.`);
    if (f.text) {
      const h = hoehe([f.text], textW, size, "sans", false);
      teile.push({ k: "text", x: MX, y, w: textW, h, absaetze: [f.text], font: "sans", size, color: L.ink });
      y += h + size;
    }
    if (f.punkte.length) teile.push({ k: "text", x: MX, y, w: textW, h: hoehe(f.punkte, textW, size, "sans", true), absaetze: f.punkte, font: "sans", size, color: L.ink, bullets: true });
  }
  if (f.schaubild) {
    const boxX = textual.length ? MX + textW + 32 : MX;
    const boxW = textual.length ? w - textW - 32 : w;
    const caption = f.schaubild.titel;
    const capH = caption ? 22 : 0;
    const boxH = bottom - top - capH - 20;
    // Diagrams are laid out at sheet size and drawn larger, so their text is readable on a projector (about 18 pt).
    const szene = szeneVon(f.schaubild, diagrammBreite(textual.length > 0), false);
    const scale = Math.min(ZOOM, boxW / szene.w, boxH / szene.h);
    const dw = szene.w * scale;
    const dh = szene.h * scale;
    const x = boxX + (boxW - dw) / 2;
    const y = top + 10 + (boxH - dh) / 2;
    // A white card under the diagram: in the .pptx it is a picture with a white ground, the preview shows the same.
    teile.push({ k: "rect", x: x - 10, y: y - 10, w: dw + 20, h: dh + 20, fill: "#ffffff" });
    teile.push({ k: "schaubild", x, y, scale, szene });
    if (caption) teile.push({ k: "text", x: boxX, y: y + dh + 16, w: boxW, h: 16, absaetze: [caption], font: "sans-italic", size: 14, color: L.soft, align: "center" });
  }
  return { teile: [...teile, ...fuss(p, nr)], notizen: f.notizen };
}

// ---------- Slides in a layout (the same layouts as the explainer pieces) ----------

const RAND_B = 1;
/** First every word stays whole; only when nothing fits that way, a very long word may be broken. */
let ganzeWorte = true;

/** Like `hoehe`, but a word that is wider than the box does not fit at all (it would be torn apart), so the next smaller size is tried. */
function hoeheGanz(absaetze: string[], w: number, size: number, font: Font, bullets: boolean): number {
  if (!ganzeWorte) return hoehe(absaetze, w, size, font, bullets);
  const inner = bullets ? w - size * 1.1 : w;
  const breit = absaetze.some((a) => a.split(/\s+/).some((wort) => textWidth(wort, PDF_FONT[font], size) > inner));
  return breit ? Infinity : hoehe(absaetze, w, size, font, bullets);
}
const UNTEN = H - 52;

/** Small line over the title, in the accent color when it reads on the ground, else in the quiet color. */
const kickerFarbe = (L: Look) => (kontrast(L.accent, L.paper) >= 4.5 ? L.accent : L.soft);

/** Kicker, title and an optional sentence below it. Returns the bottom edge. */
function kopf(L: Look, f: Folie, s: Folienszene, nr: number, teile: Teil[], x: number, w: number, y0: number, lede: { sizes: number[]; farbe: string } | undefined, maxTitel = 40): number {
  let y = y0;
  if (s.kicker) {
    teile.push({ k: "text", x, y, w, h: 16, absaetze: [s.kicker.toUpperCase()], font: "sans-bold", size: 12, color: kickerFarbe(L) });
    y += 24;
  }
  if (s.titel) {
    const size = [40, 36, 32, 28, 26].filter((z) => z <= maxTitel).find((z) => hoeheGanz([s.titel!], w, z, L.titel, false) <= 100);
    if (!size) throw new MaterialError(`Folie ${nr}: Der Titel ist zu lang für eine Folie. Kürze ihn.`);
    const h = hoeheGanz([s.titel], w, size, L.titel, false);
    teile.push({ k: "text", x, y, w, h, absaetze: [s.titel], font: L.titel, size, color: L.ink });
    y += h;
  }
  if (s.text && lede) {
    const size = lede.sizes.find((z) => hoeheGanz([s.text!], w, z, "sans", false) <= 120);
    if (!size) throw new MaterialError(`Folie ${nr}: Der Text unter dem Titel ist zu lang.`);
    const h = hoeheGanz([s.text], w, size, "sans", false);
    y += 12;
    teile.push({ k: "text", x, y, w, h, absaetze: [s.text], font: "sans", size, color: lede.farbe });
    y += h;
  }
  return y;
}

/** The small label of an arrow: the largest size at which each word stays whole. */
function pfeilText(L: Look, text: string, x: number, y: number, w: number): Teil {
  const t = text.toUpperCase();
  const size = [10, 9, 8].find((z) => hoeheGanz([t], w, z, "sans-bold", false) < Infinity) ?? 8;
  return { k: "text", x, y, w, h: hoehe([t], w, size, "sans-bold", false), absaetze: [t], font: "sans-bold", size, color: L.soft, align: "center" };
}

const karte = (L: Look, x: number, y: number, w: number, h: number): Teil => ({ k: "rect", x, y, w, h, fill: L.flaeche, r: L.radius, line: L.rand });

interface KartenMass { titel: number; text: number }
const KARTEN_GROESSEN: KartenMass[] = [{ titel: 26, text: 20 }, { titel: 24, text: 19 }, { titel: 22, text: 18 }, { titel: 20, text: 16 }, { titel: 18, text: 15 }, { titel: 16, text: 14 }];
const KARTE_RAND = 16;

/** Height of a card with a heading, a symbol and a text at the given sizes. */
function karteHoehe(p: Punkt, w: number, m: KartenMass, symbol: boolean): number {
  const inner = w - 2 * KARTE_RAND;
  return 2 * KARTE_RAND + (symbol && p.symbol ? 46 : 0) + hoeheGanz([p.titel], inner, m.titel, "sans-bold", false) + (p.text ? 6 + hoeheGanz([p.text], inner, m.text, "sans", false) : 0);
}

/** Draws the contents of a card at its top left corner. */
function karteInhalt(L: Look, p: Punkt, x: number, y: number, w: number, m: KartenMass, teile: Teil[]): void {
  const inner = w - 2 * KARTE_RAND;
  let yy = y + KARTE_RAND;
  if (p.symbol) {
    teile.push({ k: "symbol", x: x + KARTE_RAND, y: yy, s: 36, id: p.symbol, farbe: L.zeichen });
    yy += 46;
  }
  const th = hoeheGanz([p.titel], inner, m.titel, "sans-bold", false);
  teile.push({ k: "text", x: x + KARTE_RAND, y: yy, w: inner, h: th, absaetze: [p.titel], font: "sans-bold", size: m.titel, color: L.ink });
  yy += th;
  if (p.text) teile.push({ k: "text", x: x + KARTE_RAND, y: yy + 6, w: inner, h: hoeheGanz([p.text], inner, m.text, "sans", false), absaetze: [p.text], font: "sans", size: m.text, color: L.soft });
}

/** The message for a slide that does not fit; it names the longest word, because one very long word is often the cause. */
const zuVoll = (nr: number, s: Folienszene) => {
  const worte = [s.titel, s.text, ...s.punkte.flatMap((q) => [q.titel, q.text, ...(q.liste ?? [])])].flatMap((x) => (x ?? "").split(/\s+/));
  const lang = worte.reduce((a, b) => (b.length > a.length ? b : a), "");
  return new MaterialError(`Folie ${nr} hat zu viel Text${lang.length > 16 ? ` oder ein sehr langes Wort („${lang}“)` : ""}. Kürze die Einträge, nimm ein kürzeres Wort oder verteile sie auf zwei Folien.`);
};

function szenenFolie(p: Praesentation, f: Folie, nr: number): FolienPlan {
  ganzeWorte = true;
  try {
    return szenenAufbau(p, f, nr);
  } catch (e) {
    if (!(e instanceof MaterialError)) throw e;
    ganzeWorte = false;
    return szenenAufbau(p, f, nr);
  } finally {
    ganzeWorte = true;
  }
}

function szenenAufbau(p: Praesentation, f: Folie, nr: number): FolienPlan {
  const L = look(p);
  const s = f.szene!;
  const teile: Teil[] = [{ k: "rect", x: 0, y: 0, w: W, h: H, fill: L.paper }];
  const w = W - 2 * MX;
  const n = s.punkte.length;
  const unten = UNTEN;
  /** Moves everything drawn after `von` down by `dy`, so a block of content sits well in the room. */
  const schieben = (von: number, dy: number) => {
    for (const t of teile.slice(von)) {
      if (t.k === "pfad") t.punkte = t.punkte.map(([a, b]) => [a, b + dy]);
      else (t as { y: number }).y += dy;
    }
  };
  /** Draws the header, then lets `body` draw the content in the room below; returns its height. The whole block is centered a little above the middle. */
  const block = (body: (top: number, room: number) => number, lede?: { sizes: number[]; farbe: string }) => {
    const start = teile.length;
    // A big title leaves the content less room: when it does not fit, the title is set smaller.
    for (const maxTitel of [40, 32, 26]) {
      teile.length = start;
      try {
        const kopfUnten = kopf(L, f, s, nr, teile, MX, w, 0, lede, maxTitel);
        const top = kopfUnten + 30;
        const hBody = body(top, unten - 40 - top);
        schieben(start, Math.max(0, (unten - 40 - (top + hBody)) * 0.45) + 40);
        return;
      } catch (e) {
        if (!(e instanceof MaterialError) || maxTitel === 26) throw e;
      }
    }
  };

  if (s.layout === "punkte" || s.layout === "schritte") {
    block((top, room) => {
      const cols = n >= 5 ? 3 : n;
      const rows = Math.ceil(n / cols);
      const gap = 18;
      const cw = (w - gap * (cols - 1)) / cols;
      const badge = s.layout === "schritte" ? 17 : 0;
      for (const m of KARTEN_GROESSEN) {
        const hs = s.punkte.map((q) => karteHoehe(q, cw, m, s.layout === "punkte") + badge);
        const ch = Math.max(...hs, 120);
        if (rows * ch + (rows - 1) * gap > room - badge) continue;
        s.punkte.forEach((q, i) => {
          const x = MX + (i % cols) * (cw + gap);
          const y = top + badge + Math.floor(i / cols) * (ch + gap);
          teile.push(karte(L, x, y, cw, ch));
          if (badge) teile.push({ k: "kreis", x: x + 20, y: y - badge, d: 2 * badge, fill: L.accent, text: String(i + 1), color: L.aufAkzent, size: 15 });
          karteInhalt(L, q, x, y + (badge ? 8 : 0), cw, m, teile);
        });
        return badge + rows * ch + (rows - 1) * gap;
      }
      throw zuVoll(nr, s);
    }, { sizes: [24, 22, 20], farbe: L.soft });
  } else if (s.layout === "ablauf" || s.layout === "kreislauf") {
    block((top, room) => {
      const ag = n === 4 ? 60 : 76;
      const cw = (w - (n - 1) * ag) / n;
      const rueck = s.layout === "kreislauf" ? 44 : 0;
      for (const m of KARTEN_GROESSEN) {
        const ch = Math.max(...s.punkte.map((q) => karteHoehe(q, cw, m, true)), 110);
        if (ch + rueck > room) continue;
        s.punkte.forEach((q, i) => {
          const x = MX + i * (cw + ag);
          teile.push(karte(L, x, top, cw, ch));
          karteInhalt(L, q, x, top, cw, m, teile);
          if (i < n - 1) {
            const ym = top + ch / 2;
            teile.push({ k: "pfad", punkte: [[x + cw + 8, ym], [x + cw + ag - 8, ym]], farbe: L.zeichen, breite: 2.2, spitze: true });
            if (q.pfeil) teile.push(pfeilText(L, q.pfeil, x + cw + 2, ym + 8, ag - 4));
          }
        });
        if (rueck) {
          const x1 = MX + (n - 1) * (cw + ag) + cw / 2;
          const x0 = MX + cw / 2;
          const yb = top + ch;
          teile.push({ k: "pfad", punkte: [[x1, yb + 4], [x1, yb + 28], [x0, yb + 28], [x0, yb + 6]], farbe: L.zeichen, breite: 2.2, spitze: true });
          const letzter = s.punkte[n - 1]!.pfeil;
          if (letzter) teile.push(pfeilText(L, letzter, x0, yb + 33, x1 - x0));
        }
        return ch + rueck;
      }
      throw zuVoll(nr, s);
    }, { sizes: [24, 22, 20], farbe: L.soft });
  } else if (s.layout === "zahl") {
    const zw = 340;
    const tw = w - zw - 48;
    const zs = passend([s.zahl!], zw, 170, [140, 120, 100, 84, 70, 56, 44], L.titel) ?? 44;
    const zh = hoeheGanz([s.zahl!], zw, zs, L.titel, false);
    const start = teile.length;
    teile.push({ k: "text", x: MX, y: 0, w: zw, h: zh, absaetze: [s.zahl!], font: L.titel, size: zs, color: L.zeichen });
    const bh = kopf(L, f, s, nr, teile, MX + zw + 48, tw, 0, { sizes: [24, 22, 20], farbe: L.soft });
    if (Math.max(zh, bh) > unten - 60) throw zuVoll(nr, s);
    const mitte = 40 + (unten - 40) / 2 - 10;
    schieben(start, mitte - zh / 2);
    schieben(start + 1, mitte - bh / 2 - (mitte - zh / 2));
  } else if (s.layout === "vergleich") {
    block((top, room) => {
      const gap = 24;
      const cw = (w - gap) / 2;
      for (const size of [22, 20, 19, 18, 16, 15]) {
        const inner = cw - 2 * 22;
        const rowH = (z: string) => hoeheGanz([z], inner - 22, size, "sans", false) + 18;
        const kopfH = (q: Punkt) => hoeheGanz([q.titel], inner, size + 6, "sans-bold", false) + 14;
        const hs = s.punkte.map((q) => 2 * 20 + kopfH(q) + q.liste!.reduce((a, z) => a + rowH(z), 0));
        const ch = Math.max(...hs);
        if (ch > room) continue;
        s.punkte.forEach((q, i) => {
          const x = MX + i * (cw + gap);
          teile.push(karte(L, x, top, cw, ch));
          const th = hoeheGanz([q.titel], inner, size + 6, "sans-bold", false);
          teile.push({ k: "text", x: x + 22, y: top + 20, w: inner, h: th, absaetze: [q.titel], font: "sans-bold", size: size + 6, color: L.ink });
          let y = top + 20 + kopfH(q);
          for (const z of q.liste!) {
            teile.push({ k: "rect", x: x + 22, y, w: inner, h: RAND_B, fill: L.rand });
            teile.push({ k: "rect", x: x + 24, y: y + 9 + size * 0.45 - 3, w: 6, h: 6, fill: L.zeichen });
            teile.push({ k: "text", x: x + 22 + 22, y: y + 9, w: inner - 22, h: hoeheGanz([z], inner - 22, size, "sans", false), absaetze: [z], font: "sans", size, color: L.ink });
            y += rowH(z);
          }
        });
        return ch;
      }
      throw zuVoll(nr, s);
    }, { sizes: [24, 22, 20], farbe: L.soft });
  } else if (s.layout === "zeitstrahl") {
    block((top, room) => {
      const gap = 16;
      const cw = (w - gap * (n - 1)) / n;
      const jahrGroesse = Math.min(...s.punkte.map((q) => passend([q.zahl!], cw, 44, [34, 30, 26, 22, 18, 16], L.titel) ?? 16));
      for (const m of [{ titel: 22, text: 16 }, { titel: 20, text: 15 }, { titel: 18, text: 14 }, { titel: 16, text: 13 }]) {
        const kh = (q: Punkt) => hoeheGanz([q.titel], cw, m.titel, "sans-bold", false) + (q.text ? 6 + hoeheGanz([q.text], cw, m.text, "sans", false) : 0);
        const ch = jahrGroesse * LEAD + 40 + Math.max(...s.punkte.map(kh));
        if (ch > room) continue;
        teile.push({ k: "rect", x: MX, y: top + jahrGroesse * LEAD + 9, w, h: 2, fill: L.rand });
        s.punkte.forEach((q, i) => {
          const x = MX + i * (cw + gap);
          teile.push({ k: "text", x, y: top, w: cw, h: jahrGroesse * LEAD, absaetze: [q.zahl!], font: L.titel, size: jahrGroesse, color: L.ink });
          teile.push({ k: "kreis", x, y: top + jahrGroesse * LEAD + 3, d: 14, fill: L.zeichen, text: "", color: L.zeichen, size: 1 });
          const ty = top + jahrGroesse * LEAD + 30;
          const th = hoeheGanz([q.titel], cw, m.titel, "sans-bold", false);
          teile.push({ k: "text", x, y: ty, w: cw, h: th, absaetze: [q.titel], font: "sans-bold", size: m.titel, color: L.ink });
          if (q.text) teile.push({ k: "text", x, y: ty + th + 6, w: cw, h: hoeheGanz([q.text], cw, m.text, "sans", false), absaetze: [q.text], font: "sans", size: m.text, color: L.soft });
        });
        return ch;
      }
      throw zuVoll(nr, s);
    }, { sizes: [22, 20], farbe: L.soft });
  } else if (s.layout === "aussage") {
    const mitBild = !!s.symbol;
    const tw = mitBild ? w - 210 : w;
    const start = teile.length;
    const kopfUnten = kopf(L, f, { ...s, text: undefined }, nr, teile, MX, tw, 0, undefined);
    const size = [30, 28, 26, 24, 22, 20, 18].find((z) => hoeheGanz([s.text!], tw, z, "sans", false) <= unten - 120 - kopfUnten);
    if (!size) throw zuVoll(nr, s);
    const th = hoeheGanz([s.text!], tw, size, "sans", false);
    teile.push({ k: "text", x: MX, y: kopfUnten + 18, w: tw, h: th, absaetze: [s.text!], font: "sans", size, color: L.ink });
    const gesamt = kopfUnten + 18 + th;
    const dy = Math.max(0, (unten - 40 - gesamt) * 0.45) + 40;
    schieben(start, dy);
    if (mitBild) {
      const y = dy + gesamt / 2 - 80;
      teile.push(karte(L, MX + w - 160, y, 160, 160));
      teile.push({ k: "symbol", x: MX + w - 160 + 36, y: y + 36, s: 88, id: s.symbol!, farbe: L.zeichen });
    }
  } else {
    // merksatz: one sentence, large
    const bw = 800;
    const size = [46, 42, 38, 34, 30, 26].find((z) => hoeheGanz([s.text!], bw, z, L.titel, false) <= 270);
    if (!size) throw zuVoll(nr, s);
    const th = hoeheGanz([s.text!], bw, size, L.titel, false);
    const qh = s.quelle ? 40 : 0;
    const kh = s.kicker ? 24 : 0;
    const y0 = (unten - (kh + 24 + th + qh)) / 2 + 20;
    if (s.kicker) teile.push({ k: "text", x: MX, y: y0, w: bw, h: 16, absaetze: [s.kicker.toUpperCase()], font: "sans-bold", size: 12, color: kickerFarbe(L) });
    teile.push({ k: "rect", x: MX, y: y0 + kh, w: 56, h: 5, fill: L.accent });
    teile.push({ k: "text", x: MX, y: y0 + kh + 24, w: bw, h: th, absaetze: [s.text!], font: L.titel, size, color: L.ink });
    if (s.quelle) teile.push({ k: "text", x: MX, y: y0 + kh + 24 + th + 18, w: bw, h: 20, absaetze: [s.quelle], font: "sans", size: 15, color: L.soft });
  }
  return { teile: [...teile, ...fuss(p, nr)], notizen: f.notizen, layout: true };
}

export function planen(p: Praesentation): FolienPlan[] {
  return [titelFolie(p), ...p.folien.map((f, i) => (f.art === "szene" ? szenenFolie(p, f, i + 2) : f.art === "abschnitt" ? abschnittFolie(p, f, i + 2) : inhaltFolie(p, f, i + 2)))];
}

// ---------- PowerPoint ----------

const inch = (pt: number) => pt / 72;
const hex = (c: string) => c.replace("#", "").toUpperCase();
const PPTX_FONT: Record<Font, { face: string; bold?: boolean; italic?: boolean }> = {
  serif: { face: PPTX_SERIF },
  sans: { face: PPTX_SANS },
  "sans-bold": { face: PPTX_SANS, bold: true },
  "sans-italic": { face: PPTX_SANS, italic: true },
};

/** The head of an arrow at the end of a path: three corners, tip last. */
function spitzeVon(t: Extract<Teil, { k: "pfad" }>): [number, number][] {
  const [p, q] = [t.punkte[t.punkte.length - 2]!, t.punkte[t.punkte.length - 1]!];
  const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const l = 5 + t.breite * 1.6;
  const eck = (w: number): [number, number] => [q[0] - l * Math.cos(a) + w * Math.sin(a), q[1] - l * Math.sin(a) - w * Math.cos(a)];
  return [eck(l * 0.6), eck(-l * 0.6), q];
}

/** A path of lines (PowerPoint has no polyline we can rely on) and its arrow head as a small triangle. */
function pfadPptx(pres: PptxGenJS, slide: ReturnType<PptxGenJS["addSlide"]>, t: Extract<Teil, { k: "pfad" }>): void {
  for (let i = 0; i + 1 < t.punkte.length; i++) {
    const [p, q] = [t.punkte[i]!, t.punkte[i + 1]!];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    slide.addShape(pres.ShapeType.line, { x: inch(Math.min(p[0], q[0])), y: inch(Math.min(p[1], q[1])), w: inch(Math.abs(dx)), h: inch(Math.abs(dy)), flipH: dx < 0, flipV: dy < 0, line: { color: hex(t.farbe), width: t.breite } });
  }
  if (t.spitze) {
    const [p, q] = [t.punkte[t.punkte.length - 2]!, t.punkte[t.punkte.length - 1]!];
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const l = 5 + t.breite * 1.6;
    const w = 2 * l * 0.6;
    const cx = q[0] - (l / 2) * Math.cos(a);
    const cy = q[1] - (l / 2) * Math.sin(a);
    slide.addShape(pres.ShapeType.triangle, { x: inch(cx - w / 2), y: inch(cy - l / 2), w: inch(w), h: inch(l), rotate: ((a * 180) / Math.PI + 90 + 360) % 360, fill: { color: hex(t.farbe) }, line: { color: hex(t.farbe), width: 0 } });
  }
}

export async function renderPptx(p: Praesentation): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches, 16:9
  pres.title = p.titel;
  pres.company = "Pult";
  for (const plan of planen(p)) {
    const slide = pres.addSlide();
    slide.background = { color: hex(look(p).paper) };
    for (const t of plan.teile) {
      if (t.k === "rect") {
        if (t.w >= W && t.h >= H) continue; // the background
        const rund = t.r ? { rectRadius: inch(t.r) } : {};
        slide.addShape(t.r ? pres.ShapeType.roundRect : pres.ShapeType.rect, { x: inch(t.x), y: inch(t.y), w: inch(t.w), h: inch(t.h), fill: { color: hex(t.fill) }, line: { color: hex(t.line ?? t.fill), width: t.line ? 1 : 0 }, ...rund });
      } else if (t.k === "kreis") {
        slide.addText(t.text, { shape: pres.ShapeType.ellipse, x: inch(t.x), y: inch(t.y), w: inch(t.d), h: inch(t.d), fill: { color: hex(t.fill) }, line: { color: hex(t.fill), width: 0 }, fontFace: PPTX_SANS, fontSize: t.size, bold: true, color: hex(t.color), align: "center", valign: "middle", margin: 0, wrap: false });
      } else if (t.k === "symbol") {
        slide.addImage({ data: `image/png;base64,${(await symbolPng(t.id, t.farbe)).toString("base64")}`, x: inch(t.x), y: inch(t.y), w: inch(t.s), h: inch(t.s) });
      } else if (t.k === "pfad") {
        pfadPptx(pres, slide, t);
      } else if (t.k === "text") {
        const f = PPTX_FONT[t.font];
        const runs = t.absaetze.map((a, i) => ({
          text: a,
          options: { breakLine: i < t.absaetze.length - 1, ...(t.bullets ? { bullet: { indent: t.size * 0.9 }, paraSpaceAfter: t.size * 0.45 } : {}) },
        }));
        slide.addText(runs, {
          x: inch(t.x), y: inch(t.y), w: inch(t.w), h: inch(t.h + t.size * 0.3),
          fontFace: f.face, bold: f.bold, italic: f.italic, fontSize: t.size, color: hex(t.color),
          align: t.align ?? "left", valign: "top", margin: 0, lineSpacingMultiple: LEAD * 0.92, fit: "none",
          ...(plan.layout ? { objectName: "Layout" } : {}),
        });
      } else if (t.k === "bild") {
        slide.addImage({ data: `image/png;base64,${t.png.toString("base64")}`, x: inch(t.x), y: inch(t.y), w: inch(t.w), h: inch(t.h) });
      } else {
        // A diagram goes in as real objects (boxes, lines, text), so it can be edited in PowerPoint.
        zeichnePptx(pres, slide, t.szene, t.x, t.y, t.scale);
      }
    }
    if (plan.notizen) slide.addNotes(plan.notizen);
  }
  return (await pres.write({ outputType: "nodebuffer" })) as Buffer;
}

// ---------- Preview (PDF, one page per slide) ----------

export async function renderVorschau(p: Praesentation): Promise<{ pdf: Buffer; seiten: number }> {
  const plans = planen(p);
  const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false, info: { Title: printable(p.titel), Producer: "Pult" } });
  registerFonts(doc);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => doc.on("end", resolve));
  for (const plan of plans) {
    doc.addPage({ size: [W, H], margin: 0 });
    for (const t of plan.teile) {
      if (t.k === "rect") {
        const sh = t.r ? doc.roundedRect(t.x, t.y, t.w, t.h, t.r) : doc.rect(t.x, t.y, t.w, t.h);
        doc.save();
        if (t.line) sh.lineWidth(1).fillAndStroke(t.fill, t.line);
        else sh.fill(t.fill);
        doc.restore();
      } else if (t.k === "kreis") {
        doc.save().circle(t.x + t.d / 2, t.y + t.d / 2, t.d / 2).fill(t.fill).restore();
        if (t.text) {
          doc.font(SANS_BOLD).fontSize(t.size).fillColor(t.color);
          doc.text(t.text, t.x + (t.d - doc.widthOfString(t.text)) / 2, t.y + t.d / 2 - t.size * 0.62, { lineBreak: false });
        }
      } else if (t.k === "symbol") doc.image(await symbolPng(t.id, t.farbe), t.x, t.y, { width: t.s, height: t.s });
      else if (t.k === "pfad") {
        doc.save().lineWidth(t.breite).lineJoin("round").strokeColor(t.farbe);
        t.punkte.forEach(([x, y], i) => (i === 0 ? doc.moveTo(x, y) : doc.lineTo(x, y)));
        doc.stroke().restore();
        if (t.spitze) {
          doc.save().fillColor(t.farbe).polygon(...spitzeVon(t)).fill().restore();
        }
      } else if (t.k === "bild") doc.image(t.png, t.x, t.y, { width: t.w, height: t.h });
      else if (t.k === "schaubild") {
        doc.save().translate(t.x, t.y).scale(t.scale);
        zeichnePdf(doc, t.szene, 0, 0);
        doc.restore();
      } else {
        doc.font(PDF_FONT[t.font]).fontSize(t.size).fillColor(t.color);
        let y = t.y;
        for (const a of t.absaetze) {
          const indent = t.bullets ? t.size * 1.1 : 0;
          if (t.bullets) doc.text("•", t.x, y, { lineBreak: false });
          const ls = umbrechen(a, t.w - indent, t.size, PDF_FONT[t.font]);
          for (const l of ls) {
            const free = t.w - indent - doc.widthOfString(printable(l));
            const shift = t.align === "right" ? free : t.align === "center" ? free / 2 : 0;
            doc.text(printable(l), t.x + indent + Math.max(0, shift), y, { lineBreak: false });
            y += t.size * LEAD;
          }
          y += t.size * 0.45;
        }
      }
    }
  }
  doc.end();
  await done;
  return { pdf: Buffer.concat(chunks), seiten: plans.length };
}

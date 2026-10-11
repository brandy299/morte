/**
 * Slides for PowerPoint (.pptx) and the same slides as a PDF for the preview.
 * The layout of every slide is planned once (in points, 16:9) and then drawn twice, so preview and file agree.
 * See docs/entscheidungen/016-praesentationen.md.
 */
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { schulkopf } from "../schule/index.ts";
import { MaterialError, printable, registerFonts, SANS, SANS_BOLD, SANS_ITALIC, SERIF, str } from "./layout.ts";
import { parseSchaubild, szeneVon, umbrechen, type Schaubild, type Szene } from "./schaubild.ts";
import { zeichnePdf } from "./schaubild-zeichnen.ts";
import { zeichnePptx } from "./schaubild-pptx.ts";

export interface Folie {
  /** `abschnitt`: a divider between parts of the talk. */
  art: "inhalt" | "abschnitt";
  titel: string;
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

export function parsePraesentation(raw: unknown): Praesentation {
  const o = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(o.folien) ? o.folien : [];
  if (list.length === 0) throw new MaterialError("Es fehlen die Folien.");
  if (list.length > MAX_FOLIEN) throw new MaterialError(`Höchstens ${MAX_FOLIEN} Folien.`);
  const folien = list.map((f, i): Folie => {
    const nr = i + 2; // the title slide is slide 1
    const e = (f ?? {}) as Record<string, unknown>;
    const art = e.art === undefined ? "inhalt" : e.art;
    if (art !== "inhalt" && art !== "abschnitt") throw new MaterialError(`Folie ${nr}: Die Art „${String(art)}“ gibt es nicht. Erlaubt: inhalt, abschnitt.`);
    const punkte = (Array.isArray(e.punkte) ? e.punkte : []).map((p, j) => str(p, `Punkt ${j + 1} auf Folie ${nr}`, 200, true)!);
    if (punkte.length > MAX_PUNKTE) throw new MaterialError(`Folie ${nr} hat ${punkte.length} Punkte. Höchstens ${MAX_PUNKTE}, verteile den Rest auf eine weitere Folie.`);
    const text = str(e.text, `der Text auf Folie ${nr}`, 600);
    if (e.schaubild && (e.schaubild as Record<string, unknown>).wortliste === true) throw new MaterialError(`Folie ${nr}: Eine Wortliste gibt es in einer Präsentation nicht. Schreib die Wörter als Stichpunkte auf eine eigene Folie.`);
    const schaubild = e.schaubild ? parseSchaubild(e.schaubild, nr, `Folie ${nr}`) : undefined;
    if (art === "abschnitt" && (punkte.length || schaubild)) throw new MaterialError(`Folie ${nr} ist ein Abschnitt. Sie hat nur einen Titel und höchstens einen kurzen Text.`);
    return { art, titel: str(e.titel, `der Titel von Folie ${nr}`, 100, true)!, text, punkte, schaubild, notizen: mitLoesung(str(e.notizen, `die Notizen zu Folie ${nr}`, 3000), schaubild) };
  });
  return {
    titel: str(o.titel, "der Titel", 120, true)!,
    untertitel: str(o.untertitel, "der Untertitel", 160),
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    fuss: str(o.fuss, "der Fußtext", 200),
    folien,
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
/** Fonts in the .pptx: on every computer with PowerPoint, on Windows and Mac. The preview uses Pult's own fonts. */
const PPTX_SERIF = "Georgia";
const PPTX_SANS = "Calibri";
const LEAD = 1.25;
const ZOOM = 1.9;

type Font = "serif" | "sans" | "sans-bold" | "sans-italic";
const PDF_FONT: Record<Font, string> = { serif: SERIF, sans: SANS, "sans-bold": SANS_BOLD, "sans-italic": SANS_ITALIC };

type Teil =
  | { k: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { k: "text"; x: number; y: number; w: number; h: number; absaetze: string[]; font: Font; size: number; color: string; bullets?: boolean; align?: "left" | "center" | "right" }
  | { k: "bild"; x: number; y: number; w: number; h: number; png: Buffer }
  | { k: "schaubild"; x: number; y: number; scale: number; szene: Szene };

interface FolienPlan { teile: Teil[]; notizen?: string }

const lines = (t: string, w: number, size: number, font: Font) => umbrechen(t, w, size, PDF_FONT[font]).length;

/** Height of paragraphs at a size, with room for the bullet in front. */
function hoehe(absaetze: string[], w: number, size: number, font: Font, bullets: boolean): number {
  const inner = bullets ? w - size * 1.1 : w;
  const n = absaetze.reduce((sum, a) => sum + lines(a, inner, size, font), 0);
  return n * size * LEAD + Math.max(0, absaetze.length - 1) * size * 0.45;
}

/** The largest of `sizes` at which the paragraphs fit into the box, or undefined. */
function passend(absaetze: string[], w: number, h: number, sizes: number[], font: Font, bullets = false): number | undefined {
  return sizes.find((s) => hoehe(absaetze, w, s, font, bullets) <= h);
}

function titelFolie(p: Praesentation): FolienPlan {
  const teile: Teil[] = [{ k: "rect", x: 0, y: 0, w: W, h: H, fill: PAPER }, { k: "rect", x: 0, y: 0, w: 16, h: H, fill: ACCENT }];
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
    if (school.name) teile.push({ k: "text", x, y: top + 10, w: W - x - MX, h: 24, absaetze: [school.name], font: "sans-bold", size: 14, color: SOFT });
    top += 56;
  }
  const kicker = [p.fach, p.klasse].filter(Boolean).join(" · ");
  const w = W - 2 * MX - 40;
  const size = passend([p.titel], w, 180, [46, 42, 38, 34, 30], "serif") ?? 30;
  const titelH = hoehe([p.titel], w, size, "serif", false);
  let y = Math.max(top + 40, 230 - titelH / 2);
  if (kicker) teile.push({ k: "text", x: MX + 8, y: y - 34, w, h: 20, absaetze: [kicker.toUpperCase()], font: "sans", size: 13, color: SOFT });
  teile.push({ k: "text", x: MX + 8, y, w, h: titelH, absaetze: [p.titel], font: "serif", size, color: INK });
  y += titelH + 18;
  if (p.untertitel) {
    const s = passend([p.untertitel], w, 80, [24, 22, 20, 18], "sans") ?? 18;
    teile.push({ k: "text", x: MX + 8, y, w, h: hoehe([p.untertitel], w, s, "sans", false), absaetze: [p.untertitel], font: "sans", size: s, color: SOFT });
  }
  if (p.fuss) teile.push({ k: "text", x: MX + 8, y: H - 34, w: W - 2 * MX - 80, h: 16, absaetze: [p.fuss], font: "sans", size: 10, color: SOFT });
  return { teile };
}

function fuss(p: Praesentation, nr: number): Teil[] {
  const links = [[p.fach, p.klasse].filter(Boolean).join(" · ") || p.titel, p.fuss].filter(Boolean).join(" · ");
  return [
    { k: "text", x: MX, y: H - 34, w: W - 2 * MX - 80, h: 16, absaetze: [links], font: "sans", size: 10, color: SOFT },
    { k: "text", x: W - MX - 60, y: H - 34, w: 60, h: 16, absaetze: [String(nr)], font: "sans", size: 10, color: SOFT, align: "right" },
  ];
}

function abschnittFolie(p: Praesentation, f: Folie, nr: number): FolienPlan {
  const teile: Teil[] = [{ k: "rect", x: 0, y: 0, w: W, h: H, fill: PAPER }, { k: "rect", x: MX, y: 200, w: 64, h: 5, fill: ACCENT }];
  const w = W - 2 * MX;
  const size = passend([f.titel], w, 130, [40, 36, 32, 28], "serif");
  if (!size) throw new MaterialError(`Folie ${nr}: Der Titel ist zu lang für eine Folie.`);
  const th = hoehe([f.titel], w, size, "serif", false);
  teile.push({ k: "text", x: MX, y: 222, w, h: th, absaetze: [f.titel], font: "serif", size, color: INK });
  if (f.text) {
    const s = passend([f.text], w, H - 300 - th, [22, 20, 18], "sans");
    if (!s) throw new MaterialError(`Folie ${nr}: Der Text ist zu lang. Ein Abschnitt hat höchstens zwei, drei Zeilen.`);
    teile.push({ k: "text", x: MX, y: 240 + th, w, h: hoehe([f.text], w, s, "sans", false), absaetze: [f.text], font: "sans", size: s, color: SOFT });
  }
  return { teile: [...teile, ...fuss(p, nr)], notizen: f.notizen };
}

function inhaltFolie(p: Praesentation, f: Folie, nr: number): FolienPlan {
  const teile: Teil[] = [{ k: "rect", x: 0, y: 0, w: W, h: H, fill: PAPER }, { k: "rect", x: MX, y: 40, w: 40, h: 4, fill: ACCENT }];
  const w = W - 2 * MX;
  const tSize = passend([f.titel], w, 90, [32, 28, 26], "serif");
  if (!tSize) throw new MaterialError(`Folie ${nr}: Der Titel ist zu lang für eine Folie. Kürze ihn auf eine Zeile.`);
  const th = hoehe([f.titel], w, tSize, "serif", false);
  teile.push({ k: "text", x: MX, y: 56, w, h: th, absaetze: [f.titel], font: "serif", size: tSize, color: INK });
  const top = 56 + th + 24;
  const bottom = H - 50;
  const textual = [...(f.text ? [f.text] : []), ...f.punkte];
  const textW = f.schaubild && textual.length ? w * 0.44 : w;
  if (textual.length) {
    let y = top;
    const room = bottom - top;
    // Text and points share the room. One size for both, so the slide looks calm.
    const size = [26, 24, 22, 20, 18].find((s) => (f.text ? hoehe([f.text], textW, s, "sans", false) + s : 0) + hoehe(f.punkte, textW, s, "sans", true) <= room);
    if (!size) throw new MaterialError(`Folie ${nr} hat zu viel Text. Kürze die Punkte oder verteile sie auf zwei Folien.`);
    if (f.text) {
      const h = hoehe([f.text], textW, size, "sans", false);
      teile.push({ k: "text", x: MX, y, w: textW, h, absaetze: [f.text], font: "sans", size, color: INK });
      y += h + size;
    }
    if (f.punkte.length) teile.push({ k: "text", x: MX, y, w: textW, h: hoehe(f.punkte, textW, size, "sans", true), absaetze: f.punkte, font: "sans", size, color: INK, bullets: true });
  }
  if (f.schaubild) {
    const boxX = textual.length ? MX + textW + 32 : MX;
    const boxW = textual.length ? w - textW - 32 : w;
    const caption = f.schaubild.titel;
    const capH = caption ? 22 : 0;
    const boxH = bottom - top - capH - 20;
    // Diagrams are laid out at sheet size and drawn larger, so their text is readable on a projector (about 18 pt).
    const szene = szeneVon(f.schaubild, boxW / ZOOM, false);
    const scale = Math.min(ZOOM, boxW / szene.w, boxH / szene.h);
    const dw = szene.w * scale;
    const dh = szene.h * scale;
    const x = boxX + (boxW - dw) / 2;
    const y = top + 10 + (boxH - dh) / 2;
    // A white card under the diagram: in the .pptx it is a picture with a white ground, the preview shows the same.
    teile.push({ k: "rect", x: x - 10, y: y - 10, w: dw + 20, h: dh + 20, fill: "#ffffff" });
    teile.push({ k: "schaubild", x, y, scale, szene });
    if (caption) teile.push({ k: "text", x: boxX, y: y + dh + 16, w: boxW, h: 16, absaetze: [caption], font: "sans-italic", size: 14, color: SOFT, align: "center" });
  }
  return { teile: [...teile, ...fuss(p, nr)], notizen: f.notizen };
}

export function planen(p: Praesentation): FolienPlan[] {
  return [titelFolie(p), ...p.folien.map((f, i) => (f.art === "abschnitt" ? abschnittFolie(p, f, i + 2) : inhaltFolie(p, f, i + 2)))];
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

export async function renderPptx(p: Praesentation): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches, 16:9
  pres.title = p.titel;
  pres.company = "Pult";
  for (const plan of planen(p)) {
    const slide = pres.addSlide();
    slide.background = { color: hex(PAPER) };
    for (const t of plan.teile) {
      if (t.k === "rect") {
        if (t.w >= W && t.h >= H) continue; // the background
        slide.addShape(pres.ShapeType.rect, { x: inch(t.x), y: inch(t.y), w: inch(t.w), h: inch(t.h), fill: { color: hex(t.fill) }, line: { color: hex(t.fill), width: 0 } });
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
      if (t.k === "rect") doc.save().rect(t.x, t.y, t.w, t.h).fill(t.fill).restore();
      else if (t.k === "bild") doc.image(t.png, t.x, t.y, { width: t.w, height: t.h });
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

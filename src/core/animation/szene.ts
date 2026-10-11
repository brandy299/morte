/**
 * Explainer piece (Erklärstück): the model writes the content as a scene description, this file checks it and
 * places every element. The model never gives pixels, the layout puts things in a 3x3 grid and refuses what does not fit,
 * so nothing overlaps or runs over the edge. Drawing and timing are in html.ts.
 */
import { MaterialError, SERIF, str, textWidth } from "../material/layout.ts";
import { umbrechen } from "../material/schaubild.ts";

export const W = 1280;
export const H = 720;
const MARGIN = 48;
const GAP = 24;
const STACK_GAP = 16;

export const LAGEN = ["oben-links", "oben", "oben-rechts", "links", "mitte", "rechts", "unten-links", "unten", "unten-rechts"] as const;
export type Lage = (typeof LAGEN)[number];
export const FORMEN = ["sonne", "wolke", "huegel", "wasser"] as const;
export type Formart = (typeof FORMEN)[number];
export const ARTEN = ["text", "kasten", "zahl", "form", "pfeil"] as const;
export type Art = (typeof ARTEN)[number];
export const PALETTEN = ["wasser", "wiese", "abend"] as const;
export type Palette = (typeof PALETTEN)[number];
export const TEMPI = ["ruhig", "mittel", "zuegig"] as const;
export type Tempo = (typeof TEMPI)[number];

export const MAX_SZENEN = 10;
export const MAX_ELEMENTE = 8;

export interface Element {
  art: Art;
  id?: string;
  text?: string;
  zahl?: string;
  form?: Formart;
  lage?: Lage;
  von?: string;
  nach?: string;
}
export interface Szene {
  titel?: string;
  elemente: Element[];
}
export interface Erklaerstueck {
  titel: string;
  untertitel?: string;
  palette: Palette;
  tempo: Tempo;
  szenen: Szene[];
}

const oneOf = <T extends string>(v: unknown, list: readonly T[], what: string, fallback?: T): T => {
  if (v === undefined || v === null || v === "") {
    if (fallback) return fallback;
    throw new MaterialError(`Es fehlt: ${what}.`);
  }
  if (typeof v !== "string" || !(list as readonly string[]).includes(v)) throw new MaterialError(`${what}: „${String(v)}“ gibt es nicht. Erlaubt: ${list.join(", ")}.`);
  return v as T;
};

/** `str` with the place (scene, element) in front of the message, so the model knows what to fix. */
const feld = (stelle: string, v: unknown, was: string, max: number, required = false): string | undefined => {
  try {
    return str(v, was, max, required);
  } catch (e) {
    throw e instanceof MaterialError ? new MaterialError(`${stelle}: ${e.message}`) : e;
  }
};

/** Checks the raw scene description from the model and explains every problem in plain words. */
export function parseErklaerstueck(raw: unknown): Erklaerstueck {
  if (!raw || typeof raw !== "object") throw new MaterialError("Die Szenenbeschreibung fehlt.");
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.szenen) || o.szenen.length === 0) throw new MaterialError("Es fehlen die Szenen.");
  if (o.szenen.length > MAX_SZENEN) throw new MaterialError(`Es sind ${o.szenen.length} Szenen. Höchstens ${MAX_SZENEN}, sonst wird es zu lang. Fasse zusammen oder teile das Thema in zwei Erklärstücke.`);
  const szenen = o.szenen.map((s, i): Szene => {
    const nr = i + 1;
    const e = (s ?? {}) as Record<string, unknown>;
    if (!Array.isArray(e.elemente) || e.elemente.length === 0) throw new MaterialError(`Szene ${nr}: Es fehlen die Elemente.`);
    if (e.elemente.length > MAX_ELEMENTE) throw new MaterialError(`Szene ${nr} hat ${e.elemente.length} Elemente. Höchstens ${MAX_ELEMENTE}. Verteile sie auf eine weitere Szene.`);
    const ids = new Set<string>();
    const elemente = e.elemente.map((x, j): Element => {
      const stelle = `Szene ${nr}, Element ${j + 1}`;
      const el = (x ?? {}) as Record<string, unknown>;
      const art = oneOf(el.art, ARTEN, `${stelle}: Die Art`);
      const id = feld(stelle, el.id, "die Kennung", 20);
      if (id) {
        if (!/^[a-z0-9]+$/.test(id)) throw new MaterialError(`${stelle}: Die Kennung „${id}“ darf nur aus kleinen Buchstaben und Ziffern bestehen.`);
        if (ids.has(id)) throw new MaterialError(`Szene ${nr}: Die Kennung „${id}“ kommt zweimal vor.`);
        ids.add(id);
      }
      if (art === "pfeil") {
        const von = feld(stelle, el.von, "der Anfang des Pfeils (von)", 20, true)!;
        const nach = feld(stelle, el.nach, "das Ende des Pfeils (nach)", 20, true)!;
        return { art, id, von, nach, text: feld(stelle, el.text, "die Beschriftung des Pfeils", 30) };
      }
      const lage = oneOf(el.lage, LAGEN, `${stelle}: Die Lage`);
      if (art === "form") return { art, id, lage, form: oneOf(el.form, FORMEN, `${stelle}: Die Form`) };
      if (art === "zahl") return { art, id, lage, zahl: feld(stelle, el.zahl, "die Zahl", 12, true)!, text: feld(stelle, el.text, "der Text zur Zahl", 60) };
      if (art === "kasten") return { art, id, lage, text: feld(stelle, el.text, "der Text im Kasten", 80, true)! };
      return { art, id, lage, text: feld(stelle, el.text, "der Text", 140, true)! };
    });
    for (const p of elemente.filter((x) => x.art === "pfeil")) {
      for (const ende of [p.von!, p.nach!]) {
        const ziel = elemente.find((x) => x.id === ende);
        if (!ziel) throw new MaterialError(`Szene ${nr}: Der Pfeil zeigt auf „${ende}“, das es in dieser Szene nicht gibt. Gib dem Element eine Kennung (id).`);
        if (ziel.art === "pfeil") throw new MaterialError(`Szene ${nr}: Ein Pfeil kann nicht auf einen anderen Pfeil zeigen.`);
      }
      if (p.von === p.nach) throw new MaterialError(`Szene ${nr}: Der Pfeil beginnt und endet im selben Element.`);
    }
    return { titel: feld(`Szene ${nr}`, e.titel, "der Titel", 80), elemente };
  });
  return {
    titel: str(o.titel, "der Titel", 80, true)!,
    untertitel: str(o.untertitel, "der Untertitel", 120),
    palette: oneOf(o.palette, PALETTEN, "Die Farbwelt (palette)", "wasser"),
    tempo: oneOf(o.tempo, TEMPI, "Das Tempo", "mittel"),
    szenen,
  };
}

// ---------- layout ----------

export interface Box { x: number; y: number; w: number; h: number }
export type Teil =
  | (Box & { k: "text"; zeilen: string[]; groesse: number })
  | (Box & { k: "kasten"; zeilen: string[]; groesse: number })
  | (Box & { k: "zahl"; zahl: string; zeilen: string[]; groesse: number })
  | (Box & { k: "form"; form: Formart })
  | { k: "pfeil"; von: [number, number]; nach: [number, number]; etikett?: Box & { zeilen: string[] } };
export interface GesetztesElement { id?: string; teil: Teil }
export interface GesetzteSzene {
  titel?: Box & { zeilen: string[]; groesse: number };
  elemente: GesetztesElement[];
}

const SIZE = { text: 34, kasten: 28, zahl: 76, zahlText: 26, titel: 44, etikett: 24 };
const LEAD = 1.28;
const PAD = 18;
const FORM = { w: 220, h: 147 };

const lineH = (size: number) => size * LEAD;
const maxLine = (zeilen: string[], size: number) => Math.max(...zeilen.map((l) => textWidth(l, SERIF, size)));

const hits = (a: Box, b: Box, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/** Where the straight line between two box centers leaves box `b` (the arrow starts at the edge, not in the middle). */
function rand(b: Box, tx: number, ty: number): [number, number] {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const s = Math.min(dx !== 0 ? b.w / 2 / Math.abs(dx) : Infinity, dy !== 0 ? b.h / 2 / Math.abs(dy) : Infinity);
  return [cx + dx * s, cy + dy * s];
}

const segmentHits = (p: [number, number], q: [number, number], b: Box): boolean => {
  for (let i = 0; i <= 40; i++) {
    const x = p[0] + ((q[0] - p[0]) * i) / 40;
    const y = p[1] + ((q[1] - p[1]) * i) / 40;
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
};

/** Places all elements of a scene. Throws a plain-language message when something does not fit. */
export function setzen(s: Szene, nr: number): GesetzteSzene {
  const titel = s.titel
    ? (() => {
        const zeilen = umbrechen(s.titel, W - 2 * MARGIN, SIZE.titel, SERIF);
        if (zeilen.length > 2) throw new MaterialError(`Szene ${nr}: Der Titel ist zu lang. Kürzer, höchstens zwei Zeilen.`);
        const w = Math.min(W - 2 * MARGIN, maxLine(zeilen, SIZE.titel));
        return { x: (W - w) / 2, y: MARGIN, w, h: zeilen.length * lineH(SIZE.titel), zeilen, groesse: SIZE.titel };
      })()
    : undefined;
  const top = titel ? titel.y + titel.h + 20 : MARGIN;
  const cw = (W - 2 * MARGIN - 2 * GAP) / 3;
  const ch = (H - MARGIN - top - 2 * GAP) / 3;
  const cell = (lage: Lage): Box => {
    const i = LAGEN.indexOf(lage);
    return { x: MARGIN + (i % 3) * (cw + GAP), y: top + Math.floor(i / 3) * (ch + GAP), w: cw, h: ch };
  };

  // Measure every element, then stack the ones in the same cell.
  type Mass = { el: Element; w: number; h: number; make: (b: Box) => Teil };
  const masse = s.elemente.filter((e) => e.art !== "pfeil").map((el): Mass => {
    if (el.art === "form") return { el, ...FORM, make: (b) => ({ k: "form", ...b, form: el.form! }) };
    if (el.art === "text") {
      const zeilen = umbrechen(el.text!, cw, SIZE.text, SERIF);
      return { el, w: Math.min(cw, maxLine(zeilen, SIZE.text)), h: zeilen.length * lineH(SIZE.text), make: (b) => ({ k: "text", ...b, zeilen, groesse: SIZE.text }) };
    }
    if (el.art === "kasten") {
      const zeilen = umbrechen(el.text!, cw - 2 * PAD, SIZE.kasten, SERIF);
      return { el, w: Math.min(cw, maxLine(zeilen, SIZE.kasten) + 2 * PAD), h: zeilen.length * lineH(SIZE.kasten) + 2 * PAD, make: (b) => ({ k: "kasten", ...b, zeilen, groesse: SIZE.kasten }) };
    }
    const zeilen = el.text ? umbrechen(el.text, cw, SIZE.zahlText, SERIF) : [];
    const zahlW = textWidth(el.zahl!, SERIF, SIZE.zahl);
    if (zahlW > cw) throw new MaterialError(`Szene ${nr}: Die Zahl „${el.zahl}“ ist zu breit. Kürzer schreiben.`);
    const w = Math.min(cw, Math.max(zahlW, zeilen.length ? maxLine(zeilen, SIZE.zahlText) : 0));
    return { el, w, h: lineH(SIZE.zahl) + zeilen.length * lineH(SIZE.zahlText), make: (b) => ({ k: "zahl", ...b, zahl: el.zahl!, zeilen, groesse: SIZE.zahl }) };
  });

  const gesetzt = new Map<Element, Teil>();
  for (const lage of LAGEN) {
    const inCell = masse.filter((m) => m.el.lage === lage);
    if (!inCell.length) continue;
    const c = cell(lage);
    const total = inCell.reduce((a, m) => a + m.h, 0) + STACK_GAP * (inCell.length - 1);
    if (total > c.h) throw new MaterialError(`Szene ${nr}: In „${lage}“ ist zu viel. Verteile die Elemente auf andere Lagen, kürze die Texte oder nimm eine weitere Szene.`);
    let y = c.y + (c.h - total) / 2;
    for (const m of inCell) {
      gesetzt.set(m.el, m.make({ x: c.x + (c.w - m.w) / 2, y, w: m.w, h: m.h }));
      y += m.h + STACK_GAP;
    }
  }

  // Arrows run between the edges of two elements. The label sits next to the line, never on top of another element.
  const boxen = (): Box[] => [...gesetzt.values()].filter((t): t is Extract<Teil, Box> => t.k !== "pfeil");
  const etiketten: Box[] = [];
  const out: GesetztesElement[] = [];
  for (const el of s.elemente) {
    if (el.art !== "pfeil") {
      out.push({ id: el.id, teil: gesetzt.get(el)! });
      continue;
    }
    const a = gesetzt.get(s.elemente.find((x) => x.id === el.von)!) as Box;
    const b = gesetzt.get(s.elemente.find((x) => x.id === el.nach)!) as Box;
    const ca: [number, number] = [a.x + a.w / 2, a.y + a.h / 2];
    const cb: [number, number] = [b.x + b.w / 2, b.y + b.h / 2];
    const dir = Math.atan2(cb[1] - ca[1], cb[0] - ca[0]);
    const gap = 10;
    const p0 = rand(a, cb[0], cb[1]);
    const p1 = rand(b, ca[0], ca[1]);
    const von: [number, number] = [p0[0] + Math.cos(dir) * gap, p0[1] + Math.sin(dir) * gap];
    const nach: [number, number] = [p1[0] - Math.cos(dir) * gap, p1[1] - Math.sin(dir) * gap];
    if (Math.hypot(nach[0] - von[0], nach[1] - von[1]) < 30) throw new MaterialError(`Szene ${nr}: Die Elemente „${el.von}“ und „${el.nach}“ liegen zu nah beieinander für einen Pfeil. Setze sie in verschiedene Lagen.`);
    for (const other of boxen()) {
      if (other === a || other === b) continue;
      if (segmentHits(von, nach, other)) throw new MaterialError(`Szene ${nr}: Der Pfeil von „${el.von}“ nach „${el.nach}“ geht über ein anderes Element. Setze die beiden nebeneinander oder lass die Zelle dazwischen frei.`);
    }
    let etikett: (Box & { zeilen: string[] }) | undefined;
    if (el.text) {
      const zeilen = [el.text];
      const w = textWidth(el.text, SERIF, SIZE.etikett) + 16;
      const h = lineH(SIZE.etikett) + 6;
      const nx = -Math.sin(dir);
      const ny = Math.cos(dir);
      const off = Math.abs(nx) * (w / 2 + 8) + Math.abs(ny) * (h / 2 + 8);
      candidates: for (const t of [0.5, 0.4, 0.6, 0.3, 0.7]) for (const side of [0, 1, -1]) {
        const mx = von[0] + (nach[0] - von[0]) * t + nx * side * off;
        const my = von[1] + (nach[1] - von[1]) * t + ny * side * off;
        const box = { x: mx - w / 2, y: my - h / 2, w, h };
        if (box.x < MARGIN / 2 || box.y < MARGIN / 2 || box.x + w > W - MARGIN / 2 || box.y + h > H - MARGIN / 2) continue;
        if (boxen().some((o) => hits(box, o, 4)) || etiketten.some((o) => hits(box, o, 4)) || (titel && hits(box, titel, 4))) continue;
        etikett = { ...box, zeilen };
        break candidates;
      }
      if (!etikett) throw new MaterialError(`Szene ${nr}: Für die Beschriftung „${el.text}“ am Pfeil ist kein Platz. Kürzer schreiben oder die Elemente weiter auseinander setzen.`);
      etiketten.push(etikett);
    }
    out.push({ id: el.id, teil: { k: "pfeil", von, nach, etikett } });
  }
  return { titel, elemente: out };
}

export const stueckSetzen = (e: Erklaerstueck): GesetzteSzene[] => e.szenen.map((s, i) => setzen(s, i + 1));

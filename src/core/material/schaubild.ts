/**
 * Diagrams for worksheets: flow, structure, cycle, timeline, bar chart.
 * The model delivers the parts (boxes, arrows, numbers), the program lays them out and draws them. Everything is
 * gray and vector, so it prints sharp and sits in the same family as the rest of the sheet.
 * The layout is computed once into a "scene" of simple shapes with the text already broken into lines.
 * The PDF and the picture for Word draw the same scene, so both look alike.
 */
import { MaterialError, SANS, SANS_BOLD, str, textWidth } from "./layout.ts";
import { mischen } from "./mischen.ts";

export type SchaubildArt = "ablauf" | "hierarchie" | "kreislauf" | "zeitstrahl" | "saeulen";

export interface Knoten {
  id: string;
  text: string;
  /** Timeline only: the date or year in front of the text. */
  datum?: string;
  /** A blank box for the students. The teacher's copy shows the text. */
  leer?: boolean;
  /** Drawn with a heavy edge and a gray fill. */
  betont?: boolean;
}

export interface Schaubild {
  art: SchaubildArt;
  /** Caption below the diagram. */
  titel?: string;
  /** Flow and structure: "waagerecht" (left to right) or "senkrecht" (top to bottom). Default: the program decides. */
  richtung?: "waagerecht" | "senkrecht";
  knoten: Knoten[];
  /** Arrows. Without any, a flow is a chain in the order of the boxes. */
  verbindungen: { von: string; nach: string; text?: string }[];
  /** Cycle: text in the middle. */
  mitte?: string;
  /** Bar chart. */
  saeulen: { name: string; wert: number }[];
  einheit?: string;
  /** Bar chart: the students draw the bars themselves. The teacher's copy shows them. */
  leerSaeulen?: boolean;
  /** Print the hidden texts of blank boxes, shuffled, as a word bank. */
  wortliste?: boolean;
}

const ARTEN: SchaubildArt[] = ["ablauf", "hierarchie", "kreislauf", "zeitstrahl", "saeulen"];

// ---------- checking what the model sent ----------

/** Checks a diagram from the model. Messages tell the model what to correct. */
export function parseSchaubild(raw: unknown, nr: number): Schaubild {
  const o = (raw ?? {}) as Record<string, unknown>;
  const where = `Aufgabe ${nr} (Schaubild)`;
  const art = o.art as SchaubildArt;
  if (!ARTEN.includes(art)) throw new MaterialError(`${where}: Die Art „${String(o.art)}“ gibt es nicht. Erlaubt: ${ARTEN.join(", ")}.`);
  const titel = str(o.titel, `der Titel des Schaubilds in Aufgabe ${nr}`, 140);
  const base = { art, titel, knoten: [] as Knoten[], verbindungen: [] as Schaubild["verbindungen"], saeulen: [] as Schaubild["saeulen"] };

  if (art === "saeulen") {
    const list = Array.isArray(o.saeulen) ? o.saeulen : [];
    if (list.length < 2 || list.length > 8) throw new MaterialError(`${where}: Ein Säulendiagramm braucht 2 bis 8 Säulen (Name und Wert).`);
    const saeulen = list.map((s, i) => {
      const e = (s ?? {}) as Record<string, unknown>;
      const wert = Number(e.wert);
      if (!Number.isFinite(wert) || wert < 0) throw new MaterialError(`${where}: Säule ${i + 1} braucht einen Wert von 0 oder mehr.`);
      return { name: str(e.name, `Name von Säule ${i + 1} in Aufgabe ${nr}`, 40, true)!, wert };
    });
    if (saeulen.every((s) => s.wert === 0)) throw new MaterialError(`${where}: Alle Werte sind 0.`);
    return { ...base, saeulen, einheit: str(o.einheit, `die Einheit in Aufgabe ${nr}`, 20), leerSaeulen: o.leer === true };
  }

  const list = Array.isArray(o.knoten) ? o.knoten : [];
  const [min, max] = art === "kreislauf" ? [3, 8] : art === "zeitstrahl" ? [2, 8] : [2, 12];
  if (list.length < min || list.length > max) throw new MaterialError(`${where}: ${art} braucht ${min} bis ${max} Kästchen (knoten), es sind ${list.length}.`);
  const seen = new Set<string>();
  const knoten = list.map((k, i): Knoten => {
    const e = (k ?? {}) as Record<string, unknown>;
    const id = String(e.id ?? i + 1).trim();
    if (seen.has(id)) throw new MaterialError(`${where}: Die Kennung „${id}“ kommt doppelt vor.`);
    seen.add(id);
    const text = str(e.text, `Text von Kästchen ${i + 1} in Aufgabe ${nr}`, art === "zeitstrahl" ? 120 : 90, true)!;
    const datum = art === "zeitstrahl" ? str(e.datum, `Datum von Ereignis ${i + 1} in Aufgabe ${nr}`, 30, true) : undefined;
    return { id, text, datum, leer: e.leer === true, betont: e.betont === true };
  });
  if (art === "zeitstrahl" || art === "kreislauf") return { ...base, knoten, mitte: art === "kreislauf" ? str(o.mitte, `der Text in der Mitte in Aufgabe ${nr}`, 60) : undefined, wortliste: o.wortliste === true };

  const links = Array.isArray(o.verbindungen) ? o.verbindungen : [];
  if (art === "hierarchie" && links.length === 0) throw new MaterialError(`${where}: Eine Hierarchie braucht Pfeile (verbindungen: von, nach), sonst ist nicht klar, was worunter steht.`);
  const verbindungen = links.length
    ? links.map((v, i) => {
        const e = (v ?? {}) as Record<string, unknown>;
        const von = String(e.von ?? "").trim();
        const nach = String(e.nach ?? "").trim();
        if (!seen.has(von) || !seen.has(nach)) throw new MaterialError(`${where}: Pfeil ${i + 1} nennt ein Kästchen, das es nicht gibt („${von}“ nach „${nach}“). Nimm die Kennungen aus knoten.`);
        if (von === nach) throw new MaterialError(`${where}: Pfeil ${i + 1} zeigt auf dasselbe Kästchen. Für Kreisläufe nimm die Art kreislauf.`);
        return { von, nach, text: str(e.text, `Beschriftung von Pfeil ${i + 1} in Aufgabe ${nr}`, 40) };
      })
    : knoten.slice(1).map((k, i) => ({ von: knoten[i]!.id, nach: k.id }));
  if (links.length && hasCycle(knoten, verbindungen)) throw new MaterialError(`${where}: Die Pfeile laufen im Kreis. Für einen Kreislauf nimm die Art kreislauf, sonst lass den Pfeil zurück weg.`);
  const rich = o.richtung;
  if (rich !== undefined && rich !== "waagerecht" && rich !== "senkrecht") throw new MaterialError(`${where}: richtung ist waagerecht oder senkrecht.`);
  return { ...base, knoten, verbindungen, richtung: rich, wortliste: o.wortliste === true };
}

function hasCycle(knoten: Knoten[], v: Schaubild["verbindungen"]): boolean {
  const state = new Map<string, 0 | 1 | 2>();
  const next = (id: string) => v.filter((e) => e.von === id).map((e) => e.nach);
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    const bad = next(id).some(visit);
    state.set(id, 2);
    return bad;
  };
  return knoten.some((k) => visit(k.id));
}

// ---------- the scene ----------

export type Form =
  | { k: "kasten"; x: number; y: number; w: number; h: number; zeilen: string[]; stil: "normal" | "betont" | "leer"; nr?: number }
  | { k: "pfeil"; punkte: [number, number][]; gestrichelt?: boolean }
  | { k: "text"; x: number; y: number; w: number; zeilen: string[]; groesse: number; fett?: boolean; ausrichtung: "left" | "center" | "right"; weissHinter?: boolean }
  | { k: "linie"; x1: number; y1: number; x2: number; y2: number; breite: number; farbe: "ink" | "line"; gestrichelt?: boolean }
  | { k: "balken"; x: number; y: number; w: number; h: number }
  | { k: "punkt"; x: number; y: number; r: number };

export interface Szene {
  w: number;
  h: number;
  formen: Form[];
}

const FS = 9.5;
const LEAD = 11.5;
const PAD = 6;

/** Breaks text into lines of at most `w` points, at spaces; a word that is too long is cut. */
export function umbrechen(text: string, w: number, size = FS, font = SANS): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (textWidth(word, font, size) > w && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && textWidth(word.slice(0, cut) + "-", font, size) > w) cut--;
        if (line) (out.push(line), (line = ""));
        out.push(word.slice(0, cut) + "-");
        word = word.slice(cut);
      }
      const trial = line ? `${line} ${word}` : word;
      if (line && textWidth(trial, font, size) > w) {
        out.push(line);
        line = word;
      } else line = trial;
    }
    out.push(line);
  }
  return out;
}

const boxHeight = (lines: number) => Math.max(26, lines * LEAD + 2 * PAD);

/** Where the line from the inside of a box (towards a point) leaves it, so arrows end at the edge and not in the middle. */
function rand(b: { x: number; y: number; w: number; h: number }, tx: number, ty: number): [number, number] {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  const s = Math.min(dx !== 0 ? b.w / 2 / Math.abs(dx) : Infinity, dy !== 0 ? b.h / 2 / Math.abs(dy) : Infinity);
  return [cx + dx * s, cy + dy * s];
}

/** Builds the scene for a diagram `w` points wide. `loesung`: blank boxes and bars show their content. */
export function szeneVon(s: Schaubild, w: number, loesung: boolean): Szene {
  const scene = s.art === "saeulen" ? saeulen(s, w, loesung) : s.art === "zeitstrahl" ? zeitstrahl(s, w) : s.art === "kreislauf" ? kreislauf(s, w, loesung) : geschichtet(s, w, loesung);
  return scene;
}

/** Numbers of blank boxes in order of appearance. */
const leereNummern = (s: Schaubild) => new Map(s.knoten.filter((k) => k.leer).map((k, i) => [k.id, i + 1]));

function kasten(k: Knoten, x: number, y: number, w: number, h: number, zeilen: string[], nummern: Map<string, number>, loesung: boolean): Form {
  const nr = nummern.get(k.id);
  const hidden = k.leer && !loesung;
  return { k: "kasten", x, y, w, h, zeilen: hidden ? [] : zeilen, stil: hidden ? "leer" : k.betont ? "betont" : "normal", nr };
}

/** Flow and structure: boxes in layers, arrows between the layers. */
function geschichtet(s: Schaubild, W: number, loesung: boolean): Szene {
  const chain = kette(s);
  if (chain) return schlange(s, chain, W, loesung);
  const ids = s.knoten.map((k) => k.id);
  const layer = new Map<string, number>();
  const parents = new Map<string, string[]>(ids.map((id) => [id, s.verbindungen.filter((v) => v.nach === id).map((v) => v.von)]));
  const depth = (id: string): number => {
    if (!layer.has(id)) layer.set(id, 0);
    const ps = parents.get(id)!;
    const d = ps.length ? Math.max(...ps.map(depth)) + 1 : 0;
    layer.set(id, d);
    return d;
  };
  ids.forEach(depth);
  const count = Math.max(...layer.values()) + 1;
  const rows: Knoten[][] = Array.from({ length: count }, () => []);
  for (const k of s.knoten) rows[layer.get(k.id)!]!.push(k);
  // Order inside a layer by the mean position of the parents, so arrows cross less.
  const pos = new Map<string, number>();
  rows.forEach((row, ri) => {
    if (ri > 0) row.sort((a, b) => mean(parents.get(a.id)!.map((p) => pos.get(p) ?? 0)) - mean(parents.get(b.id)!.map((p) => pos.get(p) ?? 0)));
    row.forEach((k, i) => pos.set(k.id, i));
  });
  const widest = Math.max(...rows.map((r) => r.length));
  const GAP = 24;
  const horizontal = s.richtung ? s.richtung === "waagerecht" : s.art === "ablauf" && count <= 4 && count * 74 + (count - 1) * GAP <= W;
  const nummern = leereNummern(s);
  const formen: Form[] = [];
  const placed = new Map<string, { x: number; y: number; w: number; h: number }>();
  // A blank box is at least two lines high, so there is room to write.
  const boxH = (k: Knoten, lines: Map<string, string[]>) => boxHeight(Math.max(lines.get(k.id)!.length, k.leer ? 2 : 0));
  let height: number;

  if (horizontal) {
    const bw = Math.min(150, (W - (count - 1) * GAP) / count);
    const lines = new Map(s.knoten.map((k) => [k.id, umbrechen(k.text, bw - 2 * PAD)]));
    const colH = rows.map((row) => row.reduce((n, k) => n + boxH(k, lines) + 14, -14));
    const H = Math.max(...colH);
    const x0 = (W - (count * bw + (count - 1) * GAP)) / 2;
    rows.forEach((row, ci) => {
      let y = (H - colH[ci]!) / 2;
      for (const k of row) {
        const h = boxH(k, lines);
        placed.set(k.id, { x: x0 + ci * (bw + GAP), y, w: bw, h });
        y += h + 14;
      }
    });
    height = H;
  } else {
    const bw = Math.min(170, (W - (widest - 1) * GAP) / widest);
    const lines = new Map(s.knoten.map((k) => [k.id, umbrechen(k.text, bw - 2 * PAD)]));
    let y = 0;
    for (const row of rows) {
      const h = Math.max(...row.map((k) => boxH(k, lines)));
      const rowW = row.length * bw + (row.length - 1) * GAP;
      row.forEach((k, i) => placed.set(k.id, { x: (W - rowW) / 2 + i * (bw + GAP), y, w: bw, h: boxH(k, lines) }));
      y += h + (s.verbindungen.some((v) => v.text) ? 34 : 26);
    }
    height = y - (s.verbindungen.some((v) => v.text) ? 34 : 26);
    // Boxes of one row have the height of the tallest, so the row looks even.
    for (const row of rows) {
      const h = Math.max(...row.map((k) => placed.get(k.id)!.h));
      for (const k of row) placed.get(k.id)!.h = h;
    }
  }
  for (const k of s.knoten) {
    const b = placed.get(k.id)!;
    formen.push(kasten(k, b.x, b.y, b.w, b.h, umbrechen(k.text, b.w - 2 * PAD), nummern, loesung));
  }
  for (const v of s.verbindungen) {
    const a = placed.get(v.von)!;
    const b = placed.get(v.nach)!;
    const from = rand(a, b.x + b.w / 2, b.y + b.h / 2);
    const to = rand(b, a.x + a.w / 2, a.y + a.h / 2);
    formen.push({ k: "pfeil", punkte: [from, to] });
    if (v.text) {
      const lw = Math.min(110, textWidth(v.text, SANS, 8.5) + 8);
      formen.push({ k: "text", x: (from[0] + to[0]) / 2 - lw / 2, y: (from[1] + to[1]) / 2 - 6, w: lw, zeilen: [v.text], groesse: 8.5, ausrichtung: "center", weissHinter: true });
    }
  }
  return { w: W, h: height, formen };
}

/** The boxes in order when the diagram is a plain chain of five or more steps without labels or a fixed direction. */
function kette(s: Schaubild): Knoten[] | undefined {
  const n = s.knoten.length;
  if (s.art !== "ablauf" || s.richtung || n < 5 || s.verbindungen.length !== n - 1 || s.verbindungen.some((v) => v.text)) return undefined;
  const next = new Map(s.verbindungen.map((v) => [v.von, v.nach]));
  const hasParent = new Set(s.verbindungen.map((v) => v.nach));
  if (next.size !== n - 1 || hasParent.size !== n - 1) return undefined;
  const start = s.knoten.find((k) => !hasParent.has(k.id));
  const byId = new Map(s.knoten.map((k) => [k.id, k]));
  const order: Knoten[] = [];
  for (let k = start; k && order.length <= n; k = next.has(k.id) ? byId.get(next.get(k.id)!) : undefined) order.push(k);
  return order.length === n ? order : undefined;
}

/** A long chain in rows of three or four boxes, so it does not run down the whole page. Arrows turn at the end of a row. */
function schlange(s: Schaubild, order: Knoten[], W: number, loesung: boolean): Szene {
  const n = order.length;
  const perRow = n >= 10 ? 4 : 3;
  const GAP = 26;
  const bw = Math.min(150, (W - (perRow - 1) * GAP) / perRow);
  const nummern = leereNummern(s);
  const lines = order.map((k) => umbrechen(k.text, bw - 2 * PAD));
  const hs = order.map((k, i) => boxHeight(Math.max(lines[i]!.length, k.leer ? 2 : 0)));
  const rows = Math.ceil(n / perRow);
  const rowH = Array.from({ length: rows }, (_, r) => Math.max(...hs.slice(r * perRow, (r + 1) * perRow)));
  const ROWGAP = 30;
  const x0 = (W - (perRow * bw + (perRow - 1) * GAP)) / 2;
  const top = (r: number) => rowH.slice(0, r).reduce((a, h) => a + h + ROWGAP, 0);
  const box = (i: number) => ({ x: x0 + (i % perRow) * (bw + GAP), y: top(Math.floor(i / perRow)), w: bw, h: rowH[Math.floor(i / perRow)]! });
  const formen: Form[] = order.map((k, i) => {
    const b = box(i);
    return kasten(k, b.x, b.y, b.w, b.h, lines[i]!, nummern, loesung);
  });
  for (let i = 0; i + 1 < n; i++) {
    const a = box(i);
    const b = box(i + 1);
    if (Math.floor(i / perRow) === Math.floor((i + 1) / perRow)) formen.push({ k: "pfeil", punkte: [[a.x + a.w, a.y + a.h / 2], [b.x, b.y + b.h / 2]] });
    else {
      const ym = a.y + a.h + ROWGAP / 2;
      formen.push({ k: "pfeil", punkte: [[a.x + a.w / 2, a.y + a.h], [a.x + a.w / 2, ym], [b.x + b.w / 2, ym], [b.x + b.w / 2, b.y]] });
    }
  }
  return { w: W, h: top(rows - 1) + rowH[rows - 1]!, formen };
}

const mean = (a: number[]) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : 0);

function kreislauf(s: Schaubild, W: number, loesung: boolean): Szene {
  const n = s.knoten.length;
  const H = Math.min(W * 0.78, 270);
  const bw = Math.min(130, W / (n <= 4 ? 3 : 3.6));
  const nummern = leereNummern(s);
  const rx = (W - bw) / 2 - 4;
  const ry = (H - 34) / 2 - 2;
  const lines = s.knoten.map((k) => umbrechen(k.text, bw - 2 * PAD));
  const lineCount = (i: number) => Math.max(lines[i]!.length, s.knoten[i]!.leer ? 2 : 0);
  const centers = s.knoten.map((_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [W / 2 + rx * Math.cos(a), H / 2 + ry * Math.sin(a)] as const;
  });
  const boxes = s.knoten.map((_, i) => {
    const h = boxHeight(lineCount(i));
    return { x: centers[i]![0] - bw / 2, y: centers[i]![1] - h / 2, w: bw, h };
  });
  const formen: Form[] = [];
  if (s.mitte) {
    const mw = Math.min(W * 0.34, 150);
    const zeilen = umbrechen(s.mitte, mw, 10.5, SANS_BOLD);
    formen.push({ k: "text", x: W / 2 - mw / 2, y: H / 2 - (zeilen.length * 13) / 2, w: mw, zeilen, groesse: 10.5, fett: true, ausrichtung: "center" });
  }
  s.knoten.forEach((k, i) => formen.push(kasten(k, boxes[i]!.x, boxes[i]!.y, bw, boxes[i]!.h, lines[i]!, nummern, loesung)));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const from = rand(boxes[i]!, centers[j]![0], centers[j]![1]);
    const to = rand(boxes[j]!, centers[i]![0], centers[i]![1]);
    formen.push({ k: "pfeil", punkte: [from, to] });
  }
  return { w: W, h: H, formen };
}

function zeitstrahl(s: Schaubild, W: number): Szene {
  const n = s.knoten.length;
  const slot = W / n;
  const tw = Math.min(150, slot * 1.9);
  const items = s.knoten.map((k) => ({ datum: umbrechen(k.datum ?? "", tw, 10, SANS_BOLD), text: umbrechen(k.text, tw) }));
  const hOf = (i: number) => items[i]!.datum.length * 12.5 + items[i]!.text.length * LEAD;
  const up = Math.max(0, ...items.map((_, i) => (i % 2 === 0 ? hOf(i) : 0))) + 14;
  const down = Math.max(0, ...items.map((_, i) => (i % 2 === 1 ? hOf(i) : 0))) + 14;
  const axis = up + 4;
  const formen: Form[] = [{ k: "linie", x1: 0, y1: axis, x2: W, y2: axis, breite: 1.6, farbe: "ink" }];
  s.knoten.forEach((k, i) => {
    const cx = slot * (i + 0.5);
    const above = i % 2 === 0;
    const x = Math.max(0, Math.min(W - tw, cx - tw / 2));
    const h = hOf(i);
    formen.push({ k: "punkt", x: cx, y: axis, r: 4 });
    formen.push({ k: "linie", x1: cx, y1: axis + (above ? -4 : 4), x2: cx, y2: above ? axis - 12 : axis + 12, breite: 0.8, farbe: "line" });
    const y = above ? axis - 14 - h : axis + 14;
    formen.push({ k: "text", x, y, w: tw, zeilen: items[i]!.datum, groesse: 10, fett: true, ausrichtung: "center" });
    formen.push({ k: "text", x, y: y + items[i]!.datum.length * 12.5, w: tw, zeilen: items[i]!.text, groesse: FS, ausrichtung: "center" });
  });
  return { w: W, h: axis + down + 4, formen };
}

/** A round upper bound for the axis, in steps of 1, 2, 2.5, 5 or 10 times a power of ten. */
export function achse(max: number): { top: number; step: number } {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((c) => c >= raw)!;
  return { top: Math.ceil(max / step) * step, step };
}

const zahl = (v: number) => String(Math.round(v * 100) / 100).replace(".", ",");

function saeulen(s: Schaubild, W: number, loesung: boolean): Szene {
  const { top, step } = achse(Math.max(...s.saeulen.map((x) => x.wert)));
  const left = 38;
  const chartH = 150;
  const labelLines = s.saeulen.map((x) => umbrechen(x.name, (W - left) / s.saeulen.length - 6, 9));
  const labelH = Math.max(...labelLines.map((l) => l.length)) * 11 + 6;
  const topPad = s.einheit ? 16 : 6;
  const y0 = topPad + chartH;
  const formen: Form[] = [];
  if (s.einheit) formen.push({ k: "text", x: 0, y: 0, w: left + 60, zeilen: [s.einheit], groesse: 8.5, ausrichtung: "left" });
  for (let v = 0; v <= top + 1e-9; v += step) {
    const y = y0 - (v / top) * chartH;
    formen.push({ k: "linie", x1: left, y1: y, x2: W, y2: y, breite: v === 0 ? 1.2 : 0.5, farbe: v === 0 ? "ink" : "line", gestrichelt: v !== 0 });
    formen.push({ k: "text", x: 0, y: y - 5.5, w: left - 6, zeilen: [zahl(v)], groesse: 8.5, ausrichtung: "right" });
  }
  formen.push({ k: "linie", x1: left, y1: topPad, x2: left, y2: y0, breite: 1.2, farbe: "ink" });
  const slot = (W - left) / s.saeulen.length;
  const bw = Math.min(46, slot * 0.55);
  s.saeulen.forEach((x, i) => {
    const cx = left + slot * (i + 0.5);
    if (!s.leerSaeulen || loesung) {
      const h = (x.wert / top) * chartH;
      formen.push({ k: "balken", x: cx - bw / 2, y: y0 - h, w: bw, h });
      formen.push({ k: "text", x: cx - slot / 2, y: y0 - h - 12, w: slot, zeilen: [zahl(x.wert)], groesse: 9, fett: true, ausrichtung: "center" });
    }
    formen.push({ k: "text", x: cx - slot / 2 + 3, y: y0 + 4, w: slot - 6, zeilen: labelLines[i]!, groesse: 9, ausrichtung: "center" });
  });
  return { w: W, h: y0 + labelH, formen };
}

/** Text for the word bank and the teacher's key: what is hidden in the diagram. */
export function versteckt(s: Schaubild, seed: string): { wortliste?: string; loesung?: string } {
  if (s.art === "saeulen") {
    return s.leerSaeulen ? { loesung: s.saeulen.map((x) => `${x.name}: ${zahl(x.wert)}${s.einheit ? ` ${s.einheit}` : ""}`).join(",  ") } : {};
  }
  const blanks = s.knoten.filter((k) => k.leer);
  if (blanks.length === 0) return {};
  const nummern = leereNummern(s);
  return {
    wortliste: s.wortliste ? mischen(blanks.length, `${seed}|s`).map((i) => blanks[i]!.text).join("   ·   ") : undefined,
    loesung: s.knoten.filter((k) => k.leer).map((k) => `${nummern.get(k.id)} = ${k.text}`).join(",  "),
  };
}

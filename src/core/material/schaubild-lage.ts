/**
 * Geometry for diagrams: where labels and detours go, and a check that finds anything that overlaps.
 * The layout in schaubild.ts uses `etikettSetzen` and `umweg` while it builds a scene. `pruefeSzene` looks at the
 * finished scene and reports every overlap, cut-off text and arrow that runs through a box. It is the safety net:
 * a diagram with problems is never handed to the PDF or the PowerPoint file.
 */
import { SANS, SANS_BOLD, textWidth } from "./layout.ts";
import type { Form, Szene } from "./schaubild.ts";

export interface Rechteck {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Punkt = [number, number];

/** A penalty from this value on means the label is in the way of something. */
export const KOLLISION = 1000;

/** Do the two rectangles share area? `rand` keeps a distance (a is grown by it on every side). */
export const ueberlappt = (a: Rechteck, b: Rechteck, rand = 0): boolean =>
  a.x - rand < b.x + b.w && b.x < a.x + a.w + rand && a.y - rand < b.y + b.h && b.y < a.y + a.h + rand;

const enthaelt = (a: Rechteck, b: Rechteck): boolean => a.x <= b.x + 0.5 && a.y <= b.y + 0.5 && a.x + a.w >= b.x + b.w - 0.5 && a.y + a.h >= b.y + b.h - 0.5;

/** Does the straight line p-q run through the rectangle (shrunk by `schrumpf`, so touching its edge does not count)? */
export function streckeSchneidet(p: Punkt, q: Punkt, r: Rechteck, schrumpf = 0): boolean {
  const x0 = r.x + schrumpf;
  const x1 = r.x + r.w - schrumpf;
  const y0 = r.y + schrumpf;
  const y1 = r.y + r.h - schrumpf;
  if (x1 <= x0 || y1 <= y0) return false;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  let t0 = 0;
  let t1 = 1;
  for (const [d, dist] of [[-dx, p[0] - x0], [dx, x1 - p[0]], [-dy, p[1] - y0], [dy, y1 - p[1]]] as const) {
    if (d === 0) {
      if (dist < 0) return false;
    } else {
      const t = dist / d;
      if (d < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

export const pfadSchneidet = (pfad: Punkt[], r: Rechteck, schrumpf = 0): boolean => pfad.slice(1).some((q, i) => streckeSchneidet(pfad[i]!, q, r, schrumpf));

/** Distance of a point from a path. */
function abstandZumPfad(pfad: Punkt[], p: Punkt): number {
  let best = Infinity;
  for (let i = 1; i < pfad.length; i++) {
    const [ax, ay] = pfad[i - 1]!;
    const [bx, by] = pfad[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2));
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
}

// ---------- labels on arrows ----------

export interface Variante {
  zeilen: string[];
  w: number;
  h: number;
}

export interface Umgebung {
  /** Boxes, and anything else a label must not cover. */
  hindernisse: Rechteck[];
  /** Labels already placed. */
  etiketten: Rechteck[];
  /** The paths of all arrows. A label may sit on its own arrow, but no other arrow may run through it. */
  pfade: Punkt[][];
  /** The size of the drawing. A label stays inside it. */
  grenze: { w: number; h: number };
}

const ANTEILE = [0.5, 0.46, 0.54, 0.42, 0.58, 0.38, 0.62, 0.34, 0.66, 0.3, 0.7, 0.26, 0.74, 0.22, 0.78, 0.18, 0.82];

/**
 * Finds the place for a label on its arrow (`pfad`, number `eigen` in `umgebung.pfade`) with the least trouble.
 * It tries the middle of the arrow first, then other points along it, and each wording in `varianten` (the first one
 * is preferred, the others break the text into more lines). A result at or above KOLLISION means no free place was found.
 */
export function etikettSetzen(pfad: Punkt[], eigen: number, varianten: Variante[], umgebung: Umgebung): Rechteck & { zeilen: string[]; strafe: number } {
  const laengen = pfad.slice(1).map((q, i) => Math.hypot(q[0] - pfad[i]![0], q[1] - pfad[i]![1]));
  // The two longest pieces of the path carry the label: a bent arrow has its label on the longer part.
  const stuecke = laengen.map((l, i) => ({ l, i })).sort((a, b) => b.l - a.l).slice(0, 2);
  let best: (Rechteck & { zeilen: string[]; strafe: number }) | undefined;
  varianten.forEach((v, vi) => {
    for (const { i } of stuecke) {
      const a = pfad[i]!;
      const b = pfad[i + 1]!;
      ANTEILE.forEach((t, ti) => {
        const cx = a[0] + (b[0] - a[0]) * t;
        const cy = a[1] + (b[1] - a[1]) * t;
        const r: Rechteck = { x: cx - v.w / 2, y: cy - v.h / 2, w: v.w, h: v.h };
        let strafe = vi * 4 + ti * 0.3;
        if (r.x < 0 || r.y < 0 || r.x + r.w > umgebung.grenze.w || r.y + r.h > umgebung.grenze.h) strafe += KOLLISION;
        for (const o of umgebung.hindernisse) if (ueberlappt(r, o, 1)) strafe += KOLLISION;
        for (const o of umgebung.etiketten) if (ueberlappt(r, o, 2)) strafe += KOLLISION;
        umgebung.pfade.forEach((p, pi) => {
          if (pi !== eigen && pfadSchneidet(p, r, 0.5)) strafe += KOLLISION / 4;
        });
        if (!best || strafe < best.strafe) best = { ...r, zeilen: v.zeilen, strafe };
      });
    }
  });
  return best!;
}

// ---------- detours around boxes ----------

/**
 * A path from box `a` to box `b` that does not run through any other box. The straight line is used when it is free.
 * Otherwise the path gets one bend, as close to the straight line as possible. `rand` gives the point where a
 * line towards a target leaves a box.
 */
export function umweg(a: Rechteck, b: Rechteck, hindernisse: Rechteck[], grenze: { w: number; h: number }, rand: (r: Rechteck, tx: number, ty: number) => Punkt): Punkt[] {
  const ac = [a.x + a.w / 2, a.y + a.h / 2] as const;
  const bc = [b.x + b.w / 2, b.y + b.h / 2] as const;
  const gerade: Punkt[] = [rand(a, bc[0], bc[1]), rand(b, ac[0], ac[1])];
  const frei = (p: Punkt[]) => !hindernisse.some((o) => o !== a && o !== b && pfadSchneidet(p, o, 1));
  if (frei(gerade)) return gerade;
  const dx = bc[0] - ac[0];
  const dy = bc[1] - ac[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (ac[0] + bc[0]) / 2;
  const my = (ac[1] + bc[1]) / 2;
  for (let d = 14; d <= 260; d += 12) {
    for (const sign of [1, -1]) {
      const via: Punkt = [mx + nx * d * sign, my + ny * d * sign];
      if (via[0] < 0 || via[1] < 0 || via[0] > grenze.w || via[1] > grenze.h) continue;
      const pfad: Punkt[] = [rand(a, via[0], via[1]), via, rand(b, via[0], via[1])];
      if (frei(pfad)) return pfad;
    }
  }
  return gerade;
}

// ---------- checking a finished scene ----------

const LEAD = 11.5;
const textLead = (groesse: number) => (groesse >= 10 ? 12.5 : LEAD);

/** The area a piece of text covers on the sheet. */
function textRechteck(f: Extract<Form, { k: "text" }>): Rechteck {
  const w = Math.max(0, ...f.zeilen.map((z) => textWidth(z, f.fett ? SANS_BOLD : SANS, f.groesse)));
  const x = f.ausrichtung === "left" ? f.x : f.ausrichtung === "right" ? f.x + f.w - w : f.x + (f.w - w) / 2;
  return { x, y: f.y, w, h: f.zeilen.length * textLead(f.groesse) };
}

const benenne = (zeilen: string[], was: string) => (zeilen.length ? `${was} „${zeilen.join(" ")}“` : `ein leeres ${was.toLowerCase()}`);

/**
 * Everything wrong with a finished scene, in plain German: overlapping boxes and labels, text that does not fit its
 * box, arrows that run through a box or a label of another arrow, and anything outside the drawing.
 * An empty list means the diagram is clean.
 */
export function pruefeSzene(szene: Szene): string[] {
  const probleme: string[] = [];
  // The shapes sit in the coordinates of the layout; w and h are the size after zooming.
  const breite = szene.w / (szene.k ?? 1);
  const hoehe = szene.h / (szene.k ?? 1);
  type Teil = Rechteck & { name: string; art: "kasten" | "etikett" | "text"; rahmen?: boolean };
  const teile: Teil[] = [];
  const pfeile: Punkt[][] = [];
  for (const f of szene.formen) {
    if (f.k === "kasten") {
      teile.push({ x: f.x, y: f.y, w: f.w, h: f.h, name: benenne(f.zeilen, "Kästchen"), art: "kasten", rahmen: f.zeilen.length === 0 });
      const font = f.stil === "betont" ? SANS_BOLD : SANS;
      for (const z of f.zeilen) if (textWidth(z, font, 9.5) > f.w - 4) probleme.push(`Der Text „${z}“ passt nicht in sein Kästchen.`);
    } else if (f.k === "etikett") {
      teile.push({ x: f.x, y: f.y, w: f.w, h: f.h, name: benenne(f.zeilen, "Beschriftung"), art: "etikett" });
      for (const z of f.zeilen) if (textWidth(z, SANS, 8.5) > f.w - 4) probleme.push(`Die Beschriftung „${z}“ passt nicht in ihr Feld.`);
    } else if (f.k === "text") {
      teile.push({ ...textRechteck(f), name: benenne(f.zeilen, "Text"), art: "text" });
    } else if (f.k === "pfeil") pfeile.push(f.punkte);
  }
  // Boxes, labels and texts must not overlap each other. Only an empty box that holds the others (the frame of a window sketch) is fine.
  teile.forEach((a, i) => {
    for (const b of teile.slice(i + 1)) {
      if (ueberlappt(a, b, -0.5) && !(a.rahmen && enthaelt(a, b)) && !(b.rahmen && enthaelt(b, a))) probleme.push(`${a.name} und ${b.name} überlappen sich.`);
    }
    if (a.x < -1 || a.y < -1 || a.x + a.w > breite + 1 || a.y + a.h > hoehe + 1) probleme.push(`${a.name} ragt aus dem Bild.`);
  });
  // An arrow runs from box to box. It may end at a box and may carry its own label, but it must not cut through anything else.
  for (const pfad of pfeile) {
    const start = pfad[0]!;
    const ende = pfad[pfad.length - 1]!;
    for (const t of teile) {
      if (!pfadSchneidet(pfad, t, 1.5)) continue;
      const mitte: Punkt = [t.x + t.w / 2, t.y + t.h / 2];
      if (t.art === "etikett" && abstandZumPfad(pfad, mitte) <= 2.5) continue;
      const beruehrt = (p: Punkt) => p[0] >= t.x - 2 && p[0] <= t.x + t.w + 2 && p[1] >= t.y - 2 && p[1] <= t.y + t.h + 2;
      if (t.art === "kasten" && (beruehrt(start) || beruehrt(ende))) continue;
      probleme.push(`Ein Pfeil läuft durch ${t.name}.`);
    }
  }
  return probleme;
}

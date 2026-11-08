// Calm patterns that stand next to the status line while Pult works. Own code after the idea of a collection of
// generative background patterns. They take turns: each wait starts with the next one, a long wait changes softly.

export type Farben = { ink: string; accent: string };
export type Muster = { name: string; draw: (c: CanvasRenderingContext2D, w: number, h: number, t: number, f: Farben) => void };

const TAU = Math.PI * 2;
const dot = (c: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  if (r <= 0.15) return;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
};

export const MUSTER: Muster[] = [
  {
    name: "Sonnenblume",
    draw(c, w, h, t, f) {
      const n = 90, sc = (Math.min(w, h) / 2 / Math.sqrt(n)) * 0.94, u = w / 40;
      for (let i = 1; i < n; i++) {
        const a = i * 2.39996 + t * 0.12, r = Math.sqrt(i) * sc;
        c.fillStyle = i % 11 === 0 ? f.accent : f.ink;
        c.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 - i * 0.07));
        dot(c, w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, (0.45 + (i / n) * 1.1) * u);
      }
    },
  },
  {
    name: "Verschachtelte Quadrate",
    draw(c, w, h, t, f) {
      const n = 6, u = w / 40;
      for (let i = 0; i < n; i++) {
        const s = Math.min(w, h) * (0.88 - i * 0.13), last = i === n - 1;
        c.save();
        c.translate(w / 2, h / 2);
        c.rotate(Math.sin(t * 0.7 - i * 0.4) * 0.32);
        c.strokeStyle = last ? f.accent : f.ink;
        c.globalAlpha = last ? 1 : 0.25 + i * 0.1;
        c.lineWidth = (last ? 1.8 : 1) * u;
        c.strokeRect(-s / 2, -s / 2, s, s);
        c.restore();
      }
    },
  },
  {
    name: "Ruhige Welle",
    draw(c, w, h, t, f) {
      const u = w / 40, k = TAU / (w * 0.95), amp = h * 0.14;
      const line = (col: string, alpha: number, lw: number, ph: number) => {
        c.strokeStyle = col;
        c.globalAlpha = alpha;
        c.lineWidth = lw;
        c.lineCap = "round";
        c.beginPath();
        for (let x = 3 * u; x <= w - 3 * u; x += 1) {
          const y = h / 2 + Math.sin(x * k + t * 1.1 + ph) * amp;
          if (x === 3 * u) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      };
      line(f.ink, 0.2, 1.1 * u, 1.5);
      line(f.ink, 0.45, 1.1 * u, 0.8);
      line(f.accent, 1, 4.5 * u, 0);
    },
  },
  {
    name: "Kopierer-Raster",
    draw(c, w, h, t, f) {
      const step = Math.min(w, h) / 7, m = Math.min(w, h);
      c.fillStyle = f.ink;
      for (let x = step / 2; x < w; x += step) {
        for (let y = step / 2; y < h; y += step) {
          const v = Math.max(0, Math.sin((Math.hypot(x - w / 2, y - h / 2) / m) * 9 - t * 1.4));
          c.globalAlpha = 0.3 + 0.6 * v;
          dot(c, x, y, v * step * 0.42);
        }
      }
      c.globalAlpha = 1;
      c.fillStyle = f.accent;
      dot(c, w / 2, h / 2, step * 0.3);
    },
  },
];

/** Seconds one pattern stays during a long wait, and how long the change takes. */
export const WECHSEL = 20;
export const UEBERGANG = 1.2;

/**
 * Which pattern shows after `sekunden` of waiting, starting with pattern `start`.
 * `blend` is how far the next one has faded in (0 most of the time, up to 1 at the end of a turn).
 */
export function musterZurZeit(start: number, sekunden: number, anzahl = MUSTER.length): { jetzt: number; naechstes: number; blend: number } {
  const s = Math.max(0, sekunden);
  const runde = Math.floor(s / WECHSEL);
  const rest = s - runde * WECHSEL;
  const jetzt = (((start + runde) % anzahl) + anzahl) % anzahl;
  const blend = rest > WECHSEL - UEBERGANG ? (rest - (WECHSEL - UEBERGANG)) / UEBERGANG : 0;
  return { jetzt, naechstes: (jetzt + 1) % anzahl, blend };
}

const KEY = "pult.warteMuster";

/** The pattern a new wait starts with: the one after the last wait's. Remembered in this browser only. */
export function naechsterStart(store: Pick<Storage, "getItem" | "setItem"> | undefined = globalThis.localStorage, anzahl = MUSTER.length): number {
  let vorher = -1;
  try {
    const text = store?.getItem(KEY);
    const raw = text ? Number(text) : NaN;
    if (Number.isInteger(raw) && raw >= 0) vorher = raw;
  } catch {
    // No storage (private window): always start with the first.
  }
  const start = (vorher + 1) % anzahl;
  try {
    store?.setItem(KEY, String(start));
  } catch {
    // Not saved, the next wait starts with the same one.
  }
  return start;
}

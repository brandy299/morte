/**
 * Crossword layout: the model gives words and clues, this file lays them on a grid.
 * Words only cross at a shared letter, never touch side by side, and the whole puzzle hangs together.
 */
import { MaterialError } from "../material/layout.ts";

export interface KreuzwortEintrag { nr: number; richtung: "waagerecht" | "senkrecht"; zeile: number; spalte: number; wort: string; hinweis: string }
export interface Kreuzwort { zeilen: number; spalten: number; eintraege: KreuzwortEintrag[] }

interface Platz { wort: string; hinweis: string; waagerecht: boolean; r: number; c: number }

/** The letters of a solution word in capitals (ß becomes SS, so the grid and the typed answer agree). */
export const grossbuchstaben = (w: string): string => w.toLocaleUpperCase("de");

const key = (r: number, c: number) => `${r},${c}`;

/** Tries to put a word at (r, c). Returns how many letters cross existing ones, or -1 if the place is not allowed. */
function passt(zellen: Map<string, string>, wort: string, waagerecht: boolean, r: number, c: number): number {
  const dr = waagerecht ? 0 : 1, dc = waagerecht ? 1 : 0;
  if (zellen.has(key(r - dr, c - dc)) || zellen.has(key(r + dr * wort.length, c + dc * wort.length))) return -1;
  let kreuzungen = 0;
  for (let i = 0; i < wort.length; i++) {
    const rr = r + dr * i, cc = c + dc * i;
    const da = zellen.get(key(rr, cc));
    if (da !== undefined) {
      if (da !== wort[i]) return -1;
      kreuzungen++;
    } else if (zellen.has(key(rr + dc, cc + dr)) || zellen.has(key(rr - dc, cc - dr))) return -1; // would touch a neighbour word side by side
  }
  return kreuzungen;
}

export function legeKreuzwort(woerter: { wort: string; hinweis: string }[]): Kreuzwort {
  const sortiert = woerter.map((w) => ({ ...w, wort: grossbuchstaben(w.wort) })).sort((a, b) => b.wort.length - a.wort.length);
  const zellen = new Map<string, string>();
  const plaetze: Platz[] = [];
  const setze = (p: Platz) => {
    for (let i = 0; i < p.wort.length; i++) zellen.set(key(p.r + (p.waagerecht ? 0 : i), p.c + (p.waagerecht ? i : 0)), p.wort[i]!);
    plaetze.push(p);
  };
  setze({ ...sortiert[0]!, waagerecht: true, r: 0, c: 0 });
  for (const w of sortiert.slice(1)) {
    let bester: (Platz & { punkte: number }) | undefined;
    for (const p of plaetze) {
      for (let i = 0; i < p.wort.length; i++) {
        for (let j = 0; j < w.wort.length; j++) {
          if (p.wort[i] !== w.wort[j]) continue;
          const waagerecht = !p.waagerecht;
          const r = p.waagerecht ? p.r - j : p.r + i, c = p.waagerecht ? p.c + i : p.c - j;
          const kreuzungen = passt(zellen, w.wort, waagerecht, r, c);
          if (kreuzungen < 1) continue;
          const punkte = kreuzungen * 100 - Math.abs(r) - Math.abs(c);
          if (!bester || punkte > bester.punkte) bester = { ...w, waagerecht, r, c, punkte };
        }
      }
    }
    if (!bester) throw new MaterialError(`Das Wort „${w.wort}“ lässt sich nicht ins Rätsel legen: Es hat zu wenig Buchstaben gemeinsam mit den anderen Wörtern. Tausche es gegen ein anderes Wort, das zum Beispiel ein E, A oder N mit den anderen teilt.`);
    setze(bester);
  }
  const minR = Math.min(...plaetze.map((p) => p.r)), minC = Math.min(...plaetze.map((p) => p.c));
  const norm = plaetze.map((p) => ({ ...p, r: p.r - minR, c: p.c - minC }));
  const zeilen = Math.max(...norm.map((p) => p.r + (p.waagerecht ? 1 : p.wort.length)));
  const spalten = Math.max(...norm.map((p) => p.c + (p.waagerecht ? p.wort.length : 1)));
  // Numbers run through the grid row by row; a start cell used by two words gets one number.
  const starts = [...new Set(norm.map((p) => key(p.r, p.c)))].sort((a, b) => {
    const [ar, ac] = a.split(",").map(Number) as [number, number], [br, bc] = b.split(",").map(Number) as [number, number];
    return ar - br || ac - bc;
  });
  const eintraege = norm
    .map((p): KreuzwortEintrag => ({ nr: starts.indexOf(key(p.r, p.c)) + 1, richtung: p.waagerecht ? "waagerecht" : "senkrecht", zeile: p.r, spalte: p.c, wort: p.wort, hinweis: p.hinweis }))
    .sort((a, b) => a.nr - b.nr || (a.richtung === "waagerecht" ? -1 : 1));
  return { zeilen, spalten, eintraege };
}

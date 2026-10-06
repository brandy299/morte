import { attachMaterial, listTree, readReihe, readStand, saveMaterialFile, UserError } from "../workspace/index.ts";
import { parseStunden, type Stunde } from "../workspace/reihe.ts";
import { lessonKey, parseIcs, type Lesson } from "./ics.ts";
import { loadPlan, loadZuordnung } from "./store.ts";

const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Date parts without time zone trouble: 2026-10-14 is a Wednesday. */
export const weekday = (iso: string) => DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()]!;

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week that contains `iso`. */
export function mondayOf(iso: string): string {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

/** A table date like "14.10.", "14.10" or "14.10.2026" next to an ISO date. Without year the day and month decide. */
export function sameDay(tableDate: string, iso: string): boolean {
  const iso1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tableDate.trim());
  if (iso1) return tableDate.trim() === iso;
  const m = /^(\d{1,2})\.(\d{1,2})\.?(?:(\d{4}))?$/.exec(tableDate.trim());
  if (!m) return false;
  const [y, mo, d] = iso.split("-");
  return Number(m[1]) === Number(d) && Number(m[2]) === Number(mo) && (!m[3] || m[3] === y);
}

export type Zustand =
  | "nicht-zugeordnet" // title not yet assigned to a class
  | "nicht-geplant" // assigned, but no row for that day in any series
  | "geplant" // row exists, no material yet
  | "material-fertig"
  | "gehalten";

export interface WochenStunde extends Lesson {
  klasse?: string;
  fach?: string;
  reihe?: string;
  thema?: string;
  material?: string;
  zustand: Zustand;
}

export interface Wochenansicht {
  /** Monday of the week. */
  montag: string;
  tage: { datum: string; tag: string; stunden: WochenStunde[] }[];
  /** Counts for the headline: lessons from `heute` on that still lack material. */
  fehlt: number;
  nichtGeplant: number;
  nichtZugeordnet: number;
}

/** Rows of every series of a class and subject, with the series they belong to. */
async function zeilen(klasse: string, fach: string, reihen: string[]): Promise<{ reihe: string; zeile: Stunde }[]> {
  const out: { reihe: string; zeile: Stunde }[] = [];
  for (const r of reihen) {
    for (const zeile of parseStunden(await readReihe(klasse, fach, r).catch(() => ""))) out.push({ reihe: r, zeile });
  }
  return out;
}

/**
 * The week of the timetable with what the folders know about each lesson: topic, material, status.
 * `heute` decides which lessons still count as missing material (today and later).
 */
export async function woche(anyDay: string, heute: string): Promise<Wochenansicht | undefined> {
  const plan = await loadPlan();
  if (!plan) return undefined;
  const montag = mondayOf(anyDay);
  const lessons = parseIcs(plan.text, { from: montag, to: addDays(montag, 6) });
  const map = await loadZuordnung();
  const tree = await listTree();
  const cache = new Map<string, { reihe: string; zeile: Stunde }[]>();
  const rowsOf = async (klasse: string, fach: string) => {
    const key = `${klasse}|${fach}`;
    if (!cache.has(key)) {
      const reihen = tree.find((k) => k.name === klasse)?.faecher.find((f) => f.name === fach)?.reihen.map((r) => r.name) ?? [];
      cache.set(key, await zeilen(klasse, fach, reihen));
    }
    return cache.get(key)!;
  };

  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(montag, i));
  const result: Wochenansicht = { montag, tage: [], fehlt: 0, nichtGeplant: 0, nichtZugeordnet: 0 };
  for (const datum of days) {
    const stunden: WochenStunde[] = [];
    const today = lessons.filter((l) => l.datum === datum);
    const seen = new Map<string, number>(); // lessons of the same class and subject on one day take the rows in order
    for (const l of today) {
      const z = map[lessonKey(l)];
      if (z === null) continue; // marked as "not mine"
      if (!z || !tree.some((k) => k.name === z.klasse && k.faecher.some((f) => f.name === z.fach))) {
        stunden.push({ ...l, zustand: "nicht-zugeordnet" });
        continue;
      }
      const rows = (await rowsOf(z.klasse, z.fach)).filter((r) => sameDay(r.zeile.datum, datum));
      const nth = seen.get(`${z.klasse}|${z.fach}`) ?? 0;
      seen.set(`${z.klasse}|${z.fach}`, nth + 1);
      const row = rows[nth];
      const zustand: Zustand = !row ? "nicht-geplant" : row.zeile.status === "gehalten" ? "gehalten" : row.zeile.material ? "material-fertig" : "geplant";
      stunden.push({ ...l, klasse: z.klasse, fach: z.fach, reihe: row?.reihe, thema: row?.zeile.thema || undefined, material: row?.zeile.material || undefined, zustand });
    }
    result.tage.push({ datum, tag: weekday(datum), stunden });
  }
  for (const t of result.tage) {
    for (const s of t.stunden) {
      if (s.zustand === "nicht-zugeordnet") result.nichtZugeordnet++;
      if (t.datum < heute) continue;
      if (s.zustand === "geplant") result.fehlt++;
      if (s.zustand === "nicht-geplant") result.nichtGeplant++;
    }
  }
  // Saturday and Sunday only when something happens there.
  result.tage = result.tage.filter((t, i) => i < 5 || t.stunden.length > 0);
  return result;
}

// ---------- Dropping a file on a lesson ----------

/** Name of the series a lesson belongs to: the one with a row for that day, else the current one from Stand.md, else the newest. */
async function reiheFuer(klasse: string, fach: string, datum: string): Promise<string> {
  const tree = await listTree();
  const k = tree.find((x) => x.name === klasse);
  if (!k) throw new UserError(`Die Klasse „${klasse}“ gibt es nicht.`);
  const f = k.faecher.find((x) => x.name === fach);
  if (!f) throw new UserError(`Das Fach „${fach}“ gibt es in ${klasse} nicht.`);
  const reihen = f.reihen.map((r) => r.name);
  if (reihen.length === 0) throw new UserError(`Für ${klasse}, ${fach} gibt es noch keine Reihe. Lege zuerst eine an, zum Beispiel im Gespräch.`);
  const withRow = (await zeilen(klasse, fach, reihen)).find((r) => sameDay(r.zeile.datum, datum));
  if (withRow) return withRow.reihe;
  const current = /^Aktuelle Reihe:[ \t]*(\S.*)$/m.exec(await readStand(klasse, fach).catch(() => ""))?.[1]?.trim();
  if (current) {
    const hit = reihen.find((r) => r.toLowerCase() === current.toLowerCase() || r.replace(/^\d+\s+/, "").toLowerCase() === current.replace(/^\d+\s+/, "").toLowerCase());
    if (hit) return hit;
  }
  return reihen.at(-1)!;
}

/** Saves the file in the series' Material folder and enters it in the lesson table, appended to files that are already there. */
export async function legeAb(
  lesson: { klasse: string; fach: string; datum: string; von: string },
  file: { name: string; data: Buffer },
): Promise<{ reihe: string; datei: string }> {
  const reihe = await reiheFuer(lesson.klasse, lesson.fach, lesson.datum);
  const [, m, d] = lesson.datum.split("-");
  const stunde = `${weekday(lesson.datum)} ${lesson.von}`;
  const saved = await saveMaterialFile(lesson.klasse, lesson.fach, reihe, file, { datum: lesson.datum, stunde: `${weekday(lesson.datum)}${lesson.von.replace(":", "")}` });
  const existing = (await zeilen(lesson.klasse, lesson.fach, [reihe])).find((r) => sameDay(r.zeile.datum, lesson.datum));
  await attachMaterial(lesson.klasse, lesson.fach, reihe, { datum: existing?.zeile.datum ?? `${d}.${m}.`, stunde: existing?.zeile.stunde ?? stunde }, saved.name, { append: true });
  return { reihe, datei: saved.name };
}


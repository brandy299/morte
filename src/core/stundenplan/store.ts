import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { root, listTree, type KlasseInfo } from "../workspace/index.ts";
import { coverage, IcsError, parseIcs, type Lesson } from "./ics.ts";

const dir = () => join(root(), "Stundenplan");

export interface PlanMeta {
  quelle: "datei" | "link";
  /** File name, or the address without its secret part. */
  name?: string;
  aktualisiert: string;
  von: string;
  bis: string;
  anzahl: number;
}

/** Saves the timetable as Stundenplan/untis.ics. Refuses a file without any lesson. */
export async function savePlan(text: string, from: { quelle: "datei" | "link"; name?: string }): Promise<PlanMeta> {
  const c = coverage(text);
  if (!c) throw new IcsError("In dieser Datei steht keine einzige Stunde. Ist es der richtige Kalender?");
  await mkdir(dir(), { recursive: true });
  await writeFile(join(dir(), "untis.ics"), text);
  const meta: PlanMeta = { quelle: from.quelle, name: from.name, aktualisiert: new Date().toISOString(), ...c };
  await writeFile(join(dir(), "Quelle.json"), JSON.stringify(meta, null, 2));
  return meta;
}

export async function loadPlan(): Promise<{ text: string; meta: PlanMeta } | undefined> {
  try {
    return { text: await readFile(join(dir(), "untis.ics"), "utf8"), meta: JSON.parse(await readFile(join(dir(), "Quelle.json"), "utf8")) };
  } catch {
    return undefined;
  }
}

/** Removes the timetable and the assignments. Material and series stay untouched. */
export async function removePlan(): Promise<void> {
  for (const f of ["untis.ics", "Quelle.json", "Zuordnung.json"]) await rm(join(dir(), f), { force: true });
}

// ---------- Which lesson belongs to which class and subject ----------

/** Where a title of the timetable belongs. `null` means: not mine, leave it out (supervision, breaks). */
export type Zuordnung = { klasse: string; fach: string } | null;

export const titelKey = (titel: string) => titel.replace(/\s+/g, " ").trim().toLowerCase();

export async function loadZuordnung(): Promise<Record<string, Zuordnung>> {
  try {
    return JSON.parse(await readFile(join(dir(), "Zuordnung.json"), "utf8"));
  } catch {
    return {};
  }
}

export async function saveZuordnung(map: Record<string, Zuordnung>): Promise<void> {
  await mkdir(dir(), { recursive: true });
  await writeFile(join(dir(), "Zuordnung.json"), JSON.stringify(map, null, 2));
}

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Guesses class and subject from the text of a lesson. Only suggests when it is clear:
 * exactly one class name appears as a word, and the subject is either named or the class has just one.
 */
export function suggest(text: string, klassen: Pick<KlasseInfo, "name" | "faecher">[]): Zuordnung | undefined {
  const w = new Set(words(text));
  const hits = klassen.filter((k) => w.has(k.name.toLowerCase()));
  if (hits.length !== 1) return undefined;
  const klasse = hits[0]!;
  const named = klasse.faecher.filter((f) => {
    const parts = words(f.name);
    // The subject's name, or a typical short form: the first three letters of a word ("Eng", "Wir").
    return parts.length > 0 && (parts.every((p) => w.has(p)) || parts.some((p) => p.length >= 4 && [...w].some((x) => x.length >= 3 && x.length <= 5 && p.startsWith(x))));
  });
  if (named.length === 1) return { klasse: klasse.name, fach: named[0]!.name };
  if (named.length === 0 && klasse.faecher.length === 1) return { klasse: klasse.name, fach: klasse.faecher[0]!.name };
  return undefined;
}

export interface TitelInfo {
  titel: string;
  anzahl: number;
  /** Room and description of one example lesson, to recognize the entry. */
  beispiel?: string;
  /** What the teacher saved, `null` when she marked it as "not mine". Missing: not decided yet. */
  zuordnung?: Zuordnung;
  vorschlag?: Zuordnung;
}

/** All different titles in the timetable with the saved choice or a suggestion. Most frequent first. */
export async function titelListe(): Promise<TitelInfo[]> {
  const plan = await loadPlan();
  if (!plan) return [];
  const lessons = parseIcs(plan.text, { from: plan.meta.von, to: plan.meta.bis });
  const saved = await loadZuordnung();
  const klassen = await listTree();
  const byTitle = new Map<string, TitelInfo & { lesson: Lesson }>();
  for (const l of lessons) {
    const k = titelKey(l.titel);
    const known = byTitle.get(k);
    if (known) known.anzahl++;
    else byTitle.set(k, { titel: l.titel, anzahl: 1, lesson: l });
  }
  return [...byTitle.entries()]
    .map(([k, v]): TitelInfo => ({
      titel: v.titel,
      anzahl: v.anzahl,
      beispiel: [v.lesson.ort && `Raum ${v.lesson.ort}`, v.lesson.beschreibung].filter(Boolean).join(" · ") || undefined,
      ...(k in saved ? { zuordnung: saved[k] } : { vorschlag: suggest(`${v.titel} ${v.lesson.beschreibung ?? ""} ${v.lesson.ort ?? ""}`, klassen) }),
    }))
    .sort((a, b) => b.anzahl - a.anzahl || a.titel.localeCompare(b.titel, "de"));
}

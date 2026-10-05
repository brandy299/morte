import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { dataDir } from "../paths.ts";
import { newReiheMarkdown, parseStunden, STATUS, upsertStunde, writeStunden, type Stunde } from "./reihe.ts";

export { STATUS } from "./reihe.ts";
export type { Stunde } from "./reihe.ts";

/** Top-level folders of the working folder, see docs/ordnerstruktur.md. */
const TOP_FOLDERS = ["Einstellungen", "Lehrpläne", "Klassen", "Stundenplan", "Vorlagen", "Skills", "Exporte"];

export const SCHULFORMEN = ["Berufskolleg", "Gymnasium", "Gesamtschule"] as const;

export class UserError extends Error {}

export const root = () => dataDir();
export const klassenDir = () => join(root(), "Klassen");

export async function initWorkspace(): Promise<void> {
  for (const f of TOP_FOLDERS) await mkdir(join(root(), f), { recursive: true });
}

/** Today's date as 2026-10-05, used for "Aktualisiert". */
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

/** Names become folder names, so only plain characters are allowed. */
export function cleanName(raw: string, what: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) throw new UserError(`Bitte gib ${what} an.`);
  if (name.length > 60 || !/^[\p{L}\p{N}][\p{L}\p{N} ._\-()&+]*$/u.test(name)) {
    throw new UserError(`${what[0]!.toUpperCase()}${what.slice(1)} enthält Zeichen, die nicht gehen. Nimm bitte nur Buchstaben, Zahlen und Leerzeichen.`);
  }
  return name;
}

async function subdirs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name).sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
  } catch {
    return [];
  }
}

export const exists = (p: string) => stat(p).then(() => true, () => false);
export const readText = (p: string) => readFile(p, "utf8").catch(() => "");

/** Matches a name case-insensitively against existing folders. Only existing names are ever used as paths. */
export async function resolveDir(parent: string, query: string, what: string, strip?: (n: string) => string): Promise<string> {
  const q = query.trim().toLowerCase();
  const names = await subdirs(parent);
  const hit =
    names.find((n) => n.toLowerCase() === q) ?? (strip ? names.find((n) => strip(n).toLowerCase() === q) : undefined);
  if (!hit) throw new UserError(`${what} „${query}“ gibt es nicht.`);
  return hit;
}

const stripNumber = (n: string) => n.replace(/^\d+\s+/, "");

// ---------- Tree for the sidebar ----------

export interface ReiheInfo { name: string; stunden: number; gehalten: number; ohneMaterial: number }
export interface FachInfo { name: string; reihen: ReiheInfo[] }
export interface KlasseInfo { name: string; faecher: FachInfo[] }

export async function listTree(): Promise<KlasseInfo[]> {
  const result: KlasseInfo[] = [];
  for (const k of await subdirs(klassenDir())) {
    const faecher: FachInfo[] = [];
    for (const f of await subdirs(join(klassenDir(), k))) {
      const reihen: ReiheInfo[] = [];
      for (const r of await subdirs(join(klassenDir(), k, f))) {
        const stunden = parseStunden(await readText(join(klassenDir(), k, f, r, "Reihe.md")));
        reihen.push({
          name: r,
          stunden: stunden.length,
          gehalten: stunden.filter((s) => s.status === "gehalten").length,
          ohneMaterial: stunden.filter(needsMaterial).length,
        });
      }
      faecher.push({ name: f, reihen });
    }
    result.push({ name: k, faecher });
  }
  return result;
}

/**
 * A lesson lacks material when the Material column is empty and it has not been held yet.
 * (Held lessons without a file, e.g. a discussion, are not "missing".)
 */
const needsMaterial = (s: Stunde) => !s.material && s.status !== "gehalten";

// ---------- Create a class ----------

export interface NewClass {
  name: string;
  schulform: string;
  stufe: string;
  kursniveau?: string;
  faecher: string[];
  besonderheiten?: string;
}

export async function createClass(input: NewClass): Promise<string> {
  const name = cleanName(input.name, "den Klassennamen");
  if (!SCHULFORMEN.includes(input.schulform as (typeof SCHULFORMEN)[number])) {
    throw new UserError("Bitte wähle eine Schulform aus.");
  }
  const faecher = [...new Set(input.faecher.map((f) => cleanName(f, "den Fachnamen")))];
  if (faecher.length === 0) throw new UserError("Bitte gib mindestens ein Fach an.");
  const dir = join(klassenDir(), name);
  if (await exists(dir)) throw new UserError(`Die Klasse ${name} gibt es schon.`);

  await mkdir(dir, { recursive: true });
  const oneLine = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim();
  await writeFile(
    join(dir, "Klasse.md"),
    `# Klasse ${name}

Schulform: ${input.schulform}
Stufe: ${oneLine(input.stufe)}
Kursniveau: ${oneLine(input.kursniveau)}
Lehrplan:
Fächer: ${faecher.join(", ")}
Besonderheiten: ${oneLine(input.besonderheiten)}
`,
  );
  for (const fach of faecher) {
    await mkdir(join(dir, fach), { recursive: true });
    await writeFile(join(dir, fach, "Stand.md"), standMarkdown(name, fach, {}));
  }
  return name;
}

// ---------- Read ----------

export async function readKlasse(klasse: string): Promise<string> {
  const k = await resolveDir(klassenDir(), klasse, "Die Klasse");
  return readText(join(klassenDir(), k, "Klasse.md"));
}

export async function readStand(klasse: string, fach: string): Promise<string> {
  const { dir } = await resolveFach(klasse, fach);
  return readText(join(dir, "Stand.md"));
}

export async function readReihe(klasse: string, fach: string, reihe: string): Promise<string> {
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  return readText(join(dir, r, "Reihe.md"));
}

async function resolveFach(klasse: string, fach: string) {
  const k = await resolveDir(klassenDir(), klasse, "Die Klasse");
  const f = await resolveDir(join(klassenDir(), k), fach, "Das Fach");
  return { klasse: k, fach: f, dir: join(klassenDir(), k, f) };
}

// ---------- Stand.md ----------

export interface StandFields {
  aktuelleReihe?: string;
  zuletztBehandelt?: string;
  naechsteStunde?: string;
  offen?: string[];
  besonderheiten?: string;
}

const MAX_LINE = 300;
const MAX_OPEN = 8;

function standMarkdown(klasse: string, fach: string, f: StandFields): string {
  const line = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LINE);
  const offen = (f.offen ?? []).map(line).filter(Boolean).slice(0, MAX_OPEN);
  return `# Stand: ${klasse} · ${fach}

Aktualisiert: ${today()}
Aktuelle Reihe: ${line(f.aktuelleReihe)}
Zuletzt behandelt: ${line(f.zuletztBehandelt)}
Nächste Stunde: ${line(f.naechsteStunde)}
Offen / mitnehmen:${offen.map((o) => `\n- ${o}`).join("")}
Besonderheiten: ${line(f.besonderheiten)}
`;
}

/** Overwrites Stand.md (never appends), so it stays short. */
export async function writeStand(klasse: string, fach: string, fields: StandFields): Promise<void> {
  const r = await resolveFach(klasse, fach);
  await writeFile(join(r.dir, "Stand.md"), standMarkdown(r.klasse, r.fach, fields));
}

// ---------- Reihen ----------

export interface NewReihe {
  thema: string;
  lernfeld?: string;
  zeitraum?: string;
  leistungsnachweis?: string;
  szenario?: string;
}

export async function createReihe(klasse: string, fach: string, input: NewReihe): Promise<string> {
  const thema = cleanName(input.thema, "das Thema der Reihe");
  const { dir } = await resolveFach(klasse, fach);
  const existing = await subdirs(dir);
  if (existing.some((n) => stripNumber(n).toLowerCase() === thema.toLowerCase())) {
    throw new UserError(`Die Reihe „${thema}“ gibt es schon.`);
  }
  const next = Math.max(0, ...existing.map((n) => Number(/^(\d+)\s/.exec(n)?.[1] ?? 0))) + 1;
  const name = `${String(next).padStart(2, "0")} ${thema}`;
  await mkdir(join(dir, name, "Material"), { recursive: true });
  const oneLine = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim();
  await writeFile(
    join(dir, name, "Reihe.md"),
    newReiheMarkdown({
      thema,
      lernfeld: oneLine(input.lernfeld),
      zeitraum: oneLine(input.zeitraum),
      leistungsnachweis: oneLine(input.leistungsnachweis),
      szenario: oneLine(input.szenario),
    }),
  );
  return name;
}

export async function setStunde(
  klasse: string,
  fach: string,
  reihe: string,
  patch: { datum: string; stunde: string; thema?: string; material?: string; status?: string },
): Promise<Stunde[]> {
  if (patch.status && !(STATUS as readonly string[]).includes(patch.status)) {
    throw new UserError(`Der Status muss einer dieser Werte sein: ${STATUS.join(", ")}.`);
  }
  if (!patch.datum.trim() || !patch.stunde.trim()) throw new UserError("Datum und Stunde müssen angegeben sein.");
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  const file = join(dir, r, "Reihe.md");
  const markdown = await readText(file);
  const stunden = upsertStunde(parseStunden(markdown), patch);
  await writeFile(file, writeStunden(markdown, stunden));
  return stunden;
}

// ---------- "Where is material missing?" ----------

export interface Luecke { klasse: string; fach: string; reihe: string; datum: string; stunde: string; thema: string }

export async function materialLuecken(klasse?: string): Promise<Luecke[]> {
  const result: Luecke[] = [];
  const klassen = klasse ? [await resolveDir(klassenDir(), klasse, "Die Klasse")] : await subdirs(klassenDir());
  for (const k of klassen) {
    for (const f of await subdirs(join(klassenDir(), k))) {
      for (const r of await subdirs(join(klassenDir(), k, f))) {
        const stunden = parseStunden(await readText(join(klassenDir(), k, f, r, "Reihe.md")));
        for (const s of stunden.filter(needsMaterial)) {
          result.push({ klasse: k, fach: f, reihe: r, datum: s.datum, stunde: s.stunde, thema: s.thema });
        }
      }
    }
  }
  return result;
}

// ---------- Material (PDF files) ----------

/** "14.10." becomes "2026-10-14" (current year). Anything else falls back to today. */
function isoDate(datum?: string): string {
  const m = /^(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/.exec((datum ?? "").trim());
  if (!m) return today();
  const year = m[3] ?? today().slice(0, 4);
  return `${year}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

const slug = (s: string) =>
  s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "Material";

export interface SavedMaterial {
  name: string;
  /** Path relative to the working folder, for the download link. */
  path: string;
}

/**
 * Saves a PDF. With class, subject and series it lands in that series' Material folder,
 * named like 2026-10-14_Mi3_Arbeitsblatt-Interview.pdf. Otherwise it goes to Exporte.
 */
export async function saveMaterial(
  pdf: Buffer,
  where: { art: string; titel: string; klasse?: string; fach?: string; reihe?: string; datum?: string; stunde?: string },
): Promise<SavedMaterial> {
  let dir = join(root(), "Exporte");
  let rel = "Exporte";
  if (where.klasse && where.fach && where.reihe) {
    const f = await resolveFach(where.klasse, where.fach);
    const r = await resolveDir(f.dir, where.reihe, "Die Reihe", stripNumber);
    dir = join(f.dir, r, "Material");
    rel = `Klassen/${f.klasse}/${f.fach}/${r}/Material`;
  }
  await mkdir(dir, { recursive: true });
  const stunde = (where.stunde ?? "").replace(/\s+/g, "");
  const base = [isoDate(where.datum), stunde && slug(stunde), `${where.art}-${slug(where.titel)}`].filter(Boolean).join("_");
  let name = `${base}.pdf`;
  for (let i = 2; await exists(join(dir, name)); i++) name = `${base}-${i}.pdf`;
  await writeFile(join(dir, name), pdf);
  return { name, path: `${rel}/${name}` };
}

/**
 * Enters a file in the lesson table. A lesson that is already "gehalten" keeps that status,
 * otherwise it becomes "Material fertig".
 */
export async function attachMaterial(
  klasse: string, fach: string, reihe: string,
  stunde: { datum: string; stunde: string; thema?: string }, datei: string,
): Promise<void> {
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  const file = join(dir, r, "Reihe.md");
  const markdown = await readText(file);
  const old = parseStunden(markdown).find((s) => `${s.datum}|${s.stunde}`.toLowerCase() === `${stunde.datum}|${stunde.stunde}`.toLowerCase());
  await setStunde(klasse, fach, reihe, {
    datum: stunde.datum,
    stunde: stunde.stunde,
    thema: stunde.thema,
    material: datei,
    status: old?.status === "gehalten" ? "gehalten" : "Material fertig",
  });
}

/** Resolves a download path from the browser to a real PDF file inside Klassen/ or Exporte/. */
export async function materialFile(relative: string): Promise<string | undefined> {
  const { realpath } = await import("node:fs/promises");
  const [top] = relative.split("/");
  if (!["Klassen", "Exporte"].includes(top ?? "") || !relative.toLowerCase().endsWith(".pdf")) return undefined;
  try {
    const base = await realpath(root());
    const target = await realpath(join(base, relative));
    return target.startsWith(join(base, top!) + sep) ? target : undefined;
  } catch {
    return undefined;
  }
}

/**
 * True when Klasse.md names a Lehrplan folder that really holds a Plan.md.
 * Without it, material carries an honest note instead of invented curriculum references.
 */
export async function hasLehrplan(klasse: string): Promise<boolean> {
  try {
    const name = /^Lehrplan:[ \t]*(\S.*)$/m.exec(await readKlasse(klasse))?.[1]?.trim();
    if (!name) return false;
    const dir = await resolveDir(join(root(), "Lehrpläne"), name, "Der Lehrplan");
    return (await readText(join(root(), "Lehrpläne", dir, "Plan.md"))).trim().length > 0;
  } catch {
    return false;
  }
}

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { dataDir, moveLegacyDataDir } from "../paths.ts";
import { newReiheMarkdown, parseStunden, STATUS, upsertStunde, writeStunden, type AblaufSchritt, type Stunde } from "./reihe.ts";

export { STATUS } from "./reihe.ts";
export type { AblaufSchritt, Stunde } from "./reihe.ts";

/** Top-level folders of the working folder, see docs/ordnerstruktur.md. */
const TOP_FOLDERS = ["Einstellungen", "Lehrpläne", "Klassen", "Stundenplan", "Vorlagen", "Skills", "Exporte"];

export const SCHULFORMEN = ["Berufskolleg", "Gymnasium", "Gesamtschule"] as const;

export class UserError extends Error {}

export const root = () => dataDir();
export const klassenDir = () => join(root(), "Klassen");

export async function initWorkspace(): Promise<void> {
  await moveLegacyDataDir();
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
  const seenFach = new Set<string>();
  const faecher = input.faecher.map((f) => cleanName(f, "den Fachnamen")).filter((f) => !seenFach.has(f.toLowerCase()) && seenFach.add(f.toLowerCase()));
  if (faecher.length === 0) throw new UserError("Bitte gib mindestens ein Fach an.");
  const dir = join(klassenDir(), name);
  // Lookups ignore case ("11a" finds "11A"), so a second class that differs only in case could never be reached.
  if ((await subdirs(klassenDir())).some((k) => k.toLowerCase() === name.toLowerCase())) throw new UserError(`Die Klasse ${name} gibt es schon.`);

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

/**
 * Stand.md together with the Klasse.md above it, so the reading order (class first, then Stand) holds
 * for every model without relying on it calling two tools in the right order.
 * A class without Klasse.md (or an empty one) gives the Stand alone.
 */
export async function readStandMitKlasse(klasse: string, fach: string): Promise<string> {
  const r = await resolveFach(klasse, fach);
  const [klasseText, standText] = await Promise.all([readText(join(klassenDir(), r.klasse, "Klasse.md")), readText(join(r.dir, "Stand.md"))]);
  return klasseText.trim() ? `Klasse.md:
${klasseText.trim()}

Stand.md:
${standText.trim()}` : standText;
}

export async function readReihe(klasse: string, fach: string, reihe: string): Promise<string> {
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  return readText(join(dir, r, "Reihe.md"));
}

/** Names of the files in the Material folder of a series. */
export async function listMaterial(klasse: string, fach: string, reihe: string): Promise<string[]> {
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  try {
    return (await readdir(join(dir, r, "Material"))).filter((n) => materialType(n)).sort();
  } catch {
    return [];
  }
}

export interface MaterialEntry { klasse: string; fach: string; reihe: string; name: string; path: string; size: number; modified: string }

/** Every material file of every class, newest first, for the overview page. `path` is what /api/material takes. */
export async function listAllMaterial(): Promise<MaterialEntry[]> {
  const result: MaterialEntry[] = [];
  for (const klasse of await subdirs(klassenDir())) {
    for (const fach of await subdirs(join(klassenDir(), klasse))) {
      for (const reihe of await subdirs(join(klassenDir(), klasse, fach))) {
        const folder = join(klassenDir(), klasse, fach, reihe, "Material");
        let names: string[] = [];
        try {
          names = (await readdir(folder)).filter((n) => materialType(n));
        } catch {
          continue;
        }
        for (const name of names) {
          const info = await stat(join(folder, name)).catch(() => undefined);
          if (!info?.isFile()) continue;
          result.push({ klasse, fach, reihe, name, path: `Klassen/${klasse}/${fach}/${reihe}/Material/${name}`, size: info.size, modified: info.mtime.toISOString() });
        }
      }
    }
  }
  return result.sort((a, b) => b.modified.localeCompare(a.modified) || a.name.localeCompare(b.name, "de", { numeric: true }));
}

/** Full path of one file in the Material folder of a series. Only the file name counts, never a path. */
export async function materialDatei(klasse: string, fach: string, reihe: string, datei: string): Promise<string> {
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  const name = datei.split(/[\\/]/).pop() ?? "";
  if (!name || name !== datei.trim() || !materialType(name) || !(await exists(join(dir, r, "Material", name)))) {
    throw new UserError(`Die Datei „${datei}“ gibt es in dieser Reihe nicht.`);
  }
  return join(dir, r, "Material", name);
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
  const line = (s?: string) => {
    const value = (s ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LINE);
    // Tool-call markup leaking from the model must never end up in Stand.md.
    if (/<\/?[a-z]|parameter name=/i.test(value)) {
      throw new UserError("Im Stand steckt etwas, das wie Programmcode aussieht. Bitte noch einmal in normalen Worten versuchen.");
    }
    return value;
  };
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
  ziele?: string[];
  leistungsnachweis?: string;
  szenario?: string;
  handlungssituation?: string;
  handlungsprodukt?: string;
  /** Planned lessons in order. Each becomes a row with status "geplant"; date and period may still be empty. */
  ablauf?: (AblaufSchritt & { datum?: string; stunde?: string })[];
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
  const ablauf = input.ablauf ?? [];
  await writeFile(
    join(dir, name, "Reihe.md"),
    newReiheMarkdown({
      ...input,
      thema,
      ablauf,
      stunden: ablauf.map((s) => ({ datum: s.datum ?? "", stunde: s.stunde ?? "", thema: s.thema, material: "", status: "geplant" })),
    }),
  );
  return name;
}
export async function setStunde(
  klasse: string,
  fach: string,
  reihe: string,
  patch: { nr?: number; datum?: string; stunde?: string; thema?: string; material?: string; status?: string },
): Promise<Stunde[]> {
  if (patch.status && !(STATUS as readonly string[]).includes(patch.status)) {
    throw new UserError(`Der Status muss einer dieser Werte sein: ${STATUS.join(", ")}.`);
  }
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  const file = join(dir, r, "Reihe.md");
  const markdown = await readText(file);
  const old = parseStunden(markdown);
  if (patch.nr !== undefined) {
    if (!Number.isInteger(patch.nr) || patch.nr < 1 || patch.nr > old.length) throw new UserError(`Die Reihe hat ${old.length} Stunden, eine Stunde ${patch.nr} gibt es nicht.`);
  } else if (!patch.datum?.trim() || !patch.stunde?.trim()) {
    throw new UserError("Datum und Stunde müssen angegeben sein, oder die Nummer der Stunde in der Reihe.");
  }
  const stunden = upsertStunde(old, patch);
  await writeFile(file, writeStunden(markdown, stunden));
  return stunden;
}

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
  if (/^\d{4}-\d{2}-\d{2}$/.test((datum ?? "").trim())) return datum!.trim();
  const m = /^(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/.exec((datum ?? "").trim());
  if (!m) return today();
  const year = m[3] ?? today().slice(0, 4);
  return `${year}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

const slug = (s: string) => {
  const full = s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  // A long title is cut at a word edge, not in the middle of a word.
  const cut = full.length > 50 ? full.slice(0, 50).replace(/-[^-]*$/, "") : full;
  return (cut.length >= 20 || full.length <= 50 ? cut : full.slice(0, 50)) || "Material";
};

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
  where: { art: string; titel: string; klasse?: string; fach?: string; reihe?: string; datum?: string; stunde?: string; ext?: "pdf" | "docx" | "pptx" },
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
  const ext = where.ext ?? "pdf";
  let name = `${base}.${ext}`;
  for (let i = 2; await exists(join(dir, name)); i++) name = `${base}-${i}.${ext}`;
  await writeFile(join(dir, name), pdf);
  return { name, path: `${rel}/${name}` };
}

/**
 * Puts a file the teacher brought (worksheet from a colleague, slides, picture) into the Material folder of a series.
 * The name keeps the original, with the date in front: 2026-10-14_Mi0945_Arbeitsblatt-Lebenslauf.docx.
 */
export async function saveMaterialFile(
  klasse: string, fach: string, reihe: string,
  file: { name: string; data: Buffer }, prefix: { datum: string; stunde?: string },
): Promise<SavedMaterial> {
  const ext = extensionOf(file.name);
  if (!ext || !MATERIAL_TYPES[ext]) throw new UserError(`Diesen Dateityp nehme ich nicht an. Erlaubt sind: ${MATERIAL_ENDUNGEN.join(", ")}.`);
  if (file.data.length > 25 * 1024 * 1024) throw new UserError("Die Datei ist größer als 25 MB.");
  if (file.data.length === 0) throw new UserError("Die Datei ist leer.");
  const f = await resolveFach(klasse, fach);
  const r = await resolveDir(f.dir, reihe, "Die Reihe", stripNumber);
  const dir = join(f.dir, r, "Material");
  await mkdir(dir, { recursive: true });
  const stem = file.name.replace(/\.[^.]+$/, "");
  const base = [isoDate(prefix.datum), prefix.stunde && slug(prefix.stunde), slug(stem)].filter(Boolean).join("_");
  let name = `${base}.${ext}`;
  for (let i = 2; await exists(join(dir, name)); i++) name = `${base}-${i}.${ext}`;
  await writeFile(join(dir, name), file.data);
  return { name, path: `Klassen/${f.klasse}/${f.fach}/${r}/Material/${name}` };
}

/**
 * Enters a file in the lesson table. A lesson that is already "gehalten" keeps that status,
 * otherwise it becomes "Material fertig".
 */
export async function attachMaterial(
  klasse: string, fach: string, reihe: string,
  stunde: { datum: string; stunde: string; thema?: string }, datei: string,
  opts: { append?: boolean } = {},
): Promise<void> {
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  const file = join(dir, r, "Reihe.md");
  const markdown = await readText(file);
  const rows = parseStunden(markdown);
  const old = findStunde(rows, stunde);
  await setStunde(klasse, fach, reihe, {
    // A planned row is addressed by its number, so rows without a lesson name work too.
    ...(old ? { nr: rows.indexOf(old) + 1 } : { datum: stunde.datum }),
    stunde: old?.stunde || stunde.stunde,
    thema: old?.thema ? undefined : stunde.thema, // a planned topic stays, the file title only fills an empty one
    material: opts.append && old?.material ? (old.material.split(", ").includes(datei) ? old.material : `${old.material}, ${datei}`) : datei,
    status: old?.status === "gehalten" ? "gehalten" : "Material fertig",
  });
}

/**
 * Finds the row of a lesson: same date and lesson name, or, when the name is missing on either side,
 * the only row of that date that has no name yet (the series planning writes dates first and names later).
 */
function findStunde(rows: Stunde[], want: { datum: string; stunde: string }): Stunde | undefined {
  const key = (s: { datum: string; stunde: string }) => `${s.datum}|${s.stunde}`.toLowerCase();
  const exact = rows.find((s) => key(s) === key(want));
  if (exact) return exact;
  const sameDate = rows.filter((s) => s.datum.toLowerCase() === want.datum.toLowerCase());
  if (!want.stunde) return sameDate.length === 1 ? sameDate[0] : undefined;
  const unnamed = sameDate.filter((s) => !s.stunde);
  return unnamed.length === 1 ? unnamed[0] : undefined;
}

/**
 * Notes the topic of a planned lesson in the table without touching its status or material list.
 * An existing row (found by date, or by date and lesson name) only gets a topic when it has none.
 * A lesson that is not in the table yet is added as "geplant" when its name is known.
 */
export async function notePlannedLesson(
  klasse: string, fach: string, reihe: string, stunde: { datum: string; stunde: string; thema: string },
): Promise<"eingetragen" | "ergaenzt" | "schon-da"> {
  const { dir } = await resolveFach(klasse, fach);
  const r = await resolveDir(dir, reihe, "Die Reihe", stripNumber);
  const rows = parseStunden(await readText(join(dir, r, "Reihe.md")));
  const old = findStunde(rows, stunde);
  if (old) {
    if (old.thema) return "schon-da";
    await setStunde(klasse, fach, reihe, { nr: rows.indexOf(old) + 1, thema: stunde.thema });
    return "ergaenzt";
  }
  await setStunde(klasse, fach, reihe, { datum: stunde.datum, stunde: stunde.stunde, thema: stunde.thema });
  return "eingetragen";
}

/** File types a teacher may put on a lesson, with the type the browser needs. Nothing that could run. */
const MATERIAL_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odp: "application/vnd.oasis.opendocument.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  txt: "text/plain; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};
export const MATERIAL_ENDUNGEN = Object.keys(MATERIAL_TYPES);
const extensionOf = (file: string) => /\.([A-Za-z0-9]+)$/.exec(file)?.[1]?.toLowerCase();
/** Content type of a material file by its ending, or undefined when the type is not allowed. */
export const materialType = (file: string): string | undefined => MATERIAL_TYPES[extensionOf(file) ?? ""];
/** Only PDFs and pictures are shown inline in the preview, everything else is a download. */
export const materialInline = (file: string) => /^(application\/pdf|image\/)/.test(materialType(file) ?? "");

/** Resolves a download path from the browser to a real file inside Klassen/ or Exporte/. */
export async function materialFile(relative: string): Promise<string | undefined> {
  const { realpath } = await import("node:fs/promises");
  const [top] = relative.split("/");
  if (!["Klassen", "Exporte"].includes(top ?? "") || !materialType(relative)) return undefined;
  try {
    const base = await realpath(root());
    const target = await realpath(join(base, relative));
    return target.startsWith(join(base, top!) + sep) ? target : undefined;
  } catch {
    return undefined;
  }
}

/** The Lehrplan folder name that a Klasse.md text names, if any. This is the only place that reads the line. */
export const lehrplanOf = (klasseMd: string): string | undefined => /^Lehrplan:[ \t]*(\S.*)$/m.exec(klasseMd)?.[1]?.trim() || undefined;

/** Klasse.md text with the Lehrplan line set to `name` (empty string clears it). */
export const withLehrplan = (klasseMd: string, name: string): string =>
  /^Lehrplan:.*$/m.test(klasseMd) ? klasseMd.replace(/^Lehrplan:.*$/m, `Lehrplan: ${name}`.trimEnd()) : `${klasseMd.trimEnd()}\nLehrplan: ${name}\n`;

/**
 * True when Klasse.md names a Lehrplan folder that really holds a Plan.md.
 * Without it, material carries an honest note instead of invented curriculum references.
 */
export async function hasLehrplan(klasse: string): Promise<boolean> {
  try {
    const name = lehrplanOf(await readKlasse(klasse));
    if (!name) return false;
    const dir = await resolveDir(join(root(), "Lehrpläne"), name, "Der Lehrplan");
    return (await readText(join(root(), "Lehrpläne", dir, "Plan.md"))).trim().length > 0;
  } catch {
    return false;
  }
}

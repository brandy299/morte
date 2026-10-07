/**
 * Assessment rules of a teacher: the areas of demand (Anforderungsbereiche) and the grading scale.
 * Nothing here is fixed in the program. Schools and subjects differ, so every teacher sets their own,
 * and it lives in Lehrpläne/<Ordner>/Bewertung.md where the teacher can also read and edit it.
 * The program only checks the shape and does the arithmetic.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanName, klassenDir, lehrplanOf, readKlasse, readText, resolveDir, root, UserError, withLehrplan } from "./index.ts";

export interface Bereich {
  /** Short label as the school calls it, e.g. "AFB I", "I", "Reproduktion". */
  kurz: string;
  name?: string;
  /** Intended share of the points in percent. Optional. */
  anteil?: number;
}

export interface Note {
  /** Label as used on the school's reports, e.g. "1", "2+", "sehr gut", "13 Punkte". */
  note: string;
  /** From this share of the points on, the grade applies. */
  abProzent: number;
}

export interface Bewertung {
  bereiche: Bereich[];
  notenschluessel: Note[];
  hinweise?: string;
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/** Checks what the model or the teacher entered. Plain-language errors, no invented values. */
export function checkBewertung(raw: Bewertung): Bewertung {
  const bereiche = (raw.bereiche ?? []).map((b, i) => {
    const kurz = oneLine(String(b.kurz ?? ""));
    if (!kurz || kurz.length > 20 || /[:()]/.test(kurz)) throw new UserError(`Bereich ${i + 1}: Die Kurzbezeichnung fehlt oder ist zu lang (höchstens 20 Zeichen, ohne Doppelpunkt und Klammern).`);
    const name = b.name ? oneLine(String(b.name)).replace(/\s*\(\s*[\d,.]+\s*%\s*\)\s*$/, "") : undefined;
    if (name && name.length > 80) throw new UserError(`Bereich ${kurz}: Der Name ist zu lang.`);
    if (b.anteil !== undefined && !(b.anteil >= 0 && b.anteil <= 100)) throw new UserError(`Bereich ${kurz}: Der Anteil muss zwischen 0 und 100 Prozent liegen.`);
    return { kurz, name: name || undefined, anteil: b.anteil };
  });
  if (bereiche.length > 8) throw new UserError("Mehr als 8 Bereiche sind zu viele.");
  if (new Set(bereiche.map((b) => b.kurz.toLowerCase())).size !== bereiche.length) throw new UserError("Zwei Bereiche heißen gleich.");

  const noten = (raw.notenschluessel ?? []).map((n, i) => {
    const note = oneLine(String(n.note ?? ""));
    if (!note || note.length > 20 || /:/.test(note)) throw new UserError(`Note ${i + 1}: Die Bezeichnung fehlt oder ist zu lang (höchstens 20 Zeichen, ohne Doppelpunkt).`);
    if (!(n.abProzent >= 0 && n.abProzent <= 100)) throw new UserError(`Note ${note}: Die Prozentgrenze muss zwischen 0 und 100 liegen.`);
    return { note, abProzent: n.abProzent };
  });
  if (noten.length === 1 || noten.length > 20) throw new UserError("Ein Notenschlüssel braucht mindestens zwei und höchstens 20 Stufen.");
  for (let i = 1; i < noten.length; i++) {
    if (noten[i]!.abProzent >= noten[i - 1]!.abProzent) throw new UserError("Die Prozentgrenzen müssen von der besten zur schlechtesten Note kleiner werden.");
  }
  const hinweise = raw.hinweise ? oneLine(raw.hinweise).slice(0, 1000) : undefined;
  return { bereiche, notenschluessel: noten, hinweise: hinweise || undefined };
}

const pct = (n: number) => String(n).replace(".", ",");
const fromPct = (s: string) => Number(s.replace(",", "."));

export function bewertungMarkdown(ordner: string, b: Bewertung): string {
  const bereiche = b.bereiche.length
    ? b.bereiche.map((x) => `- ${x.kurz}:${x.name ? ` ${x.name}` : ""}${x.anteil !== undefined ? ` (${pct(x.anteil)} %)` : ""}`).join("\n")
    : "(keine festgelegt)";
  const noten = b.notenschluessel.length ? b.notenschluessel.map((n) => `- ${n.note}: ab ${pct(n.abProzent)} %`).join("\n") : "(keiner festgelegt)";
  return `# Bewertung: ${ordner}

Bereiche (Anforderungsbereiche, so wie eure Schule sie nennt):
${bereiche}

Notenschlüssel (ab wie viel Prozent der Punkte):
${noten}

Hinweise: ${b.hinweise ?? ""}
`;
}

export function parseBewertung(markdown: string): Bewertung {
  const section = (title: RegExp) => {
    const lines = markdown.split(/\r?\n/);
    const start = lines.findIndex((l) => title.test(l));
    if (start < 0) return [];
    const out: string[] = [];
    for (const l of lines.slice(start + 1)) {
      if (/^\S.*:/.test(l) && !l.startsWith("-")) break;
      if (l.startsWith("- ")) out.push(l.slice(2).trim());
    }
    return out;
  };
  const bereiche = section(/^Bereiche\b/).flatMap((l): Bereich[] => {
    const m = /^([^:]+):\s*(.*?)(?:\s*\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\))?$/.exec(l);
    return m ? [{ kurz: m[1]!.trim(), name: m[2]!.trim() || undefined, anteil: m[3] ? fromPct(m[3]) : undefined }] : [];
  });
  const notenschluessel = section(/^Notenschlüssel\b/).flatMap((l): Note[] => {
    const m = /^([^:]+):\s*(?:ab\s*)?(\d+(?:[.,]\d+)?)\s*%?$/.exec(l);
    return m ? [{ note: m[1]!.trim(), abProzent: fromPct(m[2]!) }] : [];
  });
  const hinweise = /^Hinweise:[ \t]*(\S.*)$/m.exec(markdown)?.[1]?.trim();
  return { bereiche, notenschluessel, hinweise };
}

/** Name of the Lehrplan folder that Klasse.md points to, if it names one. */
async function lehrplanOrdner(klasse: string): Promise<string | undefined> {
  return lehrplanOf(await readKlasse(klasse));
}

/** Reads the rules for a class. `undefined` means the teacher has not set any yet. */
export async function readBewertung(klasse: string): Promise<{ ordner: string; bewertung: Bewertung; markdown: string } | undefined> {
  const name = await lehrplanOrdner(klasse);
  if (!name) return undefined;
  let ordner: string;
  try {
    ordner = await resolveDir(join(root(), "Lehrpläne"), name, "Der Lehrplan");
  } catch {
    return undefined;
  }
  const markdown = await readText(join(root(), "Lehrpläne", ordner, "Bewertung.md"));
  if (!markdown.trim()) return undefined;
  return { ordner, bewertung: parseBewertung(markdown), markdown };
}

/**
 * Saves the rules in Lehrpläne/<ordner>/Bewertung.md and points the given classes to that folder.
 * An existing Plan.md or Hinweise.md in the folder stays untouched.
 */
export async function writeBewertung(ordnerName: string, klassen: string[], input: Bewertung): Promise<string> {
  const ordner = cleanName(ordnerName, "den Namen des Bildungsgangs oder Fachs");
  const bewertung = checkBewertung(input);
  if (bewertung.notenschluessel.length === 0 && bewertung.bereiche.length === 0) throw new UserError("Es gibt noch nichts zu speichern: weder Bereiche noch einen Notenschlüssel.");
  // An existing folder wins, whatever the case: "englisch" belongs to "Englisch".
  const existing = await resolveDir(join(root(), "Lehrpläne"), ordner, "Der Lehrplan").catch(() => undefined);
  const folder = existing ?? ordner;
  const dir = join(root(), "Lehrpläne", folder);
  const resolved = await Promise.all(klassen.map((k) => resolveDir(klassenDir(), k, "Die Klasse")));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "Bewertung.md"), bewertungMarkdown(folder, bewertung));
  for (const k of resolved) {
    const file = join(klassenDir(), k, "Klasse.md");
    const md = await readText(file);
    await writeFile(file, withLehrplan(md, folder));
  }
  return folder;
}

// ---------- Arithmetic (the model never calculates points or grade limits) ----------

/** Smallest point total that still reaches `abProzent` of `gesamt`, in steps of half a point. */
export function punktgrenze(gesamt: number, abProzent: number): number {
  return Math.ceil((gesamt * abProzent) / 100 / 0.5 - 1e-9) * 0.5 || 0; // `|| 0` turns -0 into 0
}

export interface Grenze {
  note: string;
  abProzent: number;
  /** From this many points on. */
  vonPunkten: number;
  /** Up to this many points, or undefined for the best grade. */
  bisPunkten?: number;
}

/** Turns the percent scale into point ranges for an exam with `gesamt` points. */
export function grenzen(gesamt: number, schluessel: Note[]): Grenze[] {
  return schluessel.map((n, i) => {
    const von = n.abProzent === 0 ? 0 : punktgrenze(gesamt, n.abProzent);
    const better = i > 0 ? punktgrenze(gesamt, schluessel[i - 1]!.abProzent) : undefined;
    return { note: n.note, abProzent: n.abProzent, vonPunkten: von, bisPunkten: better === undefined ? undefined : better - 0.5 };
  });
}

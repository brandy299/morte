import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanName, klassenDir, lehrplanOf, readKlasse, readText, resolveDir, root, UserError, withLehrplan } from "../workspace/index.ts";

const lehrplanDir = () => join(root(), "Lehrpläne");
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

export interface LehrplanInfo {
  name: string;
  /** Plan.md holds text. */
  hasPlan: boolean;
  hasBewertung: boolean;
  /** Number of headings, a rough idea of how detailed the plan is. */
  abschnitte: number;
  /** Classes whose Klasse.md names this folder. */
  klassen: string[];
}

export async function listLehrplaene(): Promise<LehrplanInfo[]> {
  let names: string[];
  try {
    names = (await readdir(lehrplanDir(), { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name);
  } catch {
    return [];
  }
  const assigned = await klassenByLehrplan();
  const result: LehrplanInfo[] = [];
  for (const name of names.sort((a, b) => a.localeCompare(b, "de"))) {
    const plan = await readText(join(lehrplanDir(), name, "Plan.md"));
    result.push({
      name,
      hasPlan: plan.trim().length > 0,
      hasBewertung: (await readText(join(lehrplanDir(), name, "Bewertung.md"))).trim().length > 0,
      abschnitte: outline(plan).length,
      klassen: assigned.get(name.toLowerCase()) ?? [],
    });
  }
  return result;
}

async function klassenByLehrplan(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  let klassen: string[] = [];
  try {
    klassen = (await readdir(klassenDir(), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    /* no classes yet */
  }
  for (const k of klassen) {
    const name = lehrplanOf(await readText(join(klassenDir(), k, "Klasse.md")))?.toLowerCase();
    if (name) map.set(name, [...(map.get(name) ?? []), k]);
  }
  return map;
}

/**
 * Saves the converted plan as Lehrpläne/<name>/Plan.md. An existing plan is only replaced when `replace` is set.
 * Bewertung.md and Hinweise.md in the same folder stay as they are.
 */
export async function saveLehrplan(
  rawName: string,
  markdown: string,
  source: { file: string; pages?: number },
  opts: { replace?: boolean } = {},
): Promise<string> {
  const typed = cleanName(rawName, "den Namen des Lehrplans");
  // An existing folder wins, whatever the case: "englisch" belongs to "Englisch".
  const name = await resolveDir(lehrplanDir(), typed, "Der Lehrplan").catch(() => typed);
  const dir = join(lehrplanDir(), name);
  const file = join(dir, "Plan.md");
  if ((await readText(file)).trim() && !opts.replace) throw new UserError(`Für „${name}“ gibt es schon einen Lehrplan.`);
  await mkdir(dir, { recursive: true });
  const origin = [`Quelle: ${source.file.replace(/\s+/g, " ").slice(0, 120)}`, source.pages ? `${source.pages} Seiten` : "", `übernommen am ${today()}`].filter(Boolean).join(" · ");
  await writeFile(file, `# ${name}\n\n${origin}\n\n---\n\n${markdown.trim()}\n`);
  return name;
}

/** Removes the plan text. Bewertung.md and Hinweises.md stay, because the teacher wrote them herself. */
export async function removePlan(name: string): Promise<void> {
  const dir = await resolveDir(lehrplanDir(), name, "Der Lehrplan");
  await rm(join(lehrplanDir(), dir, "Plan.md"), { force: true });
  const left = await readdir(join(lehrplanDir(), dir));
  if (left.length === 0) await rm(join(lehrplanDir(), dir), { recursive: true });
}

/** Points the given classes to this plan and takes it away from others that pointed to it before. */
export async function assignLehrplan(name: string, klassen: string[]): Promise<void> {
  const dir = await resolveDir(lehrplanDir(), name, "Der Lehrplan");
  const wanted = new Set(await Promise.all(klassen.map((k) => resolveDir(klassenDir(), k, "Die Klasse"))));
  const all = (await readdir(klassenDir(), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const k of all) {
    const file = join(klassenDir(), k, "Klasse.md");
    const md = await readText(file);
    if (wanted.has(k)) await writeFile(file, withLehrplan(md, dir));
    else if (lehrplanOf(md)?.toLowerCase() === dir.toLowerCase()) await writeFile(file, withLehrplan(md, ""));
  }
}

/** The plan a class points to. `undefined` when it names none or the folder holds no text. */
export async function planFor(klasse: string): Promise<{ name: string; markdown: string } | undefined> {
  const name = lehrplanOf(await readKlasse(klasse));
  if (!name) return undefined;
  try {
    const dir = await resolveDir(lehrplanDir(), name, "Der Lehrplan");
    const markdown = await readText(join(lehrplanDir(), dir, "Plan.md"));
    return markdown.trim() ? { name: dir, markdown } : undefined;
  } catch {
    return undefined;
  }
}

// ---------- Reading a plan in small steps ----------

export interface Heading {
  /** Position in the outline, starting at 1. Used to ask for one section. */
  id: number;
  level: number;
  title: string;
  /** Characters in this section, including its subsections. */
  length: number;
  line: number;
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;

/** All headings of a Markdown text with the size of each section. Lines inside code fences are ignored. */
export function outline(markdown: string): Heading[] {
  const lines = markdown.split("\n");
  const found: { level: number; title: string; line: number }[] = [];
  let fenced = false;
  for (const [i, l] of lines.entries()) {
    if (/^```/.test(l)) fenced = !fenced;
    const m = !fenced && HEADING.exec(l);
    if (m) found.push({ level: m[1]!.length, title: m[2]!, line: i });
  }
  return found.map((h, i) => {
    let end = lines.length;
    for (const next of found.slice(i + 1)) {
      if (next.level <= h.level) {
        end = next.line;
        break;
      }
    }
    return { id: i + 1, level: h.level, title: h.title, line: h.line, length: lines.slice(h.line, end).join("\n").length };
  });
}

/** Text of one section with its subsections. Long sections are cut at `limit` characters, with a note how to continue. */
export function section(markdown: string, id: number, from = 0, limit = 6000): string {
  const heads = outline(markdown);
  const h = heads.find((x) => x.id === id);
  if (!h) throw new UserError(`Den Abschnitt ${id} gibt es nicht.`);
  const lines = markdown.split("\n");
  let end = lines.length;
  for (const next of heads.slice(id)) {
    if (next.level <= h.level) {
      end = next.line;
      break;
    }
  }
  const text = lines.slice(h.line, end).join("\n");
  const part = text.slice(from, from + limit);
  const more = from + limit < text.length ? `\n\n[Es geht weiter: Abschnitt ${id}, ab Zeichen ${from + limit} von ${text.length}.]` : "";
  return part + more;
}

export interface Hit {
  /** Section the paragraph belongs to. */
  id?: number;
  path: string;
  text: string;
}

/** Finds paragraphs that contain all given words (any case), with the heading path they sit under. */
export function search(markdown: string, query: string, max = 8): Hit[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return [];
  const heads = outline(markdown);
  const lines = markdown.split("\n");
  const hits: Hit[] = [];
  const stack: Heading[] = [];
  let para: string[] = [];
  const flush = (path: string, id?: number) => {
    const text = para.join("\n").trim();
    para = [];
    if (text && terms.every((t) => text.toLowerCase().includes(t))) hits.push({ id, path, text: text.length > 700 ? `${text.slice(0, 700)} …` : text });
  };
  for (const [i, line] of lines.entries()) {
    const head = heads.find((h) => h.line === i);
    const path = stack.map((h) => h.title).join(" › ");
    const id = stack.at(-1)?.id;
    if (head) {
      flush(path, id);
      while (stack.length && stack.at(-1)!.level >= head.level) stack.pop();
      stack.push(head);
    } else if (line.trim() === "") flush(path, id);
    else para.push(line);
    if (hits.length >= max) break;
  }
  flush(stack.map((h) => h.title).join(" › "), stack.at(-1)?.id);
  return hits.slice(0, max);
}


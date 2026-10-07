import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "../paths.ts";
import { listSkills, SkillError } from "./index.ts";

/** What a teacher's own template (personal skill) must look like before it is saved. */
export interface VorlageDraft {
  /** Short name in plain words, e.g. "Vokabeltest 11a". Becomes the folder name. */
  titel: string;
  /** When to use it and when not. This text decides whether the assistant picks the template by itself. */
  beschreibung: string;
  /** The instructions, as Markdown. */
  anleitung: string;
}

const personalDir = () => join(dataDir(), "Skills");

const FOLD: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
/** "Vokabeltest für die 11a" becomes "vokabeltest-fuer-die-11a". */
export function vorlagenName(titel: string): string {
  return titel
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => FOLD[c]!)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * The checklist from docs/skills.md. Returns problems in plain words, one per rule that is not met.
 * `knownTools` are the tools the assistant has, so instructions cannot name tools that do not exist.
 */
export function checkVorlage(draft: VorlageDraft, knownTools: string[]): string[] {
  const problems: string[] = [];
  const name = vorlagenName(draft.titel);
  if (!name) problems.push("Der Name fehlt oder besteht nur aus Sonderzeichen.");
  const d = draft.beschreibung.trim();
  if (d.length < 60) problems.push("Die Beschreibung ist zu kurz. Sie soll sagen, was die Vorlage macht und bei welchen Wünschen sie greift (mit den Wörtern, die Lehrkräfte wirklich benutzen).");
  if (d.length > 1000) problems.push("Die Beschreibung ist zu lang. Höchstens etwa 1000 Zeichen.");
  if (!/nicht für/i.test(d)) problems.push("Die Beschreibung sagt nicht, wofür die Vorlage nicht gedacht ist (zum Beispiel „Nicht für Klausuren“). Das verhindert, dass zwei Vorlagen gleichzeitig greifen.");
  if (/\n/.test(d)) problems.push("Die Beschreibung muss in einer Zeile stehen.");
  const a = draft.anleitung.trim();
  if (a.length < 200) problems.push("Die Anleitung ist zu kurz, um verlässlich zu sein. Sie braucht einen Ablauf in Schritten.");
  if (a.length > 9000) problems.push("Die Anleitung ist zu lang. Kürze sie auf das Wesentliche, höchstens etwa 9000 Zeichen.");
  if (a.startsWith("---")) problems.push("Die Anleitung darf nicht mit einem Kopfbereich beginnen, der wird beim Speichern angelegt.");
  const unknown = [...new Set([...a.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((m) => m[1]!))].filter((t) => !knownTools.includes(t));
  if (unknown.length) problems.push(`Die Anleitung nennt Werkzeuge, die es nicht gibt: ${unknown.join(", ")}.`);
  if (/\b(Schüler|Schülerin)\s+[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+/.test(a)) problems.push("In der Anleitung scheint ein Name von Schülerinnen oder Schülern zu stehen. Es dürfen keine Namen vorkommen.");
  return problems;
}

/** Saves a personal template. Returns the internal name and whether it is new, changed, or shadows a bundled one. */
export async function saveVorlage(draft: VorlageDraft, knownTools: string[]): Promise<{ name: string; art: "neu" | "geaendert" | "ersetzt-mitgelieferte" }> {
  const problems = checkVorlage(draft, knownTools);
  if (problems.length) throw new SkillError(`Die Vorlage ist noch nicht in Ordnung:\n- ${problems.join("\n- ")}`);
  const name = vorlagenName(draft.titel);
  const existing = (await listSkills()).skills.find((s) => s.name === name);
  const dir = join(personalDir(), name);
  await mkdir(dir, { recursive: true });
  const text = `---\nname: ${name}\ntitle: ${draft.titel.trim().replace(/\s+/g, " ")}\ndescription: ${draft.beschreibung.trim().replace(/^["']+/, "")}\n---\n\n${draft.anleitung.trim()}\n`;
  await writeFile(join(dir, "SKILL.md"), text);
  return { name, art: !existing ? "neu" : existing.level === "mitgeliefert" ? "ersetzt-mitgelieferte" : "geaendert" };
}

/** Finds a template by its name or by the title the teacher knows it under ("Vokabeltest 11a"). */
async function findVorlage(nameOrTitle: string) {
  const want = nameOrTitle.trim().toLowerCase();
  const slug = vorlagenName(nameOrTitle);
  return (await listSkills()).skills.find((s) => s.name === want || s.name === slug || s.title.toLowerCase() === want);
}

/** Removes a personal template. A bundled template of the same name is never touched, and comes back into use. */
export async function deleteVorlage(name: string): Promise<void> {
  const skill = await findVorlage(name);
  if (!skill || skill.level !== "persönlich") throw new SkillError("Diese Vorlage ist nicht deine eigene und kann nicht gelöscht werden.");
  await rm(skill.dir, { recursive: true, force: true });
}

/** The saved instructions of a personal template, for improving it. */
export async function readVorlage(name: string): Promise<string> {
  const skill = await findVorlage(name);
  if (!skill) throw new SkillError(`Die Vorlage „${name}“ gibt es nicht.`);
  return readFile(join(skill.dir, "SKILL.md"), "utf8");
}

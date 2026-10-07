import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir } from "../paths.ts";

/**
 * Skill loader after the Agent Skills format (a folder with SKILL.md, optional references/, assets/, scripts/).
 * Levels, later wins on equal names: bundled with the program < school (later) < personal.
 */
export type SkillLevel = "mitgeliefert" | "persönlich";

export interface SkillInfo {
  name: string;
  /** Name as the teacher reads it, e.g. "Verständnis-Check". Falls back to the name. */
  title: string;
  description: string;
  level: SkillLevel;
  dir: string;
}

export interface SkillProblem {
  dir: string;
  problem: string;
}

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const bundledDir = () => process.env.PULT_SKILLS ?? fileURLToPath(new URL("../../../skills", import.meta.url));
const personalDir = () => join(dataDir(), "Skills");

/** Reads the small YAML header: `key: value`, quoted values, and indented continuation lines. */
export function parseSkillFile(text: string): { meta: Record<string, string>; body: string } | undefined {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return undefined;
  const meta: Record<string, string> = {};
  let key: string | undefined;
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1]!;
      const v = kv[2]!.trim();
      meta[key] = v === ">" || v === "|" || v === ">-" || v === "|-" ? "" : v.replace(/^(["'])(.*)\1$/, "$2");
    } else if (key && /^\s+\S/.test(line)) {
      meta[key] = `${meta[key]} ${line.trim()}`.trim();
    }
  }
  return { meta, body: m[2]!.trim() };
}

async function scan(root: string, level: SkillLevel, found: Map<string, SkillInfo>, problems: SkillProblem[]) {
  let entries: string[];
  try {
    entries = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return;
  }
  for (const folder of entries.sort()) {
    const dir = join(root, folder);
    let text: string;
    try {
      text = await readFile(join(dir, "SKILL.md"), "utf8");
    } catch {
      continue; // not a skill folder
    }
    const parsed = parseSkillFile(text);
    const name = parsed?.meta.name;
    const description = parsed?.meta.description;
    if (!parsed) problems.push({ dir, problem: "SKILL.md hat keinen Kopfbereich." });
    else if (!name || !NAME.test(name) || name.length > 64 || name !== folder) problems.push({ dir, problem: "Der Name fehlt oder passt nicht zum Ordner." });
    else if (!description || description.length > 1024) problems.push({ dir, problem: "Die Beschreibung fehlt oder ist zu lang." });
    else found.set(name, { name, title: parsed.meta.title?.trim() || name, description, level, dir });
  }
}

export async function listSkills(): Promise<{ skills: SkillInfo[]; problems: SkillProblem[] }> {
  const found = new Map<string, SkillInfo>();
  const problems: SkillProblem[] = [];
  await scan(bundledDir(), "mitgeliefert", found, problems);
  await scan(personalDir(), "persönlich", found, problems); // overrides bundled skills of the same name
  return { skills: [...found.values()].sort((a, b) => a.name.localeCompare(b.name)), problems };
}

export class SkillError extends Error {}

async function findSkill(name: string): Promise<SkillInfo> {
  const skill = (await listSkills()).skills.find((s) => s.name === name.trim());
  if (!skill) throw new SkillError(`Die Anleitung „${name}“ gibt es nicht.`);
  return skill;
}

const SUBFOLDERS = ["references", "assets", "scripts"];

async function filesIn(dir: string, sub: string): Promise<string[]> {
  try {
    const out: string[] = [];
    for (const e of await readdir(join(dir, sub), { withFileTypes: true })) if (e.isFile()) out.push(`${sub}/${e.name}`);
    return out.sort();
  } catch {
    return [];
  }
}

/** Full instructions of one skill plus the names of its extra files. Extra files are read only when needed. */
export async function loadSkill(name: string): Promise<{ info: SkillInfo; body: string; files: string[] }> {
  const info = await findSkill(name);
  const parsed = parseSkillFile(await readFile(join(info.dir, "SKILL.md"), "utf8"));
  const files = (await Promise.all(SUBFOLDERS.map((s) => filesIn(info.dir, s)))).flat();
  return { info, body: parsed?.body ?? "", files };
}

/** Reads one file inside references/ or assets/. Anything outside the skill folder is refused. */
export async function readSkillFile(name: string, relative: string): Promise<string> {
  const info = await findSkill(name);
  const [top] = relative.split("/");
  if (!top || !["references", "assets"].includes(top)) throw new SkillError("Aus diesem Ordner darf ich nichts lesen.");
  let base: string;
  let target: string;
  try {
    base = await realpath(join(info.dir, top));
    target = await realpath(resolve(info.dir, relative));
  } catch {
    throw new SkillError(`Die Datei „${relative}“ gibt es nicht.`);
  }
  if (!target.startsWith(base + sep) || !(await stat(target)).isFile()) throw new SkillError("Diese Datei darf ich nicht lesen.");
  return readFile(target, "utf8");
}

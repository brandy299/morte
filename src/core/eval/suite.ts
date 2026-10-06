import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv } from "./csv.ts";
import type { Criterion, EvalCase } from "./types.ts";

const HEADER = ["ID", "Gruppe", "Kriterium", "Bestanden wenn", "Hinweis", "Bedingung", "Prüfart"];

export async function loadCriteria(file: string): Promise<Criterion[]> {
  const rows = parseCsv(await readFile(file, "utf8"));
  const head = rows.shift() ?? [];
  if (HEADER.some((h, i) => head[i]?.trim() !== h)) throw new Error(`${file}: Die Kopfzeile muss lauten: ${HEADER.join(",")}`);
  return rows.map((r, n) => {
    const [id, gruppe, kriterium, bestandenWenn, hinweis = "", bedingung = "", art = "Prüfer"] = r.map((f) => f.trim());
    if (!id || !gruppe || !kriterium || !bestandenWenn) throw new Error(`${file}, Zeile ${n + 2}: ID, Gruppe, Kriterium und „Bestanden wenn“ müssen ausgefüllt sein.`);
    if (!["Programm", "Prüfer"].includes(art)) throw new Error(`${file}, Zeile ${n + 2}: Prüfart muss „Programm“ oder „Prüfer“ sein.`);
    return { id, gruppe, kriterium, bestandenWenn, hinweis, bedingung, art: art as Criterion["art"] };
  });
}

export interface Suite {
  skill: string;
  /** Criteria for all skills first, then the skill's own. */
  kriterien: Criterion[];
  faelle: EvalCase[];
}

/** Reads `evals/gemeinsam.csv` and, per skill, `evals/<skill>/kriterien.csv` and `evals/<skill>/testsaetze.json`. */
export async function loadSuites(dir: string, only?: string[]): Promise<Suite[]> {
  const shared = await loadCriteria(join(dir, "gemeinsam.csv"));
  const suites: Suite[] = [];
  for (const e of (await readdir(dir, { withFileTypes: true })).filter((x) => x.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name === "ergebnisse" || (only?.length && !only.includes(e.name))) continue;
    const own = await loadCriteria(join(dir, e.name, "kriterien.csv"));
    const cases = JSON.parse(await readFile(join(dir, e.name, "testsaetze.json"), "utf8")) as Omit<EvalCase, "skill">[];
    const ids = new Set<string>();
    for (const c of [...shared, ...own]) {
      if (ids.has(c.id)) throw new Error(`${e.name}: Die Kennung ${c.id} kommt doppelt vor.`);
      ids.add(c.id);
    }
    for (const c of cases) if (!c.id || !Array.isArray(c.nachrichten) || c.nachrichten.length === 0) throw new Error(`${e.name}: Ein Testsatz braucht id und mindestens eine Nachricht.`);
    suites.push({ skill: e.name, kriterien: [...shared, ...own], faelle: cases.map((c) => ({ ...c, skill: e.name, erwartet: c.erwartet ?? {} })) });
  }
  return suites;
}

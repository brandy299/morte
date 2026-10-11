import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listSkills } from "../skills/index.ts";
import { fragenTool } from "./fragen.ts";
import { tools as fixedTools } from "./tools.ts";

// The question tool is added by the session (it needs the screen), so it is not in the fixed list.
const tools = [...fixedTools, fragenTool(async () => undefined) as (typeof fixedTools)[number]];

/** Guards the skills that come with the program: they load, and every tool they name exists with the parameters they mention. */
describe("bundled skills", () => {
  it("all load without problems", async () => {
    delete process.env.PULT_SKILLS;
    const { skills, problems } = await listSkills();
    expect(problems).toEqual([]);
    expect(skills.filter((s) => s.level === "mitgeliefert").map((s) => s.name).sort()).toEqual(
      ["arbeitsblatt", "bewertung", "differenzieren", "erklaerstueck", "foto-nachbauen", "klausur", "lernsituation", "praesentation", "stunde-planen", "stunde-vorbereiten", "uebung", "verstaendnis-check", "vorlage-bauen"],
    );
  });

  it("only name tools and parameters that exist", async () => {
    const byName = new Map(tools.map((t) => [t.name, t]));
    const { skills } = await listSkills();
    for (const skill of skills.filter((s) => s.level === "mitgeliefert")) {
      const text = await readFile(join(skill.dir, "SKILL.md"), "utf8");
      for (const [, name] of text.matchAll(/`([a-z]+_[a-z_]+)`/g)) {
        const tool = byName.get(name!);
        // Snake case names in backticks are tools, except parameter names inside tools, which are checked below.
        if (!tool && !allParameters(tools).has(name!)) throw new Error(`Der Skill „${skill.name}“ nennt „${name}“, das es nicht gibt.`);
      }
      for (const [, name] of text.matchAll(/`([a-z]+)`/g)) {
        if (/^(hilfe|loesung|zeilen|niveau|dauer|reihe|datum|stunde)$/.test(name!)) expect(allParameters(tools).has(name!), `${skill.name}: ${name}`).toBe(true);
      }
    }
  });
});

function allParameters(list: typeof tools): Set<string> {
  const names = new Set<string>();
  const walk = (schema: any) => {
    if (!schema || typeof schema !== "object") return;
    for (const [key, value] of Object.entries<any>(schema.properties ?? {})) {
      names.add(key);
      walk(value);
    }
    walk(schema.items);
  };
  for (const t of list) walk(t.parameters);
  return names;
}

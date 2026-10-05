import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { listSkills, loadSkill, parseSkillFile, readSkillFile, SkillError } from "./index.ts";

let bundled: string;
let home: string;

async function skill(root: string, name: string, description = "Tut etwas. Nicht für anderes.", body = "Anleitung.") {
  await mkdir(join(root, name, "references"), { recursive: true });
  await writeFile(join(root, name, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\n${body}\n`);
  await writeFile(join(root, name, "references", "regeln.md"), "Regel 1");
}

beforeEach(async () => {
  bundled = await mkdtemp(join(tmpdir(), "morte-bundled-"));
  home = await mkdtemp(join(tmpdir(), "morte-home-"));
  process.env.MORTE_SKILLS = bundled;
  process.env.MORTE_HOME = home;
});

describe("parseSkillFile", () => {
  it("reads quoted and folded values", () => {
    const r = parseSkillFile(`---\nname: a-b\ndescription: >\n  Erste Zeile\n  zweite Zeile\nother: "x y"\n---\nText`)!;
    expect(r.meta).toEqual({ name: "a-b", description: "Erste Zeile zweite Zeile", other: "x y" });
    expect(r.body).toBe("Text");
  });
  it("rejects a file without header", () => expect(parseSkillFile("Nur Text")).toBeUndefined());
});

describe("skills", () => {
  it("lists bundled skills and lets a personal one override by name", async () => {
    await skill(bundled, "arbeitsblatt", "Mitgeliefert.");
    await skill(bundled, "klausur");
    await skill(join(home, "Skills"), "arbeitsblatt", "Meine Version.");
    const { skills } = await listSkills();
    expect(skills.map((s) => [s.name, s.level, s.description])).toEqual([
      ["arbeitsblatt", "persönlich", "Meine Version."],
      ["klausur", "mitgeliefert", "Tut etwas. Nicht für anderes."],
    ]);
  });

  it("skips broken skills and reports why", async () => {
    await mkdir(join(bundled, "kaputt"), { recursive: true });
    await writeFile(join(bundled, "kaputt", "SKILL.md"), "---\nname: anders\ndescription: x\n---\n");
    const { skills, problems } = await listSkills();
    expect(skills).toEqual([]);
    expect(problems[0]!.problem).toContain("Name");
  });

  it("loads instructions and the list of extra files, then reads a reference on demand", async () => {
    await skill(bundled, "klausur", "Klausur bauen.", "Schritt 1");
    const loaded = await loadSkill("klausur");
    expect(loaded.body).toBe("Schritt 1");
    expect(loaded.files).toEqual(["references/regeln.md"]);
    expect(await readSkillFile("klausur", "references/regeln.md")).toBe("Regel 1");
  });

  it("refuses paths outside the skill folder", async () => {
    await skill(bundled, "klausur");
    await writeFile(join(home, "geheim.txt"), "geheim");
    await symlink(join(home, "geheim.txt"), join(bundled, "klausur", "references", "link.md"));
    await expect(readSkillFile("klausur", "../../../x")).rejects.toBeInstanceOf(SkillError);
    await expect(readSkillFile("klausur", "references/../SKILL.md")).rejects.toBeInstanceOf(SkillError);
    await expect(readSkillFile("klausur", "references/link.md")).rejects.toBeInstanceOf(SkillError);
    await expect(readSkillFile("klausur", "scripts/run.sh")).rejects.toBeInstanceOf(SkillError);
  });
});

describe("bundled skills", () => {
  it("are all valid and have a description that says what they are not for", async () => {
    delete process.env.MORTE_SKILLS;
    const { skills, problems } = await listSkills();
    expect(problems).toEqual([]);
    expect(skills.map((s) => s.name)).toContain("arbeitsblatt");
    for (const s of skills) expect(s.description).toMatch(/[Nn]icht für/);
  });
});

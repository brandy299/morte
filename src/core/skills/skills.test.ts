import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { listSkills, loadSkill, parseSkillFile, readSkillFile, SkillError } from "./index.ts";
import { checkVorlage, deleteVorlage, readVorlage, saveVorlage, vorlagenName } from "./personal.ts";

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

describe("personal templates", () => {
  const draft = {
    titel: "Vokabeltest für die 11a",
    beschreibung: "Erstellt einen kurzen Vokabeltest mit Lösungsblatt im Aufbau unserer Fachschaft. Nutze es bei Wünschen wie „Vokabeltest“ oder „Vokabeln abfragen“. Nicht für Klausuren.",
    anleitung: "# Vokabeltest\n\n1. Frag nach der Unit und der Anzahl der Wörter, höchstens zwei Rückfragen.\n2. Schreibe zehn Aufgaben: fünf Übersetzungen, drei Lückensätze, zwei Zuordnungen.\n3. Erstelle den Test mit `arbeitsblatt_erstellen` und gib bei jeder Aufgabe die Lösung an.\n4. Sag in einem Satz, was die Lehrkraft bekommt.\nDie Aufgaben gehen von leicht nach schwer und passen auf eine Seite.",
  };
  const tools = ["arbeitsblatt_erstellen", "skill_laden"];

  it("makes a safe name from a title with umlauts", () => {
    expect(vorlagenName("Vokabeltest für die 11a!")).toBe("vokabeltest-fuer-die-11a");
    expect(vorlagenName("***")).toBe("");
  });

  it("saves a good template that is found and loaded like any other, and can be changed and deleted", async () => {
    expect(await saveVorlage(draft, tools)).toEqual({ name: "vokabeltest-fuer-die-11a", art: "neu" });
    const found = (await listSkills()).skills.find((s) => s.name === "vokabeltest-fuer-die-11a");
    expect(found).toMatchObject({ level: "persönlich", description: expect.stringContaining("Nicht für Klausuren") });
    expect((await loadSkill("vokabeltest-fuer-die-11a")).body).toContain("Schreibe zehn Aufgaben");
    expect((await saveVorlage({ ...draft, anleitung: `${draft.anleitung}\nNeue Regel.` }, tools)).art).toBe("geaendert");
    expect(await readVorlage("vokabeltest-fuer-die-11a")).toContain("Neue Regel.");
    expect(await readVorlage("Vokabeltest für die 11a")).toContain("Neue Regel."); // the title works as well as the name
    await deleteVorlage("vokabeltest-fuer-die-11a");
    expect((await listSkills()).skills.find((s) => s.name === "vokabeltest-fuer-die-11a")).toBeUndefined();
  });

  it("names every rule that is broken, in plain words", async () => {
    const problems = checkVorlage({ titel: "x", beschreibung: "Zu kurz", anleitung: "Kurz. Nutze `gibt_es_nicht`." }, tools);
    expect(problems.join(" ")).toMatch(/Beschreibung ist zu kurz/);
    expect(problems.join(" ")).toMatch(/Anleitung ist zu kurz/);
    expect(problems.join(" ")).toMatch(/gibt_es_nicht/);
    await expect(saveVorlage({ ...draft, beschreibung: draft.beschreibung.replace("Nicht für Klausuren.", "") }, tools)).rejects.toThrow(/wofür die Vorlage nicht gedacht ist/);
  });

  it("only deletes the teacher's own templates, and a copy of a bundled one gives way again", async () => {
    await skill(bundled, "arbeitsblatt");
    await expect(deleteVorlage("arbeitsblatt")).rejects.toThrow(/nicht deine eigene/);
    expect((await saveVorlage({ ...draft, titel: "arbeitsblatt" }, tools)).art).toBe("ersetzt-mitgelieferte");
    expect((await listSkills()).skills.find((s) => s.name === "arbeitsblatt")?.level).toBe("persönlich");
    await deleteVorlage("arbeitsblatt");
    expect((await listSkills()).skills.find((s) => s.name === "arbeitsblatt")?.level).toBe("mitgeliefert");
  });
});

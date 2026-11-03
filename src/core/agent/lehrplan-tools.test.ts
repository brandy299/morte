import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { assignLehrplan, saveLehrplan } from "../lehrplan/store.ts";
import { createClass } from "../workspace/index.ts";
import { tools } from "./tools.ts";

const run = async (name: string, args: object) => {
  const tool = tools.find((t) => t.name === name)!;
  const result = await tool.execute("id", args as never);
  return (result.content[0] as { text: string }).text;
};

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "morte-lpt-"));
  await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
});

describe("curriculum tools", () => {
  it("tells honestly when a class has no plan", async () => {
    expect(await run("lehrplan_lesen", { klasse: "11a" })).toMatch(/kein Lehrplan hinterlegt/);
    expect(await run("lehrplan_suchen", { klasse: "11a", suche: "Bewerbung" })).toMatch(/kein Lehrplan hinterlegt/);
  });

  it("gives the outline first, then one section, and finds words", async () => {
    await saveLehrplan("HHS", "## 1 Ziele\nKommunikation.\n\n## 2 Themen\n### 2.1 Work\nBewerbung und Interview.", { file: "a.pdf" });
    await assignLehrplan("HHS", ["11a"]);
    const gliederung = await run("lehrplan_lesen", { klasse: "11a" });
    expect(gliederung).toContain("Lehrplan „HHS“");
    expect(gliederung).toMatch(/2\.\s+1 Ziele/);
    expect(await run("lehrplan_lesen", { klasse: "11a", abschnitt: 4 })).toContain("Bewerbung und Interview");
    expect(await run("lehrplan_suchen", { klasse: "11a", suche: "interview" })).toMatch(/\[Abschnitt 4: HHS › 2 Themen › 2.1 Work\]/);
  });

  it("is a reading tool: no question is asked", () => {
    expect(tools.find((t) => t.name === "lehrplan_lesen")!.ask).toBeUndefined();
  });
});

describe("exam rules given in the request", () => {
  it("are checked like saved rules", async () => {
    const exam = {
      klasse: "11a", titel: "T",
      aufgaben: [{ teile: [{ text: "Nenne.", punkte: 4, erwartung: "x" }] }],
    };
    await expect(run("klausur_erstellen", { ...exam, notenschluessel: [{ note: "1", abProzent: 50 }, { note: "2", abProzent: 80 }] })).rejects.toThrow(/kleiner werden/);
    await expect(run("klausur_erstellen", { ...exam, bereiche: [{ kurz: "I" }, { kurz: "i" }] })).rejects.toThrow(/gleich/);
  });
});

describe("rueckmeldung_erstellen", () => {
  it("counts the points itself, uses the class scale only as a hint and asks nothing", async () => {
    const { writeBewertung } = await import("../workspace/bewertung.ts");
    await writeBewertung("HHS", ["11a"], { bereiche: [], notenschluessel: [{ note: "1", abProzent: 87 }, { note: "2", abProzent: 73 }, { note: "3", abProzent: 59 }, { note: "4", abProzent: 45 }, { note: "5", abProzent: 18 }, { note: "6", abProzent: 0 }] });
    const out = await run("rueckmeldung_erstellen", {
      titel: "Rückmeldung", klasse: "11a",
      kriterien: [{ name: "Inhalt", max: 10, erreicht: 7.5 }, { name: "Sprache", max: 10, erreicht: 6 }],
      befunde: [{ abschnitt: "Absatz 1", art: "Grammatik", erklaerung: "Zeitform." }],
    });
    expect(out).toContain("13.5 von 20"); // program-side sum
    expect(out).toContain("Note 3");
    expect(out).toMatch(/die Note legt die Lehrkraft fest/);
    expect(tools.find((t) => t.name === "rueckmeldung_erstellen")!.ask).toBeUndefined();
  });
});

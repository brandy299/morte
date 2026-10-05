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
  process.env.MORTE_HOME = await mkdtemp(join(tmpdir(), "morte-lpt-"));
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

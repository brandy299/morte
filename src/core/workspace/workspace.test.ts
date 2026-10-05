import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createClass, createReihe, initWorkspace, listTree, materialLuecken, readKlasse, readReihe, readStand,
  setStunde, UserError, writeStand,
} from "./index.ts";

let home: string;
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "morte-test-"));
  process.env.MORTE_HOME = home;
  await initWorkspace();
  await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
});

describe("workspace", () => {
  it("creates the top-level folders and a class with Klasse.md and Stand.md per subject", async () => {
    expect(await readdir(home)).toEqual(expect.arrayContaining(["Klassen", "Lehrpläne", "Einstellungen", "Exporte"]));
    expect(await readKlasse("11a")).toContain("Schulform: Berufskolleg");
    expect(await readStand("11a", "Business English")).toContain("# Stand: 11a · Business English");
  });

  it("rejects duplicate classes and unsafe names", async () => {
    await expect(createClass({ name: "11a", schulform: "Gymnasium", stufe: "11", faecher: ["x"] })).rejects.toBeInstanceOf(UserError);
    await expect(createClass({ name: "../evil", schulform: "Gymnasium", stufe: "5", faecher: ["x"] })).rejects.toBeInstanceOf(UserError);
    await expect(readKlasse("../Einstellungen")).rejects.toBeInstanceOf(UserError);
  });

  it("numbers Reihen and keeps the lesson table in Reihe.md", async () => {
    expect(await createReihe("11a", "Business English", { thema: "Bewerbung", lernfeld: "LF 3" })).toBe("01 Bewerbung");
    expect(await createReihe("11a", "business english", { thema: "Meetings" })).toBe("02 Meetings");
    await setStunde("11a", "Business English", "Bewerbung", { datum: "12.10.", stunde: "Mo 1", thema: "Lebenslauf", material: "Arbeitsblatt-Lebenslauf.pdf", status: "gehalten" });
    await setStunde("11a", "Business English", "01 Bewerbung", { datum: "14.10.", stunde: "Mi 3", thema: "Interview" });
    const md = await readReihe("11a", "Business English", "Bewerbung");
    expect(md).toContain("| 12.10. | Mo 1 | Lebenslauf | Arbeitsblatt-Lebenslauf.pdf | gehalten |");
    expect(md).toContain("| 14.10. | Mi 3 | Interview |  | geplant |");
    expect(md).toContain("## Notizen");
  });

  it("updates an existing lesson instead of adding a second row", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "Mi 3", thema: "Interview" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "Mi 3", material: "Rollenspiel.pdf", status: "Material fertig" });
    const md = await readReihe("11a", "Business English", "Bewerbung");
    expect(md.match(/Interview/g)).toHaveLength(1);
    expect(md).toContain("| 14.10. | Mi 3 | Interview | Rollenspiel.pdf | Material fertig |");
  });

  it("only accepts the fixed status words", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    await expect(setStunde("11a", "Business English", "Bewerbung", { datum: "1.", stunde: "1", status: "erledigt" })).rejects.toBeInstanceOf(UserError);
  });

  it("finds lessons without material, but not held ones", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "12.10.", stunde: "Mo 1", thema: "Lebenslauf", status: "gehalten" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "Mi 3", thema: "Interview" });
    const gaps = await materialLuecken("11a");
    expect(gaps).toEqual([expect.objectContaining({ datum: "14.10.", thema: "Interview", reihe: "01 Bewerbung" })]);
    const tree = await listTree();
    expect(tree[0]!.faecher[0]!.reihen[0]).toMatchObject({ stunden: 2, gehalten: 1, ohneMaterial: 1 });
  });

  it("overwrites Stand.md and keeps it short", async () => {
    await writeStand("11a", "Business English", { aktuelleReihe: "01 Bewerbung", offen: Array.from({ length: 20 }, (_, i) => `Punkt ${i}`) });
    await writeStand("11a", "Business English", { aktuelleReihe: "02 Meetings", offen: ["Wortschatz"] });
    const stand = await readFile(join(home, "Klassen", "11a", "Business English", "Stand.md"), "utf8");
    expect(stand).toContain("Aktuelle Reihe: 02 Meetings");
    expect(stand).not.toContain("01 Bewerbung");
    expect(stand.match(/^- /gm)).toHaveLength(1);
  });
});

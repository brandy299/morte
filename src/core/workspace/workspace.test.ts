import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createClass, createReihe, initWorkspace, listTree, materialLuecken, readKlasse, readReihe, readStand,
  setStunde, UserError, writeStand, saveMaterial, attachMaterial, materialFile, hasLehrplan,
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

  it("saves material into the Reihe folder with a sorted name and never overwrites", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    const where = { art: "Arbeitsblatt", titel: "Interview Basics!", klasse: "11a", fach: "Business English", reihe: "Bewerbung", datum: "14.10.", stunde: "Mi 3" };
    const a = await saveMaterial(Buffer.from("%PDF-1"), where);
    const b = await saveMaterial(Buffer.from("%PDF-2"), where);
    expect(a.name).toMatch(/^\d{4}-10-14_Mi3_Arbeitsblatt-Interview-Basics\.pdf$/);
    expect(b.name).toMatch(/-2\.pdf$/);
    expect(a.path).toBe(`Klassen/11a/Business English/01 Bewerbung/Material/${a.name}`);
    expect(await materialFile(a.path)).toBeTruthy();
  });

  it("falls back to Exporte without a Reihe", async () => {
    const m = await saveMaterial(Buffer.from("x"), { art: "Arbeitsblatt", titel: "Test" });
    expect(m.path.startsWith("Exporte/")).toBe(true);
  });

  it("enters material in the table and keeps the status 'gehalten'", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "12.10.", stunde: "Mo 1", thema: "Lebenslauf", status: "gehalten" });
    await attachMaterial("11a", "Business English", "Bewerbung", { datum: "12.10.", stunde: "Mo 1" }, "a.pdf");
    await attachMaterial("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "Mi 3", thema: "Interview" }, "b.pdf");
    const md = await readReihe("11a", "Business English", "Bewerbung");
    expect(md).toContain("| 12.10. | Mo 1 | Lebenslauf | a.pdf | gehalten |");
    expect(md).toContain("| 14.10. | Mi 3 | Interview | b.pdf | Material fertig |");
  });

  it("keeps the planned topic when a file is attached to an existing lesson", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "Mi 3", thema: "Vorstellungsgespräch" });
    await attachMaterial("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "Mi 3", thema: "Arbeitsblatt Interview" }, "b.pdf");
    expect(await readReihe("11a", "Business English", "Bewerbung")).toContain("| 14.10. | Mi 3 | Vorstellungsgespräch | b.pdf | Material fertig |");
  });

  it("finds the planned row by date when the lesson name is not given", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    // A planned row from the series planning has a date and a topic but no lesson name yet.
    await setStunde("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "x", thema: "Interview" });
    const file = join(home, "Klassen", "11a", "Business English", "01 Bewerbung", "Reihe.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("| 14.10. | x |", "| 14.10. |  |"));
    await attachMaterial("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "", thema: "Blatt" }, "b.pdf");
    const md = await readReihe("11a", "Business English", "Bewerbung");
    expect(md).toContain("| 14.10. |  | Interview | b.pdf | Material fertig |");
    expect(md.match(/\| 14\.10\./g)).toHaveLength(1);
  });

  it("does not create a second class or subject that differs only in case", async () => {
    await expect(createClass({ name: "11A", schulform: "Gymnasium", stufe: "11", faecher: ["x"] })).rejects.toThrow(/gibt es schon/);
    await createClass({ name: "9c", schulform: "Gymnasium", stufe: "9", faecher: ["Englisch", "englisch", "ENGLISCH"] });
    expect((await readKlasse("9c")).match(/^Fächer: (.*)$/m)![1]).toBe("Englisch");
  });

  it("only serves PDFs from Klassen and Exporte", async () => {
    expect(await materialFile("../../etc/passwd.pdf")).toBeUndefined();
    expect(await materialFile("Einstellungen/.zugang.pdf")).toBeUndefined();
    expect(await materialFile("Klassen/11a/Klasse.md")).toBeUndefined();
    expect(await materialFile("Klassen/../Einstellungen/x.pdf")).toBeUndefined();
  });

  it("knows whether a Lehrplan is named", async () => {
    expect(await hasLehrplan("11a")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { artLabel, artOf, filterFiles, formatSize, groupFiles, showName, showReihe, type MaterialDatei } from "./materialListe.ts";

const f = (klasse: string, reihe: string, name: string, fach = "Wirtschaft"): MaterialDatei => ({ klasse, fach, reihe, name, path: `Klassen/${klasse}/${fach}/${reihe}/Material/${name}`, size: 10, modified: "2026-10-01T10:00:00Z" });
const files = [
  f("11a", "01 Kreislauf", "2026-10-14_Mi0945_Arbeitsblatt-Kreislauf.pdf"),
  f("11a", "01 Kreislauf", "Arbeitsblatt-Kreislauf.docx"),
  f("11a", "01 Kreislauf", "Arbeitsblatt-Kreislauf-Loesung.pdf"),
  f("12b", "03 Bürgschaft", "Klausur.pdf", "Recht"),
  f("11a", "02 Märkte", "Folien.pptx"),
  f("11a", "02 Märkte", "Skizze.png"),
];

describe("material overview helpers", () => {
  it("names kinds by ending", () => {
    expect([artOf("a.PDF"), artOf("a.docx"), artOf("a.odt"), artOf("a.jpeg"), artOf("a.pptx"), artOf("a")]).toEqual(["pdf", "word", "word", "bild", "sonst", "sonst"]);
    expect([artLabel("a.pdf"), artLabel("a.pptx"), artLabel("a")]).toEqual(["PDF", "PPTX", "Datei"]);
  });

  it("hides the date prefix and the sort number", () => {
    expect(showName("2026-10-14_Mi0945_Folien-Interview.pptx")).toBe("Folien-Interview.pptx");
    expect(showName("Folien.pptx")).toBe("Folien.pptx");
    expect(showReihe("01 Bewerbung")).toBe("Bewerbung");
  });

  it("formats sizes", () => {
    expect([formatSize(12), formatSize(2048), formatSize(3.5 * 1024 * 1024)]).toEqual(["12 Byte", "2 KB", "3,5 MB"]);
  });

  it("filters by class and kind, and by every search word without caring for case or umlauts", () => {
    expect(filterFiles(files, { klasse: "12b" }).map((x) => x.name)).toEqual(["Klausur.pdf"]);
    expect(filterFiles(files, { art: "word" }).map((x) => x.name)).toEqual(["Arbeitsblatt-Kreislauf.docx"]);
    expect(filterFiles(files, { suche: "burgschaft" }).map((x) => x.name)).toEqual(["Klausur.pdf"]);
    expect(filterFiles(files, { suche: "KREISLAUF 11a" })).toHaveLength(3);
    expect(filterFiles(files, { suche: "recht klausur" })).toHaveLength(1);
    expect(filterFiles(files, { suche: "gibtesnicht" })).toHaveLength(0);
    expect(filterFiles(files, { art: "alle", suche: "  " })).toHaveLength(6);
  });

  it("does not search in the date prefix", () => {
    expect(filterFiles(files, { suche: "0945" })).toHaveLength(0);
  });

  it("groups by class and subject, then series, in order of first appearance", () => {
    const g = groupFiles(files);
    expect(g.map((x) => `${x.klasse}/${x.fach}`)).toEqual(["11a/Wirtschaft", "12b/Recht"]);
    expect(g[0]!.reihen.map((r) => [r.reihe, r.files.length])).toEqual([["01 Kreislauf", 3], ["02 Märkte", 2]]);
    expect(g[0]!.reihen[0]!.files.map((x) => x.name)).toEqual(["Arbeitsblatt-Kreislauf.docx", "2026-10-14_Mi0945_Arbeitsblatt-Kreislauf.pdf", "Arbeitsblatt-Kreislauf-Loesung.pdf"]);
  });
});

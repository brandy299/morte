import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MaterialError } from "./layout.ts";
import { parseLernsituation, renderLernsituation } from "./lernsituation.ts";

const hasPoppler = (() => {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const pageText = async (pdf: Buffer, p: number) => {
  const file = join(await mkdtemp(join(tmpdir(), "morte-ls-")), "a.pdf");
  await writeFile(file, pdf);
  return execFileSync("pdftotext", ["-f", String(p), "-l", String(p), file, "-"]).toString();
};

const sample = {
  titel: "Bewerbung bei der Nordlicht GmbH", fach: "Business English", klasse: "11a", lernfeld: "LF 3",
  handlungssituation: "Die Nordlicht GmbH sucht eine Assistenz im Einkauf.\n\nIhr wollt euch bewerben.",
  auftrag: "Erstellt eine englische Bewerbung.",
  handlungsprodukt: "Bewerbungsmappe auf Englisch",
  ziele: ["Stellenanzeigen verstehen"],
  ablauf: [
    { thema: "Stellenanzeige auswerten", phase: "Informieren", inhalt: "Anforderungen markieren.", produkt: "Liste", datum: "12.10.", stunde: "Mo 1" },
    { thema: "Lebenslauf", phase: "Planen" },
  ],
};

describe("parseLernsituation", () => {
  it("accepts good content", () => expect(parseLernsituation(sample).ablauf).toHaveLength(2));
  it("needs a situation and at least one lesson", () => {
    expect(() => parseLernsituation({ ...sample, handlungssituation: "" })).toThrow(/Handlungssituation/);
    expect(() => parseLernsituation({ ...sample, ablauf: [] })).toThrow(MaterialError);
    expect(() => parseLernsituation({ ...sample, ablauf: [{ phase: "Planen" }] })).toThrow(/Thema von Stunde 1/);
  });
});

describe("renderLernsituation", () => {
  it("puts only the situation for the students on page 1 and the plan for the teacher after it", async () => {
    if (!hasPoppler) return;
    const { pdf, pages } = await renderLernsituation(parseLernsituation(sample));
    expect(pages).toBe(2);
    const one = await pageText(pdf, 1);
    for (const part of ["Bewerbung bei der Nordlicht GmbH", "Ihr wollt euch bewerben.", "Euer Auftrag", "Bewerbungsmappe auf Englisch"]) expect(one).toContain(part);
    expect(one).not.toContain("Steckbrief");
    const two = await pageText(pdf, 2);
    for (const part of ["Steckbrief", "2 Stunden", "Stellenanzeigen verstehen", "Informieren", "Anforderungen markieren.", "12.10. Mo 1", "Seite 2 von 2"]) expect(two).toContain(part);
  });
});

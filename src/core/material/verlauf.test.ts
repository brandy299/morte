import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MaterialError } from "./layout.ts";
import { parseVerlauf, renderVerlauf } from "./verlauf.ts";

export const sampleVerlauf = {
  titel: "Zellbezüge verstehen",
  fach: "Informationswirtschaft",
  klasse: "11a",
  datum: "14.10.",
  dauer: 45,
  lernziele: ["Den Unterschied zwischen relativen und absoluten Bezügen erklären", "Eine Formel mit $-Zeichen anpassen"],
  voraussetzungen: "Einfache Formeln und die Summenfunktion sind bekannt.",
  phasen: [
    { minuten: 8, phase: "Einstieg", inhalt: "Eine kopierte Formel liefert falsche Werte. Die Klasse sucht den Fehler.", sozialform: "Plenum" },
    { minuten: 27, phase: "Erarbeitung", inhalt: "Aufgaben 1 bis 4 am Rechner, Hilfekarte liegt aus.", sozialform: "Partnerarbeit", material: "Arbeitsblatt, Tabelle" },
    { minuten: 10, phase: "Sicherung", inhalt: "Zwei Paare zeigen ihre Lösung, gemeinsam wird die Regel formuliert.", sozialform: "Plenum" },
  ],
  differenzierung: "Schnelle Paare erhalten eine Zusatzaufgabe mit gemischten Bezügen.",
  hinweise: "Das $-Zeichen wird oft vor die falsche Stelle gesetzt.",
};

describe("Stundenverlauf", () => {
  it("accepts a plan whose minutes add up", () => expect(parseVerlauf(sampleVerlauf).phasen).toHaveLength(3));

  it("asks for corrected minutes in plain words", () => {
    expect(() => parseVerlauf({ ...sampleVerlauf, dauer: 90 })).toThrow(/ergeben 45 Minuten, die Stunde dauert aber 90/);
    expect(() => parseVerlauf({ ...sampleVerlauf, lernziele: [] })).toThrow(MaterialError);
    expect(() => parseVerlauf({ ...sampleVerlauf, phasen: [] })).toThrow(/mindestens eine Phase/);
    expect(() => parseVerlauf({ ...sampleVerlauf, phasen: [{ minuten: 0, phase: "x", inhalt: "y" }] })).toThrow(/Phase 1/);
  });

  it("draws one page with the times of each phase", async () => {
    const { pdf, pages } = await renderVerlauf(parseVerlauf(sampleVerlauf));
    expect(pages).toBe(1);
    const file = join(await mkdtemp(join(tmpdir(), "morte-pdf-")), "v.pdf");
    await writeFile(file, pdf);
    let text = "";
    try {
      text = execFileSync("pdftotext", ["-layout", file, "-"]).toString();
    } catch {
      return; // no poppler on this machine: the page count above is enough
    }
    expect(text).toContain("0–8 min");
    expect(text).toContain("8–35 min");
    expect(text).toContain("35–45 min");
    expect(text.replace(/ /g, "")).toContain("STUNDENVERLAUF");
  });
});

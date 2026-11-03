import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MaterialError } from "./layout.ts";
import { gesamtErreicht, gesamtMax, notenHinweis, parseRueckmeldung, renderRueckmeldung } from "./rueckmeldung.ts";

const schluessel = [{ note: "1", abProzent: 87 }, { note: "2", abProzent: 73 }, { note: "3", abProzent: 59 }, { note: "4", abProzent: 45 }, { note: "5", abProzent: 18 }, { note: "6", abProzent: 0 }];
const sample = {
  titel: "Rückmeldung zur Bewerbung",
  fach: "Business English",
  staerken: ["Klarer Aufbau."],
  kriterien: [
    { name: "Inhalt", max: 10, erreicht: 7.5, begruendung: "Alle Punkte genannt." },
    { name: "Sprache", max: 10, erreicht: 6 },
  ],
  befunde: [{ abschnitt: "Absatz 2", zitat: "I am work since 2020", art: "Grammatik", erklaerung: "Falsche Zeitform.", vorschlag: "I have been working since 2020." }],
  naechsteSchritte: ["Present Perfect üben."],
};

describe("parseRueckmeldung", () => {
  it("sums points in the program", () => {
    const r = parseRueckmeldung(sample, { notenschluessel: schluessel });
    expect(gesamtMax(r)).toBe(20);
    expect(gesamtErreicht(r)).toBe(13.5);
  });

  it("rejects more points than possible, odd steps and unknown kinds", () => {
    expect(() => parseRueckmeldung({ ...sample, kriterien: [{ name: "A", max: 5, erreicht: 6 }] })).toThrow(/über den möglichen/);
    expect(() => parseRueckmeldung({ ...sample, kriterien: [{ name: "A", max: 5, erreicht: 2.3 }] })).toThrow(MaterialError);
    expect(() => parseRueckmeldung({ ...sample, befunde: [{ ...sample.befunde[0], art: "Stil" }] })).toThrow(/Erlaubt sind/);
  });

  it("needs something to say", () => {
    expect(() => parseRueckmeldung({ titel: "X" })).toThrow(/Befunde, Stärken oder Kriterien/);
  });
});

describe("notenHinweis", () => {
  it("finds the grade on the teacher's scale at the edges", () => {
    expect(notenHinweis(17.5, 20, schluessel)).toBe("1"); // 87.5 %
    expect(notenHinweis(17, 20, schluessel)).toBe("2"); // 85 %
    expect(notenHinweis(9, 20, schluessel)).toBe("4"); // 45 % is exactly the border
    expect(notenHinweis(0, 20, schluessel)).toBe("6");
  });

  it("gives nothing without a scale or without points", () => {
    expect(notenHinweis(5, 10, [])).toBeUndefined();
    expect(notenHinweis(0, 0, schluessel)).toBeUndefined();
  });
});

describe("renderRueckmeldung", () => {
  const poppler = (() => { try { execFileSync("pdftotext", ["-v"], { stdio: "ignore" }); return true; } catch { return false; } })();

  it("draws a PDF", async () => {
    const out = await renderRueckmeldung(parseRueckmeldung(sample, { notenschluessel: schluessel }));
    expect(out.pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(out.pages).toBeGreaterThanOrEqual(1);
  });

  it.skipIf(!poppler)("prints the sum, the hint and no name field", async () => {
    const out = await renderRueckmeldung(parseRueckmeldung(sample, { notenschluessel: schluessel }));
    const file = join(await mkdtemp(join(tmpdir(), "pult-r-")), "r.pdf");
    await writeFile(file, out.pdf);
    const t = execFileSync("pdftotext", [file, "-"]).toString();
    expect(t).toContain("13,5 / 20");
    expect(t).toContain("Note 3"); // 67.5 %
    expect(t).toContain("legt die Note fest");
    expect(t).not.toMatch(/Name:/);
  });
});

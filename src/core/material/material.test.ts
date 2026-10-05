import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { arbeitsblattFooter, arbeitsblattHtml, MaterialError, parseArbeitsblatt } from "./arbeitsblatt.ts";
import { pdfAvailable, renderPdf } from "./pdf.ts";

const sample = {
  titel: "Job Interview <Basics>",
  fach: "Business English",
  klasse: "11a",
  einleitung: "Lies den Text und löse die Aufgaben.",
  merkkasten: { titel: "Merke", text: "Im Interview: first impression & clear answers." },
  aufgaben: [
    { text: "Nenne drei typische Fragen.", punkte: 3, zeilen: 3 },
    { text: "Beschreibe deine Stärken.", hilfe: "Nutze „I am good at …“.", zeilen: 4 },
  ],
  fuss: "Ohne hinterlegten Lehrplan erstellt",
};

describe("parseArbeitsblatt", () => {
  it("accepts good content", () => expect(parseArbeitsblatt(sample).aufgaben).toHaveLength(2));
  it("explains problems in plain words", () => {
    expect(() => parseArbeitsblatt({ titel: "x", aufgaben: [] })).toThrow(MaterialError);
    expect(() => parseArbeitsblatt({ aufgaben: [{ text: "a" }] })).toThrow(/Titel/);
    expect(() => parseArbeitsblatt({ titel: "x", aufgaben: [{ text: "a", zeilen: 99 }] })).toThrow(/Schreibzeilen/);
  });
});

describe("arbeitsblattHtml", () => {
  it("escapes everything that comes from the model", () => {
    const html = arbeitsblattHtml(parseArbeitsblatt({ titel: "<script>alert(1)</script>", aufgaben: [{ text: "<img src=x onerror=1>" }] }));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
  });
  it("uses no color, only gray values", () => {
    const colors = arbeitsblattHtml(parseArbeitsblatt(sample)).match(/#[0-9a-fA-F]{3,6}\b/g) ?? [];
    for (const c of colors) {
      const hex = c.length === 4 ? [...c.slice(1)].map((d) => d + d).join("") : c.slice(1);
      expect(hex.slice(0, 2)).toBe(hex.slice(2, 4));
      expect(hex.slice(2, 4)).toBe(hex.slice(4, 6));
    }
  });
});

const hasPoppler = (() => {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!pdfAvailable() || !hasPoppler)("renderPdf", () => {
  it("makes a one-page, gray-only PDF with the content", async () => {
    const a = parseArbeitsblatt(sample);
    const { pdf, pages } = await renderPdf(arbeitsblattHtml(a), arbeitsblattFooter(a));
    expect(pages).toBe(1);
    const dir = await mkdtemp(join(tmpdir(), "morte-pdf-"));
    const file = join(dir, "a.pdf");
    await writeFile(file, pdf);
    const text = execFileSync("pdftotext", [file, "-"]).toString();
    expect(text).toContain("Job Interview <Basics>");
    expect(text).toContain("Nenne drei typische Fragen.");
    expect(text).toContain("Ohne hinterlegten Lehrplan erstellt");
    // Render to pixels: every pixel must have R = G = B.
    const ppm = execFileSync("pdftoppm", ["-r", "40", file], { maxBuffer: 50_000_000 });
    const body = ppm.subarray(ppm.indexOf("\n255\n") + 5);
    let colored = 0;
    for (let i = 0; i + 2 < body.length; i += 3) if (body[i] !== body[i + 1] || body[i + 1] !== body[i + 2]) colored++;
    expect(colored).toBe(0);
  });
});

import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MaterialError, parseArbeitsblatt, printable, renderArbeitsblatt } from "./arbeitsblatt.ts";

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

const tool = (cmd: string) => {
  try {
    execFileSync(cmd, ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const hasPoppler = tool("pdftotext") && tool("pdftoppm");

async function toFile(pdf: Buffer) {
  const file = join(await mkdtemp(join(tmpdir(), "morte-pdf-")), "a.pdf");
  await writeFile(file, pdf);
  return file;
}

describe("parseArbeitsblatt", () => {
  it("accepts good content", () => expect(parseArbeitsblatt(sample).aufgaben).toHaveLength(2));
  it("explains problems in plain words", () => {
    expect(() => parseArbeitsblatt({ titel: "x", aufgaben: [] })).toThrow(MaterialError);
    expect(() => parseArbeitsblatt({ aufgaben: [{ text: "a" }] })).toThrow(/Titel/);
    expect(() => parseArbeitsblatt({ titel: "x", aufgaben: [{ text: "a", zeilen: 99 }] })).toThrow(/Schreibzeilen/);
  });
});

describe("printable", () => {
  it("keeps German text and replaces what the standard fonts cannot draw", () => {
    expect(printable("Größe, Übung, Straße „ja“ – 5 €")).toBe("Größe, Übung, Straße „ja“ - 5 €");
    expect(printable("A → B • C")).toBe("A -> B - C");
    expect(printable("Hi 😀")).toBe("Hi ?");
  });
});

describe("renderArbeitsblatt", () => {
  it("makes a one-page PDF with the content and the footer", async () => {
    const { pdf, pages } = await renderArbeitsblatt(parseArbeitsblatt(sample));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pages).toBe(1);
    if (!hasPoppler) return;
    const text = execFileSync("pdftotext", [await toFile(pdf), "-"]).toString();
    for (const part of ["Job Interview <Basics>", "BUSINESS ENGLISH", "Nenne drei typische Fragen.", "Tipp: Nutze", "3 P.", "Ohne hinterlegten Lehrplan erstellt", "Seite 1 von 1"]) {
      expect(text).toContain(part);
    }
  });

  it("flows onto more pages without adding blank pages, and numbers them", async () => {
    const aufgaben = Array.from({ length: 12 }, (_, i) => ({ text: `Aufgabe Nummer ${i + 1}: ${"Erkläre den Begriff genau. ".repeat(4)}`, zeilen: 5 }));
    const { pdf, pages } = await renderArbeitsblatt(parseArbeitsblatt({ titel: "Lang", aufgaben }));
    expect(pages).toBeGreaterThan(1);
    if (!hasPoppler) return;
    const file = await toFile(pdf);
    for (let p = 1; p <= pages; p++) {
      const text = execFileSync("pdftotext", ["-f", String(p), "-l", String(p), file, "-"]).toString();
      expect(text, `page ${p}`).toContain("Aufgabe Nummer"); // no blank pages
      expect(text).toContain(`Seite ${p} von ${pages}`);
    }
    expect(execFileSync("pdftotext", [file, "-"]).toString()).toContain("Aufgabe Nummer 12");
  });

  it("uses only gray values", async () => {
    if (!hasPoppler) return;
    const { pdf } = await renderArbeitsblatt(parseArbeitsblatt(sample));
    const ppm = execFileSync("pdftoppm", ["-r", "40", await toFile(pdf)], { maxBuffer: 50_000_000 });
    const body = ppm.subarray(ppm.indexOf("\n255\n") + 5);
    let colored = 0;
    for (let i = 0; i + 2 < body.length; i += 3) if (body[i] !== body[i + 1] || body[i + 1] !== body[i + 2]) colored++;
    expect(colored).toBe(0);
  });
});

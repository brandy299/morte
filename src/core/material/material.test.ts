import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MaterialError, parseArbeitsblatt, printable, renderArbeitsblatt } from "./arbeitsblatt.ts";
import { SANS_BOLD, SERIF, displayFont } from "./layout.ts";

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
  const file = join(await mkdtemp(join(tmpdir(), "pult-pdf-")), "a.pdf");
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
  it("keeps text from many languages and signs", () => {
    for (const text of ["Größe, Übung, Straße „ja“ – 5 €", "A → B • C ✓", "ğşıİ ąęł őű čž", "α β γ Δ Ω ≤ ≥ ≠ ∞ √", "Привет, мир", "½ ² ³ ± ×"]) expect(printable(text)).toBe(text);
  });
  it("cleans up what disturbs the layout and marks what no font can draw", () => {
    expect(printable("a\u00a0b\tc\u200bd")).toBe("a b cd");
    expect(printable("Hi 😀")).toBe("Hi ?");
  });
});

describe("fonts", () => {
  it("picks the title font only when it can draw the title", () => {
    expect(displayFont("Vorstellungsgespräch")).toBe(SERIF);
    expect(displayFont("Größe, çğş")).toBe(SERIF);
    expect(displayFont("Grundlagen der Δ-Rechnung")).toBe(SANS_BOLD);
    expect(displayFont("Привет")).toBe(SANS_BOLD);
  });

  it.skipIf(!hasPoppler)("embeds the bundled fonts and prints Greek, Cyrillic and Turkish letters", async () => {
    const { pdf } = await renderArbeitsblatt(
      parseArbeitsblatt({
        titel: "Übung zu Größen",
        aufgaben: [{ text: "Berechne α + β ≤ π. Привет! ğşıİ → ✓" }],
      }),
    );
    const file = await toFile(pdf);
    const fonts = execFileSync("pdffonts", [file]).toString();
    expect(fonts).toMatch(/Fraunces/);
    expect(fonts).toMatch(/SourceSans3/);
    expect(fonts).not.toMatch(/Helvetica|Times/);
    const text = execFileSync("pdftotext", [file, "-"]).toString();
    expect(text).toContain("α + β ≤ π");
    expect(text).toContain("Привет");
    expect(text).toContain("ğşıİ → ✓");
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

describe("teacher's copy", () => {
  it.skipIf(!hasPoppler)("shows the answers instead of writing lines, and marks the page", async () => {
    const sheet = parseArbeitsblatt({ ...sample, niveau: "Basis", aufgaben: [{ text: "Nenne eine Frage.", zeilen: 2, loesung: "Tell me about yourself." }] });
    const student = await toFile((await renderArbeitsblatt(sheet)).pdf);
    const teacher = await toFile((await renderArbeitsblatt(sheet, { lehrerexemplar: true })).pdf);
    const read = (f: string) => execFileSync("pdftotext", ["-layout", f, "-"]).toString();
    expect(read(student)).toContain("BASIS");
    expect(read(student)).toContain("Name");
    expect(read(student)).not.toContain("Tell me about yourself");
    expect(read(teacher)).toContain("Tell me about yourself.");
    expect(read(teacher)).toContain("LÖSUNG FÜR DIE LEHRKRAFT");
    expect(read(teacher)).not.toContain("Name");
  });
});

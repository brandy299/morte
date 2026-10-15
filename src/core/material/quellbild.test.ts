import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { quellenzeile, umkodieren, type Quellbild } from "../commons/index.ts";
import { parseArbeitsblatt, renderArbeitsblatt } from "./arbeitsblatt.ts";
import { BILD_MAX, bildGroesse } from "./quellbild.ts";
import { arbeitsblattWord } from "./word-render.ts";

const foto = await readFile(new URL("../commons/fixtures/bild-960.jpg", import.meta.url));
const t = { titel: "Machtübernahme Hitlers", urheber: "Robert Sennecke", lizenz: "Public domain", seite: "https://commons.wikimedia.org/wiki/File:Bundesarchiv_Bild_146-1972-026-11,_Macht%C3%BCbernahme_Hitlers.jpg" };

/** A picture of the given size, in color, as the program would hand it to the layout. */
async function bild(id: string, w: number, h: number): Promise<Quellbild> {
  const c = createCanvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = "#c03030";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#3050c0";
  g.fillRect(w / 2, 0, w / 2, h);
  const u = await umkodieren(c.toBuffer("image/png"));
  return { id, ...u, jpg: u.jpg, titel: t.titel, quelle: quellenzeile(t) };
}
const echt = async (): Promise<Quellbild> => {
  const u = await umkodieren(foto);
  return { id: "commons-5418919", ...u, titel: t.titel, quelle: quellenzeile(t) };
};

const inFile = async (buf: Buffer, name: string) => {
  const f = join(await mkdtemp(join(tmpdir(), "pult-qb-")), name);
  await writeFile(f, buf);
  return f;
};
const pages = (f: string) => Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f], { encoding: "utf8" }))![1]);
const pageText = (f: string, n: number) => execFileSync("pdftotext", ["-f", String(n), "-l", String(n), "-layout", f, "-"], { encoding: "utf8" });
/** Pages (1-based) that carry a picture. */
const imagePages = (f: string) => execFileSync("pdfimages", ["-list", f], { encoding: "utf8" }).split("\n").slice(2).map((l) => Number(l.trim().split(/\s+/)[0])).filter(Boolean);

const blatt = (extra: Record<string, unknown>, aufgaben: Record<string, unknown>[] = [{ text: "Beschreibe das Bild.", zeilen: 3 }]) => parseArbeitsblatt({ titel: "Machtergreifung 1933", fach: "Geschichte", einleitung: "Am 30. Januar 1933 wurde Hitler zum Reichskanzler ernannt.", aufgaben, ...extra });

describe("bildGroesse", () => {
  it("skaliert hohe, breite und kleine Bilder in den Kasten, nie größer als echt", () => {
    const col = 480;
    for (const [w, h] of [[400, 2000], [3000, 300], [40, 30], [960, 700]] as const) {
      const s = bildGroesse({ breite: w, hoehe: h }, col);
      expect(s.w).toBeLessThanOrEqual(Math.min(col, BILD_MAX.w) + 0.01);
      expect(s.h).toBeLessThanOrEqual(BILD_MAX.h + 0.01);
      expect(s.w / s.h).toBeCloseTo(w / h, 3);
    }
    expect(bildGroesse({ breite: 40, hoehe: 30 }, col).w).toBeCloseTo(30, 3); // 40 px at 96 dpi
  });
});

describe("Bild mit Quellenzeile im PDF", () => {
  it("zeigt Titel, Urheber, Lizenz und Link unter dem Bild (Einleitung und Aufgabe)", async () => {
    const q = await echt();
    const { pdf } = await renderArbeitsblatt(blatt({ bildDaten: q }, [{ text: "Beschreibe das Foto.", bildDaten: q, zeilen: 3 }]));
    const f = await inFile(pdf, "a.pdf");
    expect(imagePages(f)).toHaveLength(2);
    const text = pageText(f, 1).replace(/\s+/g, " ");
    expect(text).toContain("Bild: Machtübernahme Hitlers.");
    expect(text).toContain("Urheber: Robert Sennecke.");
    expect(text).toContain("Lizenz: Public domain.");
    expect(text.replace(/ /g, "")).toContain("commons.wikimedia.org/wiki/File:Bundesarchiv_Bild_146-1972-026-11");
  });

  it("hohes, breites und sehr kleines Bild laufen nicht über den Rand und nicht in den Text", async () => {
    for (const [w, h] of [[400, 2400], [3000, 200], [32, 24]] as const) {
      const q = await bild(`commons-${w}`, w, h);
      const { pdf, pages: n } = await renderArbeitsblatt(blatt({ bildDaten: q }));
      expect(n).toBe(1);
      const f = await inFile(pdf, "b.pdf");
      // Bounding boxes of the words: nothing right of the page margin, and the first task text sits below the picture's source line.
      const html = execFileSync("pdftotext", ["-bbox", f, "-"], { encoding: "utf8" });
      const xs = [...html.matchAll(/xMax="([\d.]+)"/g)].map((m) => Number(m[1]));
      expect(Math.max(...xs)).toBeLessThanOrEqual(595.28 - 45.3 + 1);
      const y = (word: string) => Number(new RegExp(`yMin="([\\d.]+)"[^>]*>${word}</word>`).exec(html)![1]);
      expect(y("Beschreibe")).toBeGreaterThan(y("Urheber:"));
    }
  });

  it("Quellenzeile bleibt beim Bild, auch wenn die Seite vorher fast voll ist", async () => {
    const q = await echt();
    let sawBreak = false;
    // Fill the page with a growing number of tasks until the picture task has to move to the next page.
    for (let n = 6; n <= 14; n++) {
      const aufgaben = Array.from({ length: n }, (_, i) => ({ text: `Aufgabe ${i + 1}: Nenne zwei Folgen der Ernennung.`, zeilen: 2 }));
      aufgaben.push({ text: "Beschreibe das Foto.", bildDaten: q, zeilen: 2 } as never);
      const { pdf } = await renderArbeitsblatt(blatt({}, aufgaben));
      const f = await inFile(pdf, "c.pdf");
      const [imgPage] = imagePages(f);
      expect(imgPage).toBeDefined();
      expect(pageText(f, imgPage!)).toContain("Urheber: Robert Sennecke");
      for (let p = 1; p <= pages(f); p++) if (p !== imgPage) expect(pageText(f, p)).not.toContain("Urheber:");
      if (imgPage! > 1) sawBreak = true;
    }
    expect(sawBreak).toBe(true);
  });

  it("Farbbild kommt in Graustufen ins PDF", async () => {
    const q = await bild("commons-1", 300, 200);
    const { pdf } = await renderArbeitsblatt(blatt({ bildDaten: q }));
    const f = await inFile(pdf, "d.pdf");
    // Render the page and look at every pixel: a color photo must not leave any color on the page.
    const ppm = execFileSync("pdftoppm", ["-r", "40", "-f", "1", "-l", "1", f], { encoding: "buffer" });
    const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(ppm.subarray(0, 30).toString("latin1"))!;
    const px = ppm.subarray(header[0].length);
    let maxDiff = 0;
    for (let i = 0; i + 2 < px.length; i += 3) maxDiff = Math.max(maxDiff, Math.abs(px[i]! - px[i + 1]!), Math.abs(px[i + 1]! - px[i + 2]!));
    expect(px.length).toBe(Number(header[1]) * Number(header[2]) * 3);
    expect(maxDiff).toBeLessThanOrEqual(3);
  });

  it("ein unvollständiges Bild wird mit deutscher Meldung abgelehnt", () => {
    expect(() => blatt({ bildDaten: { jpg: "x" } })).toThrow("commons_bild_einfuegen");
  });
});

describe("Bild mit Quellenzeile in Word", () => {
  it("enthält das Bild und darunter Titel, Urheber, Lizenz und Link", async () => {
    const q = await echt();
    const buf = await arbeitsblattWord(blatt({ bildDaten: q }, [{ text: "Beschreibe das Foto.", bildDaten: q, zeilen: 2 }]));
    const f = await inFile(buf, "a.docx");
    const text = (await mammoth.extractRawText({ path: f })).value;
    expect(text.match(/Urheber: Robert Sennecke/g)).toHaveLength(2);
    expect(text).toContain("Lizenz: Public domain");
    expect(text).toContain("commons.wikimedia.org/wiki/File:Bundesarchiv");
    const xml = execFileSync("unzip", ["-p", f, "word/document.xml"], { encoding: "utf8" });
    expect(xml.match(/<pic:pic/g)).toHaveLength(2);
    expect(xml).toMatch(/<w:keepNext\/>[\s\S]{0,400}<w:drawing>/); // the picture paragraph stays with the source line
  });
});

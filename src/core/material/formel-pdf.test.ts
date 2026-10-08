import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArbeitsblatt, renderArbeitsblatt } from "./arbeitsblatt.ts";
import { onFormelWarning } from "./formel.ts";
import { newSheet } from "./layout.ts";

const tool = (cmd: string) => {
  try {
    execFileSync(cmd, ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const hasPoppler = tool("pdftotext") && tool("pdftoppm");
const toFile = async (pdf: Buffer) => {
  const file = join(await mkdtemp(join(tmpdir(), "pult-formel-")), "f.pdf");
  await writeFile(file, pdf);
  return file;
};
const textOf = async (pdf: Buffer) => execFileSync("pdftotext", [await toFile(pdf), "-"]).toString();

/** Gray value of every pixel of page 1, row by row. */
async function gray(pdf: Buffer, dpi = 150) {
  const out = execFileSync("pdftoppm", ["-gray", "-r", String(dpi), "-f", "1", "-l", "1", await toFile(pdf)], { maxBuffer: 80_000_000 });
  // P5 <w> <h> 255\n then the pixels
  const [, w, h] = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(out.subarray(0, 30).toString("latin1"))!.map(Number) as [unknown, number, number];
  const pixels = out.subarray(out.length - w * h);
  return { w, h, at: (x: number, y: number) => pixels[y * w + x]! };
}

const warnings: string[] = [];
onFormelWarning((r) => warnings.push(r));

const sample = () =>
  parseArbeitsblatt({
    titel: "Zinsrechnung",
    fach: "Mathematik",
    einleitung: "Der Zins berechnet sich mit \\(Z = \\frac{K \\cdot p \\cdot t}{100}\\) für ein Jahr. Das kostet 5 $ und 6 $.",
    aufgaben: [
      { text: "Löse \\[ x_{1,2} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q} \\] und \\(\\sqrt[3]{x}\\), \\(\\sum_{i=1}^{n} x_i\\), \\(f(x) = 2x^2 - 3x + 1\\).", zeilen: 1 },
      { text: "Für \\(\\text{für } x > 0\\), \\(\\text{Ausgaben in €}\\) und \\(\\text{Höhe}\\) gilt: \\[ \\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases} \\]", zeilen: 1 },
      { text: "Kaputt: \\(\\frac{1}{\\) und \\(\\unbekannterbefehl\\) und der Rest.", zeilen: 1 },
    ],
  });

describe.skipIf(!hasPoppler)("formulas in the PDF", () => {
  it("sets formulas instead of printing the LaTeX, keeps umlauts and money, and shows broken formulas as raw text", async () => {
    warnings.length = 0;
    const { pdf } = await renderArbeitsblatt(sample());
    const text = await textOf(pdf);
    expect(text).not.toMatch(/\\sqrt|\\sum|\\cdot|\\begin|\\left|\\pm|\\text/);
    expect(text.match(/\\frac/g)).toHaveLength(1); // only the broken one, below
    expect(text).toContain("5 $ und 6 $");
    expect(text).toMatch(/Für\s+für/);
    expect(text).toMatch(/Ausgaben in\s*€/);
    expect(text).toContain("Höhe");
    // Wrong LaTeX stays visible as written, and the run goes on to the end.
    expect(text).toContain("\\frac{1}{");
    expect(text).toContain("der Rest.");
    // A short note for each, without the formula in it.
    expect(warnings).toHaveLength(2);
    expect(warnings.join("")).not.toMatch(/frac/);
  });

  it("draws a fraction with a bar between the numbers", async () => {
    const sheet = newSheet("Bruch");
    sheet.paragraph("\\[ \\frac{1}{2} \\]");
    const { w, h, at } = await gray((await sheet.finish()).pdf);
    const dark = (x: number, y: number) => at(x, y) < 128;
    const run = (y: number) => {
      let best = 0;
      let cur = 0;
      for (let x = 0; x < w; x++) best = Math.max(best, (cur = dark(x, y) ? cur + 1 : 0));
      return best;
    };
    const rows = Array.from({ length: Math.floor(h / 2) }, (_, y) => y); // the body, not the footer
    const bar = rows.filter((y) => run(y) >= 14);
    expect(bar.length, "no horizontal bar found").toBeGreaterThan(0);
    const anyDark = (from: number, to: number) => rows.some((y) => y >= from && y < to && Array.from({ length: w }, (_, x) => x).some((x) => dark(x, y)));
    expect(anyDark(bar[0]! - 30, bar[0]! - 2), "no numerator above the bar").toBe(true);
    expect(anyDark(bar.at(-1)! + 2, bar.at(-1)! + 30), "no denominator below the bar").toBe(true);
  });

  it("uses only gray values", async () => {
    const { pdf, pages } = await renderArbeitsblatt(sample(), { lehrerexemplar: true });
    for (let p = 1; p <= pages; p++) {
      const ppm = execFileSync("pdftoppm", ["-r", "40", "-f", String(p), "-l", String(p), await toFile(pdf)], { maxBuffer: 50_000_000 });
      const body = ppm.subarray(ppm.indexOf("\n255\n") + 5);
      let colored = 0;
      for (let i = 0; i + 2 < body.length; i += 3) if (body[i] !== body[i + 1] || body[i + 1] !== body[i + 2]) colored++;
      expect(colored, `page ${p}`).toBe(0);
    }
  });

  it("does not put anything over the right edge, even for a formula that is far too long", async () => {
    const long = `${Array.from({ length: 40 }, (_, i) => `a_{${i + 1}}`).join(" + ")} = S`;
    const sheet = newSheet("Lang");
    sheet.paragraph(`Vorher \\[ ${long} \\] danach \\(${long}\\) zum Schluss.`);
    const { w, h, at } = await gray((await sheet.finish()).pdf, 100);
    const marginRight = Math.round(((595.28 - (16 * 72) / 25.4) / 72) * 100); // x of the right margin in pixels
    let over = 0;
    for (let y = 0; y < h; y++) for (let x = marginRight + 3; x < w; x++) if (at(x, y) < 160) over++;
    expect(over).toBe(0);
  });
});

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createClass, readKlasse, UserError } from "../workspace/index.ts";
import { coverage, dehyphenate, dropRepeated, fallbackMarkdown, fidelity, normalizeHeadings } from "./clean.ts";
import { chunksOf, convertPdf, estimate, unfence, type Ask } from "./convert.ts";
import { assignLehrplan, listLehrplaene, outline, removePlan, saveLehrplan, search, section } from "./store.ts";
import { readPdf } from "./pdf.ts";
import { samplePlan } from "./fixtures.ts";

beforeEach(async () => {
  process.env.MORTE_HOME = await mkdtemp(join(tmpdir(), "morte-lp-"));
});

/** A "model" that gives the text back as Markdown: tabs become table cells, line-end hyphens are joined. */
const echo: Ask = async ({ text, images }) =>
  images?.length ? "# Gescannte Seite\nText aus dem Bild" : dehyphenate(text).replace(/^(\d+\. .*)$/gm, "## $1").replace(/\t/g, " | ");

describe("reading a PDF", () => {
  it("finds the rows of every page and separates table columns with a tab", async () => {
    const pdf = await readPdf(await samplePlan());
    expect(pdf.pages).toHaveLength(4);
    const text = pdf.pages[1]!.rows.map((r) => r.text).join("\n");
    expect(text).toContain("Ministerium für Schule und Weiterbildung");
    expect(text).toContain("Themen\tHinweise");
    expect(text).toMatch(/- Choosing a career.*\tEinführung in die situations- und adres-/);
    await pdf.close();
  });

  it("explains in plain words when the file is not a PDF", async () => {
    await expect(readPdf(Buffer.from("<html>nope</html>"))).rejects.toThrow(/nicht öffnen/);
  });
});

describe("cleaning", () => {
  it("drops headers and footers that repeat on many pages, but keeps the content", async () => {
    const pdf = await readPdf(await samplePlan());
    const text = dropRepeated(pdf.pages).flatMap((p) => p.rows.map((r) => r.text)).join("\n");
    expect(text).not.toContain("Ministerium");
    expect(text).not.toMatch(/Seite \d+ von/);
    expect(text).toContain("Kurshalbjahr 3");
    await pdf.close();
  });

  it("joins words split at the end of a line, but not 'Berufs- und …'", () => {
    expect(dehyphenate("zuneh-\nmend wichtig")).toBe("zunehmend wichtig");
    expect(dehyphenate("Berufs-\nund Bildungsgang")).toBe("Berufs-\nund Bildungsgang");
  });

  it("makes plain Markdown as a safety net", async () => {
    const pdf = await readPdf(await samplePlan());
    const md = fallbackMarkdown(dropRepeated(pdf.pages).slice(0, 1));
    expect(md).toMatch(/^# 1\. Kurshalbjahr 1/m);
    expect(md).toContain("Bewältigung beruflicher Situationen"); // joined across the line end
    expect(md).toContain("Themen | Hinweise");
    await pdf.close();
  });

  it("keeps repeated table headers and numbered labels, only real page furniture goes", () => {
    const row = (text: string, y: number) => ({ text, y, size: 10 });
    const pages = [1, 2, 3, 4].map((n) => ({
      n, height: 842, chars: 100,
      rows: [row("Kompetenz\tInhalt", 800), row(`Lernfeld ${n}`, 790), row("Ministerium", 810), row(`Seite ${n} von 4`, 30), row(`Text ${n}`, 400)],
    }));
    const text = dropRepeated(pages).flatMap((p) => p.rows.map((r) => r.text));
    expect(text).toContain("Kompetenz\tInhalt");
    expect(text).toContain("Lernfeld 2");
    expect(text).not.toContain("Ministerium");
    expect(text.some((t) => t.startsWith("Seite"))).toBe(false);
  });

  it("checks both ways: words left out, and words the model added", () => {
    const source = "Anwendungsmodelle Projekte Hilfsmittel Textproduktion Kommunikation Lernfeld";
    expect(fidelity(source, source)).toEqual({ kept: 1, own: 1 });
    expect(fidelity(source, "Anwendungsmodelle").kept).toBeLessThan(0.3);
    expect(fidelity(source, `${source} Zusätzliche erfundene Kompetenzen Beschreibung Ergebnisse Bewertung`).own).toBeLessThan(0.6);
  });

  it("makes heading levels consistent between separately converted parts", () => {
    const md = "# 3 Kompetenzen\n## 3.3 Kurshalbjahr\n### Hinweise\n# 4 Prüfung\n##### Unterpunkt\n```\n# kein Titel\n```";
    expect(normalizeHeadings(md)).toBe("## 3 Kompetenzen\n### 3.3 Kurshalbjahr\n#### Hinweise\n## 4 Prüfung\n### Unterpunkt\n```\n# kein Titel\n```");
    // A part that starts with "##" for chapter 3.3 still ends up at the right depth.
    expect(normalizeHeadings("## 3.3 Kurshalbjahr")).toBe("## 3.3 Kurshalbjahr");
  });

  it("measures how much of the source a conversion kept", () => {
    expect(coverage("Anwen-\ndungsmodelle und Projekte", "Anwendungsmodelle und Projekte")).toBe(1);
    expect(coverage("Anwendungsmodelle Projekte Hilfsmittel Textproduktion", "Anwendungsmodelle")).toBeLessThan(0.5);
  });
});

describe("converting", () => {
  it("produces Markdown without page furniture, reports progress", async () => {
    const pdf = await readPdf(await samplePlan());
    const steps: string[] = [];
    const result = await convertPdf(pdf, echo, { onProgress: (p) => steps.push(`${p.done}/${p.total}`) });
    expect(result.warnings).toEqual([]);
    expect(result.markdown).toContain("## 1. Kurshalbjahr 1");
    expect(result.markdown).toContain("Themen | Hinweise");
    expect(result.markdown).not.toContain("Ministerium");
    expect(steps.at(-1)).toMatch(/^(\d+)\/\1$/);
    await pdf.close();
  });

  it("falls back to the plain text, with a note, when the model leaves things out", async () => {
    const pdf = await readPdf(await samplePlan());
    const lazy: Ask = async () => "Zusammenfassung: es geht um Englisch.";
    const result = await convertPdf(pdf, lazy);
    expect(result.markdown).toContain("Commercial Correspondence");
    expect(result.warnings[0]).toMatch(/unverändert übernommen/);
    await pdf.close();
  });

  it("falls back as well when the model fails", async () => {
    const pdf = await readPdf(await samplePlan());
    const broken: Ask = async () => {
      throw new Error("offline");
    };
    const result = await convertPdf(pdf, broken);
    expect(result.markdown).toContain("Kursthema: The experience of work");
    expect(result.warnings.length).toBeGreaterThan(0);
    await pdf.close();
  });

  it("reads a page without text from a picture", async () => {
    const text = await readPdf(await samplePlan({ pages: 1 }));
    const png = await text.renderPage(1, 600);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    await text.close();
    const pdf = await readPdf(await samplePlan({ pages: 3, scanPage: png }));
    const seenImages: number[] = [];
    const ask: Ask = async (req) => {
      seenImages.push(req.images?.length ?? 0);
      return echo(req);
    };
    const result = await convertPdf(pdf, ask);
    expect(seenImages).toContain(1);
    expect(result.markdown).toContain("Text aus dem Bild");
    await pdf.close();
  });

  it("estimates the effort before anything is sent", async () => {
    const pdf = await readPdf(await samplePlan());
    const e = estimate(pdf);
    expect(e).toMatchObject({ pages: 4, scanned: 0 });
    expect(e.inputTokens).toBeGreaterThan(300);
    expect(chunksOf(dropRepeated(pdf.pages))).toHaveLength(1);
    await pdf.close();
  });

  it("removes a code fence around the answer", () => expect(unfence("```markdown\n# A\n```")).toBe("# A"));
});

const PLAN = `# Plan\n\nQuelle: x\n\n## 1 Ziele\nDie Lernenden kommunizieren.\n\n### 1.1 Rezeption\nHörverstehen und Leseverstehen.\n\n## 2 Inhalte\n### 2.1 Kursthema Work\nBewerbung, Interview, Business Letter.\n\n\`\`\`\n# kein Titel\n\`\`\`\n`;

describe("reading a plan in steps", () => {
  it("lists headings with sizes and ignores code fences", () => {
    const o = outline(PLAN);
    expect(o.map((h) => `${h.level}:${h.title}`)).toEqual(["1:Plan", "2:1 Ziele", "3:1.1 Rezeption", "2:2 Inhalte", "3:2.1 Kursthema Work"]);
    expect(o[1]!.length).toBeGreaterThan(o[2]!.length);
  });
  it("returns one section with its subsections and cuts long ones", () => {
    expect(section(PLAN, 2)).toContain("Hörverstehen");
    expect(section(PLAN, 2)).not.toContain("Bewerbung");
    expect(section(PLAN, 2, 0, 20)).toMatch(/Es geht weiter: Abschnitt 2, ab Zeichen 20/);
    expect(() => section(PLAN, 99)).toThrow(UserError);
  });
  it("finds paragraphs with all search words and tells where they are", () => {
    const hits = search(PLAN, "bewerbung interview");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ id: 5, path: "Plan › 2 Inhalte › 2.1 Kursthema Work" });
    expect(search(PLAN, "gibtesnicht")).toEqual([]);
  });
});

describe("storing plans", () => {
  beforeEach(async () => {
    await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
    await createClass({ name: "11b", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
  });

  it("saves the plan with its source, refuses to overwrite by accident, replaces on request", async () => {
    await saveLehrplan("Höhere Handelsschule", "## Ziele\nText", { file: "lp.pdf", pages: 22 });
    const file = join(process.env.MORTE_HOME!, "Lehrpläne", "Höhere Handelsschule", "Plan.md");
    expect(await readFile(file, "utf8")).toMatch(/^# Höhere Handelsschule\n\nQuelle: lp\.pdf · 22 Seiten · übernommen am \d{4}-\d\d-\d\d/);
    await expect(saveLehrplan("Höhere Handelsschule", "neu", { file: "b.pdf" })).rejects.toThrow(/schon einen Lehrplan/);
    await saveLehrplan("Höhere Handelsschule", "## Neu", { file: "b.pdf" }, { replace: true });
    expect(await readFile(file, "utf8")).toContain("## Neu");
    await expect(saveLehrplan("../x", "t", { file: "a" })).rejects.toThrow(UserError);
  });

  it("points classes to the plan, and lists which classes use it", async () => {
    await saveLehrplan("HHS", "## A\nx\n## B\ny", { file: "a.pdf" });
    await assignLehrplan("HHS", ["11a", "11b"]);
    expect(await readKlasse("11a")).toContain("Lehrplan: HHS");
    expect((await listLehrplaene())[0]).toMatchObject({ name: "HHS", hasPlan: true, abschnitte: 3, klassen: ["11a", "11b"] });
    await assignLehrplan("HHS", ["11b"]);
    expect(await readKlasse("11a")).toMatch(/^Lehrplan:$/m);
    expect((await listLehrplaene())[0]!.klassen).toEqual(["11b"]);
  });

  it("reuses an existing folder when the name differs only in case", async () => {
    await saveLehrplan("Englisch", "## A\nx", { file: "a.pdf" });
    await saveLehrplan("englisch", "## B\ny", { file: "b.pdf" }, { replace: true });
    const plans = await listLehrplaene();
    expect(plans.map((p) => p.name)).toEqual(["Englisch"]);
    expect(await readFile(join(process.env.MORTE_HOME!, "Lehrpläne", "Englisch", "Plan.md"), "utf8")).toContain("## B");
  });

  it("removes the plan text", async () => {
    await saveLehrplan("HHS", "## A", { file: "a.pdf" });
    await removePlan("HHS");
    expect(await listLehrplaene()).toEqual([]);
  });
});

import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import mammoth from "mammoth";
import { unzipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { saveLogo, saveSchulname } from "../schule/index.ts";
import { parseArbeitsblatt, renderArbeitsblatt } from "./arbeitsblatt.ts";
import { parseKlausur, renderErwartungshorizont, renderKlausur } from "./klausur.ts";
import { logoSize, mm, SCHOOL_LOGO_BOX } from "./layout.ts";
import { parseLernsituation, renderLernsituation } from "./lernsituation.ts";
import { parseVerlauf, renderVerlauf } from "./verlauf.ts";
import { arbeitsblattWord, erwartungshorizontWord, klausurWord, lernsituationWord, verlaufWord } from "./word-render.ts";

const tool = (cmd: string) => {
  try {
    execFileSync(cmd, ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const hasPoppler = tool("pdftotext") && tool("pdftoppm");

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-kopf-"));
});

const logo = (w: number, h: number) => {
  const c = createCanvas(w, h);
  const x = c.getContext("2d");
  x.fillStyle = "#c0392b";
  x.fillRect(0, 0, w, h);
  x.fillStyle = "#1f4e9c";
  x.fillRect(w * 0.1, h * 0.1, w * 0.3, h * 0.8);
  return c.toBuffer("image/png");
};

const arbeitsblatt = () => parseArbeitsblatt({ titel: "Ein sehr langer Titel, der sich über mehrere Zeilen erstreckt, damit man sieht, dass nichts überlappt", fach: "Mathematik", klasse: "HH1", einleitung: "Kurzer Text.", aufgaben: [{ text: "Nenne drei Beispiele.", zeilen: 2 }] });
const klausur = () =>
  parseKlausur({ titel: "Klausur 1", fach: "Mathematik", klasse: "HH1", dauer: "45 Minuten", aufgaben: [{ titel: "Zinsen", teile: [{ text: "Berechne den Zins.", punkte: 4, zeilen: 3, erwartung: "Z = 21,88 €" }] }] });
const lernsituation = () => parseLernsituation({ titel: "Bewerbung", fach: "Englisch", klasse: "11a", handlungssituation: "Die Firma sucht eine Assistenz.", ziele: ["Anzeigen verstehen"], ablauf: [{ thema: "Anzeige auswerten" }] });
const verlauf = () => parseVerlauf({ titel: "Zellbezüge", fach: "INWI", klasse: "11a", dauer: 45, lernziele: ["Bezüge erklären"], phasen: [{ minuten: 45, phase: "Erarbeitung", inhalt: "Aufgaben am Rechner." }] });

const pdfText = (pdf: Buffer, page = 1) => {
  const file = join(process.env.PULT_HOME!, `t${Math.random()}.pdf`);
  return writeFile(file, pdf).then(() => execFileSync("pdftotext", ["-f", String(page), "-l", String(page), "-layout", file, "-"]).toString());
};

describe("school head in the PDF", () => {
  it("shows the name on all five kinds of material, in front of the title", async () => {
    await saveSchulname("Berufskolleg Musterstadt");
    await saveLogo(logo(500, 150));
    if (!hasPoppler) return;
    for (const { pdf } of [await renderArbeitsblatt(arbeitsblatt()), await renderKlausur(klausur()), await renderErwartungshorizont(klausur()), await renderLernsituation(lernsituation()), await renderVerlauf(verlauf())]) {
      const text = await pdfText(pdf);
      expect(text).toContain("Berufskolleg Musterstadt");
      expect(text.indexOf("Berufskolleg Musterstadt")).toBeLessThan(text.search(/Ein sehr langer|Klausur 1|Bewerbung|Zellbezüge/));
    }
  });

  it("adds nothing without an entry", async () => {
    if (!hasPoppler) return;
    const { pdf } = await renderArbeitsblatt(arbeitsblatt());
    expect(await pdfText(pdf)).not.toMatch(/Berufskolleg|Schule/);
  });

  it("uses only gray values, also with a colored logo", async () => {
    await saveSchulname("Berufskolleg Musterstadt");
    await saveLogo(logo(500, 150));
    if (!hasPoppler) return;
    const { pdf } = await renderArbeitsblatt(arbeitsblatt());
    const file = join(process.env.PULT_HOME!, "g.pdf");
    await writeFile(file, pdf);
    const ppm = execFileSync("pdftoppm", ["-r", "60", "-f", "1", "-l", "1", file], { maxBuffer: 50_000_000 });
    const body = ppm.subarray(ppm.indexOf("\n255\n") + 5);
    let colored = 0;
    for (let i = 0; i + 2 < body.length; i += 3) if (body[i] !== body[i + 1] || body[i + 1] !== body[i + 2]) colored++;
    expect(colored).toBe(0);
  });

  it("fits every logo shape into the box, and a long name wraps instead of running over", async () => {
    for (const [w, h] of [[500, 150], [3000, 120], [120, 800], [1, 1], [800, 260]] as const) {
      const size = logoSize(w, h);
      expect(size.w, `${w}x${h}`).toBeLessThanOrEqual(SCHOOL_LOGO_BOX.w + 1e-9);
      expect(size.h, `${w}x${h}`).toBeLessThanOrEqual(SCHOOL_LOGO_BOX.h + 1e-9);
      expect(size.w / size.h).toBeCloseTo(w / h, 6);
    }
    expect(SCHOOL_LOGO_BOX.h).toBeLessThanOrEqual(mm(14));
  });

  it("never lets the head and the title touch: the title starts below the head, for every extreme", async () => {
    if (!hasPoppler) return;
    const cases: [string, [number, number] | undefined][] = [
      ["Städtisches Berufskolleg für Wirtschaft und Verwaltung der Stadt Musterhausen am Rhein, Anna-Beispiel-Straße 12", [3000, 120]],
      ["Gesamtschule Nord", [120, 800]],
      ["x".repeat(120), [500, 150]],
      ["Gymnasium", undefined],
    ];
    for (const [name, size] of cases) {
      await saveSchulname(name);
      if (size) await saveLogo(logo(...size));
      else await (await import("../schule/index.ts")).removeLogo();
      const { pdf, pages } = await renderArbeitsblatt(arbeitsblatt());
      expect(pages).toBe(1);
      const text = await pdfText(pdf);
      // The head comes first, then the kicker line, then the title, in this order, each on its own line.
      const lines = text.split("\n").filter((l) => l.trim());
      const head = lines.findIndex((l) => l.includes(name.slice(0, 8)));
      const kicker = lines.findIndex((l) => /M\s*A\s*T\s*H\s*E\s*M\s*A\s*T\s*I\s*K/.test(l));
      const title = lines.findIndex((l) => l.includes("Ein sehr langer Titel"));
      expect(head, name).toBeGreaterThanOrEqual(0);
      expect(head).toBeLessThan(kicker);
      expect(kicker).toBeLessThan(title);
      expect(lines.some((l) => l.includes("Nenne drei Beispiele"))).toBe(true);
    }
  });
});

describe("school head in Word files", () => {
  it("is in the header of the first page, with logo and name, on all kinds of material", async () => {
    await saveSchulname("Berufskolleg Musterstadt");
    await saveLogo(logo(500, 150));
    const files: [Buffer, string][] = [
      [await arbeitsblattWord(arbeitsblatt()), "Ein sehr langer Titel"],
      [await klausurWord(klausur()), "Klausur 1"],
      [await erwartungshorizontWord(klausur()), "Klausur 1"],
      [await lernsituationWord(lernsituation()), "Bewerbung"],
      [await verlaufWord(verlauf()), "Zellbezüge"],
    ];
    for (const [docx, title] of files) {
      const zip = unzipSync(new Uint8Array(docx));
      const names = Object.keys(zip);
      const header = names.find((n) => /^word\/header\d*\.xml$/.test(n))!;
      expect(header, "no header").toBeDefined();
      const xml = new TextDecoder().decode(zip[header]);
      expect(xml).toContain("Berufskolleg Musterstadt");
      expect(xml).toContain("<w:drawing>");
      expect(names.some((n) => n.startsWith("word/media/") && n.endsWith(".png"))).toBe(true);
      const body = new TextDecoder().decode(zip["word/document.xml"]);
      expect(body).toContain('w:titlePg');
      // The footer with the page number stays on the first page as well.
      expect(names.filter((n) => /^word\/footer\d*\.xml$/.test(n)).length).toBeGreaterThanOrEqual(2);
      // The file opens and keeps its text.
      expect((await mammoth.extractRawText({ buffer: docx })).value).toContain(title);
    }
  });

  it("has no header at all without an entry", async () => {
    const zip = unzipSync(new Uint8Array(await arbeitsblattWord(arbeitsblatt())));
    expect(Object.keys(zip).some((n) => /^word\/header/.test(n))).toBe(false);
    expect(new TextDecoder().decode(zip["word/document.xml"])).not.toContain("titlePg");
  });

  it("works with a name only, and with a logo only", async () => {
    await saveSchulname("Nur der Name");
    let zip = unzipSync(new Uint8Array(await arbeitsblattWord(arbeitsblatt())));
    expect(new TextDecoder().decode(zip["word/header1.xml"])).toContain("Nur der Name");
    expect(Object.keys(zip).some((n) => n.startsWith("word/media/"))).toBe(false);
    await saveSchulname("");
    await saveLogo(logo(300, 100));
    zip = unzipSync(new Uint8Array(await arbeitsblattWord(arbeitsblatt())));
    expect(new TextDecoder().decode(zip["word/header1.xml"])).toContain("<w:drawing>");
  });
});

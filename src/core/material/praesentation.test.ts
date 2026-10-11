import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { MaterialError } from "./layout.ts";
import { parsePraesentation, planen, renderPptx, renderVorschau } from "./praesentation.ts";

const sample = {
  titel: "Das Fenster von PowerPoint",
  untertitel: "Einführung",
  fach: "INWI",
  klasse: "HHS1",
  folien: [
    { art: "abschnitt", titel: "Teil 1" },
    { titel: "Fünf Bereiche", punkte: ["Menüband", "Folienbereich", "Arbeitsfläche"], notizen: "Am Beamer zeigen." },
    { titel: "Ablauf", schaubild: { art: "ablauf", knoten: [{ id: "a", text: "Planen" }, { id: "b", text: "Gestalten" }, { id: "c", text: "Üben" }] } },
  ],
};

const hasPoppler = (() => {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("parsePraesentation", () => {
  it("accepts good content and counts the title slide as slide 1", () => {
    const p = parsePraesentation(sample);
    expect(p.folien).toHaveLength(3);
    expect(p.folien[1]!.art).toBe("inhalt");
    expect(() => parsePraesentation({ ...sample, folien: [{ art: "quiz", titel: "x" }] })).toThrow("Folie 2: Die Art „quiz“ gibt es nicht.");
  });

  it("explains problems in plain words, with the slide number", () => {
    expect(() => parsePraesentation({ titel: "x", folien: [] })).toThrow("Es fehlen die Folien.");
    expect(() => parsePraesentation({ titel: "x", folien: [{ titel: "Viel", punkte: Array.from({ length: 8 }, (_, i) => `P${i}`) }] })).toThrow(/Folie 2 hat 8 Punkte\. Höchstens 7/);
    expect(() => parsePraesentation({ titel: "x", folien: [{ art: "abschnitt", titel: "A", punkte: ["p"] }] })).toThrow(/Folie 2 ist ein Abschnitt/);
    expect(() => parsePraesentation({ titel: "x", folien: [{ titel: "S", schaubild: { art: "ablauf", knoten: [{ id: "a", text: "" , leer: true }, { id: "b", text: "b" }] } }] })).toThrow(/^Folie 2 \(Schaubild\)/);
  });

  it("refuses a slide with too much text instead of letting it run over the edge", () => {
    const long = "Ein sehr langer Punkt mit vielen Wörtern, der so ausführlich ist, dass er mehrere Zeilen braucht und die Folie überfüllt. ".repeat(2).trim();
    // Next to a diagram the text has less than half the width.
    const p = parsePraesentation({ titel: "x", folien: [{ titel: "Zu voll", punkte: Array.from({ length: 7 }, () => long.slice(0, 199)), schaubild: sample.folien[2]!.schaubild }] });
    expect(() => planen(p)).toThrow(MaterialError);
    expect(() => planen(p)).toThrow("Folie 2 hat zu viel Text.");
  });

  it("keeps every part of every slide inside the slide", () => {
    for (const plan of planen(parsePraesentation(sample))) {
      for (const t of plan.teile) {
        if (t.k === "schaubild") {
          expect(t.x + t.szene.w * t.scale).toBeLessThanOrEqual(960);
          expect(t.y + t.szene.h * t.scale).toBeLessThanOrEqual(540);
        } else {
          expect(t.x + t.w).toBeLessThanOrEqual(960);
          expect(t.y + t.h).toBeLessThanOrEqual(540);
        }
      }
    }
  });
});

describe("footer note (fuss)", () => {
  const texts = (p: unknown) => planen(parsePraesentation(p)).map((pl) => pl.teile.filter((t) => t.k === "text").flatMap((t) => (t.k === "text" ? t.absaetze : [])).join("|"));

  it("shows the note on the title slide and in the footer of every other slide", () => {
    const all = texts({ ...sample, fuss: "Ohne hinterlegten Lehrplan erstellt" });
    expect(all).toHaveLength(4);
    for (const t of all) expect(t).toContain("Ohne hinterlegten Lehrplan erstellt");
    expect(all[1]).toContain("INWI · HHS1 · Ohne hinterlegten Lehrplan erstellt");
  });

  it("shows nothing extra without the note, and keeps the note inside the slide", () => {
    expect(texts(sample).join("")).not.toContain("Lehrplan");
    for (const plan of planen(parsePraesentation({ ...sample, fuss: "x".repeat(200) })))
      for (const t of plan.teile) if (t.k === "text") expect(t.x + t.w).toBeLessThanOrEqual(960);
  });

  it("is in the PowerPoint file", async () => {
    const files = unzipSync(await renderPptx(parsePraesentation({ ...sample, fuss: "Ohne hinterlegten Lehrplan erstellt" })));
    expect(strFromU8(files["ppt/slides/slide3.xml"]!)).toContain("Ohne hinterlegten Lehrplan erstellt");
  });
});

describe("labelling exercise on a window sketch", () => {
  const bereiche = [{ id: "m", text: "Menüband", lage: "menue", leer: true }, { id: "a", text: "Arbeitsfläche", lage: "mitte", leer: true }, { id: "s", text: "Statusleiste", lage: "status" }];
  const folie = (extra: object = {}, notizen?: string) => ({ titel: "Beschrifte das Fenster", notizen, schaubild: { art: "oberflaeche", knoten: bereiche, ...extra } });

  it("puts the key into the speaker notes: number = area, in the order of the empty boxes", () => {
    const p = parsePraesentation({ titel: "x", folien: [folie()] });
    expect(p.folien[0]!.notizen).toBe("Lösung zum Beschriften: 1 = Menüband; 2 = Arbeitsfläche.");
    expect(planen(p)[1]!.notizen).toContain("1 = Menüband");
  });

  it("keeps the notes the model wrote and adds the key after them", () => {
    const p = parsePraesentation({ titel: "x", folien: [folie({}, "Erst raten lassen.")] });
    expect(p.folien[0]!.notizen).toBe("Erst raten lassen.\nLösung zum Beschriften: 1 = Menüband; 2 = Arbeitsfläche.");
  });

  it("adds nothing when no box is empty", () => {
    const p = parsePraesentation({ titel: "x", folien: [folie({ knoten: bereiche.map((b) => ({ ...b, leer: false })) })] });
    expect(p.folien[0]!.notizen).toBeUndefined();
  });

  it("refuses a word list, which presentations do not have", () => {
    expect(() => parsePraesentation({ titel: "x", folien: [folie({ wortliste: true })] })).toThrow("Folie 2: Eine Wortliste gibt es in einer Präsentation nicht.");
  });
});

describe("renderPptx", () => {
  it("makes a 16:9 PowerPoint file with a title slide, one slide per entry, notes and the diagram as editable objects", async () => {
    const files = unzipSync(await renderPptx(parsePraesentation(sample)));
    const slides = Object.keys(files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slides).toHaveLength(4);
    expect(strFromU8(files["ppt/presentation.xml"]!)).toContain('cx="12192000" cy="6858000"');
    expect(strFromU8(files["ppt/slides/slide1.xml"]!)).toContain("Das Fenster von PowerPoint");
    expect(strFromU8(files["ppt/slides/slide3.xml"]!)).toContain("Folienbereich");
    // The diagram is real objects, not a picture: boxes with the text in them, and arrows with a head.
    const ablauf = strFromU8(files["ppt/slides/slide4.xml"]!);
    expect(ablauf).toContain("Gestalten");
    expect((ablauf.match(/name="Schaubild"/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(ablauf).toContain('prst="roundRect"');
    expect(ablauf).toContain('prst="triangle"'); // the arrow heads
    expect(ablauf).not.toContain("<p:pic>");
    const notes = Object.keys(files).filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)).map((n) => strFromU8(files[n]!));
    expect(notes.some((n) => n.includes("Am Beamer zeigen."))).toBe(true);
  });
});

describe("renderVorschau", () => {
  it("shows the same slides as pages for the preview", async () => {
    const { pdf, seiten } = await renderVorschau(parsePraesentation(sample));
    expect(seiten).toBe(4);
    if (!hasPoppler) return;
    const file = join(await mkdtemp(join(tmpdir(), "pult-folien-")), "v.pdf");
    await writeFile(file, pdf);
    const info = execFileSync("pdfinfo", [file]).toString();
    expect(info).toMatch(/Pages:\s+4/);
    expect(info).toMatch(/Page size:\s+960 x 540 pts/);
    expect(execFileSync("pdftotext", ["-f", "3", "-l", "3", file, "-"]).toString()).toContain("Folienbereich");
  });
});

import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { MaterialError } from "./layout.ts";
import { STILE } from "../animation/stile.ts";
import { LAYOUTS } from "../animation/szene.ts";
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
          const b = box(t);
          expect(b.x + b.w).toBeLessThanOrEqual(960);
          expect(b.y + b.h).toBeLessThanOrEqual(540);
        }
      }
    }
  });
});

/** The rectangle a part covers on the slide. */
function box(t: Exclude<ReturnType<typeof planen>[number]["teile"][number], { k: "schaubild" }>): { x: number; y: number; w: number; h: number } {
  if (t.k === "kreis") return { x: t.x, y: t.y, w: t.d, h: t.d };
  if (t.k === "symbol") return { x: t.x, y: t.y, w: t.s, h: t.s };
  if (t.k === "pfad") {
    const xs = t.punkte.map((q) => q[0]);
    const ys = t.punkte.map((q) => q[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  return t;
}

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

describe("looks of a presentation", () => {
  const ground = (stil?: string) => planen(parsePraesentation({ ...sample, stil }))[0]!.teile[0] as { fill: string };

  it("keep the classic look without a style", () => {
    expect(ground().fill).toBe("#f4efe6");
  });

  it("take the colors of the chosen style on every slide, light or dark", () => {
    expect(ground("blueprint").fill).toBe("#0b3a6f");
    expect(ground("editorial-serif").fill).toBe("#faf7f2");
    const alle = planen(parsePraesentation({ ...sample, stil: "tokyo-night" }));
    for (const plan of alle) expect((plan.teile[0] as { fill: string }).fill).toBe("#1a1b26");
    const text = alle[0]!.teile.filter((t) => t.k === "text") as { color: string }[];
    expect(text.some((t) => t.color === "#c0caf5")).toBe(true);
  });

  it("draw into the .pptx and the preview with the chosen colors", async () => {
    const deck = parsePraesentation({ ...sample, stil: "blueprint" });
    const files = unzipSync(new Uint8Array(await renderPptx(deck)));
    expect(strFromU8(files["ppt/slides/slide1.xml"]!)).toContain("0B3A6F");
    expect((await renderVorschau(deck)).seiten).toBeGreaterThan(1);
  });

  it("explain an unknown style", () => {
    expect(() => parsePraesentation({ ...sample, stil: "neon-flamingo" })).toThrow(/Der Stil: „neon-flamingo“ gibt es nicht/);
  });
});

describe("designed slides (layouts)", () => {
  const k = (titel: string, text?: string, extra: object = {}) => ({ titel, text, ...extra });
  const wort = (n: number) => Array.from({ length: n }, () => "Wort").join(" ");
  /** The longest content each layout allows. */
  const voll: Record<string, object> = {
    punkte: { karten: Array.from({ length: 6 }, (_, i) => k(`Überschrift ${i} lang genug hier`, wort(14).slice(0, 80), { symbol: "book" })) },
    schritte: { karten: Array.from({ length: 5 }, (_, i) => k(`Schritt ${i} mit Überschrift`, wort(14).slice(0, 80))) },
    ablauf: { karten: Array.from({ length: 4 }, (_, i) => k(`Station ${i} lang genug`, wort(14).slice(0, 90), { symbol: "book", pfeil: i < 3 ? "wird gekürzt" : undefined })) },
    kreislauf: { karten: Array.from({ length: 4 }, (_, i) => k(`Station ${i} lang genug`, wort(14).slice(0, 90), { pfeil: "wird gekürzt" })) },
    zahl: { zahl: "71 %", text: wort(30).slice(0, 160) },
    vergleich: { karten: [0, 1].map((i) => ({ titel: `Seite ${i} Überschrift lang`, liste: Array.from({ length: 4 }, () => wort(14).slice(0, 70)) })) },
    zeitstrahl: { karten: Array.from({ length: 5 }, (_, i) => k(`Ereignis ${i} Überschrift`, wort(14).slice(0, 80), { zahl: "1933–1945" })) },
    aussage: { text: wort(70).slice(0, 280), symbol: "scale" },
    merksatz: { text: wort(40).slice(0, 170), quelle: "Eigene Zusammenfassung der Klasse" },
  };
  const deck = (stil?: string) => parsePraesentation({ titel: "T", stil, folien: LAYOUTS.map((layout) => ({ layout, titel: layout === "merksatz" ? undefined : "Eine Überschrift, die in zwei Zeilen laufen kann", kicker: "Beispiel", ...voll[layout] })) });

  it("covers every layout of the explainer pieces", () => {
    expect(Object.keys(voll).sort()).toEqual([...LAYOUTS].sort());
  });

  it("checks the entries like the explainer piece does, with the slide number", () => {
    const folie = (f: object) => parsePraesentation({ titel: "T", folien: [f] });
    expect(() => folie({ layout: "ablauf", titel: "A", karten: [k("Nur eine")] })).toThrow(/Folie 2: Das Layout „ablauf“ braucht 2 bis 4 Einträge/);
    expect(() => folie({ layout: "punkte", titel: "A", punkte: ["x"], karten: [k("a"), k("b")] })).toThrow(/Mit einem Layout gibt es keine Stichpunkte/);
    expect(() => folie({ layout: "kreuz", titel: "A" })).toThrow(/Folie 2: Das Layout \(layout\): „kreuz“ gibt es nicht/);
    expect(() => folie({ layout: "punkte", titel: "A", karten: [k("a", "x", { symbol: "einhorn" }), k("b", "x", { symbol: "drache" })] })).toThrow(/Diese Symbole gibt es nicht: „einhorn“ \(Folie 2, Eintrag 1\), „drache“ \(Folie 2, Eintrag 2\)/);
  });

  it("keeps the longest content of every layout inside the slide, in the classic look and in every style", () => {
    for (const stil of [undefined, ...STILE.map((x) => x.id)]) {
      for (const plan of planen(deck(stil))) {
        for (const t of plan.teile) {
          if (t.k === "schaubild") continue;
          const b = box(t);
          expect(b.x, stil).toBeGreaterThanOrEqual(-0.5);
          expect(b.y, stil).toBeGreaterThanOrEqual(-0.5);
          expect(b.x + b.w, stil).toBeLessThanOrEqual(960.5);
          expect(b.y + b.h, stil).toBeLessThanOrEqual(540.5);
        }
      }
    }
  });

  it("puts nothing on top of the footer", () => {
    for (const plan of planen(deck("editorial-serif"))) {
      for (const t of plan.teile) {
        if (t.k === "schaubild" || (t.k === "rect" && (t.w >= 960 || t.h >= 540))) continue; // background and the bar of the title slide
        const b = box(t);
        const fuss = t.k === "text" && t.size === 10 && b.y >= 540 - 40;
        if (!fuss) expect(b.y + b.h).toBeLessThanOrEqual(540 - 34 + 0.5);
      }
    }
  });

  it("refuses a slide with far too much text and names a very long word", () => {
    const viel = { layout: "punkte", titel: "A", karten: Array.from({ length: 6 }, (_, i) => k(`Überschrift ${i}`, wort(14).slice(0, 80))) };
    const lang = parsePraesentation({ titel: "T", folien: [{ ...viel, karten: [k("Beitragsbemessungsgrenzenberechnung", "x"), k("b"), k("c"), k("d"), k("e"), k("f")] }] });
    expect(() => planen(lang)).not.toThrow(); // a very long word is broken as a last resort
    const riesig = parsePraesentation({ titel: "T", folien: [{ layout: "aussage", titel: "A", text: "Wort ".repeat(56).trim() }] });
    expect(() => planen(riesig)).not.toThrow();
    expect(() => planen(parsePraesentation({ titel: "T", folien: [{ layout: "zahl", titel: "Z", zahl: "1", text: "Kurz" }] }))).not.toThrow();
    void viel;
  });

  it("draws every layout into the preview and into real PowerPoint objects, with the notes", async () => {
    const d = deck("tokyo-night");
    d.folien[1]!.notizen = "Das sagst du dazu.";
    const { pdf, seiten } = await renderVorschau(d);
    expect(seiten).toBe(LAYOUTS.length + 1);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const zip = unzipSync(await renderPptx(d));
    const slides = Object.keys(zip).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slides).toHaveLength(LAYOUTS.length + 1);
    const xml = slides.map((n) => strFromU8(zip[n]!)).join("");
    expect(xml).toContain("roundRect"); // the cards
    expect(xml).toContain("<p:pic>"); // the symbols
    expect(Object.keys(zip).some((n) => n.startsWith("ppt/notesSlides/"))).toBe(true);
  });
});

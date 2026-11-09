import { describe, expect, it } from "vitest";
import { parsePraesentation, renderPptx, renderVorschau } from "./praesentation.ts";
import { parseSchaubild, szeneVon, type Form, type Szene } from "./schaubild.ts";
import { pruefeSzene, streckeSchneidet, ueberlappt } from "./schaubild-lage.ts";

/** The two diagrams of the bug report: labels on top of each other, a box over text, words cut in the middle. */
const traeger = {
  art: "hierarchie",
  titel: "Wer macht Sozialpolitik, und woher kommt das Geld?",
  knoten: [
    { id: "s", text: "Sozialpolitik", betont: true },
    { id: "a", text: "Staat: Steuern" },
    { id: "b", text: "Sozialversicherungen: Beiträge" },
    { id: "c", text: "Freie Träger: Zuschüsse und Spenden" },
  ],
  verbindungen: [
    { von: "s", nach: "a", text: "Gesetze und Verwaltung" },
    { von: "s", nach: "b", text: "für Pflichtversicherte" },
    { von: "s", nach: "c", text: "Kitas, Beratung, Pflege" },
  ],
};
const beitraege = {
  art: "kreislauf",
  titel: "Beiträge rein, Leistungen raus",
  mitte: "Sozialversicherung",
  knoten: [
    { id: "b", text: "Beschäftigte" },
    { id: "a", text: "Arbeitgeber" },
    { id: "t", text: "Beitragstopf" },
    { id: "l", text: "Leistungen" },
  ],
  verbindungen: [
    { von: "b", nach: "t", text: "Beitrag" },
    { von: "a", nach: "t", text: "Beitrag" },
    { von: "t", nach: "l", text: "Auszahlung" },
    { von: "l", nach: "b", text: "sichert Einkommen" },
  ],
};

const kaesten = (s: Szene) => s.formen.filter((f): f is Extract<Form, { k: "kasten" }> => f.k === "kasten");
const etiketten = (s: Szene) => s.formen.filter((f): f is Extract<Form, { k: "etikett" }> => f.k === "etikett");
const text = (s: Szene) => s.formen.filter((f): f is Extract<Form, { k: "text" }> => f.k === "text");

describe("diagrams from the bug report", () => {
  // 228 is a slide with text next to the diagram, 450 a worksheet.
  it.each([228, 260, 300, 450])("hierarchy with arrow labels at width %i: nothing overlaps, no word is cut", (w) => {
    const s = parseSchaubild(traeger, 1);
    const scene = szeneVon(s, w, false);
    expect(pruefeSzene(scene)).toEqual([]);
    expect(scene.w).toBeLessThanOrEqual(w + 0.5);
    expect(etiketten(scene)).toHaveLength(3);
    // Every line of a box is a whole piece of the text: "Sozialversicherungen:" is not broken into "Sozialversic-" and "herungen:".
    for (const [i, k] of kaesten(scene).entries()) expect(k.zeilen.join(" ")).toBe(s.knoten[i]!.text);
  });

  it.each([228, 260, 300, 450])("cycle with a text in the middle at width %i: nothing overlaps, the text stays readable", (w) => {
    const scene = szeneVon(parseSchaubild(beitraege, 1), w, false);
    expect(pruefeSzene(scene)).toEqual([]);
    expect(etiketten(scene)).toHaveLength(4);
    expect(text(scene).map((t) => t.zeilen.join(" "))).toEqual(["Sozialversicherung"]);
  });

  it("keeps the labels apart in the teacher's copy and with blank labels", () => {
    const blank = { ...traeger, verbindungen: traeger.verbindungen.map((v) => ({ ...v, leer: true })) };
    for (const loesung of [false, true]) expect(pruefeSzene(szeneVon(parseSchaubild(blank, 1), 228, loesung))).toEqual([]);
  });

  it("lays the diagram out wider and draws it smaller when a long word needs the room", () => {
    const s = parseSchaubild(traeger, 1);
    const scene = szeneVon(s, 228, false);
    expect(scene.k).toBeLessThan(1);
    expect(scene.k).toBeGreaterThanOrEqual(0.7);
    expect(scene.w).toBeLessThanOrEqual(228.5);
  });

  it("goes into the slides: preview and PowerPoint file are made", async () => {
    const p = parsePraesentation({
      titel: "Sozialpolitik",
      folien: [
        { art: "inhalt", titel: "Drei Träger – drei Geldquellen", punkte: ["Nur der Staat darf per Gesetz verpflichten"], schaubild: traeger },
        { art: "inhalt", titel: "Der Kreislauf der Beiträge", punkte: ["Beide Seiten zahlen je etwa die Hälfte"], schaubild: beitraege },
      ],
    });
    expect((await renderVorschau(p)).seiten).toBe(3);
    expect((await renderPptx(p)).length).toBeGreaterThan(1000);
  });
});

describe("the check for overlaps", () => {
  const kasten = (x: number, y: number, w: number, h: number, zeilen = ["Text"]): Form => ({ k: "kasten", x, y, w, h, zeilen, stil: "normal" });
  const etikett = (x: number, y: number, zeilen = ["Label"]): Form => ({ k: "etikett", x, y, w: 40, h: 18, zeilen, leer: false });

  it("finds a label on top of a box, two labels on top of each other, and a box leaving the picture", () => {
    expect(pruefeSzene({ w: 200, h: 100, formen: [kasten(10, 10, 60, 30), etikett(50, 20)] })).toHaveLength(1);
    expect(pruefeSzene({ w: 200, h: 100, formen: [kasten(10, 10, 60, 30), etikett(30, 20)] })).toHaveLength(1); // inside a box is no better
    expect(pruefeSzene({ w: 200, h: 100, formen: [etikett(10, 10, ["A"]), etikett(30, 15, ["B"])] })).toHaveLength(1);
    expect(pruefeSzene({ w: 200, h: 100, formen: [kasten(150, 10, 60, 30)] })[0]).toMatch(/ragt aus dem Bild/);
  });

  it("finds an arrow through a box or through the label of another arrow, but allows its own label and its end boxes", () => {
    const boxes = [kasten(0, 0, 60, 30), kasten(0, 100, 60, 30, ["Unten"]), kasten(0, 50, 60, 30, ["Mitte"])];
    const pfeil: Form = { k: "pfeil", punkte: [[30, 30], [30, 100]] };
    expect(pruefeSzene({ w: 200, h: 200, formen: [...boxes, pfeil] })).toEqual(["Ein Pfeil läuft durch Kästchen „Mitte“."]);
    expect(pruefeSzene({ w: 200, h: 200, formen: [boxes[0]!, boxes[1]!, pfeil] })).toEqual([]);
    expect(pruefeSzene({ w: 200, h: 200, formen: [boxes[0]!, boxes[1]!, pfeil, etikett(10, 56)] })).toEqual([]); // centred on the arrow: its own label
    expect(pruefeSzene({ w: 200, h: 200, formen: [boxes[0]!, boxes[1]!, pfeil, etikett(25, 56)] })).toEqual(["Ein Pfeil läuft durch Beschriftung „Label“."]);
  });

  it("finds text that is wider than its box", () => {
    const probleme = pruefeSzene({ w: 300, h: 100, formen: [kasten(10, 10, 40, 30, ["Sozialversicherungen"])] });
    expect(probleme[0]).toMatch(/passt nicht in sein Kästchen/);
  });

  it("has helpers that work on touching and crossing shapes", () => {
    expect(ueberlappt({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(ueberlappt({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 0, w: 10, h: 10 })).toBe(true);
    expect(streckeSchneidet([0, 5], [20, 5], { x: 5, y: 0, w: 10, h: 10 })).toBe(true);
    expect(streckeSchneidet([0, 15], [20, 15], { x: 5, y: 0, w: 10, h: 10 })).toBe(false);
    expect(streckeSchneidet([0, 0], [20, 20], { x: 12, y: 0, w: 5, h: 5 })).toBe(false);
  });
});

describe("any diagram a teacher is likely to ask for", () => {
  // A fixed sequence of "random" numbers, so a failure can be repeated.
  let seed = 4711;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  const woerter = ["Staat", "Steuern", "Sozialversicherungen", "Beiträge", "Freie Träger", "Zuschüsse", "Spenden", "Arbeitgeber", "Leistungen", "Verfassungsorgane", "Bundestag", "Haushalte", "Unternehmen", "Einkommen", "Auszahlung", "Gesetze"];
  const wort = (max: number) => Array.from({ length: 1 + Math.floor(rnd() * max) }, () => pick(woerter)).join(" ");

  it("is drawn without overlaps, whatever the width, and the words stay whole", () => {
    for (let i = 0; i < 120; i++) {
      const art = pick(["ablauf", "hierarchie", "kreislauf"] as const);
      const n = art === "kreislauf" ? 3 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 4);
      const knoten = Array.from({ length: n }, (_, j) => ({ id: String(j), text: wort(2), betont: rnd() < 0.15, leer: rnd() < 0.15 }));
      const label = rnd() < 0.6;
      const verbindungen =
        art === "kreislauf"
          ? knoten.map((k, j) => ({ von: k.id, nach: String((j + 1) % n), text: label ? pick(woerter) : undefined }))
          : knoten.slice(1).map((k, j) => ({ von: String(art === "hierarchie" ? Math.floor(rnd() * (j + 1)) : j), nach: k.id, text: label ? pick(woerter) : undefined }));
      const raw = { art, knoten, verbindungen, mitte: art === "kreislauf" && rnd() < 0.6 ? wort(1) : undefined };
      const s = parseSchaubild(raw, 1); // throws if the diagram cannot be drawn cleanly
      for (const w of [300, 450]) {
        const scene = szeneVon(s, w, false);
        expect(pruefeSzene(scene), JSON.stringify(raw)).toEqual([]);
        expect(scene.w).toBeLessThanOrEqual(w + 0.5);
        kaesten(scene).forEach((k, j) => {
          if (k.zeilen.length) expect(k.zeilen.join(" "), `${art} w=${w} k=${scene.k}`).toBe(s.knoten[j]!.text);
        });
      }
    }
  });

  it("is refused when a word is too long for any layout", () => {
    const raw = { art: "hierarchie", knoten: [{ id: "a", text: "Wurzel" }, ...["Verfassungsbeschwerdeverfahren", "Bundesverfassungsgerichtsentscheidung", "Sozialversicherungsträger", "Arbeitslosenversicherungsbeiträge"].map((text, i) => ({ id: String(i), text }))], verbindungen: [0, 1, 2, 3].map((i) => ({ von: "a", nach: String(i) })) };
    expect(() => parseSchaubild(raw, 1)).toThrow(/Ein Wort in „Bundesverfassungsgerichtsentscheidung“ ist zu lang/);
  });

  it("is refused in words the model can act on when it cannot be drawn cleanly", () => {
    const zuViel = {
      art: "kreislauf",
      knoten: ["für Sozialversicherungen Leistungen Staat", "Leistungen", "Arbeitgeber", "Bundestag Beratung", "Haushalte Haushalte Träger für", "Unternehmen", "sichert sichert"].map((t, i) => ({ id: String(i), text: t })),
      verbindungen: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 3]].map(([a, b]) => ({ von: String(a), nach: String(b), text: "Geld" })),
    };
    expect(() => parseSchaubild(zuViel, 3, "Folie 3", [233])).toThrow(/^Folie 3 \(Schaubild\): Das Schaubild lässt sich nicht sauber zeichnen.*weniger Kästchen/);
  });
});

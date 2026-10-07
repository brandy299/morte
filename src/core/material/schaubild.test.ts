import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { koerperVon, loesungVon } from "./aufgabentypen.ts";
import { arbeitsblattWord } from "./word-render.ts";
import { parseArbeitsblatt, renderArbeitsblatt } from "./arbeitsblatt.ts";
import { achse, parseSchaubild, szeneVon, umbrechen, versteckt, type Form } from "./schaubild.ts";
import { readPdf } from "../lehrplan/pdf.ts";

const gesetz = {
  art: "ablauf",
  titel: "So wird ein Gesetz gemacht",
  richtung: "senkrecht",
  knoten: [
    { id: "a", text: "Gesetzentwurf" },
    { id: "b", text: "Der Bundestag berät und beschließt", leer: true },
    { id: "c", text: "Der Bundesrat wirkt mit", leer: true },
    { id: "d", text: "Der Bundespräsident unterschreibt", betont: true },
  ],
  wortliste: true,
};

const kaesten = (formen: Form[]) => formen.filter((f): f is Extract<Form, { k: "kasten" }> => f.k === "kasten");
const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

describe("checking a diagram from the model", () => {
  it("accepts good diagrams and chains boxes when no arrows are given", () => {
    const s = parseSchaubild(gesetz, 1);
    expect(s.verbindungen).toEqual([{ von: "a", nach: "b" }, { von: "b", nach: "c" }, { von: "c", nach: "d" }]);
  });

  it("tells the model what to correct", () => {
    expect(() => parseSchaubild({ art: "torte" }, 2)).toThrow(/Aufgabe 2.*Erlaubt/);
    expect(() => parseSchaubild({ art: "ablauf", knoten: [{ id: "a", text: "x" }] }, 1)).toThrow(/2 bis 12/);
    expect(() => parseSchaubild({ art: "hierarchie", knoten: [{ id: "a", text: "x" }, { id: "b", text: "y" }] }, 1)).toThrow(/Pfeile/);
    expect(() => parseSchaubild({ art: "ablauf", knoten: [{ id: "a", text: "x" }, { id: "a", text: "y" }] }, 1)).toThrow(/doppelt/);
    expect(() => parseSchaubild({ art: "ablauf", knoten: [{ id: "a", text: "x" }, { id: "b", text: "y" }], verbindungen: [{ von: "a", nach: "z" }] }, 1)).toThrow(/Kästchen, das es nicht gibt/);
    expect(() => parseSchaubild({ art: "ablauf", knoten: [{ id: "a", text: "x" }, { id: "b", text: "y" }], verbindungen: [{ von: "a", nach: "b" }, { von: "b", nach: "a" }] }, 1)).toThrow(/kreislauf/);
    expect(() => parseSchaubild({ art: "zeitstrahl", knoten: [{ id: "a", text: "x" }, { id: "b", text: "y", datum: "1990" }] }, 1)).toThrow(/Datum/);
    expect(() => parseSchaubild({ art: "saeulen", saeulen: [{ name: "A", wert: -1 }, { name: "B", wert: 2 }] }, 1)).toThrow(/Wert/);
    expect(() => parseSchaubild({ art: "kreislauf", knoten: [{ id: "a", text: "x" }, { id: "b", text: "y" }] }, 1)).toThrow(/3 bis 8/);
  });
});

describe("layout", () => {
  const specs = {
    gesetz,
    waagerecht: { art: "ablauf", knoten: [{ id: "1", text: "Bedarf" }, { id: "2", text: "Produktion" }, { id: "3", text: "Verkauf" }] },
    kette: { art: "ablauf", knoten: ["Antrag stellen", "Prüfung durch die Behörde", "Anhörung", "Bescheid erlassen", "Widerspruch einlegen", "Klage vor dem Verwaltungsgericht", "Urteil"].map((t, i) => ({ id: String(i), text: t, leer: i === 2 })) },
    baum: { art: "hierarchie", knoten: [{ id: "v", text: "Volk" }, { id: "l", text: "Gesetzgebung" }, { id: "r", text: "Regierung" }, { id: "j", text: "Rechtsprechung" }, { id: "x", text: "Ein sehr langes Wort wie Verfassungsbeschwerdeverfahren" }], verbindungen: [{ von: "v", nach: "l" }, { von: "v", nach: "r" }, { von: "v", nach: "j" }, { von: "j", nach: "x" }] },
    kreis: { art: "kreislauf", mitte: "Wirtschaft", knoten: ["Haushalte", "Unternehmen", "Staat", "Banken", "Ausland"].map((t, i) => ({ id: String(i), text: t })) },
    zeit: { art: "zeitstrahl", knoten: [1949, 1961, 1989, 1990].map((y, i) => ({ id: String(i), datum: String(y), text: `Ereignis im Jahr ${y}, ziemlich lang beschrieben` })) },
    kreislaufMitPfeilen: { art: "kreislauf", knoten: [{ id: "h", text: "Private Haushalte" }, { id: "u", text: "Unternehmen" }], verbindungen: [{ von: "u", nach: "h", text: "Güter", leer: true }, { von: "h", nach: "u", text: "Geld" }, { von: "u", nach: "h", text: "Lohn", leer: true }, { von: "h", nach: "u", text: "Arbeitskraft" }] },
    saeulen: { art: "saeulen", einheit: "Prozent", saeulen: [{ name: "Partei A", wert: 24.3 }, { name: "Partei B", wert: 18 }, { name: "Sonstige Parteien und Gruppen", wert: 7 }] },
  };

  it.each(Object.entries(specs))("%s: boxes stay on the sheet and never overlap", (_name, raw) => {
    const scene = szeneVon(parseSchaubild(raw, 1), 450, false);
    const boxes = kaesten(scene.formen);
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(-0.5);
      expect(b.x + b.w).toBeLessThanOrEqual(scene.w + 0.5);
      expect(b.y).toBeGreaterThanOrEqual(-0.5);
      expect(b.y + b.h).toBeLessThanOrEqual(scene.h + 0.5);
    }
    for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(overlap(a, b), `${a.zeilen.join(" ")} / ${b.zeilen.join(" ")}`).toBe(false);
    expect(scene.h).toBeGreaterThan(20);
  });

  it("draws a circuit with your own arrows, also in both directions, and numbers the blank labels", () => {
    const s = parseSchaubild(specs.kreislaufMitPfeilen, 1);
    const student = szeneVon(s, 450, false);
    const labels = student.formen.filter((f): f is Extract<Form, { k: "etikett" }> => f.k === "etikett");
    expect(labels).toHaveLength(4);
    expect(labels.filter((l) => l.leer).map((l) => l.nr)).toEqual([1, 2]);
    expect(labels.filter((l) => !l.leer).flatMap((l) => l.zeilen)).toEqual(["Geld", "Arbeitskraft"]);
    // The four arrows run side by side, not on top of each other.
    const arrows = student.formen.filter((f): f is Extract<Form, { k: "pfeil" }> => f.k === "pfeil");
    expect(new Set(arrows.map((a) => Math.round(a.punkte[0]![0]))).size).toBeGreaterThanOrEqual(2);
    // Labels do not overlap each other or the boxes.
    const shapes = [...kaesten(student.formen), ...labels];
    for (const [i, a] of shapes.entries()) for (const b of shapes.slice(i + 1)) expect(overlap(a, b)).toBe(false);
    const teacher = szeneVon(s, 450, true).formen.filter((f) => f.k === "etikett") as { zeilen: string[]; leer: boolean }[];
    expect(teacher.map((l) => l.zeilen[0])).toEqual(["Güter", "Geld", "Lohn", "Arbeitskraft"]);
    expect(versteckt({ ...s, wortliste: true }, "x").loesung).toBe("1 = Güter,  2 = Lohn");
  });

  it("asks for the solution text when an arrow label is left blank", () => {
    expect(() => parseSchaubild({ art: "kreislauf", knoten: [{ id: "a", text: "A" }, { id: "b", text: "B" }], verbindungen: [{ von: "a", nach: "b", leer: true }] }, 1)).toThrow(/Text für die Lösung/);
  });

  it("lays a long plain chain out in rows, so it stays short", () => {
    const scene = szeneVon(parseSchaubild(specs.kette, 1), 450, false);
    const ys = new Set(kaesten(scene.formen).map((b) => Math.round(b.y)));
    expect(ys.size).toBe(3); // seven steps, three per row
    expect(scene.h).toBeLessThan(260);
    // A chain with labels on the arrows keeps the vertical layout, because labels need room.
    const labelled = { ...specs.kette, knoten: specs.kette.knoten, verbindungen: specs.kette.knoten.slice(1).map((k, i) => ({ von: String(i), nach: k.id, text: "dann" })) };
    expect(new Set(kaesten(szeneVon(parseSchaubild(labelled, 1), 450, false).formen).map((b) => Math.round(b.y))).size).toBe(7);
  });

  it("hides the text of blank boxes for students and shows it in the teacher's copy", () => {
    const s = parseSchaubild(gesetz, 1);
    const student = kaesten(szeneVon(s, 450, false).formen);
    const teacher = kaesten(szeneVon(s, 450, true).formen);
    expect(student.filter((b) => b.stil === "leer").map((b) => [b.nr, b.zeilen.length])).toEqual([[1, 0], [2, 0]]);
    expect(teacher.flatMap((b) => b.zeilen).join(" ")).toContain("Bundestag");
    expect(student.flatMap((b) => b.zeilen).join(" ")).not.toContain("Bundestag");
    // A blank box leaves room to write: at least two lines high.
    expect(Math.min(...student.filter((b) => b.stil === "leer").map((b) => b.h))).toBeGreaterThanOrEqual(35);
  });

  it("breaks long text at spaces and cuts words that are too long", () => {
    const lines = umbrechen("Verfassungsbeschwerdeverfahren beim Bundesverfassungsgericht", 80);
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.slice(0, -1).filter((l) => l.endsWith("-")).length).toBeGreaterThan(0);
  });

  it("chooses round axis values", () => {
    expect(achse(24.3)).toEqual({ top: 30, step: 10 });
    expect(achse(150)).toEqual({ top: 150, step: 50 });
    expect(achse(0.8).top).toBeCloseTo(0.8);
  });

  it("makes the key and the word bank from the hidden texts", () => {
    const s = parseSchaubild(gesetz, 1);
    const v = versteckt(s, "x");
    expect(v.loesung).toBe("1 = Der Bundestag berät und beschließt,  2 = Der Bundesrat wirkt mit");
    expect(v.wortliste?.split("   ·   ").sort()).toEqual(["Der Bundesrat wirkt mit", "Der Bundestag berät und beschließt"]);
    expect(versteckt(parseSchaubild({ art: "saeulen", leer: true, einheit: "Mio.", saeulen: [{ name: "2021", wert: 12 }, { name: "2022", wert: 7.5 }] }, 1), "x").loesung).toBe("2021: 12 Mio.,  2022: 7,5 Mio.");
  });
});

describe("in a worksheet", () => {
  const blatt = () =>
    parseArbeitsblatt({
      titel: "Das politische System der BRD",
      aufgaben: [
        { text: "Trage die fehlenden Organe ein.", schaubild: gesetz },
        { text: "Beschreibe in zwei Sätzen, warum der Bundesrat mitwirkt.", zeilen: 2 },
      ],
    });

  it("draws the diagram in the PDF, with the word bank, and fills it in for the teacher", async () => {
    const a = blatt();
    expect(a.aufgaben[0]!.typ.art).toBe("schaubild");
    expect(koerperVon(a.aufgaben[0]!.typ, "s")).toMatchObject({ art: "schaubild", wortliste: expect.stringContaining("Bundesrat") });
    expect(loesungVon(a.aufgaben[0]!.typ, "s")).toContain("1 = Der Bundestag");

    const student = await renderArbeitsblatt(a);
    const teacher = await renderArbeitsblatt(a, { lehrerexemplar: true });
    const text = async (pdf: Buffer) => {
      const f = await readPdf(pdf);
      const t = f.pages.flatMap((p) => p.rows.map((r) => r.text)).join("\n");
      await f.close();
      return t;
    };
    const s = await text(student.pdf);
    const t = await text(teacher.pdf);
    expect(s).toContain("Gesetzentwurf");
    expect(s).toContain("So wird ein Gesetz gemacht");
    expect(s).toContain("Der Bundesrat wirkt mit"); // in the word bank
    expect(t).toContain("1 = Der Bundestag"); // the key
    expect(student.pages).toBe(1);
  });

  it("puts the diagram into the Word file as a picture", async () => {
    const docx = await arbeitsblattWord(blatt());
    const files = unzipSync(docx);
    const pictures = Object.keys(files).filter((n) => /^word\/media\/.+\.png$/.test(n));
    expect(pictures).toHaveLength(1);
    expect(Buffer.from(files[pictures[0]!]!).subarray(1, 4).toString()).toBe("PNG");
    expect(new TextDecoder().decode(files["word/document.xml"]!)).toContain("Wörter:");
  });

  it("refuses a diagram that does not fit on a page, in words the model can act on", async () => {
    const many = { art: "ablauf", richtung: "senkrecht", knoten: Array.from({ length: 12 }, (_, i) => ({ id: String(i), text: "Ein Schritt mit einem etwas längeren Text, der umbricht" })) };
    await expect(renderArbeitsblatt(parseArbeitsblatt({ titel: "x", aufgaben: [{ text: "y", schaubild: many }] }))).rejects.toThrow(/zu groß/);
  });
});

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { strFromU8, unzipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { tools } from "../agent/tools.ts";
import { MaterialError } from "../material/layout.ts";
import { parsePraesentation, renderPptx } from "../material/praesentation.ts";
import { parseSchaubild, szeneVon, versteckt } from "../material/schaubild.ts";
import { szeneAlsPng } from "../material/schaubild-zeichnen.ts";
import { UserError } from "../workspace/index.ts";
import { bilderDir, ladeBild, listBilder, parseBildInfo, pngMasse } from "./index.ts";

const hasPoppler = (() => {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

/** An invented window, drawn here: no real program, no real data. */
const fenster = () => {
  const c = createCanvas(1200, 700);
  const g = c.getContext("2d");
  g.fillStyle = "#2b579a";
  g.fillRect(0, 0, 1200, 700);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 40, 1200, 110);
  g.fillStyle = "#e6e6e6";
  g.fillRect(0, 150, 220, 520);
  g.fillStyle = "#f7f7f7";
  g.fillRect(220, 150, 980, 520);
  g.fillStyle = "#444444";
  g.fillRect(0, 670, 1200, 30);
  return c.toBuffer("image/png");
};
const elemente = [
  { id: "menueband", name: "Menüband", ort: "oben", rechteck: [0, 40, 1200, 110] },
  { id: "folien", name: "Folienbereich", ort: "links", rechteck: [0, 150, 220, 520] },
  { id: "flaeche", name: "Arbeitsfläche", ort: "Mitte", rechteck: [220, 150, 980, 520] },
  { id: "status", name: "Statusleiste", rechteck: [0, 670, 1200, 30] },
];
const beschreibung = { titel: "Fenster eines Beispielprogramms", programm: "Beispiel", version: "1", sprache: "de", datum: "2026-10-11", elemente };

let home: string;
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pult-bilder-"));
  process.env.PULT_HOME = home;
  await mkdir(bilderDir(), { recursive: true });
  await writeFile(join(bilderDir(), "fenster.png"), fenster());
  await writeFile(join(bilderDir(), "fenster.json"), JSON.stringify(beschreibung));
});

describe("picture library", () => {
  it("reads the size from the PNG header and refuses other files", () => {
    expect(pngMasse(fenster())).toEqual({ breite: 1200, hoehe: 700 });
    expect(pngMasse(Buffer.from("kein Bild, nur Text, aber lang genug für den Kopf"))).toBeUndefined();
  });

  it("loads a picture with its places and lists it", async () => {
    const b = await ladeBild("fenster");
    expect(b).toMatchObject({ id: "fenster", breite: 1200, hoehe: 700, programm: "Beispiel" });
    expect(b.elemente).toHaveLength(4);
    expect((await listBilder()).bilder.map((x) => x.id)).toEqual(["fenster"]);
  });

  it("explains in plain words: unknown id, broken description, rectangle outside the picture, bad file", async () => {
    await expect(ladeBild("gibtsnicht")).rejects.toThrow("Das Bild „gibtsnicht“ gibt es nicht. Vorhanden: fenster.");
    await expect(ladeBild("../etc/passwd")).rejects.toBeInstanceOf(UserError);
    expect(() => parseBildInfo({ titel: "x", elemente: [{ id: "a", name: "A", rechteck: [0, 0, 5000, 10] }] }, "x", 100, 100)).toThrow(/Das Rechteck liegt nicht im Bild \(100 x 100 Pixel\)/);
    expect(() => parseBildInfo({ titel: "x", elemente: [{ id: "a", name: "A", rechteck: [0, 0, 5] }] }, "x", 100, 100)).toThrow("vier Zahlen");
    expect(() => parseBildInfo({ titel: "x", elemente: [{ id: "A b", name: "A", rechteck: [0, 0, 5, 5] }] }, "x", 100, 100)).toThrow("kleinen Buchstaben");
    expect(() => parseBildInfo({ titel: "x", elemente: [{ id: "a", name: "A", rechteck: [0, 0, 5, 5] }, { id: "a", name: "B", rechteck: [0, 0, 5, 5] }] }, "x", 100, 100)).toThrow("kommt zweimal vor");
    await writeFile(join(bilderDir(), "kaputt.png"), "kein png");
    await writeFile(join(bilderDir(), "kaputt.json"), "{}");
    await writeFile(join(bilderDir(), "schief.png"), fenster());
    await writeFile(join(bilderDir(), "schief.json"), "{ nicht json");
    const { bilder, probleme } = await listBilder();
    expect(bilder.map((b) => b.id)).toEqual(["fenster"]); // the broken ones do not stop the good one
    expect(probleme.join("\n")).toMatch(/kaputt\.png ist keine PNG-Datei/);
    expect(probleme.join("\n")).toMatch(/schief\.json ist keine gültige Beschreibung/);
  });
});

const sb = async (extra: object = {}, knoten = [{ id: "menueband", text: "Menüband", leer: true }, { id: "folien", text: "Folienbereich", leer: true }, { id: "status", text: "Statusleiste" }]) =>
  parseSchaubild({ art: "bild", bild: "fenster", bildDaten: await ladeBild("fenster"), knoten, wortliste: true, ...extra }, 1);

describe("diagram of the art bild", () => {
  it("refuses a missing picture, unknown places, doubles and too many", async () => {
    expect(() => parseSchaubild({ art: "bild", knoten: [{ id: "a" }] }, 1)).toThrow("Das Bild fehlt");
    await expect(sb({}, [{ id: "gibtsnicht", text: "x", leer: false }])).rejects.toThrow(/Stelle 1 \(„gibtsnicht“\) gibt es im Bild „fenster“ nicht\. Vorhanden: menueband, folien, flaeche, status/);
    await expect(sb({}, [{ id: "status", text: "a", leer: false }, { id: "status", text: "b", leer: false }])).rejects.toThrow("doppelt");
    await expect(sb({}, [])).rejects.toThrow(MaterialError);
    // The model cannot smuggle in a "picture" of its own.
    expect(() => parseSchaubild({ art: "bild", bildDaten: { png: "x", elemente: [] }, knoten: [{ id: "a" }] }, 1)).toThrow("Das Bild fehlt");
  });

  it("uses the name of the place when no text is given", async () => {
    const s = await sb({}, [{ id: "flaeche", text: undefined as unknown as string, leer: false }]);
    expect(s.knoten[0]!.text).toBe("Arbeitsfläche");
  });

  it("lays out the picture with numbered outlines inside it, and a list below", async () => {
    const s = await sb();
    const sz = szeneVon(s, 450, false);
    const image = sz.formen.find((f) => f.k === "bild")!;
    expect(image).toMatchObject({ x: 0, y: 0, w: 450 });
    const frames = sz.formen.filter((f) => f.k === "rahmen");
    expect(frames).toHaveLength(3);
    for (const f of frames) {
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x + f.w).toBeLessThanOrEqual(450.01);
      expect(f.y + f.h).toBeLessThanOrEqual((image as { h: number }).h + 0.01);
    }
    expect(frames.map((f) => (f as { nr: number }).nr)).toEqual([1, 2, 3]);
    const list = sz.formen.filter((f) => f.k === "etikett");
    expect(list).toHaveLength(3);
    expect(list.every((f) => f.y >= (image as { h: number }).h)).toBe(true);
  });

  it("keeps a tall picture within the width and 1.1 times the width in height", async () => {
    const b = await ladeBild("fenster");
    const tall = { ...b, breite: 600, hoehe: 3000, elemente: [{ id: "a", name: "A", rechteck: [0, 0, 600, 100] as [number, number, number, number] }] };
    const s = parseSchaubild({ art: "bild", bildDaten: tall, knoten: [{ id: "a", text: "A" }] }, 1);
    const image = szeneVon(s, 450, false).formen.find((f) => f.k === "bild")! as { w: number; h: number; x: number };
    expect(image.h).toBeLessThanOrEqual(450 * 1.1 + 0.01);
    expect(image.x + image.w).toBeLessThanOrEqual(450.01);
  });

  it("hides the labels of blank places from the students and shows them on the teacher's copy, with the numbers of the picture", async () => {
    const s = await sb();
    const labels = (loesung: boolean) => szeneVon(s, 450, loesung).formen.flatMap((f) => (f.k === "etikett" ? [{ leer: f.leer, zeilen: f.zeilen, nr: f.nr }] : []));
    expect(labels(false)).toEqual([{ leer: true, zeilen: [], nr: 1 }, { leer: true, zeilen: [], nr: 2 }, { leer: false, zeilen: ["Statusleiste"], nr: 3 }]);
    expect(labels(true).map((l) => l.zeilen[0])).toEqual(["Menüband", "Folienbereich", "Statusleiste"]);
    const k = versteckt(s, "seed");
    expect(k.loesung).toBe("1 = Menüband,  2 = Folienbereich");
    expect(k.wortliste?.split("   ·   ").sort()).toEqual(["Folienbereich", "Menüband"]);
    // The numbers stay the numbers of the picture when a place in between is not blank.
    const mixed = await sb({}, [{ id: "status", text: "Statusleiste", leer: false }, { id: "menueband", text: "Menüband", leer: true }]);
    expect(versteckt(mixed, "s").loesung).toBe("2 = Menüband");
  });

  it("is drawn as a picture for Word files", async () => {
    const png = szeneAlsPng(szeneVon(await sb(), 450, false), 2);
    expect(pngMasse(png)!.breite).toBeGreaterThan(890);
  });
});

describe("tools and materials", () => {
  const tool = (name: string) => tools.find((t) => t.name === name)! as unknown as { execute: (id: string, args: Record<string, unknown>) => Promise<{ content: { text: string }[]; details?: { materials?: { path: string }[] } }> };

  it("lists pictures by search words and says honestly when nothing fits", async () => {
    const all = await tool("bilder_suchen").execute("1", {});
    expect(all.content[0]!.text).toContain("fenster: Fenster eines Beispielprogramms (Beispiel, 1, de, 2026-10-11)");
    expect(all.content[0]!.text).toContain("menueband = Menüband [oben]");
    expect((await tool("bilder_suchen").execute("1", { suche: "statusleiste" })).content[0]!.text).toContain("fenster:");
    expect((await tool("bilder_suchen").execute("1", { suche: "access tabelle" })).content[0]!.text).toBe("Dazu gibt es kein Bild in der Bibliothek.");
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-leer-"));
    expect((await tool("bilder_suchen").execute("1", {})).content[0]!.text).toMatch(/^Die Bibliothek ist leer\./);
  });

  it("puts the picture into a worksheet: student copy without the solution, teacher copy with it", async () => {
    const res = await tool("arbeitsblatt_erstellen").execute("1", {
      titel: "Das Fenster",
      fach: "INWI",
      aufgaben: [{ text: "Beschrifte die markierten Bereiche.", art: "schaubild", schaubild: { art: "bild", bild: "fenster", wortliste: true, knoten: [{ id: "menueband", text: "Menüband", leer: true }, { id: "folien", text: "Folienbereich", leer: true }] } }],
    });
    const files = res.details!.materials!.map((m) => join(home, m.path));
    expect(files.length).toBeGreaterThanOrEqual(1);
    if (!hasPoppler) return;
    const text = (f: string) => execFileSync("pdftotext", [f, "-"]).toString();
    const student = files.find((f) => !/Loesung/.test(f))!;
    expect(text(student)).not.toContain("1 = Menüband");
    const teacher = files.find((f) => /Loesung/.test(f));
    if (teacher) expect(text(teacher)).toContain("1 = Menüband");
    expect(execFileSync("pdfimages", ["-list", student]).toString()).toMatch(/\bimage\b/);
  });

  it("refuses a worksheet that names a picture that does not exist, with the ids that do", async () => {
    await expect(tool("arbeitsblatt_erstellen").execute("1", { titel: "x", aufgaben: [{ text: "t", art: "schaubild", schaubild: { art: "bild", bild: "nein", knoten: [{ id: "a", text: "A" }] } }] })).rejects.toThrow(/Das Bild „nein“ gibt es nicht\. Vorhanden: fenster\./);
  });

  it("puts the picture into a PowerPoint slide as a picture with outlines on top, editable", async () => {
    const deck = parsePraesentation({ titel: "x", folien: [{ titel: "Das Fenster", schaubild: { art: "bild", bildDaten: await ladeBild("fenster"), knoten: [{ id: "menueband", text: "Menüband", leer: true }, { id: "status", text: "Statusleiste" }] } }] });
    const xml = strFromU8(unzipSync(await renderPptx(deck))["ppt/slides/slide2.xml"]!);
    expect(xml).toContain("<p:pic>");
    expect(xml).toContain("Statusleiste");
    expect((xml.match(/name="Schaubild"/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });
});

/**
 * Picture library: screenshots (and other pictures) with a description of what is where in them, kept in the folder
 * Bilder/ of the user's data. A picture is `<id>.png`, its description is `<id>.json`:
 *   { "titel", "programm", "version", "sprache", "datum", "elemente": [{ "id", "name", "ort", "rechteck": [x, y, breite, hoehe] }] }
 * with the rectangle in pixels of the picture. Pult ships no pictures, only the mechanism: the pictures are the teacher's own.
 * The model never sees a path, only the id. Everything is checked here, so a broken file gives a plain message.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "../paths.ts";
import { UserError } from "../workspace/index.ts";

export const bilderDir = () => join(dataDir(), "Bilder");
export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_PIXEL = 5000;
export const MAX_ELEMENTE = 80;

export interface BildElement {
  id: string;
  name: string;
  ort?: string;
  /** x, y, width, height in pixels of the picture. */
  rechteck: [number, number, number, number];
}
export interface BildInfo {
  id: string;
  titel: string;
  programm?: string;
  version?: string;
  sprache?: string;
  datum?: string;
  breite: number;
  hoehe: number;
  elemente: BildElement[];
}
export interface Bild extends BildInfo {
  png: Buffer;
}

const ID = /^[a-z0-9][a-z0-9-]{0,60}$/;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width and height from the PNG header, or undefined when it is not a PNG. */
export function pngMasse(buf: Buffer): { breite: number; hoehe: number } | undefined {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG) || buf.toString("ascii", 12, 16) !== "IHDR") return undefined;
  return { breite: buf.readUInt32BE(16), hoehe: buf.readUInt32BE(20) };
}

const text = (v: unknown, was: string, max: number, datei: string, required = false): string | undefined => {
  if (v === undefined || v === null || v === "") {
    if (required) throw new UserError(`${datei}: Es fehlt ${was}.`);
    return undefined;
  }
  if (typeof v !== "string" || v.trim().length > max) throw new UserError(`${datei}: ${was} muss Text sein, höchstens ${max} Zeichen.`);
  return v.trim();
};

/** Checks the description of a picture of the given size. */
export function parseBildInfo(raw: unknown, id: string, breite: number, hoehe: number): BildInfo {
  const datei = `Bilder/${id}.json`;
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.elemente)) throw new UserError(`${datei}: Es fehlt die Liste „elemente“.`);
  if (o.elemente.length > MAX_ELEMENTE) throw new UserError(`${datei}: Höchstens ${MAX_ELEMENTE} Elemente.`);
  const seen = new Set<string>();
  const elemente = o.elemente.map((x, i): BildElement => {
    const e = (x ?? {}) as Record<string, unknown>;
    const wo = `${datei}, Element ${i + 1}`;
    const eid = text(e.id, "die Kennung (id)", 40, wo, true)!;
    if (!ID.test(eid)) throw new UserError(`${wo}: Die Kennung „${eid}“ darf nur aus kleinen Buchstaben, Ziffern und Bindestrichen bestehen.`);
    if (seen.has(eid)) throw new UserError(`${datei}: Die Kennung „${eid}“ kommt zweimal vor.`);
    seen.add(eid);
    const r = e.rechteck;
    if (!Array.isArray(r) || r.length !== 4 || r.some((n) => typeof n !== "number" || !Number.isFinite(n))) throw new UserError(`${wo}: Das Rechteck braucht vier Zahlen: x, y, Breite, Höhe.`);
    const [x0, y0, w, h] = r as [number, number, number, number];
    if (w <= 0 || h <= 0 || x0 < 0 || y0 < 0 || x0 + w > breite + 0.5 || y0 + h > hoehe + 0.5) throw new UserError(`${wo} („${eid}“): Das Rechteck liegt nicht im Bild (${breite} x ${hoehe} Pixel).`);
    return { id: eid, name: text(e.name, "der Name", 60, wo, true)!, ort: text(e.ort, "der Ort", 120, wo), rechteck: [x0, y0, w, h] };
  });
  return {
    id,
    titel: text(o.titel, "der Titel", 100, datei, true)!,
    programm: text(o.programm, "das Programm", 40, datei),
    version: text(o.version, "die Version", 40, datei),
    sprache: text(o.sprache, "die Sprache", 10, datei),
    datum: text(o.datum, "das Datum", 20, datei),
    breite,
    hoehe,
    elemente,
  };
}

async function laden(id: string): Promise<Bild> {
  const base = join(bilderDir(), id);
  let png: Buffer;
  let json: string;
  try {
    [png, json] = await Promise.all([readFile(`${base}.png`), readFile(`${base}.json`, "utf8")]);
  } catch {
    throw new UserError(`Das Bild „${id}“ ist unvollständig: Es braucht ${id}.png und ${id}.json im Ordner Bilder.`);
  }
  if (png.length > MAX_BYTES) throw new UserError(`Bilder/${id}.png ist zu groß (höchstens ${MAX_BYTES / 1024 / 1024} MB).`);
  const m = pngMasse(png);
  if (!m) throw new UserError(`Bilder/${id}.png ist keine PNG-Datei.`);
  if (m.breite > MAX_PIXEL || m.hoehe > MAX_PIXEL) throw new UserError(`Bilder/${id}.png ist zu groß (höchstens ${MAX_PIXEL} Pixel je Seite).`);
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new UserError(`Bilder/${id}.json ist keine gültige Beschreibung (JSON-Fehler).`);
  }
  return { ...parseBildInfo(raw, id, m.breite, m.hoehe), png };
}

/** One picture with its file, or a message in plain words. */
export async function ladeBild(id: unknown): Promise<Bild> {
  if (typeof id !== "string" || !ID.test(id)) throw new UserError(`Die Bild-Kennung „${String(id)}“ ist ungültig. Nimm eine aus bilder_suchen.`);
  try {
    await stat(join(bilderDir(), `${id}.json`));
  } catch {
    const known = (await listBilder()).bilder.map((b) => b.id);
    throw new UserError(`Das Bild „${id}“ gibt es nicht.${known.length ? ` Vorhanden: ${known.join(", ")}.` : " Die Bibliothek ist leer."}`);
  }
  return laden(id);
}

/** All pictures with a valid description. Broken ones are listed as problems and do not stop the others. */
export async function listBilder(): Promise<{ bilder: BildInfo[]; probleme: string[] }> {
  let names: string[] = [];
  try {
    names = (await readdir(bilderDir())).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
  } catch {
    return { bilder: [], probleme: [] };
  }
  const bilder: BildInfo[] = [];
  const probleme: string[] = [];
  for (const id of names) {
    try {
      if (!ID.test(id)) throw new UserError(`Bilder/${id}.json: Der Dateiname darf nur aus kleinen Buchstaben, Ziffern und Bindestrichen bestehen.`);
      const { png: _png, ...info } = await laden(id);
      bilder.push(info);
    } catch (e) {
      probleme.push(e instanceof UserError ? e.message : `Bilder/${id}: ${(e as Error).message}`);
    }
  }
  return { bilder, probleme };
}

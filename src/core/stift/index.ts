/**
 * Dev pencil: while Yannik tests Pult he marks a place on the screen and writes what is wrong. The note is saved here
 * (his own data folder, nothing is sent) with where it was: view, element, rectangle, and on request a screenshot.
 * The export is one file he gives to the developer. Only for the development phase: the server turns it on with PULT_STIFT=1.
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir } from "../paths.ts";
import { zipFiles } from "../workspace/zip.ts";

export const MAX_NOTIZ = 1500;
export const MAX_BILD_BYTES = 3 * 1024 * 1024;
export const MAX_EINTRAEGE = 300;
export class StiftFehler extends Error {}

export interface Rechteck { x: number; y: number; w: number; h: number }
export interface Ziel {
  art: "element" | "bereich";
  /** Short CSS path to the element, so the developer can find it in the code. */
  selektor?: string;
  tag?: string;
  /** What the element says (its text), short. */
  text?: string;
  beschriftung?: string;
  rolle?: string;
  rechteck: Rechteck;
}
export interface Ansicht { url: string; titel: string; ueberschriften: string[]; fenster: { w: number; h: number } }
export interface StiftEintrag { id: string; zeit: string; notiz: string; ansicht: Ansicht; ziel: Ziel; bild?: string }

const dir = () => join(dataDir(), "Dev-Hinweise");
const ID = /^[0-9a-f-]{36}$/;
const text = (v: unknown, was: string, max: number, required = false): string | undefined => {
  if (v === undefined || v === null || v === "") {
    if (required) throw new StiftFehler(`Es fehlt: ${was}.`);
    return undefined;
  }
  if (typeof v !== "string") throw new StiftFehler(`${was} muss Text sein.`);
  const t = v.replace(/\r\n?/g, "\n").trim();
  if (t.length > max) throw new StiftFehler(`${was} ist zu lang (höchstens ${max} Zeichen).`);
  return t || undefined;
};
const zahl = (v: unknown, was: string): number => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new StiftFehler(`${was} muss eine Zahl sein.`);
  return Math.round(v * 10) / 10;
};

export function pruefeEingabe(raw: unknown): { notiz: string; ansicht: Ansicht; ziel: Ziel; bild?: Buffer } {
  const o = (raw ?? {}) as Record<string, any>;
  const notiz = text(o.notiz, "die Notiz", MAX_NOTIZ, true)!;
  const a = (o.ansicht ?? {}) as Record<string, any>;
  const z = (o.ziel ?? {}) as Record<string, any>;
  const r = (z.rechteck ?? {}) as Record<string, unknown>;
  if (z.art !== "element" && z.art !== "bereich") throw new StiftFehler("Das Ziel ist ein Element oder ein Bereich.");
  const ueberschriften = Array.isArray(a.ueberschriften) ? a.ueberschriften.slice(0, 6).map((h: unknown) => text(h, "eine Überschrift", 120) ?? "") : [];
  let bild: Buffer | undefined;
  if (o.bild !== undefined && o.bild !== null && o.bild !== "") {
    const m = typeof o.bild === "string" ? /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(o.bild) : null;
    if (!m) throw new StiftFehler("Das Bild muss ein PNG sein.");
    bild = Buffer.from(m[1]!, "base64");
    if (bild.length > MAX_BILD_BYTES) throw new StiftFehler("Das Bild ist zu groß (höchstens 3 MB).");
    if (bild.subarray(0, 4).toString("hex") !== "89504e47") throw new StiftFehler("Das Bild ist keine PNG-Datei.");
  }
  return {
    notiz,
    ansicht: {
      url: text(a.url, "die Adresse", 300) ?? "",
      titel: text(a.titel, "der Titel", 200) ?? "",
      ueberschriften: ueberschriften.filter(Boolean),
      fenster: { w: zahl(a.fenster?.w, "die Fensterbreite"), h: zahl(a.fenster?.h, "die Fensterhöhe") },
    },
    ziel: {
      art: z.art,
      selektor: text(z.selektor, "der Selektor", 400),
      tag: text(z.tag, "der Tag", 40),
      text: text(z.text, "der Text", 200),
      beschriftung: text(z.beschriftung, "die Beschriftung", 200),
      rolle: text(z.rolle, "die Rolle", 40),
      rechteck: { x: zahl(r.x, "x"), y: zahl(r.y, "y"), w: zahl(r.w, "die Breite"), h: zahl(r.h, "die Höhe") },
    },
    bild,
  };
}

export async function speichereHinweis(raw: unknown, jetzt = new Date()): Promise<StiftEintrag> {
  const e = pruefeEingabe(raw);
  await mkdir(dir(), { recursive: true });
  if ((await liste()).length >= MAX_EINTRAEGE) throw new StiftFehler(`Es sind schon ${MAX_EINTRAEGE} Hinweise gespeichert. Bitte exportiere sie und lösche sie danach.`);
  const id = randomUUID();
  const eintrag: StiftEintrag = { id, zeit: jetzt.toISOString(), notiz: e.notiz, ansicht: e.ansicht, ziel: e.ziel, ...(e.bild ? { bild: `${id}.png` } : {}) };
  if (e.bild) await writeFile(join(dir(), `${id}.png`), e.bild);
  await writeFile(join(dir(), `${id}.json`), JSON.stringify(eintrag, null, 2));
  return eintrag;
}

/** All notes, oldest first. */
export async function liste(): Promise<StiftEintrag[]> {
  let names: string[];
  try {
    names = (await readdir(dir())).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  const out: StiftEintrag[] = [];
  for (const n of names) {
    try {
      out.push(JSON.parse(await readFile(join(dir(), n), "utf8")) as StiftEintrag);
    } catch {
      // A broken file is skipped.
    }
  }
  return out.sort((a, b) => a.zeit.localeCompare(b.zeit));
}

export async function loescheHinweis(id: string): Promise<void> {
  if (!ID.test(id)) throw new StiftFehler("Diese Kennung gibt es nicht.");
  await rm(join(dir(), `${id}.json`), { force: true });
  await rm(join(dir(), `${id}.png`), { force: true });
}

const code = (s: string) => `\`${s.replace(/`/g, "'")}\``;

/** One readable file for the developer: what was marked, where, what is wrong. Screenshots are named, and in the zip next to it. */
export function alsMarkdown(eintraege: StiftEintrag[], opts: { version?: string; jetzt?: Date } = {}): string {
  const out = [
    "# Hinweise aus dem Test von Pult",
    "",
    `- Erzeugt: ${(opts.jetzt ?? new Date()).toISOString()}${opts.version ? ` · Pult ${opts.version}` : ""}`,
    `- ${eintraege.length} ${eintraege.length === 1 ? "Hinweis" : "Hinweise"}`,
    "",
  ];
  eintraege.forEach((e, i) => {
    const z = e.ziel;
    const erste = e.notiz.split("\n")[0]!.slice(0, 80);
    out.push(`## ${i + 1}. ${erste}`, "");
    if (e.notiz !== erste) out.push(e.notiz, ""); // a one-line note is already the heading
    out.push(`- Ansicht: ${e.ansicht.ueberschriften.length ? e.ansicht.ueberschriften.join(" › ") : e.ansicht.titel || "unbekannt"} (${e.ansicht.url}, Fenster ${e.ansicht.fenster.w} x ${e.ansicht.fenster.h})`);
    out.push(`- Markiert: ${z.art === "element" ? "ein Element" : "ein Bereich"}, ${z.rechteck.w} x ${z.rechteck.h} bei ${z.rechteck.x}/${z.rechteck.y}`);
    if (z.selektor) out.push(`- Stelle im Code: ${code(z.selektor)}`);
    if (z.tag || z.rolle) out.push(`- Art: ${[z.tag, z.rolle].filter(Boolean).join(", ")}`);
    if (z.beschriftung) out.push(`- Beschriftung: ${z.beschriftung}`);
    if (z.text) out.push(`- Text im Element: „${z.text}“`);
    if (e.bild) out.push(`- Bildschirmfoto: ${e.bild}`);
    out.push(`- Gespeichert: ${e.zeit}`, "");
  });
  return `${out.join("\n").trimEnd()}\n`;
}

export async function exportiere(opts: { version?: string; jetzt?: Date } = {}): Promise<{ markdown: string; zip: Uint8Array }> {
  const alle = await liste();
  const markdown = alsMarkdown(alle, opts);
  const files: { name: string; data: Uint8Array }[] = [{ name: "hinweise.md", data: new TextEncoder().encode(markdown) }];
  for (const e of alle) if (e.bild) files.push({ name: e.bild, data: await readFile(join(dir(), e.bild)).catch(() => new Uint8Array()) });
  return { markdown, zip: zipFiles(files) };
}

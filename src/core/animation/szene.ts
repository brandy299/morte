/**
 * Explainer piece (Erklärstück): the model writes the content as scenes, each in one of a few fixed layouts
 * (cards, steps, a flow with arrows, a big number, ...). This file checks it and explains every problem in plain words.
 * The model never gives sizes or positions: the layouts (html.ts, assets/animation/szenen.css) do that.
 */
import { MaterialError, str } from "../material/layout.ts";
import { STANDARD_STIL, STILE } from "./stile.ts";
import { symbolMitId } from "./symbole.ts";

export const LAYOUTS = ["punkte", "schritte", "ablauf", "kreislauf", "zahl", "vergleich", "zeitstrahl", "aussage", "merksatz"] as const;
export type Layout = (typeof LAYOUTS)[number];
export const TEMPI = ["ruhig", "mittel", "zuegig"] as const;
export type Tempo = (typeof TEMPI)[number];
/** Quiet moving backgrounds (assets/animation/hintergrund.js), or none. */
export const HINTERGRUENDE = ["wellenlinien", "wellenringe", "formen", "flecken", "punktraster", "flaechen", "keiner"] as const;
export type Hintergrund = (typeof HINTERGRUENDE)[number];

export const MAX_SZENEN = 10;

export interface Punkt {
  titel: string;
  text?: string;
  symbol?: string;
  /** zeitstrahl: the year or date. */
  zahl?: string;
  /** ablauf, kreislauf: what the arrow to the next station says. */
  pfeil?: string;
  /** vergleich: the entries of this side. */
  liste?: string[];
}
export interface Szene {
  layout: Layout;
  kicker?: string;
  titel?: string;
  text?: string;
  zahl?: string;
  symbol?: string;
  quelle?: string;
  punkte: Punkt[];
}
export interface Erklaerstueck {
  titel: string;
  untertitel?: string;
  /** Small line over the title, e.g. subject and class. */
  kopf?: string;
  stil: string;
  tempo: Tempo;
  hintergrund: Hintergrund;
  szenen: Szene[];
}

/** How many entries (punkte) each layout takes, and how long their texts may be. */
const REGELN: Record<Layout, { punkte: [number, number]; titel: number; text: number }> = {
  punkte: { punkte: [2, 6], titel: 40, text: 110 },
  schritte: { punkte: [2, 5], titel: 40, text: 110 },
  ablauf: { punkte: [2, 4], titel: 36, text: 90 },
  kreislauf: { punkte: [3, 4], titel: 36, text: 90 },
  vergleich: { punkte: [2, 2], titel: 36, text: 0 },
  zeitstrahl: { punkte: [3, 5], titel: 32, text: 80 },
  zahl: { punkte: [0, 0], titel: 0, text: 0 },
  aussage: { punkte: [0, 0], titel: 0, text: 0 },
  merksatz: { punkte: [0, 0], titel: 0, text: 0 },
};

const oneOf = <T extends string>(v: unknown, list: readonly T[], what: string, fallback?: T): T => {
  if (v === undefined || v === null || v === "") {
    if (fallback) return fallback;
    throw new MaterialError(`Es fehlt: ${what}.`);
  }
  if (typeof v !== "string" || !(list as readonly string[]).includes(v)) throw new MaterialError(`${what}: „${String(v)}“ gibt es nicht. Erlaubt: ${list.join(", ")}.`);
  return v as T;
};

/** `str` with the place (scene, entry) in front of the message, so the model knows what to fix. */
const feld = (stelle: string, v: unknown, was: string, max: number, required = false): string | undefined => {
  try {
    return str(v, was, max, required);
  } catch (e) {
    throw e instanceof MaterialError ? new MaterialError(`${stelle}: ${e.message}`) : e;
  }
};

/** Checks the raw scene description from the model and explains every problem in plain words. */
export function parseErklaerstueck(raw: unknown): Erklaerstueck {
  if (!raw || typeof raw !== "object") throw new MaterialError("Die Szenenbeschreibung fehlt.");
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.szenen) || o.szenen.length === 0) throw new MaterialError("Es fehlen die Szenen.");
  if (o.szenen.length > MAX_SZENEN) throw new MaterialError(`Es sind ${o.szenen.length} Szenen. Höchstens ${MAX_SZENEN}, sonst wird es zu lang. Fasse zusammen oder teile das Thema in zwei Erklärstücke.`);
  // Unknown symbols are collected and named together, so the model fixes them in one go.
  const unbekannt: string[] = [];
  const symbol = (stelle: string, v: unknown): string | undefined => {
    const id = feld(stelle, v, "das Symbol (symbol)", 40);
    if (id && !symbolMitId(id)) unbekannt.push(`„${id}“ (${stelle})`);
    return id;
  };
  const szenen = o.szenen.map((s, i): Szene => {
    const stelle = `Szene ${i + 1}`;
    const e = (s ?? {}) as Record<string, unknown>;
    const layout = oneOf(e.layout, LAYOUTS, `${stelle}: Das Layout (layout)`);
    const regel = REGELN[layout];
    const roh = Array.isArray(e.punkte) ? e.punkte : [];
    const [min, max] = regel.punkte;
    if (max === 0 && roh.length) throw new MaterialError(`${stelle}: Das Layout „${layout}“ hat keine Einträge (punkte). Nimm „punkte“ oder „schritte“, wenn du mehrere Dinge zeigen willst.`);
    if (roh.length < min || roh.length > max) throw new MaterialError(`${stelle}: Das Layout „${layout}“ braucht ${min === max ? `genau ${min}` : `${min} bis ${max}`} Einträge (punkte), es sind ${roh.length}. ${roh.length > max ? "Verteile sie auf zwei Szenen." : "Ergänze Einträge oder nimm ein anderes Layout."}`);
    // Many cards side by side are narrow, so their texts must be shorter.
    const textMax = roh.length >= 5 ? Math.min(regel.text, 80) : regel.text;
    const punkte = roh.map((x, j): Punkt => {
      const ort = `${stelle}, Eintrag ${j + 1}`;
      const p = (x ?? {}) as Record<string, unknown>;
      const punkt: Punkt = { titel: feld(ort, p.titel, "die Überschrift (titel)", regel.titel, true)! };
      if (textMax) punkt.text = feld(ort, p.text, "der Text", textMax);
      if (layout === "punkte" || layout === "ablauf" || layout === "kreislauf") punkt.symbol = symbol(ort, p.symbol);
      if (layout === "zeitstrahl") punkt.zahl = feld(ort, p.zahl, "das Jahr oder Datum (zahl)", 12, true)!;
      if ((layout === "ablauf" && j < roh.length - 1) || layout === "kreislauf") punkt.pfeil = feld(ort, p.pfeil, "die Beschriftung des Pfeils (pfeil)", 18);
      if (layout === "vergleich") {
        if (!Array.isArray(p.liste) || p.liste.length < 1 || p.liste.length > 4) throw new MaterialError(`${ort}: Jede Seite eines Vergleichs braucht 1 bis 4 kurze Zeilen (liste).`);
        punkt.liste = p.liste.map((z, k) => feld(ort, z, `Zeile ${k + 1} der Liste`, 70, true)!);
      }
      return punkt;
    });
    const szene: Szene = { layout, kicker: feld(stelle, e.kicker, "die kleine Zeile über dem Titel (kicker)", 40), titel: feld(stelle, e.titel, "der Titel", 70, layout !== "merksatz"), punkte };
    if (layout === "zahl") {
      szene.zahl = feld(stelle, e.zahl, "die Zahl (zahl)", 8, true)!;
      szene.text = feld(stelle, e.text, "der Text", 160);
    } else if (layout === "aussage") {
      szene.text = feld(stelle, e.text, "der Text", 280, true)!;
      szene.symbol = symbol(stelle, e.symbol);
    } else if (layout === "merksatz") {
      szene.text = feld(stelle, e.text, "der Merksatz (text)", 170, true)!;
      szene.quelle = feld(stelle, e.quelle, "die Quelle", 60);
    } else szene.text = feld(stelle, e.text, "der Satz unter dem Titel (text)", 120);
    return szene;
  });
  if (unbekannt.length) throw new MaterialError(`${unbekannt.length === 1 ? "Dieses Symbol gibt es nicht" : "Diese Symbole gibt es nicht"}: ${unbekannt.join(", ")}. Such mit symbole_suchen passende heraus oder lass sie weg.`);
  return {
    titel: str(o.titel, "der Titel", 80, true)!,
    untertitel: str(o.untertitel, "der Untertitel", 120),
    kopf: str(o.kopf, "die Zeile über dem Titel", 100),
    stil: oneOf<string>(o.stil, STILE.map((s) => s.id), "Der Stil (stil)", STANDARD_STIL),
    tempo: oneOf(o.tempo, TEMPI, "Das Tempo", "mittel"),
    hintergrund: oneOf(o.hintergrund, HINTERGRUENDE, "Der Hintergrund", "keiner"),
    szenen,
  };
}

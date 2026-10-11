/**
 * Interactive exercise (Übung): the model writes the steps as data, this file checks them and explains every problem in plain words.
 * Pult draws the page (html.ts). The model never writes code, so this works with every model.
 */
import { MaterialError, str } from "../material/layout.ts";
import { PALETTEN, type Palette } from "../animation/szene.ts";

export const ARTEN = ["info", "auswahl", "lueckentext", "zuordnung", "offen", "checkliste"] as const;
export type Art = (typeof ARTEN)[number];
export const MAX_SCHRITTE = 20;

export interface Info { art: "info"; titel: string; text: string; punkte: string[] }
export interface Auswahl { art: "auswahl"; frage: string; optionen: { text: string; richtig: boolean; erklaerung?: string }[]; mehrere: boolean }
/** `teile`: plain text and gaps in order. A gap lists every accepted answer. */
export interface Lueckentext { art: "lueckentext"; aufgabe?: string; teile: ({ text: string } | { luecke: string[] })[]; hilfe: boolean; erklaerung?: string }
export interface Zuordnung { art: "zuordnung"; aufgabe: string; paare: { links: string; rechts: string }[] }
export interface Offen { art: "offen"; aufgabe: string; hinweis?: string; musterloesung?: string; woerter?: number }
export interface Checkliste { art: "checkliste"; titel: string; punkte: string[] }
export type Schritt = Info | Auswahl | Lueckentext | Zuordnung | Offen | Checkliste;

export interface Uebung {
  titel: string;
  untertitel?: string;
  palette: Palette;
  schritte: Schritt[];
}

const GAP = /\{([^{}]*)\}/g;

/** Splits "Die {Sonne|Sterne} scheint." into text and gaps. */
export function lueckenTeile(text: string, stelle: string): Lueckentext["teile"] {
  const teile: Lueckentext["teile"] = [];
  let last = 0;
  for (const m of text.matchAll(GAP)) {
    const antworten = m[1]!.split("|").map((a) => a.trim()).filter(Boolean);
    if (antworten.length === 0) throw new MaterialError(`${stelle}: Eine Lücke ist leer. Schreib die Antwort in die geschweiften Klammern, zum Beispiel {Sonne}.`);
    if (antworten.some((a) => a.length > 40)) throw new MaterialError(`${stelle}: Eine Antwort in einer Lücke ist zu lang (höchstens 40 Zeichen).`);
    if (m.index! > last) teile.push({ text: text.slice(last, m.index) });
    teile.push({ luecke: antworten });
    last = m.index! + m[0].length;
  }
  if (last < text.length) teile.push({ text: text.slice(last) });
  if (/[{}]/.test(teile.map((t) => ("text" in t ? t.text : "")).join(""))) throw new MaterialError(`${stelle}: Die geschweiften Klammern passen nicht zusammen. Jede Lücke steht in einem Paar, zum Beispiel {Sonne}.`);
  return teile;
}

const list = (v: unknown, what: string, min: number, max: number, itemMax: number, stelle: string): string[] => {
  const a = v === undefined ? [] : v;
  if (!Array.isArray(a)) throw new MaterialError(`${stelle}: ${what} muss eine Liste sein.`);
  if (a.length < min) throw new MaterialError(`${stelle}: ${what}: mindestens ${min} Einträge.`);
  if (a.length > max) throw new MaterialError(`${stelle}: ${what}: höchstens ${max} Einträge, ${a.length} sind zu viel.`);
  return a.map((x, i) => str(x, `${what}, Eintrag ${i + 1} (${stelle})`, itemMax, true)!);
};

/** `str` with the place in front of the message. */
const feld = (stelle: string, v: unknown, was: string, max: number, required = false): string | undefined => {
  try {
    return str(v, was, max, required);
  } catch (e) {
    throw e instanceof MaterialError ? new MaterialError(`${stelle}: ${e.message}`) : e;
  }
};

export function parseUebung(raw: unknown): Uebung {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.schritte) || o.schritte.length === 0) throw new MaterialError("Es fehlen die Schritte.");
  if (o.schritte.length > MAX_SCHRITTE) throw new MaterialError(`Es sind ${o.schritte.length} Schritte. Höchstens ${MAX_SCHRITTE}, sonst wird es zu lang. Teile das Thema in zwei Übungen.`);
  const palette = o.palette === undefined || o.palette === "" ? "wasser" : o.palette;
  if (typeof palette !== "string" || !(PALETTEN as readonly string[]).includes(palette)) throw new MaterialError(`Die Farbwelt (palette): „${String(palette)}“ gibt es nicht. Erlaubt: ${PALETTEN.join(", ")}.`);
  const schritte = o.schritte.map((raw, i): Schritt => {
    const nr = i + 1;
    const stelle = `Schritt ${nr}`;
    const s = (raw ?? {}) as Record<string, unknown>;
    const art = s.art;
    if (typeof art !== "string" || !(ARTEN as readonly string[]).includes(art)) throw new MaterialError(`${stelle}: Die Art „${String(art ?? "")}“ gibt es nicht. Erlaubt: ${ARTEN.join(", ")}.`);
    if (art === "info") {
      const text = feld(stelle, s.text, "der Text", 700);
      const punkte = list(s.punkte, "Die Punkte", 0, 6, 120, stelle);
      if (!text && punkte.length === 0) throw new MaterialError(`${stelle}: Eine Info braucht einen Text oder Punkte.`);
      return { art, titel: feld(stelle, s.titel, "der Titel", 80, true)!, text: text ?? "", punkte };
    }
    if (art === "auswahl") {
      const frage = feld(stelle, s.frage, "die Frage", 200, true)!;
      if (!Array.isArray(s.optionen)) throw new MaterialError(`${stelle}: Es fehlen die Antworten (optionen).`);
      if (s.optionen.length < 2 || s.optionen.length > 5) throw new MaterialError(`${stelle}: Es sind ${s.optionen.length} Antworten. Nötig sind 2 bis 5.`);
      const optionen = s.optionen.map((x, j) => {
        const o2 = (x ?? {}) as Record<string, unknown>;
        const where = `${stelle}, Antwort ${j + 1}`;
        if (typeof o2.richtig !== "boolean") throw new MaterialError(`${where}: Es fehlt, ob die Antwort richtig ist (richtig: true oder false).`);
        return { text: feld(where, o2.text, "der Text", 120, true)!, richtig: o2.richtig, erklaerung: feld(where, o2.erklaerung, "die Erklärung", 200) };
      });
      const richtige = optionen.filter((x) => x.richtig).length;
      if (richtige === 0) throw new MaterialError(`${stelle}: Keine Antwort ist als richtig markiert.`);
      if (richtige === optionen.length) throw new MaterialError(`${stelle}: Alle Antworten sind als richtig markiert. Mindestens eine muss falsch sein.`);
      if (new Set(optionen.map((x) => x.text.toLowerCase())).size < optionen.length) throw new MaterialError(`${stelle}: Zwei Antworten haben denselben Text.`);
      return { art, frage, optionen, mehrere: richtige > 1 };
    }
    if (art === "lueckentext") {
      const text = feld(stelle, s.text, "der Text mit Lücken", 500, true)!;
      const teile = lueckenTeile(text, stelle);
      const luecken = teile.filter((t) => "luecke" in t).length;
      if (luecken === 0) throw new MaterialError(`${stelle}: Der Text hat keine Lücke. Setze die gesuchten Wörter in geschweifte Klammern, zum Beispiel: Die {Sonne} scheint.`);
      if (luecken > 6) throw new MaterialError(`${stelle}: Der Text hat ${luecken} Lücken. Höchstens 6, teile ihn auf zwei Schritte.`);
      return { art, aufgabe: feld(stelle, s.aufgabe, "die Aufgabe", 160), teile, hilfe: s.hilfe === true, erklaerung: feld(stelle, s.erklaerung, "die Erklärung", 300) };
    }
    if (art === "zuordnung") {
      if (!Array.isArray(s.paare)) throw new MaterialError(`${stelle}: Es fehlen die Paare.`);
      if (s.paare.length < 2 || s.paare.length > 6) throw new MaterialError(`${stelle}: Es sind ${s.paare.length} Paare. Nötig sind 2 bis 6.`);
      const paare = s.paare.map((x, j) => {
        const p = (x ?? {}) as Record<string, unknown>;
        const where = `${stelle}, Paar ${j + 1}`;
        return { links: feld(where, p.links, "die linke Seite", 80, true)!, rechts: feld(where, p.rechts, "die rechte Seite", 80, true)! };
      });
      for (const side of ["links", "rechts"] as const) {
        if (new Set(paare.map((p) => p[side].toLowerCase())).size < paare.length) throw new MaterialError(`${stelle}: Zwei Paare haben auf der ${side === "links" ? "linken" : "rechten"} Seite denselben Text. So lässt sich nicht eindeutig zuordnen.`);
      }
      return { art, aufgabe: feld(stelle, s.aufgabe, "die Aufgabe", 200, true)!, paare };
    }
    if (art === "offen") {
      const woerter = s.woerter === undefined ? undefined : Number(s.woerter);
      if (woerter !== undefined && (!Number.isInteger(woerter) || woerter < 1 || woerter > 300)) throw new MaterialError(`${stelle}: Die Wortzahl (woerter) muss eine ganze Zahl von 1 bis 300 sein.`);
      return { art, aufgabe: feld(stelle, s.aufgabe, "die Aufgabe", 300, true)!, hinweis: feld(stelle, s.hinweis, "der Hinweis", 200), musterloesung: feld(stelle, s.musterloesung, "die Musterlösung", 600), woerter };
    }
    return { art: "checkliste", titel: feld(stelle, s.titel, "der Titel", 80, true)!, punkte: list(s.punkte, "Die Punkte", 2, 8, 120, stelle) };
  });
  return { titel: str(o.titel, "der Titel", 80, true)!, untertitel: str(o.untertitel, "der Untertitel", 120), palette: palette as Palette, schritte };
}

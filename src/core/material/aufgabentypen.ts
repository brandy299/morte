/**
 * Task types of a worksheet beyond free text: matching, gap text, multiple choice, table.
 * The model delivers the parts (pairs, sentences, options, rows); the program shuffles, numbers, letters and
 * calculates the solution, so a task can never come out with parts missing and the key always fits the sheet.
 * Shuffling is seeded, so the PDF, the Word file and the teacher's copy show the same order.
 */
import { MaterialError, str } from "./layout.ts";
import { mischen } from "./mischen.ts";
import { parseSchaubild, versteckt, type Schaubild } from "./schaubild.ts";

export type Art = "frei" | "zuordnung" | "luecken" | "auswahl" | "tabelle" | "schaubild";

export interface Typ {
  art: Art;
  paare?: { links: string; rechts: string }[];
  /** Sentences with the missing word in double curly braces: "Yesterday I {{wrote}} a letter." */
  saetze?: string[];
  /** Print the missing words, shuffled, as a word bank. */
  wortliste?: boolean;
  optionen?: string[];
  /** Number of the correct option, 1 = the first. */
  richtig?: number;
  /** Rows to fill in: an empty cell is a blank for the students. `loesung` has every cell filled. */
  tabelle?: { spalten: string[]; zeilen: string[][]; loesung?: string[][] };
  /** A diagram: flow, structure, cycle, timeline, bar chart. */
  schaubild?: Schaubild;
}

const MARK = /\{\{\s*([^{}]+?)\s*\}\}/g;
const BLANK = "__________";
const letter = (i: number) => String.fromCharCode(65 + i);

function list(v: unknown, what: string, nr: number, min: number, max: number): unknown[] {
  if (!Array.isArray(v) || v.length < min) throw new MaterialError(`Aufgabe ${nr} (${what}): Es fehlen Angaben. Gib mindestens ${min} an.`);
  if (v.length > max) throw new MaterialError(`Aufgabe ${nr} (${what}): Das sind zu viele Angaben, höchstens ${max}.`);
  return v;
}

/** Checks the type-specific parts of one task. Which type it is follows from `art`, or from the parts that are given. */
export function parseTyp(t: Record<string, unknown>, nr: number): Typ {
  const art = (t.art as Art | undefined) ?? (t.paare ? "zuordnung" : t.saetze ? "luecken" : t.optionen ? "auswahl" : t.tabelle ? "tabelle" : t.schaubild ? "schaubild" : "frei");
  if (!["frei", "zuordnung", "luecken", "auswahl", "tabelle", "schaubild"].includes(art)) throw new MaterialError(`Aufgabe ${nr}: Die Art „${String(t.art)}“ gibt es nicht. Erlaubt: frei, zuordnung, luecken, auswahl, tabelle, schaubild.`);

  if (art === "zuordnung") {
    const paare = list(t.paare, "Zuordnung", nr, 3, 10).map((p, i) => {
      const o = (p ?? {}) as Record<string, unknown>;
      return { links: str(o.links, `linke Seite von Paar ${i + 1} in Aufgabe ${nr}`, 140, true)!, rechts: str(o.rechts, `rechte Seite von Paar ${i + 1} in Aufgabe ${nr}`, 140, true)! };
    });
    return { art, paare };
  }
  if (art === "luecken") {
    const saetze = list(t.saetze, "Lückentext", nr, 1, 8).map((s, i) => {
      const text = str(s, `Satz ${i + 1} in Aufgabe ${nr}`, 400, true)!;
      const blanks = [...text.matchAll(MARK)];
      if (blanks.length === 0) throw new MaterialError(`Aufgabe ${nr}, Satz ${i + 1}: Markiere das fehlende Wort mit doppelten geschweiften Klammern, zum Beispiel „I {{wrote}} a letter.“`);
      if (blanks.length > 3) throw new MaterialError(`Aufgabe ${nr}, Satz ${i + 1}: Höchstens drei Lücken pro Satz.`);
      return text;
    });
    return { art, saetze, wortliste: t.wortliste === true };
  }
  if (art === "auswahl") {
    const optionen = list(t.optionen, "Auswahl", nr, 2, 5).map((o, i) => str(o, `Antwort ${letter(i)} in Aufgabe ${nr}`, 300, true)!);
    const richtig = Number(t.richtig);
    if (!Number.isInteger(richtig) || richtig < 1 || richtig > optionen.length) throw new MaterialError(`Aufgabe ${nr} (Auswahl): „richtig“ muss die Nummer der richtigen Antwort sein, von 1 bis ${optionen.length}.`);
    return { art, optionen, richtig };
  }
  if (art === "tabelle") {
    const tb = (t.tabelle ?? {}) as Record<string, unknown>;
    const spalten = list(tb.spalten, "Tabelle, Spalten", nr, 2, 5).map((s, i) => str(s, `Spalte ${i + 1} in Aufgabe ${nr}`, 60, true)!);
    const cells = (rows: unknown[], what: string) =>
      rows.map((r, i) => {
        if (!Array.isArray(r) || r.length !== spalten.length) throw new MaterialError(`Aufgabe ${nr} (Tabelle): ${what} ${i + 1} braucht genau ${spalten.length} Felder, eins pro Spalte. Ein leeres Feld ist eine Lücke zum Ausfüllen.`);
        return r.map((c) => String(c ?? "").trim().slice(0, 200));
      });
    const zeilen = cells(list(tb.zeilen, "Tabelle, Zeilen", nr, 1, 10), "Zeile");
    if (!zeilen.some((r) => r.some((c) => c === ""))) throw new MaterialError(`Aufgabe ${nr} (Tabelle): Es gibt keine leeren Felder zum Ausfüllen. Lass in den Zeilen Felder leer.`);
    const loesung = tb.loesung === undefined ? undefined : cells(list(tb.loesung, "Tabelle, Lösung", nr, zeilen.length, zeilen.length), "Lösungszeile");
    return { art, tabelle: { spalten, zeilen, loesung } };
  }
  if (art === "schaubild") return { art, schaubild: parseSchaubild(t.schaubild, nr) };
  return { art: "frei" };
}

// ---------- shuffling ----------

export { mischen } from "./mischen.ts";

// ---------- what is drawn ----------

export type Koerper =
  | { art: "zuordnung"; links: string[]; rechts: string[] }
  | { art: "luecken"; saetze: string[]; wortliste?: string }
  | { art: "auswahl"; optionen: string[] }
  | { art: "tabelle"; spalten: string[]; zeilen: string[][] }
  | { art: "schaubild"; schaubild: Schaubild; wortliste?: string };

/** The parts of a task as they appear on the sheet: numbered, lettered, shuffled, blanks drawn. */
export function koerperVon(typ: Typ, seed: string): Koerper | undefined {
  if (typ.art === "zuordnung" && typ.paare) {
    const order = mischen(typ.paare.length, seed);
    return { art: "zuordnung", links: typ.paare.map((p, i) => `${i + 1}  ${p.links}`), rechts: order.map((idx, pos) => `${letter(pos)}  ${typ.paare![idx]!.rechts}`) };
  }
  if (typ.art === "luecken" && typ.saetze) {
    const answers = typ.saetze.flatMap((s) => [...s.matchAll(MARK)].map((m) => m[1]!));
    return {
      art: "luecken",
      saetze: typ.saetze.map((s, i) => `${String.fromCharCode(97 + i)})  ${s.replace(MARK, BLANK)}`),
      wortliste: typ.wortliste ? mischen(answers.length, `${seed}|w`).map((i) => answers[i]).join("   ·   ") : undefined,
    };
  }
  if (typ.art === "auswahl" && typ.optionen) return { art: "auswahl", optionen: typ.optionen.map((o, i) => `${letter(i)})  ${o}`) };
  if (typ.art === "tabelle" && typ.tabelle) return { art: "tabelle", spalten: typ.tabelle.spalten, zeilen: typ.tabelle.zeilen };
  if (typ.art === "schaubild" && typ.schaubild) return { art: "schaubild", schaubild: typ.schaubild, wortliste: versteckt(typ.schaubild, seed).wortliste };
  return undefined;
}

/**
 * The solution of a task, as text for the teacher's copy. Typed tasks get it from the program, so it always fits the sheet.
 * What the model wrote (`eigene`) is added, for example why a wrong choice tempts students.
 */
export function loesungVon(typ: Typ, seed: string, eigene?: string): string | undefined {
  let own: string | undefined;
  if (typ.art === "zuordnung" && typ.paare) {
    const order = mischen(typ.paare.length, seed);
    own = typ.paare.map((_, i) => `${i + 1}–${letter(order.indexOf(i))}`).join(",  ");
  } else if (typ.art === "luecken" && typ.saetze) {
    own = typ.saetze.map((s, i) => `${String.fromCharCode(97 + i)}) ${[...s.matchAll(MARK)].map((m) => m[1]).join(", ")}`).join("\n");
  } else if (typ.art === "auswahl" && typ.optionen && typ.richtig) {
    own = `Richtig: ${letter(typ.richtig - 1)}) ${typ.optionen[typ.richtig - 1]}`;
  } else if (typ.art === "tabelle" && typ.tabelle?.loesung) {
    own = typ.tabelle.loesung.map((r) => r.join(" | ")).join("\n");
  } else if (typ.art === "schaubild" && typ.schaubild) {
    own = versteckt(typ.schaubild, seed).loesung;
  }
  return [own, eigene].filter(Boolean).join("\n") || undefined;
}

/**
 * Feedback sheet for a text the teacher is correcting: the model delivers findings as data,
 * this file sums the points, looks up the grade range and draws the PDF. The model never calculates.
 * No name fields and no student text is stored here: only the findings the teacher asked for are printed.
 * The grade is only a hint from the teacher's own scale, the teacher decides (see docs/entscheidungen/025-korrektur.md).
 */
import { punktgrenze, type Note } from "../workspace/bewertung.ts";
import { MaterialError, SOFT, SANS_BOLD, mm, newSheet, num, str, table } from "./layout.ts";

export const ARTEN = ["Inhalt", "Aufbau", "Ausdruck", "Grammatik", "Rechtschreibung", "Zeichensetzung", "Sonstiges"] as const;
export type Art = (typeof ARTEN)[number];

export interface Kriterium {
  name: string;
  max: number;
  erreicht: number;
  begruendung?: string;
}

export interface Befund {
  /** Where in the text, e.g. "Absatz 2". */
  abschnitt: string;
  /** Short quote from the text, if useful. */
  zitat?: string;
  art: Art;
  erklaerung: string;
  vorschlag?: string;
}

export interface Rueckmeldung {
  titel: string;
  fach?: string;
  klasse?: string;
  staerken: string[];
  kriterien: Kriterium[];
  befunde: Befund[];
  naechsteSchritte: string[];
  notenschluessel: Note[];
  fuss?: string;
}

const halbe = (n: number) => Number.isFinite(n) && Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;

const liste = (v: unknown, what: string, max: number, len: number): string[] => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new MaterialError(`${what} muss eine Liste sein.`);
  if (v.length > max) throw new MaterialError(`${what}: höchstens ${max} Einträge.`);
  return v.map((x, i) => str(x, `${what} ${i + 1}`, len, true)!);
};

/** Checks content from the model before anything is drawn. */
export function parseRueckmeldung(raw: unknown, rules: { notenschluessel?: Note[] } = {}): Rueckmeldung {
  const o = (raw ?? {}) as Record<string, unknown>;
  const rawK = Array.isArray(o.kriterien) ? (o.kriterien as unknown[]) : [];
  if (rawK.length > 12) throw new MaterialError("Mehr als 12 Kriterien sind zu viele.");
  const kriterien = rawK.map((p, i): Kriterium => {
    const r = (p ?? {}) as Record<string, unknown>;
    const at = `Kriterium ${i + 1}`;
    const max = Number(r.max);
    const erreicht = Number(r.erreicht);
    if (!(max > 0 && max <= 100) || !halbe(max)) throw new MaterialError(`${at}: Die möglichen Punkte müssen zwischen 0,5 und 100 liegen, in halben Schritten.`);
    if (!(erreicht >= 0) || !halbe(erreicht)) throw new MaterialError(`${at}: Die erreichten Punkte müssen eine Zahl ab 0 sein, in halben Schritten.`);
    if (erreicht > max) throw new MaterialError(`${at}: Die erreichten Punkte (${num(erreicht)}) liegen über den möglichen (${num(max)}).`);
    return { name: str(r.name, `der Name von ${at}`, 60, true)!, max, erreicht, begruendung: str(r.begruendung, `die Begründung von ${at}`, 600) };
  });

  const rawB = Array.isArray(o.befunde) ? (o.befunde as unknown[]) : [];
  if (rawB.length > 40) throw new MaterialError("Mehr als 40 Befunde sind zu viele. Fasse Ähnliches zusammen.");
  const befunde = rawB.map((p, i): Befund => {
    const r = (p ?? {}) as Record<string, unknown>;
    const at = `Befund ${i + 1}`;
    if (!ARTEN.includes(r.art as Art)) throw new MaterialError(`${at}: Die Art „${String(r.art)}“ gibt es nicht. Erlaubt sind: ${ARTEN.join(", ")}.`);
    return {
      abschnitt: str(r.abschnitt, `die Stelle von ${at}`, 60, true)!,
      zitat: str(r.zitat, `das Zitat von ${at}`, 300),
      art: r.art as Art,
      erklaerung: str(r.erklaerung, `die Erklärung von ${at}`, 600, true)!,
      vorschlag: str(r.vorschlag, `der Vorschlag von ${at}`, 600),
    };
  });

  const staerken = liste(o.staerken, "Stärken", 6, 300);
  const naechsteSchritte = liste(o.naechsteSchritte, "Nächste Schritte", 6, 300);
  if (kriterien.length + befunde.length + staerken.length === 0) throw new MaterialError("Es fehlt: Befunde, Stärken oder Kriterien.");

  return {
    titel: str(o.titel, "der Titel", 120, true)!,
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    staerken,
    kriterien,
    befunde,
    naechsteSchritte,
    notenschluessel: rules.notenschluessel ?? [],
    fuss: str(o.fuss, "der Fußtext", 200),
  };
}

export const gesamtMax = (r: Rueckmeldung) => r.kriterien.reduce((n, k) => n + k.max, 0);
export const gesamtErreicht = (r: Rueckmeldung) => r.kriterien.reduce((n, k) => n + k.erreicht, 0);

/** Grade range the points fall into on the teacher's scale (best grade first), or undefined without scale or points. */
export function notenHinweis(erreicht: number, gesamt: number, schluessel: Note[]): string | undefined {
  if (gesamt <= 0 || schluessel.length === 0) return undefined;
  return schluessel.find((n) => erreicht >= punktgrenze(gesamt, n.abProzent))?.note;
}

export async function renderRueckmeldung(r: Rueckmeldung): Promise<{ pdf: Buffer; pages: number }> {
  const sheet = newSheet(r.titel);
  sheet.header({ kicker: [r.fach, r.klasse, "Rückmeldung"].filter(Boolean).join(" · "), title: r.titel });

  if (r.staerken.length) {
    sheet.paragraph("Das ist gelungen", { font: SANS_BOLD, size: 11, gap: mm(1.5) });
    sheet.paragraph(r.staerken.map((s) => `+ ${s}`).join("\n\n"), { size: 10.5 });
  }

  if (r.kriterien.length) {
    sheet.room(60);
    sheet.paragraph("Bewertung nach Kriterien", { font: SANS_BOLD, size: 11, gap: mm(1.5) });
    const gesamt = gesamtMax(r);
    const erreicht = gesamtErreicht(r);
    table(
      sheet,
      [{ title: "Kriterium", share: 0.28, bold: true }, { title: "Begründung", share: 0.52 }, { title: "Punkte", share: 0.2, align: "right" }],
      [...r.kriterien.map((k) => [k.name, k.begruendung ?? "", `${num(k.erreicht)} / ${num(k.max)}`]), ["Gesamt", `${num(Math.round((erreicht / gesamt) * 100))} %`, `${num(erreicht)} / ${num(gesamt)}`]],
    );
    const hint = notenHinweis(erreicht, gesamt, r.notenschluessel);
    sheet.paragraph(
      hint
        ? `Nach dem Notenschlüssel liegen diese Punkte bei Note ${hint}. Das ist nur ein Hinweis, die Lehrkraft legt die Note fest.\nNote: ________`
        : `Kein Notenschlüssel hinterlegt. Die Note legt die Lehrkraft fest.\nNote: ________`,
      { size: 10, color: SOFT },
    );
  }

  if (r.befunde.length) {
    sheet.room(60);
    sheet.paragraph("Hinweise zum Text", { font: SANS_BOLD, size: 11, gap: mm(1.5) });
    table(
      sheet,
      [{ title: "Stelle", share: 0.16, bold: true }, { title: "Art", share: 0.16 }, { title: "Hinweis", share: 0.68 }],
      r.befunde.map((b) => [
        b.abschnitt,
        b.art,
        [b.zitat ? `„${b.zitat}“` : "", b.erklaerung, b.vorschlag ? `Vorschlag: ${b.vorschlag}` : ""].filter(Boolean).join("\n"),
      ]),
    );
  }

  if (r.naechsteSchritte.length) {
    sheet.paragraph("Daran kannst du als Nächstes arbeiten", { font: SANS_BOLD, size: 11, gap: mm(1.5) });
    sheet.paragraph(r.naechsteSchritte.map((s, i) => `${i + 1}. ${s}`).join("\n\n"), { size: 10.5 });
  }

  return sheet.finish(r.fuss);
}

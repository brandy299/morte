/**
 * Exam with answer key (Erwartungshorizont): the model delivers structured content, this file draws two PDFs.
 * Points, totals, shares and grade limits are calculated here, never by the model.
 * Areas of demand and the grading scale are the teacher's own (see workspace/bewertung.ts), nothing is fixed here.
 */
import { grenzen, type Bereich, type Note } from "../workspace/bewertung.ts";
import {
  BOX, INK, LINE, MaterialError, SANS, SANS_BOLD, SERIF, SOFT, displayFont, mm, newSheet, num, printable, str, table, type Sheet,
} from "./layout.ts";

export interface Teilaufgabe {
  text: string;
  punkte: number;
  /** Label of the area of demand, as the school calls it. Must be one of the teacher's areas if those are known. */
  bereich?: string;
  /** Writing lines below the task. 0 = none. */
  zeilen: number;
  /** What a good answer contains, and what earns which points. Printed only in the answer key. */
  erwartung: string;
}

export interface KlausurAufgabe {
  titel?: string;
  /** Situation, text or data the sub-tasks refer to. */
  einstieg?: string;
  teile: Teilaufgabe[];
}

export interface Klausur {
  titel: string;
  fach?: string;
  klasse?: string;
  datum?: string;
  /** e.g. "90 Minuten" */
  dauer?: string;
  hilfsmittel?: string;
  /** Instructions for students, e.g. "Beginne jede Aufgabe auf einer neuen Seite." */
  hinweise?: string;
  aufgaben: KlausurAufgabe[];
  notenschluessel: Note[];
  bereiche: Bereich[];
  fuss?: string;
}

const isHalfSteps = (n: number) => Number.isFinite(n) && Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;

/** Checks content from the model before anything is drawn. `bereiche` and `notenschluessel` come from the teacher's rules. */
export function parseKlausur(raw: unknown, rules: { bereiche?: Bereich[]; notenschluessel?: Note[] } = {}): Klausur {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.aufgaben) || o.aufgaben.length === 0) throw new MaterialError("Es fehlt: mindestens eine Aufgabe.");
  if (o.aufgaben.length > 12) throw new MaterialError("Mehr als 12 Aufgaben sind für eine Klausur zu viele.");
  const bereiche = rules.bereiche ?? [];
  const allowed = new Map(bereiche.map((b) => [b.kurz.toLowerCase(), b.kurz]));

  const aufgaben = o.aufgaben.map((a, i): KlausurAufgabe => {
    const t = (a ?? {}) as Record<string, unknown>;
    if (!Array.isArray(t.teile) || t.teile.length === 0) throw new MaterialError(`Aufgabe ${i + 1}: Es fehlt mindestens eine Teilaufgabe.`);
    if (t.teile.length > 8) throw new MaterialError(`Aufgabe ${i + 1}: Mehr als 8 Teilaufgaben sind zu viele.`);
    const rawTeile: unknown[] = t.teile;
    const teile = rawTeile.map((p, j): Teilaufgabe => {
      const at = `Aufgabe ${i + 1}${rawTeile.length > 1 ? String.fromCharCode(97 + j) : ""}`;
      const r = (p ?? {}) as Record<string, unknown>;
      const punkte = Number(r.punkte);
      if (!(punkte > 0 && punkte <= 100) || !isHalfSteps(punkte)) throw new MaterialError(`${at}: Die Punkte müssen eine Zahl zwischen 0,5 und 100 sein, in halben Schritten.`);
      const zeilen = r.zeilen === undefined ? 0 : Number(r.zeilen);
      if (!Number.isInteger(zeilen) || zeilen < 0 || zeilen > 25) throw new MaterialError(`${at}: Die Zahl der Schreibzeilen muss zwischen 0 und 25 liegen.`);
      let bereich = str(r.bereich, `der Bereich von ${at}`, 20);
      if (bereich && allowed.size > 0) {
        const hit = allowed.get(bereich.toLowerCase());
        if (!hit) throw new MaterialError(`${at}: Den Bereich „${bereich}“ gibt es in der Bewertung nicht. Erlaubt sind: ${[...allowed.values()].join(", ")}.`);
        bereich = hit;
      }
      if (!bereich && allowed.size > 0) throw new MaterialError(`${at}: Es fehlt der Bereich. Erlaubt sind: ${[...allowed.values()].join(", ")}.`);
      return {
        text: str(r.text, `der Text von ${at}`, 2500, true)!,
        punkte,
        bereich,
        zeilen,
        erwartung: str(r.erwartung, `die erwartete Leistung von ${at}`, 2500, true)!,
      };
    });
    return { titel: str(t.titel, `der Titel von Aufgabe ${i + 1}`, 120), einstieg: str(t.einstieg, `der Einstieg von Aufgabe ${i + 1}`, 3000), teile };
  });

  return {
    titel: str(o.titel, "der Titel", 120, true)!,
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    datum: str(o.datum, "das Datum", 30),
    dauer: str(o.dauer, "die Dauer", 40),
    hilfsmittel: str(o.hilfsmittel, "die Hilfsmittel", 200),
    hinweise: str(o.hinweise, "die Hinweise", 1200),
    aufgaben,
    notenschluessel: rules.notenschluessel ?? [],
    bereiche,
    fuss: str(o.fuss, "der Fußtext", 200),
  };
}

export const punkteAufgabe = (a: KlausurAufgabe) => a.teile.reduce((n, t) => n + t.punkte, 0);
export const gesamtpunkte = (k: Klausur) => k.aufgaben.reduce((n, a) => n + punkteAufgabe(a), 0);

/** Points per area of demand, in the order the teacher defined them, then labels used but not defined. */
export function verteilung(k: Klausur): { kurz: string; name?: string; punkte: number; anteil: number; soll?: number }[] {
  const gesamt = gesamtpunkte(k);
  const sums = new Map<string, number>();
  for (const t of k.aufgaben.flatMap((a) => a.teile)) if (t.bereich) sums.set(t.bereich, (sums.get(t.bereich) ?? 0) + t.punkte);
  const known = k.bereiche.map((b) => b.kurz);
  const order = [...known, ...[...sums.keys()].filter((x) => !known.includes(x))];
  return order.map((kurz) => {
    const b = k.bereiche.find((x) => x.kurz === kurz);
    const punkte = sums.get(kurz) ?? 0;
    return { kurz, name: b?.name, punkte, anteil: gesamt ? (punkte / gesamt) * 100 : 0, soll: b?.anteil };
  });
}

// ---------- Drawing ----------

const label = (k: Klausur) => [k.fach, k.klasse].filter(Boolean).join(" · ");

/** A row of small boxes with a tiny label on top, e.g. DAUER / HILFSMITTEL / PUNKTE. */
function facts(sheet: Sheet, items: [string, string][]): void {
  if (items.length === 0) return;
  const { doc, left, width } = sheet;
  const gap = mm(3);
  const w = (width - gap * (items.length - 1)) / items.length;
  const h = mm(12);
  sheet.room(h + mm(6));
  for (const [i, [name, value]] of items.entries()) {
    const x = left + i * (w + gap);
    doc.save().rect(x, sheet.y, w, h).lineWidth(0.8).strokeColor(LINE).stroke().restore();
    doc.font(SANS).fontSize(6.5).fillColor(SOFT).text(printable(name).toUpperCase(), x + 6, sheet.y + 4, { width: w - 12, characterSpacing: 1, lineBreak: false });
    doc.font(SANS_BOLD).fontSize(9.5).fillColor(INK).text(printable(value), x + 6, sheet.y + 14, { width: w - 12, lineBreak: false, ellipsis: true });
  }
  sheet.y += h + mm(6);
}

function section(sheet: Sheet, title: string): void {
  sheet.room(40);
  sheet.paragraph(title, { font: SERIF, size: 13, gap: mm(2.5) });
}

export async function renderKlausur(k: Klausur): Promise<{ pdf: Buffer; pages: number }> {
  const sheet = newSheet(k.titel);
  const { doc, left, width } = sheet;
  const gesamt = gesamtpunkte(k);

  sheet.header({ kicker: [label(k), "Klausur"].filter(Boolean).join(" · "), title: k.titel, fields: ["Name:", k.datum ? `Datum: ${k.datum}` : "Datum:"] });
  facts(sheet, [
    ...(k.dauer ? [["Dauer", k.dauer] as [string, string]] : []),
    ...(k.hilfsmittel ? [["Hilfsmittel", k.hilfsmittel] as [string, string]] : []),
    ["Punkte", `${num(gesamt)} möglich`],
  ]);
  if (k.hinweise) sheet.box({ title: "Hinweise", text: k.hinweise });

  const numW = mm(9);
  const textX = left + numW + mm(4);
  const textW = width - numW - mm(4);
  const scoreW = 50;
  const lineH = mm(8.5);

  const labelWidth = (single: boolean) => (single ? 0 : 18);
  const teilHeight = (t: Teilaufgabe, single: boolean) => {
    const tw = textW - labelWidth(single) - scoreW - 8;
    return Math.max(sheet.height(t.text, SANS, 10.5, tw), 18) + (t.zeilen ? t.zeilen * lineH + mm(1) : 0);
  };
  const einstiegHeight = (a: KlausurAufgabe) => (a.einstieg ? sheet.height(a.einstieg, SANS, 10.5, textW - mm(8)) + mm(9) : 0);

  for (const [i, a] of k.aufgaben.entries()) {
    const single = a.teile.length === 1;
    // Keep the heading together with what follows it: never a heading alone at the bottom of a page.
    sheet.room(numW + mm(3) + einstiegHeight(a) + teilHeight(a.teile[0]!, single) + mm(5));
    let y = sheet.y;
    doc.save().roundedRect(left, y, numW, numW, mm(2.2)).fill(INK).restore();
    doc.font(SANS_BOLD).fontSize(11).fillColor("#ffffff").text(String(i + 1), left, y + numW / 2 - 6, { width: numW, align: "center", lineBreak: false });
    if (a.titel) doc.font(displayFont(a.titel)).fontSize(13).fillColor(INK).text(printable(a.titel), textX, y + 4, { width: textW - 60, lineBreak: false, ellipsis: true });
    doc.font(SANS).fontSize(9).fillColor(SOFT).text(`${num(punkteAufgabe(a))} P.`, left + width - 56, y + 6, { width: 56, align: "right", lineBreak: false });
    sheet.y = y + numW + mm(3);

    if (a.einstieg) {
      const h = einstiegHeight(a) - mm(9);
      doc.save().rect(textX, sheet.y, textW, h + mm(5)).fill(BOX).restore();
      doc.font(SANS).fontSize(10.5).fillColor(INK).text(printable(a.einstieg), textX + mm(4), sheet.y + mm(2.5), { width: textW - mm(8), lineGap: 2.5 });
      sheet.y += h + mm(9);
    }

    for (const [j, t] of a.teile.entries()) {
      const labelW = labelWidth(single);
      const tw = textW - labelW - scoreW - 8;
      const textH = sheet.height(t.text, SANS, 10.5, tw);
      const h = teilHeight(t, single);
      sheet.room(h + mm(5));
      y = sheet.y;
      if (!single) doc.font(SANS_BOLD).fontSize(10.5).fillColor(INK).text(`${String.fromCharCode(97 + j)})`, textX, y + 2, { width: labelW, lineBreak: false });
      doc.font(SANS).fontSize(10.5).fillColor(INK).text(printable(t.text), textX + labelW, y + 2, { width: tw, lineGap: 2.5 });
      // Score box for the grader: blank left part, "/ max" on the right.
      const bx = left + width - scoreW;
      doc.save().roundedRect(bx, y, scoreW, 18, 4).lineWidth(0.8).strokeColor(LINE).stroke().restore();
      doc.font(SANS).fontSize(8.5).fillColor(SOFT).text(`/ ${num(t.punkte)}`, bx, y + 5, { width: scoreW - 6, align: "right", lineBreak: false });
      for (let n = 1; n <= t.zeilen; n++) {
        const ly = y + 2 + textH + n * lineH - 3;
        doc.save().moveTo(textX + labelW, ly).lineTo(left + width - scoreW - 8, ly).lineWidth(0.7).strokeColor(LINE).stroke().restore();
      }
      sheet.y = y + h + mm(4);
    }
    sheet.y += mm(3);
  }

  // Total for the grader.
  sheet.room(mm(16));
  doc.save().rect(left, sheet.y, width, mm(11)).fill(BOX).restore();
  doc.font(SANS_BOLD).fontSize(10).fillColor(INK).text(`Gesamt: ______ / ${num(gesamt)} Punkte`, left + mm(4), sheet.y + mm(3.6), { lineBreak: false });
  doc.text("Note: ________", left + width / 2, sheet.y + mm(3.6), { lineBreak: false });
  sheet.y += mm(15);

  return sheet.finish(k.fuss);
}

export async function renderErwartungshorizont(k: Klausur): Promise<{ pdf: Buffer; pages: number }> {
  const sheet = newSheet(`Erwartungshorizont ${k.titel}`);
  const gesamt = gesamtpunkte(k);

  sheet.header({ kicker: [label(k), "Erwartungshorizont"].filter(Boolean).join(" · "), title: k.titel });
  facts(sheet, [...(k.datum ? [["Datum", k.datum] as [string, string]] : []), ["Punkte", `${num(gesamt)} möglich`]]);

  section(sheet, "Erwartete Leistungen");
  const rows: string[][] = [];
  for (const [i, a] of k.aufgaben.entries()) {
    for (const [j, t] of a.teile.entries()) {
      rows.push([`${i + 1}${a.teile.length > 1 ? String.fromCharCode(97 + j) : ""}`, t.erwartung, t.bereich ?? "", num(t.punkte)]);
    }
  }
  const hasBereich = rows.some((r) => r[2]);
  table(
    sheet,
    hasBereich
      ? [{ title: "Nr.", share: 0.08, bold: true }, { title: "Erwartete Leistung und Punktvergabe", share: 0.66 }, { title: "Bereich", share: 0.14 }, { title: "Punkte", share: 0.12, align: "right" }]
      : [{ title: "Nr.", share: 0.08, bold: true }, { title: "Erwartete Leistung und Punktvergabe", share: 0.8 }, { title: "Punkte", share: 0.12, align: "right" }],
    hasBereich ? rows : rows.map((r) => [r[0]!, r[1]!, r[3]!]),
  );

  section(sheet, "Punkte je Aufgabe");
  table(
    sheet,
    [{ title: "Aufgabe", share: 0.6 }, { title: "Punkte", share: 0.4, align: "right" }],
    [...k.aufgaben.map((a, i) => [`${i + 1}${a.titel ? `  ${a.titel}` : ""}`, num(punkteAufgabe(a))]), ["Gesamt", num(gesamt)]],
  );

  const v = verteilung(k);
  if (v.length > 0) {
    section(sheet, "Verteilung auf die Bereiche");
    const hasSoll = v.some((x) => x.soll !== undefined);
    table(
      sheet,
      hasSoll
        ? [{ title: "Bereich", share: 0.4 }, { title: "Punkte", share: 0.2, align: "right" }, { title: "Anteil", share: 0.2, align: "right" }, { title: "Vorgabe", share: 0.2, align: "right" }]
        : [{ title: "Bereich", share: 0.5 }, { title: "Punkte", share: 0.25, align: "right" }, { title: "Anteil", share: 0.25, align: "right" }],
      v.map((x) => {
        const base = [x.name ? `${x.kurz}  ${x.name}` : x.kurz, num(x.punkte), `${num(Math.round(x.anteil))} %`];
        return hasSoll ? [...base, x.soll !== undefined ? `${num(x.soll)} %` : ""] : base;
      }),
    );
  }

  if (k.notenschluessel.length > 0) {
    section(sheet, "Notenschlüssel");
    table(
      sheet,
      [{ title: "Note", share: 0.3, bold: true }, { title: "Ab Prozent", share: 0.3, align: "right" }, { title: "Punkte", share: 0.4, align: "right" }],
      grenzen(gesamt, k.notenschluessel).map((g) => [
        g.note,
        `${num(g.abProzent)} %`,
        g.bisPunkten === undefined ? `${num(g.vonPunkten)} bis ${num(gesamt)}` : g.vonPunkten > g.bisPunkten ? "-" : `${num(g.vonPunkten)} bis ${num(g.bisPunkten)}`,
      ]),
    );
  } else {
    sheet.paragraph("Kein Notenschlüssel hinterlegt. Die Punktgrenzen müssen noch eingetragen werden.", { size: 10, color: SOFT });
  }

  return sheet.finish(k.fuss);
}

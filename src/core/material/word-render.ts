/** The same material as the PDFs, drawn as Word files the teacher can edit. Content and checks come from the PDF side. */
import { grenzen } from "../workspace/bewertung.ts";
import type { AblaufSchritt } from "../workspace/index.ts";
import { koerper, loesungText, type Arbeitsblatt } from "./arbeitsblatt.ts";
import { gesamtpunkte, punkteAufgabe, verteilung, type Klausur } from "./klausur.ts";
import { num } from "./layout.ts";
import type { Lernsituation } from "./lernsituation.ts";
import type { Verlauf } from "./verlauf.ts";
import { newWord } from "./word.ts";

export async function arbeitsblattWord(a: Arbeitsblatt, opts: { lehrerexemplar?: boolean } = {}): Promise<Buffer> {
  const key = opts.lehrerexemplar === true;
  const w = newWord(key ? `${a.titel} (Lösung)` : a.titel);
  w.header({ kicker: [a.fach, a.klasse, a.niveau, key ? "Lösung für die Lehrkraft" : undefined].filter(Boolean).join(" · "), title: a.titel, fields: !key });
  if (a.einleitung) w.paragraph(a.einleitung, { after: 160 });
  if (a.merkkasten) w.box({ title: a.merkkasten.titel, text: a.merkkasten.text });
  for (const [i, t] of a.aufgaben.entries()) {
    w.task({
      nr: String(i + 1),
      text: t.text,
      hilfe: t.hilfe,
      punkte: t.punkte ? `${t.punkte} P.` : undefined,
      zeilen: key ? 0 : t.zeilen,
      antwort: key ? (loesungText(a, i) ?? "—") : undefined,
      koerper: koerper(a, i),
      loesungsansicht: key,
    });
  }
  return w.build(a.fuss);
}

export async function verlaufWord(v: Verlauf): Promise<Buffer> {
  const w = newWord(v.titel);
  w.header({ kicker: [v.fach, v.klasse, "Stundenverlauf"].filter(Boolean).join(" · "), title: v.titel });
  const sum = v.phasen.reduce((n, p) => n + p.minuten, 0);
  w.facts([v.datum, `${v.dauer ?? sum} Minuten`].filter((x): x is string => Boolean(x)));
  w.box({ title: "Das können die Schülerinnen und Schüler am Ende", text: v.lernziele.map((z) => `– ${z}`).join("\n") });
  if (v.voraussetzungen) w.box({ title: "Daran knüpft die Stunde an", text: v.voraussetzungen });
  w.heading("Ablauf");
  const withForm = v.phasen.some((p) => p.sozialform);
  const withMaterial = v.phasen.some((p) => p.material);
  const cols = [
    { title: "Zeit", share: 0.13, bold: true },
    { title: "Phase", share: 0.15 },
    { title: "Was passiert", share: 0 },
    ...(withForm ? [{ title: "Sozialform", share: 0.16 }] : []),
    ...(withMaterial ? [{ title: "Material", share: 0.17 }] : []),
  ];
  cols.find((c) => c.share === 0)!.share = 1 - cols.reduce((n, c) => n + c.share, 0);
  let t = 0;
  w.table(
    cols,
    v.phasen.map((p) => {
      const from = t;
      t += p.minuten;
      return [`${from}–${t} min`, p.phase, p.inhalt, ...(withForm ? [p.sozialform ?? ""] : []), ...(withMaterial ? [p.material ?? ""] : [])];
    }),
  );
  if (v.differenzierung) w.box({ title: "Differenzierung", text: v.differenzierung });
  if (v.hinweise) w.box({ title: "Darauf achten", text: v.hinweise });
  return w.build(v.fuss);
}

export async function lernsituationWord(l: Lernsituation): Promise<Buffer> {
  const w = newWord(l.titel);
  const kicker = [l.fach, l.klasse, l.lernfeld].filter(Boolean).join(" · ");
  w.header({ kicker: kicker || "Lernsituation", title: l.titel });
  for (const part of l.handlungssituation.split(/\n\s*\n/)) w.paragraph(part.trim(), { after: 160 });
  if (l.auftrag) w.box({ title: "Euer Auftrag", text: l.auftrag });
  if (l.handlungsprodukt) w.box({ title: "Am Ende steht", text: l.handlungsprodukt });

  w.pageBreak(); // the teacher's part starts on a new page
  w.header({ kicker: [kicker, "Planung"].filter(Boolean).join(" · "), title: "Steckbrief" });
  const facts: [string, string][] = [
    ...(l.lernfeld ? [["Lernfeld", l.lernfeld] as [string, string]] : []),
    ...(l.zeitraum ? [["Zeitraum", l.zeitraum] as [string, string]] : []),
    ["Umfang", `${l.ablauf.length} ${l.ablauf.length === 1 ? "Stunde" : "Stunden"}`],
    ...(l.handlungsprodukt ? [["Handlungsprodukt", l.handlungsprodukt] as [string, string]] : []),
    ...(l.leistungsnachweis ? [["Leistungsnachweis", l.leistungsnachweis] as [string, string]] : []),
    ...(l.ziele.length ? [["Ziele", l.ziele.map((z) => `– ${z}`).join("\n")] as [string, string]] : []),
  ];
  w.table([{ title: "", share: 0.26, bold: true }, { title: "", share: 0.74 }], facts.map(([a, b]) => [a, b]), { noHeader: true });
  w.heading("Ablauf");
  const rows = (l.ablauf as (AblaufSchritt & { datum?: string; stunde?: string })[]).map((s, i) => ({ s, i }));
  const withPhase = rows.some(({ s }) => s.phase);
  const withDate = rows.some(({ s }) => s.datum || s.stunde);
  const cols = [
    { title: "Nr.", share: 0.07, bold: true },
    ...(withPhase ? [{ title: "Phase", share: 0.16 }] : []),
    { title: "Thema und Inhalt", share: 0 },
    { title: "Ergebnis", share: 0.22 },
    ...(withDate ? [{ title: "Termin", share: 0.13 }] : []),
  ];
  cols.find((c) => c.share === 0)!.share = 1 - cols.reduce((n, c) => n + c.share, 0);
  w.table(
    cols,
    rows.map(({ s, i }) => [String(i + 1), ...(withPhase ? [s.phase ?? ""] : []), s.inhalt ? `${s.thema}\n${s.inhalt}` : s.thema, s.produkt ?? "", ...(withDate ? [[s.datum, s.stunde].filter(Boolean).join(" ")] : [])]),
  );
  return w.build(l.fuss);
}

export async function klausurWord(k: Klausur): Promise<Buffer> {
  const w = newWord(k.titel);
  const gesamt = gesamtpunkte(k);
  w.header({ kicker: [k.fach, k.klasse, "Klausur"].filter(Boolean).join(" · "), title: k.titel, fields: true });
  w.facts([k.datum ? `Datum: ${k.datum}` : undefined, k.dauer ? `Dauer: ${k.dauer}` : undefined, k.hilfsmittel ? `Hilfsmittel: ${k.hilfsmittel}` : undefined, `Punkte: ${num(gesamt)} möglich`].filter((x): x is string => Boolean(x)));
  if (k.hinweise) w.box({ title: "Hinweise", text: k.hinweise });
  for (const [i, a] of k.aufgaben.entries()) {
    w.heading(`${i + 1}  ${a.titel ?? "Aufgabe"}  (${num(punkteAufgabe(a))} P.)`);
    if (a.einstieg) w.box({ text: a.einstieg });
    const single = a.teile.length === 1;
    for (const [j, t] of a.teile.entries()) {
      w.task({ nr: single ? "" : `${String.fromCharCode(97 + j)})`, text: t.text, punkte: `/ ${num(t.punkte)}`, zeilen: t.zeilen, indent: true });
    }
  }
  w.paragraph(`Gesamt: ______ / ${num(gesamt)} Punkte        Note: ________`, { bold: true, after: 0 });
  return w.build(k.fuss);
}

export async function erwartungshorizontWord(k: Klausur): Promise<Buffer> {
  const w = newWord(`Erwartungshorizont ${k.titel}`);
  const gesamt = gesamtpunkte(k);
  w.header({ kicker: [k.fach, k.klasse, "Erwartungshorizont"].filter(Boolean).join(" · "), title: k.titel });
  w.facts([k.datum ? `Datum: ${k.datum}` : undefined, `Punkte: ${num(gesamt)} möglich`].filter((x): x is string => Boolean(x)));
  w.heading("Erwartete Leistungen");
  const rows: string[][] = [];
  for (const [i, a] of k.aufgaben.entries()) for (const [j, t] of a.teile.entries()) rows.push([`${i + 1}${a.teile.length > 1 ? String.fromCharCode(97 + j) : ""}`, t.erwartung, t.bereich ?? "", num(t.punkte)]);
  const hasBereich = rows.some((r) => r[2]);
  w.table(
    hasBereich
      ? [{ title: "Nr.", share: 0.08, bold: true }, { title: "Erwartete Leistung und Punktvergabe", share: 0.66 }, { title: "Bereich", share: 0.14 }, { title: "Punkte", share: 0.12, right: true }]
      : [{ title: "Nr.", share: 0.08, bold: true }, { title: "Erwartete Leistung und Punktvergabe", share: 0.8 }, { title: "Punkte", share: 0.12, right: true }],
    hasBereich ? rows : rows.map((r) => [r[0]!, r[1]!, r[3]!]),
  );
  w.heading("Punkte je Aufgabe");
  w.table([{ title: "Aufgabe", share: 0.6 }, { title: "Punkte", share: 0.4, right: true }], [...k.aufgaben.map((a, i) => [`${i + 1}${a.titel ? `  ${a.titel}` : ""}`, num(punkteAufgabe(a))]), ["Gesamt", num(gesamt)]]);
  const v = verteilung(k);
  if (v.length > 0) {
    w.heading("Verteilung auf die Bereiche");
    const hasSoll = v.some((x) => x.soll !== undefined);
    w.table(
      hasSoll
        ? [{ title: "Bereich", share: 0.4 }, { title: "Punkte", share: 0.2, right: true }, { title: "Anteil", share: 0.2, right: true }, { title: "Vorgabe", share: 0.2, right: true }]
        : [{ title: "Bereich", share: 0.5 }, { title: "Punkte", share: 0.25, right: true }, { title: "Anteil", share: 0.25, right: true }],
      v.map((x) => {
        const base = [x.name ? `${x.kurz}  ${x.name}` : x.kurz, num(x.punkte), `${num(Math.round(x.anteil))} %`];
        return hasSoll ? [...base, x.soll !== undefined ? `${num(x.soll)} %` : ""] : base;
      }),
    );
  }
  if (k.notenschluessel.length > 0) {
    w.heading("Notenschlüssel");
    w.table(
      [{ title: "Note", share: 0.3, bold: true }, { title: "Ab Prozent", share: 0.3, right: true }, { title: "Punkte", share: 0.4, right: true }],
      grenzen(gesamt, k.notenschluessel).map((g) => [g.note, `${num(g.abProzent)} %`, g.bisPunkten === undefined ? `${num(g.vonPunkten)} bis ${num(gesamt)}` : g.vonPunkten > g.bisPunkten ? "-" : `${num(g.vonPunkten)} bis ${num(g.bisPunkten)}`]),
    );
  } else w.paragraph("Kein Notenschlüssel hinterlegt. Die Punktgrenzen müssen noch eingetragen werden.", { size: 10, color: "555555" });
  return w.build(k.fuss);
}

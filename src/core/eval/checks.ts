import type { EvalCase, Transcript, Verdict } from "./types.ts";

type Check = (c: EvalCase, t: Transcript) => Omit<Verdict, "id">;
const na = { bestanden: null, grund: "trifft hier nicht zu" } as const;
const ok = (grund: string) => ({ bestanden: true, grund });
const fail = (grund: string) => ({ bestanden: false, grund });

/** Words a teacher must never read in an answer: tool names, file names, technical terms. */
const TECHNIK = /\b[a-z]+_[a-z_]+\b|\.(pdf|docx|json|md)\b|\b(JSON|Markdown|Skill|Tool|API|Rendering|PDF-Erzeugung|Parameter)\b/;

/** Checks that code can decide. Each returns `bestanden: null` when it does not apply to the case. */
export const PROGRAMM: Record<string, Check> = {
  "G-TECHNIK": (_c, t) => {
    const hit = t.turns.map((x) => TECHNIK.exec(x.assistant)?.[0]).find(Boolean);
    return hit ? fail(`In einer Antwort steht „${hit}“.`) : ok("Keine Werkzeug- oder Dateinamen in den Antworten.");
  },
  "G-SEITEN": (c, t) => {
    // The limit is for what students get. A teacher's copy with explanations may be longer.
    const pdfs = t.files.filter((f) => f.art === "pdf" && f.seiten !== undefined && !/Lösungsblatt|Erwartungshorizont/.test(f.name));
    if (pdfs.length === 0) return na;
    const max = c.erwartet.maxSeiten ?? 3;
    const long = pdfs.filter((f) => (f.seiten ?? 0) > max);
    return long.length ? fail(`${long.map((f) => `${f.name} hat ${f.seiten} Seiten`).join(", ")} (erlaubt: ${max}).`) : ok(`Alle PDFs haben höchstens ${max} Seiten.`);
  },
  "G-MATERIAL": (c, t) => {
    if (!c.erwartet.material) return na;
    return t.files.some((f) => f.art === "pdf") ? ok("Es wurde ein PDF erstellt.") : fail("Es wurde kein PDF erstellt.");
  },
  "G-HINWEIS": (_c, t) => {
    const pdfs = t.files.filter((f) => f.art === "pdf");
    if (pdfs.length === 0) return na;
    const without = pdfs.filter((f) => !/Ohne hinterlegten Lehrplan erstellt/.test(f.text));
    return without.length ? fail(`Der Hinweis „Ohne hinterlegten Lehrplan erstellt“ fehlt in ${without.map((f) => f.name).join(", ")}.`) : ok("Der Hinweis auf den fehlenden Lehrplan steht auf jedem Blatt.");
  },
  "G-TABELLE": (c, t) => {
    if (!c.erwartet.eintrag) return na;
    const row = t.tabelle.split("\n").find((l) => l.includes(`| ${c.erwartet.eintrag} |`));
    if (!row) return fail(`Die Stunde am ${c.erwartet.eintrag} steht nicht in der Tabelle.`);
    const cells = row.split("|").map((x) => x.trim());
    return cells[4] ? ok(`Die Stunde am ${c.erwartet.eintrag} hat Material eingetragen.`) : fail(`Die Stunde am ${c.erwartet.eintrag} hat kein Material in der Tabelle.`);
  },
  "G-NURLESEN": (c, t) => {
    if (!c.erwartet.nurLesen) return na;
    const wrote = t.turns.flatMap((x) => x.fragen);
    return wrote.length === 0 && t.files.length === 0 ? ok("Es wurde nichts geändert.") : fail(`Es wurde etwas geändert oder nachgefragt, ob etwas geändert werden darf: ${wrote.join(" / ") || "Datei erstellt"}.`);
  },
  "G-FASSUNGEN": (c, t) => {
    if (!c.erwartet.fassungen) return na;
    const sheets = t.files.filter((f) => f.art === "pdf" && /Arbeitsblatt-/.test(f.name));
    return sheets.length === c.erwartet.fassungen ? ok(`${sheets.length} Fassungen erstellt.`) : fail(`${sheets.length} statt ${c.erwartet.fassungen} Fassungen erstellt.`);
  },
  "G-GESPEICHERT": (c, t) => {
    if (!c.erwartet.gespeichert) return na;
    return t.gespeichert?.includes(c.erwartet.gespeichert) ? ok("Das Erwartete steht gespeichert im Arbeitsordner.") : fail("Es wurde nicht gespeichert, was die Lehrkraft verlangt hat, auch wenn der Assistent es vielleicht behauptet.");
  },
  "G-VORSCHLAG": (c, t) => {
    if (!c.erwartet.erstVorschlag) return na;
    const first = t.turns[0];
    const created = first?.steps.some((s) => /anlegen|erstellen|speichern/i.test(s)) || (first?.fragen.length ?? 0) > 0;
    return first && !created ? ok("Der Entwurf wurde zuerst gezeigt, nichts angelegt.") : fail("Es wurde schon im ersten Schritt etwas angelegt oder um Erlaubnis dafür gefragt.");
  },
};

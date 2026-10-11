import { STATUS } from "../workspace/reihe.ts";
import type { EvalCase, Transcript, Verdict } from "./types.ts";

type Check = (c: EvalCase, t: Transcript) => Omit<Verdict, "id">;
const na = { bestanden: null, grund: "trifft hier nicht zu" } as const;
const ok = (grund: string) => ({ bestanden: true, grund });
const fail = (grund: string) => ({ bestanden: false, grund });

/** Words a teacher must never read in an answer: tool names, file names, technical terms. */
const TECHNIK = /\b[a-z]+_[a-z_]+\b|\.(pdf|docx|pptx|json|md)\b|\b(JSON|Markdown|Skill|Tool|API|Rendering|PDF-Erzeugung|Parameter)\b/;

/** The structure of every PowerPoint file the run made. */
const decks = (t: Transcript) => t.files.flatMap((f) => (f.pptx ? [f.pptx] : []));

/** Checks that code can decide. Each returns `bestanden: null` when it does not apply to the case. */
export const PROGRAMM: Record<string, Check> = {
  "G-TECHNIK": (_c, t) => {
    const hit = t.turns.map((x) => TECHNIK.exec(x.assistant)?.[0]).find(Boolean);
    return hit ? fail(`In einer Antwort steht „${hit}“.`) : ok("Keine Werkzeug- oder Dateinamen in den Antworten.");
  },
  "G-SEITEN": (c, t) => {
    // The limit is for what students get. A teacher's copy with explanations may be longer, and the preview of a presentation has one page per slide.
    const pdfs = t.files.filter((f) => f.art === "pdf" && f.seiten !== undefined && !/Lösungsblatt|Erwartungshorizont|Praesentation/.test(f.name));
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
  "PR-DATEI": (c, t) => {
    if (!c.erwartet.praesentation) return na;
    return decks(t).length ? ok("Es wurde eine PowerPoint-Datei erstellt.") : fail("Es wurde keine PowerPoint-Datei erstellt.");
  },
  "PR-FORMAT": (c, t) => {
    if (!c.erwartet.praesentation || !decks(t).length) return na;
    return decks(t).every((d) => d.breit) ? ok("Die Folien sind im Format 16:9.") : fail("Die Folien sind nicht im Format 16:9.");
  },
  "PR-UMFANG": (c, t) => {
    const range = c.erwartet.folien;
    const deck = decks(t)[0];
    if (!range || !deck) return na;
    const n = deck.folien.length - 1; // without the title slide
    return n >= range[0] && n <= range[1] ? ok(`${n} Folien nach der Titelfolie (erwartet ${range[0]} bis ${range[1]}).`) : fail(`${n} Folien nach der Titelfolie, erwartet waren ${range[0]} bis ${range[1]}.`);
  },
  "PR-TITELFOLIE": (c, t) => {
    const deck = decks(t)[0];
    if (!c.erwartet.praesentation || !deck) return na;
    const first = deck.folien[0];
    return first && first.punkte === 0 && first.bilder === 0 && first.absaetze.length >= 1 ? ok("Die erste Folie ist eine Titelfolie ohne Stichpunkte.") : fail("Die erste Folie ist keine Titelfolie.");
  },
  "PR-NOTIZEN": (c, t) => {
    const deck = decks(t)[0];
    if (!c.erwartet.praesentation || !deck) return na;
    const missing = deck.folien.flatMap((f, i) => (i > 0 && !f.abschnitt && f.notizen.length < 20 ? [i + 1] : []));
    return missing.length ? fail(`Keine oder zu kurze Notizen auf Folie ${missing.join(", ")}.`) : ok("Jede Inhaltsfolie hat Sprechernotizen.");
  },
  "PR-PUNKTE": (c, t) => {
    const deck = decks(t)[0];
    if (!c.erwartet.praesentation || !deck) return na;
    const MAX = 6;
    const crowded = deck.folien.flatMap((f, i) => (f.punkte > (f.bilder ? 3 : MAX) ? [`Folie ${i + 1} (${f.punkte})`] : []));
    return crowded.length ? fail(`Zu viele Stichpunkte: ${crowded.join(", ")}. Erlaubt sind sechs, neben einem Schaubild drei.`) : ok("Keine Folie hat zu viele Stichpunkte.");
  },
  "PR-LEER": (c, t) => {
    const deck = decks(t)[0];
    if (!c.erwartet.praesentation || !deck) return na;
    // Title, school line and number do not count as content: a content slide needs points, a picture or text beyond its title.
    const empty = deck.folien.flatMap((f, i) => (i > 0 && !f.abschnitt && f.punkte === 0 && f.bilder === 0 && f.absaetze.length <= 3 ? [i + 1] : []));
    return empty.length ? fail(`Folie ${empty.join(", ")} hat keinen Inhalt außer dem Titel.`) : ok("Keine Folie ist leer.");
  },
  "PR-FRAGEN": (c, t) => {
    const max = c.erwartet.maxFragen;
    const first = t.turns[0];
    if (max === undefined || !first) return na;
    return first.fragen.length <= max ? ok(`${first.fragen.length} Rückfragen in der ersten Runde (erlaubt: ${max}).`) : fail(`${first.fragen.length} Rückfragen in der ersten Runde, erlaubt sind ${max}: ${first.fragen.join(" / ")}`);
  },
  "PR-OBERFLAECHE": (c, t) => {
    if (!c.erwartet.oberflaeche) return na;
    const deck = decks(t)[0];
    if (!deck) return fail("Es gibt keine PowerPoint-Datei.");
    // The sketch is a picture in the .pptx. Its blank areas are numbered, and the numbers stand in lines of their own in the preview PDF ("2 | 3" when two areas share a line).
    const onlyNumbers = /^\d+( \| \d+)*$/;
    const numbers = new Set(t.files.filter((f) => f.art === "pdf").flatMap((f) => f.text.split("\n").map((l) => l.trim()).filter((l) => onlyNumbers.test(l)).flatMap((l) => l.split(" | "))));
    const numbered = numbers.size >= 2;
    return deck.folien.some((f) => f.bilder > 0) && numbered ? ok("Eine Folie hat ein Schaubild mit nummerierten, leeren Bereichen.") : fail("Es gibt kein Schaubild mit nummerierten, leeren Bereichen auf einer Folie.");
  },
  "G-VORSCHLAG": (c, t) => {
    if (!c.erwartet.erstVorschlag) return na;
    const first = t.turns[0];
    const created = first?.steps.some((s) => /anlegen|erstellen|speichern/i.test(s)) || (first?.fragen.length ?? 0) > 0;
    return first && !created ? ok("Der Entwurf wurde zuerst gezeigt, nichts angelegt.") : fail("Es wurde schon im ersten Schritt etwas angelegt oder um Erlaubnis dafür gefragt.");
  },
  "S-ORDNUNG": (c, t) => {
    if (!c.erwartet.leseOrdnung) return na;
    const steps = t.turns.flatMap((x) => x.steps);
    const klasse = steps.indexOf("Klasse nachlesen");
    const stand = steps.indexOf("Stand nachlesen");
    const reihe = steps.indexOf("Reihe nachlesen");
    // "Stand nachlesen" (stand_lesen) hands over Klasse.md first, so the class is read before the Stand even without its own step.
    if (stand < 0) return fail("Es fehlt: Stand nachlesen.");
    if (klasse > stand) return fail("Der Stand wurde vor der Klasse gelesen.");
    if (reihe >= 0 && reihe < stand) return fail("Die Reihe wurde vor dem Stand gelesen.");
    if (c.erwartet.ohneReihe && reihe >= 0) return fail("Die Reihe wurde gelesen, obwohl Klasse und Stand genügten.");
    return ok("Klasse und Stand in der richtigen Reihenfolge" + (reihe >= 0 ? ", danach die Reihe." : ", die Reihe blieb zu."));
  },
  "S-UEBERSCHRIEBEN": (c, t) => {
    if (!c.erwartet.standNeu) return na;
    const now = t.stand?.nachher ?? "";
    if (!t.turns.some((x) => x.steps.includes("Stand festhalten"))) return fail("Der Stand wurde nicht festgehalten.");
    if (now === t.stand?.vorher) return fail("Der Stand ist unverändert.");
    if ((now.match(/^# Stand:/gm) ?? []).length !== 1) return fail("Der Stand hat keine einzelne Überschrift (angehängt statt überschrieben?).");
    const missing = c.erwartet.standNeu.filter((w) => !now.toLowerCase().includes(w.toLowerCase()));
    return missing.length ? fail(`Im neuen Stand fehlt: ${missing.join(", ")}.`) : ok("Der Stand wurde überschrieben und nennt das Neue.");
  },
  "S-STATUS": (c, t) => {
    if (!c.erwartet.gehalten) return na;
    const rows = t.tabelle.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*(Datum|-)/.test(l));
    const status = rows.map((l) => l.split("|").map((x) => x.trim())[5] ?? "");
    const bad = status.filter((x) => x && !(STATUS as readonly string[]).includes(x));
    if (bad.length) return fail(`Unerlaubtes Statuswort: ${bad.join(", ")}.`);
    return status[c.erwartet.gehalten - 1] === "gehalten" ? ok(`Stunde ${c.erwartet.gehalten} steht auf „gehalten“, alle Statuswörter sind erlaubt.`) : fail(`Stunde ${c.erwartet.gehalten} steht auf „${status[c.erwartet.gehalten - 1] ?? "?"}“, nicht auf „gehalten“.`);
  },
  "S-NAMEN": (c, t) => {
    if (!c.erwartet.verboten) return na;
    const text = `${t.stand?.nachher ?? ""}\n${t.reihe ?? ""}`;
    const hit = c.erwartet.verboten.map((p) => new RegExp(p).exec(text)?.[0]).find(Boolean);
    return hit ? fail(`In Stand oder Reihe steht „${hit}“.`) : ok("Kein Name und keine Note in Stand und Reihe.");
  },
  "S-KURZ": (c, t) => {
    if (!c.erwartet.nichtLaenger) return na;
    if (!t.turns.some((x) => x.steps.includes("Stand festhalten"))) return fail("Der Stand wurde nicht festgehalten.");
    const before = Buffer.byteLength(t.stand?.vorher ?? "");
    const after = Buffer.byteLength(t.stand?.nachher ?? "");
    return after <= before ? ok(`Der Stand ist nicht gewachsen (${before} auf ${after} Byte).`) : fail(`Der Stand ist gewachsen (${before} auf ${after} Byte).`);
  },
};

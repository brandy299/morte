import { StringEnum, Type, type Tool } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { hasLoesungen, parseArbeitsblatt, renderArbeitsblatt } from "../material/arbeitsblatt.ts";
import { parseVerlauf, renderVerlauf } from "../material/verlauf.ts";
import { arbeitsblattWord, erwartungshorizontWord, klausurWord, lernsituationWord, verlaufWord } from "../material/word-render.ts";
import { parseLernsituation, renderLernsituation } from "../material/lernsituation.ts";
import { parsePraesentation, planen, renderPptx, renderVorschau } from "../material/praesentation.ts";
import { gesamtpunkte, parseKlausur, renderErwartungshorizont, renderKlausur, verteilung } from "../material/klausur.ts";
import { checkBewertung, readBewertung, writeBewertung } from "../workspace/bewertung.ts";
import { outline, planFor, search, section } from "../lehrplan/store.ts";
import { readMaterialText } from "../material/read.ts";
import { loadSkill, readSkillFile } from "../skills/index.ts";
import { deleteVorlage, readVorlage, saveVorlage } from "../skills/personal.ts";
import {
  attachMaterial, notePlannedLesson, UserError, createReihe, hasLehrplan, listMaterial, listTree, materialDatei, saveMaterial, materialLuecken, readKlasse, readReihe, readStandMitKlasse, setStunde, STATUS, writeStand,
} from "../workspace/index.ts";

/**
 * Fixed, teacher-specific tools only. No shell, no free file access.
 * `label` is German and shown in the progress display.
 * `ask` marks a tool that changes files: the teacher is asked first, in plain language.
 */
export type TeacherTool = AgentTool<any> & { ask?: (args: any) => string; producesMaterial?: boolean };

type Params = Tool["parameters"];
/** Keeps the argument types of each tool while the list below holds them as one type. */
const defineTool = <P extends Params>(tool: AgentTool<P> & { ask?: (args: any) => string; producesMaterial?: boolean }): TeacherTool => tool as TeacherTool;

const wordParam = Type.Optional(Type.Boolean({ description: "Also save an editable Word version (.docx) next to the PDF. Only when the teacher asks for Word or wants to edit the material; never by default." }));

/** Saves a Word file next to the PDF and returns the card for it. Word files are downloaded, not previewed. */
async function saveWord(buf: Buffer, where: Parameters<typeof saveMaterial>[1], title: string) {
  const saved = await saveMaterial(buf, { ...where, ext: "docx" });
  return { saved, card: { title, name: saved.name, path: saved.path, preview: false } };
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: undefined });

export const dateTool = defineTool({
  name: "datum_heute",
  label: "Datum nachsehen",
  description: "Returns today's date and weekday in German. Use it when the date matters.",
  parameters: Type.Object({}),
  async execute() {
    return text(new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeZone: "Europe/Berlin" }).format(new Date()));
  },
});

const klassenUebersicht = defineTool({
  name: "klassen_uebersicht",
  label: "Klassen ansehen",
  description:
    "Lists all classes with their subjects and series (Reihen), including how many lessons are held and how many lack material. Start here when the user asks about classes.",
  parameters: Type.Object({}),
  async execute() {
    const tree = await listTree();
    if (tree.length === 0) return text("Es gibt noch keine Klasse.");
    const lines = tree.flatMap((k) => [
      `Klasse ${k.name}`,
      ...k.faecher.flatMap((f) => [
        `  Fach ${f.name}${f.reihen.length ? "" : " (noch keine Reihe)"}`,
        ...f.reihen.map((r) => `    Reihe ${r.name}: ${r.stunden} Stunden, ${r.gehalten} gehalten, ${r.ohneMaterial} ohne Material`),
      ]),
    ]);
    return text(lines.join("\n"));
  },
});

const klasseLesen = defineTool({
  name: "klasse_lesen",
  label: "Klasse nachlesen",
  description: "Reads Klasse.md (school type, level, subjects, notes). Read this first for a class. stand_lesen already includes it.",
  parameters: Type.Object({ klasse: Type.String({ description: "Class name, e.g. 11a" }) }),
  async execute(_id, { klasse }) {
    return text(await readKlasse(klasse));
  },
});

const standLesen = defineTool({
  name: "stand_lesen",
  label: "Stand nachlesen",
  description: "Reads Klasse.md and Stand.md of a class and subject in the right order: the class, then where we are and what comes next. One call is enough, no need to call klasse_lesen first.",
  parameters: Type.Object({ klasse: Type.String(), fach: Type.String() }),
  async execute(_id, { klasse, fach }) {
    return text(await readStandMitKlasse(klasse, fach));
  },
});

const reiheLesen = defineTool({
  name: "reihe_lesen",
  label: "Reihe nachlesen",
  description: "Reads Reihe.md with the lesson table. Only open it when the details are needed.",
  parameters: Type.Object({ klasse: Type.String(), fach: Type.String(), reihe: Type.String({ description: "Name, with or without number" }) }),
  async execute(_id, { klasse, fach, reihe }) {
    return text(await readReihe(klasse, fach, reihe));
  },
});

const materialLesen = defineTool({
  name: "material_lesen",
  label: "Material nachlesen",
  description:
    "Without datei: lists the files in the Material folder of a series. With datei: reads the text of that file (PDF or text). Use it to build on existing material, for example to differentiate a worksheet or prepare a lesson.",
  parameters: Type.Object({
    klasse: Type.String(),
    fach: Type.String(),
    reihe: Type.String({ description: "Name, with or without number" }),
    datei: Type.Optional(Type.String({ description: "File name from the list" })),
  }),
  async execute(_id, { klasse, fach, reihe, datei }) {
    if (!datei) {
      const files = await listMaterial(klasse, fach, reihe);
      return text(files.length ? files.join("\n") : "In dieser Reihe liegt noch kein Material.");
    }
    return text(await readMaterialText(await materialDatei(klasse, fach, reihe, datei)));
  },
});

const lueckenTool = defineTool({
  name: "material_luecken",
  label: "Fehlendes Material suchen",
  description: "Finds lessons that have no material yet (and are not held yet). Leave klasse empty to check all classes.",
  parameters: Type.Object({ klasse: Type.Optional(Type.String()) }),
  async execute(_id, { klasse }) {
    const gaps = await materialLuecken(klasse);
    if (gaps.length === 0) return text("Es fehlt nirgends Material.");
    return text(gaps.map((g) => `${g.klasse}, ${g.fach}, ${g.reihe}: ${g.datum} ${g.stunde} ${g.thema}`.trim()).join("\n"));
  },
});

const standSchreiben = defineTool({
  name: "stand_schreiben",
  label: "Stand festhalten",
  description:
    "Overwrites Stand.md of a class and subject. Call it at the end of a work session. Read the old Stand first and pass every field that is still true. Keep entries short. Never put student names, grades or anything about individual students in it, only observations about the whole class. Leave a field empty if unknown, never invent.",
  parameters: Type.Object({
    klasse: Type.String(),
    fach: Type.String(),
    aktuelleReihe: Type.Optional(Type.String()),
    zuletztBehandelt: Type.Optional(Type.String()),
    naechsteStunde: Type.Optional(Type.String()),
    offen: Type.Optional(Type.Array(Type.String(), { description: "Open points, short" })),
    besonderheiten: Type.Optional(Type.String({ description: "Observations about the whole class only: no student names, no grades, nothing about individuals" })),
  }),
  ask: (a) => `Darf ich den Stand für ${a.klasse}, ${a.fach} neu festhalten? Der alte Stand wird dabei ersetzt.`,
  async execute(_id, { klasse, fach, ...fields }) {
    await writeStand(klasse, fach, fields);
    return text("Der Stand ist gespeichert.");
  },
});

const reiheAnlegen = defineTool({
  name: "reihe_anlegen",
  label: "Reihe anlegen",
  description: "Creates a new series (Reihe) for a class and subject. Only fill fields the teacher actually told you.",
  parameters: Type.Object({
    klasse: Type.String(),
    fach: Type.String(),
    thema: Type.String(),
    lernfeld: Type.Optional(Type.String()),
    zeitraum: Type.Optional(Type.String()),
    leistungsnachweis: Type.Optional(Type.String()),
    szenario: Type.Optional(Type.String()),
  }),
  async execute(_id, { klasse, fach, ...rest }) {
    const name = await createReihe(klasse, fach, rest);
    return text(`Die Reihe ist angelegt: ${name}`);
  },
});

/** Enters a file in the lesson table. Returns true, or the reason in plain words when that was not possible. */
async function tryAttach(...args: Parameters<typeof attachMaterial>): Promise<true | string> {
  try {
    await attachMaterial(...args);
    return true;
  } catch (err) {
    if (err instanceof UserError) return err.message;
    throw err;
  }
}

const stundeEintragen = defineTool({
  name: "stunde_eintragen",
  label: "Stunde eintragen",
  description: `Adds or updates one lesson row in a Reihe. Give nr (1-based row number) to update a planned lesson, e.g. to set its date and period. Without nr, the row is found by date and period, or added. Status must be one of: ${STATUS.join(", ")}. Empty fields keep their old value.`,
  parameters: Type.Object({
    klasse: Type.String(),
    fach: Type.String(),
    reihe: Type.String(),
    nr: Type.Optional(Type.Number({ description: "Row number in the Reihe, 1-based" })),
    datum: Type.Optional(Type.String({ description: "e.g. 14.10." })),
    stunde: Type.Optional(Type.String({ description: "e.g. Mi 3" })),
    thema: Type.Optional(Type.String()),
    material: Type.Optional(Type.String({ description: "File name in the Material folder" })),
    status: Type.Optional(StringEnum([...STATUS])),
  }),
  ask: (a) =>
    a.nr !== undefined
      ? `Darf ich Stunde ${a.nr} der Reihe ${a.reihe} in ${a.klasse}, ${a.fach} ändern?`
      : `Darf ich die Stunde am ${a.datum ?? ""} (${a.stunde ?? ""}) in ${a.klasse}, ${a.fach} eintragen oder ändern?`,
  async execute(_id, { klasse, fach, reihe, ...patch }) {
    await setStunde(klasse, fach, reihe, patch);
    return text("Die Stunde ist eingetragen.");
  },
});

const lernsituationErstellen = defineTool({
  name: "lernsituation_erstellen",
  producesMaterial: true,
  label: "Lernsituation anlegen",
  description:
    "Plans a new series for a class and subject in one step: creates the Reihe with situation, goals and every planned lesson (status geplant) in the lesson table, and builds a print-ready PDF (page 1: the situation for the students, then the plan for the teacher). Use it for a Lernsituation at a Berufskolleg and for any other planned series. Only fill fields the teacher told you or that you wrote yourself as content; leave lernfeld, zeitraum, dates and leistungsnachweis empty when unknown.",
  parameters: Type.Object({
    klasse: Type.String(),
    fach: Type.String(),
    titel: Type.String({ description: "Short name of the series, becomes the folder name" }),
    lernfeld: Type.Optional(Type.String({ description: "Only if known, e.g. LF 3 Werteströme erfassen" })),
    zeitraum: Type.Optional(Type.String()),
    handlungssituation: Type.String({ description: "The situation, written for the students. Paragraphs separated by a blank line" }),
    auftrag: Type.Optional(Type.String({ description: "The task for the students that follows from the situation" })),
    handlungsprodukt: Type.Optional(Type.String({ description: "What the students produce or present at the end" })),
    ziele: Type.Optional(Type.Array(Type.String(), { description: "Goals or competences, short, at most 10" })),
    leistungsnachweis: Type.Optional(Type.String()),
    ablauf: Type.Array(
      Type.Object({
        thema: Type.String({ description: "Topic of the lesson, short" }),
        phase: Type.Optional(Type.String({ description: "e.g. Informieren, Planen, Durchführen" })),
        inhalt: Type.Optional(Type.String({ description: "What happens, one or two sentences" })),
        produkt: Type.Optional(Type.String({ description: "What the students produce in this lesson" })),
        datum: Type.Optional(Type.String()),
        stunde: Type.Optional(Type.String()),
      }),
      { description: "Planned lessons in order, 1 to 40" },
    ),
    word: wordParam,
  }),
  ask: (a) => `Darf ich in ${a.klasse}, ${a.fach} die neue Reihe „${a.titel}“ mit ${(a.ablauf ?? []).length} geplanten Stunden anlegen und das Blatt dazu erstellen?`,
  async execute(_id, { klasse, fach, word, ...content }) {
    const plan = parseLernsituation({
      ...content,
      fach,
      klasse,
      fuss: (await hasLehrplan(klasse)) ? undefined : "Ohne hinterlegten Lehrplan erstellt",
    });
    // Render first: if the content is broken, no half-made Reihe stays behind.
    const { pdf, pages } = await renderLernsituation(plan);
    const reihe = await createReihe(klasse, fach, {
      thema: plan.titel,
      lernfeld: plan.lernfeld,
      zeitraum: plan.zeitraum,
      ziele: plan.ziele,
      leistungsnachweis: plan.leistungsnachweis,
      handlungssituation: [plan.handlungssituation, plan.auftrag && `Auftrag: ${plan.auftrag}`].filter(Boolean).join("\n\n"),
      handlungsprodukt: plan.handlungsprodukt,
      ablauf: plan.ablauf,
    });
    const saved = await saveMaterial(pdf, { art: "Lernsituation", titel: plan.titel, klasse, fach, reihe });
    const wordPlan = word ? await saveWord(await lernsituationWord(plan), { art: "Lernsituation", titel: plan.titel, klasse, fach, reihe }, `${plan.titel} (Word)`) : undefined;
    return {
      content: [{ type: "text" as const, text: `Die Reihe „${reihe}“ ist angelegt, mit ${plan.ablauf.length} geplanten Stunden. Das Blatt zur Lernsituation hat ${pages} Seiten und ist in der Vorschau zu sehen.${wordPlan ? " Es gibt auch eine Word-Fassung zum Bearbeiten." : ""}` }],
      details: { materials: [{ title: plan.titel, name: saved.name, path: saved.path }, ...(wordPlan ? [wordPlan.card] : [])] },
    };
  },
});

const skillLaden = defineTool({
  name: "skill_laden",
  label: "Anleitung laden",
  description:
    "Loads the full instructions of one skill from the list in the system prompt. Call it as soon as a request fits a skill, before you start the work. The result also lists extra files you can read with skill_datei_lesen.",
  parameters: Type.Object({ name: Type.String({ description: "Skill name from the list" }) }),
  async execute(_id, { name }) {
    const { body, files } = await loadSkill(name);
    const extra = files.length ? `\n\nWeitere Dateien (nur bei Bedarf lesen):\n${files.join("\n")}` : "";
    return text(body + extra);
  },
});

const skillDateiLesen = defineTool({
  name: "skill_datei_lesen",
  label: "Hilfsdatei lesen",
  description: "Reads one extra file of a skill, e.g. references/operatoren.md. Only read what the instructions tell you to.",
  parameters: Type.Object({ name: Type.String(), datei: Type.String({ description: "Path inside the skill, e.g. references/regeln.md" }) }),
  async execute(_id, { name, datei }) {
    return text(await readSkillFile(name, datei));
  },
});

/** A diagram the program draws. Shared by worksheets and slides. */
const schaubildParam = Type.Object({
  art: StringEnum(["ablauf", "hierarchie", "kreislauf", "zeitstrahl", "saeulen", "oberflaeche"], { description: "ablauf: steps with arrows (process, procedure). hierarchie: structure from top to bottom (who stands above whom, separation of powers, organisation). kreislauf: boxes in a circle with arrows (economic cycle, water cycle). zeitstrahl: events on a time line. saeulen: bar chart from numbers. oberflaeche: a sketch of a program window (title bar, menu band, side panels, work area, area below it, status bar) to explain where things are in a program; give every area a lage" }),
  titel: Type.Optional(Type.String({ description: "Caption below the diagram" })),
  knoten: Type.Optional(Type.Array(Type.Object({
    id: Type.String({ description: "Short unique name, used in verbindungen" }),
    text: Type.String({ description: "Text in the box, short (a few words)" }),
    datum: Type.Optional(Type.String({ description: "zeitstrahl: the date or year" })),
    leer: Type.Optional(Type.Boolean({ description: "Leave the box empty for the students to fill in. Still give its text: it is the solution. The program numbers these boxes and writes the key for the teacher" })),
    betont: Type.Optional(Type.Boolean({ description: "Heavy edge and gray fill, for the most important box" })),
    lage: Type.Optional(StringEnum(["titel", "menue", "links", "mitte", "rechts", "unten", "status"], { description: "oberflaeche only, required there, each lage once: titel = title bar at the top, menue = menu band / ribbon, links and rechts = side panels, mitte = work area, unten = area below the work area (e.g. notes), status = status bar at the bottom" })),
  }), { description: "ablauf, hierarchie, kreislauf: 2 to 12 boxes (kreislauf 3 to 8, zeitstrahl 2 to 8, in order; oberflaeche 2 to 7 areas)" })),
  verbindungen: Type.Optional(Type.Array(Type.Object({ von: Type.String(), nach: Type.String(), text: Type.Optional(Type.String({ description: "Label on the arrow, a few words" })), leer: Type.Optional(Type.Boolean({ description: "Leave the label empty for the students to fill in (text is then the solution)" })) }), { description: "Arrows between boxes by id. ablauf: leave out for a simple chain in the order of the boxes. hierarchie: required (from the upper to the lower box). kreislauf: leave out for a ring in the order of the boxes, or give your own arrows, also in both directions between two boxes (2 boxes are enough then), for example the flows of goods and money between households and companies. No arrows back in ablauf and hierarchie: use kreislauf for cycles" })),
  richtung: Type.Optional(StringEnum(["waagerecht", "senkrecht"], { description: "ablauf, hierarchie: left to right or top to bottom. Leave out and the program chooses" })),
  mitte: Type.Optional(Type.String({ description: "kreislauf: text in the middle" })),
  saeulen: Type.Optional(Type.Array(Type.Object({ name: Type.String(), wert: Type.Number() }), { description: "saeulen: 2 to 8 bars" })),
  einheit: Type.Optional(Type.String({ description: "saeulen: unit shown at the axis, e.g. Prozent" })),
  leer: Type.Optional(Type.Boolean({ description: "saeulen: the students draw the bars themselves; the teacher's copy shows them" })),
  wortliste: Type.Optional(Type.Boolean({ description: "Print the texts of the empty boxes, shuffled, as a word bank (worksheets and exams only: a presentation refuses it)" })),
}, { description: "schaubild: a diagram the program draws. Use it for processes, structures, cycles, time lines and numbers instead of describing them in words. Gray and print-ready. It cannot draw pictures, maps or photos" });

const arbeitsblattErstellen = defineTool({
  name: "arbeitsblatt_erstellen",
  producesMaterial: true,
  label: "Arbeitsblatt erstellen",
  description:
    "Builds a print-ready worksheet as PDF (gray only, fixed layout) from structured content, with free tasks and typed tasks (matching, gap text, multiple choice, table) and shows it in the preview. You write only the content, never the layout. The length follows the lesson and the topic (usually one to three pages); do not cut good content to save paper. Give klasse, fach and reihe to file it in that series; add datum (and stunde if known) to also enter it in the lesson table. Returns the page count.",
  parameters: Type.Object({
    titel: Type.String(),
    fach: Type.Optional(Type.String()),
    klasse: Type.Optional(Type.String()),
    niveau: Type.Optional(Type.String({ description: "Level of a differentiated version, e.g. Basis, Standard, Erweiterung" })),
    einleitung: Type.Optional(Type.String({ description: "The material the tasks refer to: an information text, a case, a source (up to about 3000 characters), or a short intro. Explain technical terms" })),
    merkkasten: Type.Optional(Type.Object({ titel: Type.Optional(Type.String()), text: Type.String() })),
    aufgaben: Type.Array(
      Type.Object({
        text: Type.String(),
        hilfe: Type.Optional(Type.String({ description: "Short hint for students" })),
        punkte: Type.Optional(Type.Number()),
        zeilen: Type.Optional(Type.Number({ description: "Writing lines under the task, 0 to 15" })),
        loesung: Type.Optional(Type.String({ description: "Expected answer for a free task. For the typed tasks below the program writes the solution itself; add here only what else the teacher should know (for example why a wrong choice tempts students). If any task has a solution, a second PDF for the teacher is made" })),
        art: Type.Optional(StringEnum(["frei", "zuordnung", "luecken", "auswahl", "tabelle", "schaubild"], { description: "Kind of task. Default frei (free text). zuordnung needs paare, luecken needs saetze, auswahl needs optionen and richtig, tabelle needs tabelle, schaubild needs schaubild" })),
        paare: Type.Optional(Type.Array(Type.Object({ links: Type.String(), rechts: Type.String() }), { description: "zuordnung: 3 to 10 pairs. The program shuffles the right side, numbers the left and letters the right, and writes the solution" })),
        saetze: Type.Optional(Type.Array(Type.String(), { description: "luecken: 1 to 8 sentences, the missing word in double curly braces: \"Yesterday I {{wrote}} a letter.\"" })),
        wortliste: Type.Optional(Type.Boolean({ description: "luecken: print the missing words, shuffled, as a word bank" })),
        optionen: Type.Optional(Type.Array(Type.String(), { description: "auswahl: 2 to 5 answers in the order they should have, without letters" })),
        richtig: Type.Optional(Type.Number({ description: "auswahl: number of the correct answer, 1 = the first" })),
        tabelle: Type.Optional(Type.Object({
          spalten: Type.Array(Type.String(), { description: "2 to 5 column names" }),
          zeilen: Type.Array(Type.Array(Type.String()), { description: "Rows, each with one entry per column. An empty string is a blank for the students to fill in" }),
          loesung: Type.Optional(Type.Array(Type.Array(Type.String()), { description: "The same rows with every field filled in" })),
        }, { description: "tabelle: a table to complete" })),
        schaubild: Type.Optional(schaubildParam),
      }),
      { description: "1 to 20 tasks. Give the parts of matching, gap and table tasks in the fields, never inside the task text: the sheet shows only what is in the fields" },
    ),
    word: wordParam,
    reihe: Type.Optional(Type.String({ description: "Name of the Reihe to file it in" })),
    datum: Type.Optional(Type.String({ description: "e.g. 14.10." })),
    stunde: Type.Optional(Type.String({ description: "e.g. Mi 3" })),
  }),
  async execute(_id, args) {
    const { reihe, datum, stunde, word, ...content } = args;
    const sheet = parseArbeitsblatt({
      ...content,
      // Honest note instead of invented curriculum references (see docs/skills.md).
      fuss: content.klasse && (await hasLehrplan(content.klasse)) ? undefined : "Ohne hinterlegten Lehrplan erstellt",
    });
    const where = { klasse: content.klasse, fach: content.fach, reihe, datum, stunde };
    const label = sheet.niveau ? `${sheet.titel}-${sheet.niveau}` : sheet.titel;
    const shown = sheet.niveau ? `${sheet.titel} · ${sheet.niveau}` : sheet.titel;
    const { pdf, pages } = await renderArbeitsblatt(sheet);
    const saved = await saveMaterial(pdf, { art: "Arbeitsblatt", titel: label, ...where });
    const key = hasLoesungen(sheet) ? await renderArbeitsblatt(sheet, { lehrerexemplar: true }) : undefined;
    const savedKey = key ? await saveMaterial(key.pdf, { art: "Loesung", titel: label, ...where }) : undefined;
    const wordSheet = word ? await saveWord(await arbeitsblattWord(sheet), { art: "Arbeitsblatt", titel: label, ...where }, `${shown} (Word)`) : undefined;
    const wordKey = word && key ? await saveWord(await arbeitsblattWord(sheet, { lehrerexemplar: true }), { art: "Loesung", titel: label, ...where }, `${shown} (Lösung, Word)`) : undefined;
    const entered = content.klasse && content.fach && reihe && datum
      ? await tryAttach(content.klasse, content.fach, reihe, { datum, stunde: stunde ?? "", thema: sheet.titel }, saved.name, { append: true })
      : "fehlt klasse, fach, reihe oder datum";
    if (entered === true && wordSheet) await tryAttach(content.klasse!, content.fach!, reihe!, { datum: datum!, stunde: stunde ?? "", thema: sheet.titel }, wordSheet.saved.name, { append: true });
    return {
      content: [{ type: "text" as const, text: `Das Arbeitsblatt ist fertig (${pages} ${pages === 1 ? "Seite" : "Seiten"}) und in der Vorschau zu sehen.${savedKey ? " Dazu gibt es ein Blatt mit den Lösungen für die Lehrkraft, ohne Feld für den Namen." : ""}${wordSheet ? " Es gibt auch eine Word-Fassung zum Bearbeiten." : ""}${pages > 3 ? " Es sind mehr als drei Seiten. Prüfe, ob alles nötig ist. Kürze nur, wenn die Lehrkraft ein kurzes Blatt wollte, und streiche nie Aufgaben, die sie ausdrücklich verlangt hat." : ""} ${entered === true ? `Es ist in der Stundentabelle am ${datum} eingetragen.` : `Es ist NICHT in die Stundentabelle eingetragen (${entered}).`}` }],
      details: {
        materials: [
          { title: shown, name: saved.name, path: saved.path },
          ...(savedKey ? [{ title: `${shown} (Lösung)`, name: savedKey.name, path: savedKey.path }] : []),
          ...(wordSheet ? [wordSheet.card] : []),
          ...(wordKey ? [wordKey.card] : []),
        ],
      },
    };
  },
});

const praesentationErstellen = defineTool({
  name: "praesentation_erstellen",
  producesMaterial: true,
  label: "Präsentation erstellen",
  description:
    "Builds slides as a PowerPoint file (.pptx, 16:9, editable in PowerPoint) plus a PDF of the same slides for the preview. A title slide is made from titel and untertitel, then one slide per entry. You write only the content; the program does the layout and refuses a slide with too much text. A diagram with empty boxes (leer) shows only the empty boxes; its solution (number = text) is put into the speaker notes automatically. A word bank (wortliste) does not exist in presentations. Give klasse, fach and reihe to file it in that series; add datum (and stunde if known) to also enter it in the lesson table.",
  parameters: Type.Object({
    titel: Type.String({ description: "Title of the talk, for the title slide" }),
    untertitel: Type.Optional(Type.String()),
    fach: Type.Optional(Type.String()),
    klasse: Type.Optional(Type.String()),
    folien: Type.Array(
      Type.Object({
        art: Type.Optional(StringEnum(["inhalt", "abschnitt"], { description: "inhalt (default): title with points, text and/or a diagram. abschnitt: a divider between parts, only a title and an optional short line" })),
        titel: Type.String({ description: "One short line" }),
        text: Type.Optional(Type.String({ description: "One or two sentences above the points, e.g. the key message" })),
        punkte: Type.Optional(Type.Array(Type.String(), { description: "Up to 7 short points (keywords, not full sentences)" })),
        schaubild: Type.Optional(schaubildParam),
        notizen: Type.Optional(Type.String({ description: "Speaker notes for the teacher or the students who present: what to say on this slide" })),
      }),
      { description: "1 to 40 slides after the title slide" },
    ),
    reihe: Type.Optional(Type.String({ description: "Name of the Reihe to file it in" })),
    datum: Type.Optional(Type.String({ description: "e.g. 14.10." })),
    stunde: Type.Optional(Type.String({ description: "e.g. Mi 3" })),
  }),
  async execute(_id, args) {
    const { reihe, datum, stunde, ...content } = args;
    const deck = parsePraesentation({
      ...content,
      fuss: content.klasse && (await hasLehrplan(content.klasse)) ? undefined : "Ohne hinterlegten Lehrplan erstellt",
    });
    planen(deck); // refuses an overfull slide before anything is saved
    const where = { klasse: content.klasse, fach: content.fach, reihe, datum, stunde };
    const pptx = await saveMaterial(await renderPptx(deck), { art: "Praesentation", titel: deck.titel, ...where, ext: "pptx" });
    const { pdf, seiten } = await renderVorschau(deck);
    const preview = await saveMaterial(pdf, { art: "Praesentation", titel: deck.titel, ...where });
    const entered = content.klasse && content.fach && reihe && datum
      ? await tryAttach(content.klasse, content.fach, reihe, { datum, stunde: stunde ?? "", thema: deck.titel }, pptx.name, { append: true })
      : "fehlt klasse, fach, reihe oder datum";
    return {
      content: [{ type: "text" as const, text: `Die Präsentation ist fertig (${seiten} Folien mit Titelfolie) und in der Vorschau zu sehen. Die PowerPoint-Datei liegt zum Herunterladen bereit. ${entered === true ? `Sie ist in der Stundentabelle am ${datum} eingetragen.` : `Sie ist NICHT in die Stundentabelle eingetragen (${entered}).`}` }],
      details: {
        materials: [
          { title: deck.titel, name: preview.name, path: preview.path },
          { title: `${deck.titel} (PowerPoint)`, name: pptx.name, path: pptx.path, preview: false },
        ],
      },
    };
  },
});

const stundenverlaufErstellen = defineTool({
  name: "stundenverlauf_erstellen",
  producesMaterial: true,
  label: "Stunde planen",
  description:
    "Builds the plan of one lesson as a one-page PDF for the teacher (goals, timed phases, social forms, material, differentiation, pitfalls) and shows it in the preview. You write only the content. If dauer is given, the minutes of all phases must add up to it. Give klasse, fach and reihe to file it in that series; add datum (and stunde if known) to note the topic in the lesson table. The plan is not student material and does not change the lesson's status.",
  parameters: Type.Object({
    titel: Type.String({ description: "Topic of the lesson" }),
    fach: Type.Optional(Type.String()),
    klasse: Type.Optional(Type.String()),
    datum: Type.Optional(Type.String({ description: "e.g. 14.10." })),
    stunde: Type.Optional(Type.String({ description: "e.g. Mi 3" })),
    dauer: Type.Optional(Type.Number({ description: "Length in minutes, e.g. 45 or 90" })),
    lernziele: Type.Array(Type.String(), { description: "1 to 5 goals, from the students' view" }),
    voraussetzungen: Type.Optional(Type.String()),
    phasen: Type.Array(
      Type.Object({
        minuten: Type.Number(),
        phase: Type.String({ description: "e.g. Einstieg, Erarbeitung, Sicherung" }),
        inhalt: Type.String({ description: "What happens, for the teacher" }),
        sozialform: Type.Optional(Type.String({ description: "e.g. Einzelarbeit, Partnerarbeit, Plenum" })),
        material: Type.Optional(Type.String()),
      }),
      { description: "2 to 12 phases" },
    ),
    differenzierung: Type.Optional(Type.String()),
    hinweise: Type.Optional(Type.String({ description: "Typical stumbling blocks" })),
    reihe: Type.Optional(Type.String({ description: "Name of the Reihe to file it in" })),
    word: wordParam,
  }),
  async execute(_id, args) {
    const { reihe, stunde, word, ...content } = args;
    const plan = parseVerlauf({
      ...content,
      fuss: content.klasse && (await hasLehrplan(content.klasse)) ? undefined : "Ohne hinterlegten Lehrplan erstellt",
    });
    const { pdf, pages } = await renderVerlauf(plan);
    const saved = await saveMaterial(pdf, { art: "Verlauf", titel: plan.titel, klasse: content.klasse, fach: content.fach, reihe, datum: content.datum, stunde });
    const wordPlan = word ? await saveWord(await verlaufWord(plan), { art: "Verlauf", titel: plan.titel, klasse: content.klasse, fach: content.fach, reihe, datum: content.datum, stunde }, `${plan.titel} (Word)`) : undefined;
    let note = "Die Planung liegt im Ordner der Reihe.";
    if (content.klasse && content.fach && reihe && content.datum) {
      try {
        const r = await notePlannedLesson(content.klasse, content.fach, reihe, { datum: content.datum, stunde: stunde ?? "", thema: plan.titel });
        note = r === "schon-da" ? "Die Stunde steht schon mit einem Thema in der Stundentabelle, das bleibt." : `Das Thema ist in der Stundentabelle am ${content.datum} eingetragen.`;
      } catch (err) {
        if (!(err instanceof UserError)) throw err;
        note = `Das Thema ist NICHT in die Stundentabelle eingetragen (${err.message}).`;
      }
    } else if (!reihe) note = "Die Planung ist nicht in einer Reihe abgelegt, weil keine Reihe genannt wurde.";
    return {
      content: [{ type: "text" as const, text: `Die Stundenplanung ist fertig (${pages} ${pages === 1 ? "Seite" : "Seiten"}) und in der Vorschau zu sehen. ${wordPlan ? "Es gibt auch eine Word-Fassung zum Bearbeiten. " : ""}${note}` }],
      details: { materials: [{ title: plan.titel, name: saved.name, path: saved.path }, ...(wordPlan ? [wordPlan.card] : [])] },
    };
  },
});

const vorlageSpeichern = defineTool({
  name: "vorlage_speichern",
  label: "Vorlage speichern",
  description:
    "Saves a template (personal skill) of the teacher, or changes one that exists. The instructions are checked first and every problem is returned in plain words: fix them and call again. Afterwards the template can be loaded with skill_laden under the returned name and used right away to test it.",
  parameters: Type.Object({
    titel: Type.String({ description: "Short name in plain words, e.g. Vokabeltest 11a" }),
    beschreibung: Type.String({ description: "One line: what it does, with which requests it applies (words teachers use), and 'Nicht für ...' for what it is not for" }),
    anleitung: Type.String({ description: "The instructions as Markdown: steps, rules, what to ask, what the result looks like" }),
  }),
  ask: (a) => `Darf ich die Vorlage „${a.titel}“ speichern?`,
  async execute(_id, args) {
    const saved = await saveVorlage(args, tools.map((t) => t.name));
    const how = { neu: "Die Vorlage ist neu angelegt.", geaendert: "Die Vorlage wurde geändert.", "ersetzt-mitgelieferte": "Die Vorlage ersetzt eine mitgelieferte mit demselben Namen. Löscht die Lehrkraft sie, gilt wieder die mitgelieferte." }[saved.art];
    return text(`${how} Für den Probelauf: lade sie jetzt mit skill_laden (Name: ${saved.name}) und folge ihr genau.`);
  },
});

const vorlageLesen = defineTool({
  name: "vorlage_lesen",
  label: "Vorlage nachlesen",
  description: "Reads the full text of a template (name as in the list of instructions), e.g. to improve it after a test run.",
  parameters: Type.Object({ name: Type.String() }),
  async execute(_id, { name }) {
    return text(await readVorlage(name));
  },
});

const vorlageEntfernen = defineTool({
  name: "vorlage_entfernen",
  label: "Vorlage löschen",
  description: "Deletes one of the teacher's own templates. Bundled templates cannot be deleted.",
  parameters: Type.Object({ name: Type.String() }),
  ask: (a) => `Darf ich deine Vorlage „${a.name}“ löschen?`,
  async execute(_id, { name }) {
    await deleteVorlage(name);
    return text("Die Vorlage ist gelöscht.");
  },
});

const bereichSchema = Type.Object({
  kurz: Type.String({ description: "Short label as the school calls it, e.g. AFB I or I" }),
  name: Type.Optional(Type.String({ description: "Name, e.g. Wiedergeben" })),
  anteil: Type.Optional(Type.Number({ description: "Intended share of the points in percent" })),
});
const noteSchema = Type.Object({
  note: Type.String({ description: "Grade label as on the school's reports, e.g. 1, 2+, sehr gut" }),
  abProzent: Type.Number({ description: "From this percent of the points on, 0 to 100" }),
});

const bewertungLesen = defineTool({
  name: "bewertung_lesen",
  label: "Bewertungsregeln nachlesen",
  description:
    "Reads the teacher's own assessment rules for a class: areas of demand (Anforderungsbereiche) and grading scale. Nothing is built in, every school and teacher has their own. If it says there are none, ask the teacher; never invent a scale.",
  parameters: Type.Object({ klasse: Type.String() }),
  async execute(_id, { klasse }) {
    const found = await readBewertung(klasse);
    if (!found) return text("Für diese Klasse sind noch keine Bewertungsregeln hinterlegt.");
    return text(`Bewertung aus „${found.ordner}“:\n${found.markdown}`);
  },
});

const bewertungSpeichern = defineTool({
  name: "bewertung_speichern",
  label: "Bewertungsregeln speichern",
  description:
    "Saves the teacher's assessment rules (areas of demand and grading scale) so they are used for every later exam. Only save what the teacher told you. The scale goes from the best to the worst grade with falling percent limits. Replaces earlier rules of that name.",
  parameters: Type.Object({
    lehrplan: Type.String({ description: "Name for the rules, e.g. the Bildungsgang or subject and level: Höhere Handelsschule, Englisch Sek I" }),
    klassen: Type.Array(Type.String(), { description: "Classes that use these rules" }),
    bereiche: Type.Optional(Type.Array(bereichSchema)),
    notenschluessel: Type.Optional(Type.Array(noteSchema)),
    hinweise: Type.Optional(Type.String({ description: "School-specific notes, e.g. weighting of exams" })),
  }),
  ask: (a) => `Darf ich die Bewertungsregeln „${a.lehrplan}“ für ${(a.klassen ?? []).join(", ") || "die Klasse"} speichern? Frühere Regeln mit diesem Namen werden ersetzt.`,
  async execute(_id, { lehrplan, klassen, bereiche, notenschluessel, hinweise }) {
    const ordner = await writeBewertung(lehrplan, klassen, { bereiche: bereiche ?? [], notenschluessel: notenschluessel ?? [], hinweise });
    return text(`Die Bewertungsregeln „${ordner}“ sind gespeichert.`);
  },
});

const klausurErstellen = defineTool({
  name: "klausur_erstellen",
  producesMaterial: true,
  label: "Klausur und Erwartungshorizont erstellen",
  description:
    "Builds an exam and its answer key (Erwartungshorizont) as two print-ready gray PDFs from structured content. You write only the content; layout, sums, shares per area and grade limits are calculated by the program. Every sub-task needs points (half steps) and the expected answer. If the class has assessment rules, its areas of demand and grading scale are used automatically and every sub-task must name one of those areas. Pass bereiche or notenschluessel only to override once. Give klasse, fach and reihe to file it in that series; add datum (and stunde if known) to also enter it in the lesson table.",
  parameters: Type.Object({
    titel: Type.String(),
    fach: Type.Optional(Type.String()),
    klasse: Type.Optional(Type.String()),
    datum: Type.Optional(Type.String({ description: "Date of the exam, e.g. 04.11." })),
    stunde: Type.Optional(Type.String({ description: "e.g. Mi 3" })),
    dauer: Type.Optional(Type.String({ description: "e.g. 90 Minuten" })),
    hilfsmittel: Type.Optional(Type.String()),
    hinweise: Type.Optional(Type.String({ description: "Instructions for the students" })),
    aufgaben: Type.Array(
      Type.Object({
        titel: Type.Optional(Type.String()),
        einstieg: Type.Optional(Type.String({ description: "Situation, text or data the sub-tasks refer to" })),
        teile: Type.Array(
          Type.Object({
            text: Type.String({ description: "The task for the students, starting with a clear verb" }),
            punkte: Type.Number({ description: "Points, half steps allowed" }),
            bereich: Type.Optional(Type.String({ description: "Area of demand, one of the teacher's labels" })),
            zeilen: Type.Optional(Type.Number({ description: "Writing lines, 0 to 25" })),
            erwartung: Type.String({ description: "What a good answer contains and what earns which points" }),
          }),
          { description: "1 to 8 sub-tasks" },
        ),
      }),
      { description: "1 to 12 tasks" },
    ),
    reihe: Type.Optional(Type.String({ description: "Name of the Reihe to file it in" })),
    word: wordParam,
    bereiche: Type.Optional(Type.Array(bereichSchema)),
    notenschluessel: Type.Optional(Type.Array(noteSchema)),
  }),
  async execute(_id, args) {
    const { reihe, stunde, bereiche, notenschluessel, word, ...content } = args;
    const own = content.klasse ? await readBewertung(content.klasse).catch(() => undefined) : undefined;
    // Rules given in this request are checked like saved ones: scales must fall, areas must be unique.
    const given = bereiche || notenschluessel ? checkBewertung({ bereiche: bereiche ?? [], notenschluessel: notenschluessel ?? [] }) : undefined;
    const rules = {
      bereiche: bereiche ? given!.bereiche : own?.bewertung.bereiche,
      notenschluessel: notenschluessel ? given!.notenschluessel : own?.bewertung.notenschluessel,
    };
    const exam = parseKlausur(
      { ...content, fuss: content.klasse && (await hasLehrplan(content.klasse)) ? undefined : "Ohne hinterlegten Lehrplan erstellt" },
      rules,
    );
    const where = { klasse: content.klasse, fach: content.fach, reihe, datum: content.datum, stunde };
    const klausur = await renderKlausur(exam);
    const ehz = await renderErwartungshorizont(exam);
    const savedK = await saveMaterial(klausur.pdf, { art: "Klausur", titel: exam.titel, ...where });
    const savedE = await saveMaterial(ehz.pdf, { art: "Erwartungshorizont", titel: exam.titel, ...where });
    const wordK = word ? await saveWord(await klausurWord(exam), { art: "Klausur", titel: exam.titel, ...where }, `${exam.titel} (Word)`) : undefined;
    const wordE = word ? await saveWord(await erwartungshorizontWord(exam), { art: "Erwartungshorizont", titel: exam.titel, ...where }, `Erwartungshorizont: ${exam.titel} (Word)`) : undefined;
    const entered = content.klasse && content.fach && reihe && content.datum
      ? await tryAttach(content.klasse, content.fach, reihe, { datum: content.datum, stunde: stunde ?? "", thema: exam.titel }, savedK.name)
      : "fehlt klasse, fach, reihe oder datum";
    const notes = [
      `Die Klausur ist fertig (${klausur.pages} ${klausur.pages === 1 ? "Seite" : "Seiten"}, ${gesamtpunkte(exam)} Punkte) und der Erwartungshorizont dazu (${ehz.pages} ${ehz.pages === 1 ? "Seite" : "Seiten"}). Beides ist in der Vorschau zu sehen.`,
      exam.notenschluessel.length
        ? `Der Notenschlüssel stammt ${notenschluessel ? "aus dieser Anfrage" : `aus den Bewertungsregeln „${own?.ordner}“`}.`
        : "Es ist kein Notenschlüssel hinterlegt, im Erwartungshorizont steht deshalb keiner. Frag die Lehrkraft danach und biete an, ihn zu speichern.",
      wordK ? "Beides gibt es auch als Word-Datei zum Bearbeiten." : "",
      ...verteilung(exam).filter((v) => v.soll !== undefined && Math.abs(v.anteil - v.soll) > 10).map((v) => `ACHTUNG: Bereich ${v.kurz} hat ${Math.round(v.anteil)} % der Punkte, vorgesehen sind ${v.soll} %. Die Verteilung weicht um mehr als 10 Prozentpunkte ab. Erstelle die Klausur neu und gleiche das aus, bevor du der Lehrkraft Bescheid sagst.`),
      entered === true ? `Die Klausur ist in der Stundentabelle am ${content.datum} eingetragen.` : `Die Klausur ist NICHT in die Stundentabelle eingetragen (${entered}).`,
      exam.bereiche.length ? "" : "Es sind keine Bereiche hinterlegt, deshalb gibt es keine Verteilung auf Bereiche.",
    ].filter(Boolean);
    return {
      content: [{ type: "text" as const, text: notes.join("\n") }],
      details: {
        materials: [
          { title: exam.titel, name: savedK.name, path: savedK.path },
          { title: `Erwartungshorizont: ${exam.titel}`, name: savedE.name, path: savedE.path, preview: false },
          ...(wordK ? [wordK.card] : []),
          ...(wordE ? [wordE.card] : []),
        ],
      },
    };
  },
});

const NO_PLAN = "Für diese Klasse ist kein Lehrplan hinterlegt. Arbeite ohne und sag der Lehrkraft ehrlich, dass dir der Plan fehlt. Sie kann ihn links unter „Lehrpläne“ hinzufügen.";

const lehrplanLesen = defineTool({
  name: "lehrplan_lesen",
  label: "Lehrplan nachlesen",
  description:
    "Reads the curriculum (Lehrplan) of a class in small steps. Without `abschnitt` you get the outline (numbered headings with sizes). Then read only the section you need with `abschnitt` = its number. Long sections continue with `ab`. Never read everything: the plan can be very long.",
  parameters: Type.Object({
    klasse: Type.String(),
    abschnitt: Type.Optional(Type.Number({ description: "Number from the outline" })),
    ab: Type.Optional(Type.Number({ description: "Character offset to continue a long section" })),
  }),
  async execute(_id, { klasse, abschnitt, ab }) {
    const plan = await planFor(klasse);
    if (!plan) return text(NO_PLAN);
    if (abschnitt === undefined) {
      const heads = outline(plan.markdown);
      const shown = heads.length > 120 ? heads.filter((h) => h.level <= 3) : heads;
      const list = shown.map((h) => `${h.id}. ${"  ".repeat(Math.max(0, h.level - 1))}${h.title} (${h.length} Zeichen)`).join("\n");
      return text(`Lehrplan „${plan.name}“, Gliederung:\n${list}\n\nLies einen Abschnitt mit abschnitt=<Nummer>. Mit lehrplan_suchen findest du Stellen nach Stichwort.`);
    }
    return text(section(plan.markdown, abschnitt, ab ?? 0));
  },
});

const lehrplanSuchen = defineTool({
  name: "lehrplan_suchen",
  label: "Im Lehrplan suchen",
  description: "Searches the curriculum of a class for words (all must appear in a paragraph). Returns up to 8 paragraphs with the heading path and the section number for lehrplan_lesen.",
  parameters: Type.Object({ klasse: Type.String(), suche: Type.String({ description: "One to four keywords, e.g. 'Bewerbung Interview'" }) }),
  async execute(_id, { klasse, suche }) {
    const plan = await planFor(klasse);
    if (!plan) return text(NO_PLAN);
    const hits = search(plan.markdown, suche);
    if (hits.length === 0) return text("Dazu steht nichts im Lehrplan. Versuche ein anderes Stichwort.");
    return text(hits.map((h) => `[Abschnitt ${h.id ?? "-"}: ${h.path || "Anfang"}]\n${h.text}`).join("\n\n"));
  },
});

export const tools: TeacherTool[] = [
  lehrplanLesen, lehrplanSuchen,
  arbeitsblattErstellen, praesentationErstellen, stundenverlaufErstellen, klausurErstellen, lernsituationErstellen, bewertungLesen, bewertungSpeichern,
  skillLaden, skillDateiLesen, vorlageSpeichern, vorlageLesen, vorlageEntfernen,
  dateTool, klassenUebersicht, klasseLesen, standLesen, reiheLesen, materialLesen, lueckenTool, standSchreiben, reiheAnlegen, stundeEintragen,
];

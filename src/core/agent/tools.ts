import { StringEnum, Type, type Tool } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { loadSkill, readSkillFile } from "../skills/index.ts";
import {
  createReihe, listTree, materialLuecken, readKlasse, readReihe, readStand, setStunde, STATUS, writeStand,
} from "../workspace/index.ts";

/**
 * Fixed, teacher-specific tools only. No shell, no free file access.
 * `label` is German and shown in the progress display.
 * `ask` marks a tool that changes files: the teacher is asked first, in plain language.
 */
export type TeacherTool = AgentTool<any> & { ask?: (args: any) => string };

type Params = Tool["parameters"];
/** Keeps the argument types of each tool while the list below holds them as one type. */
const defineTool = <P extends Params>(tool: AgentTool<P> & { ask?: (args: any) => string }): TeacherTool => tool as TeacherTool;

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
  description: "Reads Klasse.md (school type, level, subjects, notes). Read this first for a class, then stand_lesen.",
  parameters: Type.Object({ klasse: Type.String({ description: "Class name, e.g. 11a" }) }),
  async execute(_id, { klasse }) {
    return text(await readKlasse(klasse));
  },
});

const standLesen = defineTool({
  name: "stand_lesen",
  label: "Stand nachlesen",
  description: "Reads Stand.md of a class and subject: where we are and what comes next. Read it after klasse_lesen.",
  parameters: Type.Object({ klasse: Type.String(), fach: Type.String() }),
  async execute(_id, { klasse, fach }) {
    return text(await readStand(klasse, fach));
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
    "Overwrites Stand.md of a class and subject. Call it at the end of a work session. Read the old Stand first and pass every field that is still true. Keep entries short. Leave a field empty if unknown, never invent.",
  parameters: Type.Object({
    klasse: Type.String(),
    fach: Type.String(),
    aktuelleReihe: Type.Optional(Type.String()),
    zuletztBehandelt: Type.Optional(Type.String()),
    naechsteStunde: Type.Optional(Type.String()),
    offen: Type.Optional(Type.Array(Type.String(), { description: "Open points, short" })),
    besonderheiten: Type.Optional(Type.String({ description: "Class-level observations only, no student names" })),
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
  ask: (a) => `Darf ich in ${a.klasse}, ${a.fach} die neue Reihe „${a.thema}“ anlegen?`,
  async execute(_id, { klasse, fach, ...rest }) {
    const name = await createReihe(klasse, fach, rest);
    return text(`Die Reihe ist angelegt: ${name}`);
  },
});

const stundeEintragen = defineTool({
  name: "stunde_eintragen",
  label: "Stunde eintragen",
  description: `Adds or updates one lesson row in a Reihe, found by date and period. Status must be one of: ${STATUS.join(", ")}. Empty fields keep their old value.`,
  parameters: Type.Object({
    klasse: Type.String(),
    fach: Type.String(),
    reihe: Type.String(),
    datum: Type.String({ description: "e.g. 14.10." }),
    stunde: Type.String({ description: "e.g. Mi 3" }),
    thema: Type.Optional(Type.String()),
    material: Type.Optional(Type.String({ description: "File name in the Material folder" })),
    status: Type.Optional(StringEnum([...STATUS])),
  }),
  ask: (a) => `Darf ich die Stunde am ${a.datum} (${a.stunde}) in ${a.klasse}, ${a.fach} eintragen oder ändern?`,
  async execute(_id, { klasse, fach, reihe, ...patch }) {
    await setStunde(klasse, fach, reihe, patch);
    return text("Die Stunde ist eingetragen.");
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

export const tools: TeacherTool[] = [
  skillLaden, skillDateiLesen,
  dateTool, klassenUebersicht, klasseLesen, standLesen, reiheLesen, lueckenTool, standSchreiben, reiheAnlegen, stundeEintragen,
];

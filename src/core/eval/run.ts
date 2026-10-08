import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createChatSession, type SessionDeps } from "../agent/index.ts";
import type { AgentSettings } from "../agent/types.ts";
import { readPdf } from "../lehrplan/pdf.ts";
import { fixtureBild } from "./bilder.ts";
import { readMaterialText } from "../material/read.ts";
import { listSkills } from "../skills/index.ts";
import { createClass, createReihe, initWorkspace, readKlasse, readStand, writeStand } from "../workspace/index.ts";
import { writeBewertung } from "../workspace/bewertung.ts";
import { dataDir } from "../paths.ts";
import type { EvalCase, FileInfo, Transcript, Turn } from "./types.ts";

export const KLASSE = "11a";
export const FACH = "Business English";
export const REIHE = "Bewerbung";

/** An invented class with a series, a state and the school's own assessment rules. No real people, no real school. */
export async function seedWorkspace(): Promise<void> {
  await initWorkspace();
  await createClass({ name: KLASSE, schulform: "Berufskolleg", stufe: "11", kursniveau: "Höhere Handelsschule", faecher: [FACH], besonderheiten: "Zwei Lernende sprechen zu Hause kein Deutsch." });
  await createReihe(KLASSE, FACH, {
    thema: REIHE,
    handlungssituation: "Die Lernenden bewerben sich bei einem erfundenen Reiseunternehmen um einen Ausbildungsplatz.",
    ablauf: [
      { thema: "Stellenanzeigen lesen", datum: "12.10." },
      { thema: "Das Anschreiben", datum: "14.10." },
      { thema: "Der Lebenslauf (CV)", datum: "19.10." },
      { thema: "Das Vorstellungsgespräch", datum: "21.10." },
    ],
  });
  await writeStand(KLASSE, FACH, {
    aktuelleReihe: `01 ${REIHE}`,
    zuletztBehandelt: "Stellenanzeigen auswerten (12.10.)",
    naechsteStunde: "Das Anschreiben (14.10.)",
    offen: ["Wortschatz zum Thema Bewerbung wiederholen"],
  });
  await writeBewertung("Höhere Handelsschule", [KLASSE], {
    bereiche: [{ kurz: "I", name: "Reproduktion", anteil: 30 }, { kurz: "II", name: "Reorganisation und Transfer", anteil: 50 }, { kurz: "III", name: "Problemlösung und Beurteilung", anteil: 20 }],
    notenschluessel: [{ note: "1", abProzent: 92 }, { note: "2", abProzent: 81 }, { note: "3", abProzent: 67 }, { note: "4", abProzent: 50 }, { note: "5", abProzent: 30 }, { note: "6", abProzent: 0 }],
  });
}

const fachDir = () => join(dataDir(), "Klassen", KLASSE, FACH);

/** Every series folder of the subject, so a new series made during the run is found too. */
const reihenOrdner = async () => (await readdir(fachDir(), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();

async function collectFiles(): Promise<FileInfo[]> {
  const found: { name: string; path: string }[] = [];
  for (const reihe of await reihenOrdner()) {
    for (const name of await readdir(join(fachDir(), reihe, "Material")).catch(() => [] as string[])) found.push({ name, path: join(fachDir(), reihe, "Material", name) });
  }
  for (const name of await readdir(join(dataDir(), "Exporte")).catch(() => [] as string[])) found.push({ name, path: join(dataDir(), "Exporte", name) });
  const files: FileInfo[] = [];
  for (const f of found) {
    const art = f.name.endsWith(".pdf") ? "pdf" : f.name.endsWith(".docx") ? "docx" : "andere";
    let text = "";
    let seiten: number | undefined;
    try {
      text = await readMaterialText(f.path);
      if (art === "pdf") {
        const pdf = await readPdf(await readFile(f.path));
        seiten = pdf.pages.length;
        await pdf.close();
      }
    } catch (err) {
      text = `(nicht lesbar: ${(err as Error).message})`;
    }
    // Teacher's copies are named so the judge does not take them for the student sheet.
    files.push({ name: /Loesung-/.test(f.name) ? `${f.name} [Lösungsblatt für die Lehrkraft]` : f.name, art, text, seiten });
  }
  return files;
}

/** The lesson tables of all series, each under its folder name. */
async function tables(): Promise<string> {
  const out: string[] = [];
  for (const reihe of await reihenOrdner()) {
    const md = await readFile(join(fachDir(), reihe, "Reihe.md"), "utf8").catch(() => "");
    out.push(`Reihe ${reihe}\n${md.split("## Stunden")[1]?.split("## Notizen")[0]?.trim() ?? ""}`);
  }
  return out.join("\n\n");
}

/** The assessment rules and the teacher's own templates as they are at the end of a run. Nothing else is written there by the assistant. */
async function collectSaved(): Promise<string | undefined> {
  const blocks: string[] = [];
  const read = async (dir: string, file: string, title: string) => {
    for (const name of (await readdir(dir, { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
      const text = await readFile(join(dir, name, file), "utf8").catch(() => "");
      if (text.trim()) blocks.push(`=== ${title}: ${name} ===\n${text.trim()}`);
    }
  };
  await read(join(dataDir(), "Lehrpläne"), "Bewertung.md", "Bewertungsregeln");
  await read(join(dataDir(), "Skills"), "SKILL.md", "Eigene Vorlage");
  return blocks.length ? blocks.join("\n\n") : undefined;
}

/**
 * Plays one test case in a fresh invented working folder: sends each message, says yes to every question
 * "May I ...?", and collects what the assistant said, what it did and what it left behind.
 */
export async function runCase(c: EvalCase, settings: AgentSettings, deps: Pick<SessionDeps, "resolve"> & { timeoutMs?: number } = {}): Promise<Transcript> {
  const before = process.env.PULT_HOME;
  const home = await mkdtemp(join(tmpdir(), "pult-eval-"));
  process.env.PULT_HOME = home;
  try {
    await seedWorkspace();
    const { skills } = await listSkills();
    const session = createChatSession(settings, { skills, resolve: deps.resolve, measuring: true });
    const turns: Turn[] = [];
    const bilder = await Promise.all((c.bilder ?? []).map(fixtureBild));
    for (const [n, user] of c.nachrichten.entries()) {
      const turn: Turn = { user, assistant: "", steps: [], fragen: [] };
      // A model request that never answers must not block the whole run: after the time limit the answer is cut off.
      const timer = setTimeout(() => session.abort(), deps.timeoutMs ?? 240_000);
      await session.send(user, (e) => {
        if (e.type === "text") turn.assistant += e.delta;
        else if (e.type === "step_start") turn.steps.push(e.label);
        else if (e.type === "confirm") {
          turn.fragen.push(e.question);
          session.answer(e.id, true);
        } else if (e.type === "fragen") {
          // No teacher here: take the recommendations, and count the questions like questions in the text.
          turn.fragen.push(...e.fragen.map((f) => f.frage));
          session.answerQuestions(e.id, e.fragen.map((f) => ({ antwort: f.antworten[f.empfohlen - 1]!.text })));
        } else if (e.type === "error") turn.assistant += `\n[Fehler: ${e.message}]`;
      }, n === 0 ? bilder.map(({ data, mimeType }) => ({ data, mimeType })) : []).finally(() => clearTimeout(timer));
      turns.push(turn);
    }
    await readStand(KLASSE, FACH); // fails loudly when the folder was broken by the run
    const ordner = `Klasse.md:\n${(await readKlasse(KLASSE)).trim()}\n\nStand.md:\n${(await readStand(KLASSE, FACH)).trim()}`;
    return { turns, files: await collectFiles(), tabelle: await tables(), ordner, gespeichert: await collectSaved(), vorlage: bilder.length ? bilder.map((b) => b.text).join("\n\n") : undefined, kosten: session.usage().cost };
  } finally {
    if (before === undefined) delete process.env.PULT_HOME;
    else process.env.PULT_HOME = before;
    await rm(home, { recursive: true, force: true });
  }
}

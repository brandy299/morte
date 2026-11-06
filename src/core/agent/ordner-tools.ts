import { Type } from "@earendil-works/pi-ai";
import { ArbeitsordnerError, auflisten, lesen, schreiben } from "../arbeitsordner/index.ts";
import type { TeacherTool } from "./tools.ts";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: undefined });

/** Said when no folder is chosen. The teacher picks one next to the message field. */
const KEIN_ORDNER = "Es ist kein Ordner gewählt. Bitte die Lehrkraft, über den Ordner-Knopf unter dem Eingabefeld einen Ordner zu wählen.";

/**
 * Tools for the folder the teacher picked next to the message field. They work only inside it.
 * Listing and reading never change anything, new files are created without asking, replacing a file asks first.
 * No tool deletes.
 */
export function ordnerTools(wurzel: () => string | undefined): TeacherTool[] {
  /** Runs `work` in the folder; folder problems go back to the model as plain text, anything else stays an error. */
  const imOrdner = async (work: (dir: string) => Promise<string>) => {
    const dir = wurzel();
    if (!dir) return text(KEIN_ORDNER);
    try {
      return text(await work(dir));
    } catch (err) {
      if (err instanceof ArbeitsordnerError) return text(err.message);
      throw err;
    }
  };

  const ansehen = {
    name: "ordner_ansehen",
    label: "Ordner ansehen",
    description: "Lists the files and subfolders of the folder the teacher chose to work in (or a subfolder of it). Use it when the teacher mentions their folder or files on their computer.",
    parameters: Type.Object({ ordner: Type.Optional(Type.String({ description: "Subfolder, relative to the chosen folder, e.g. 'Klausuren/2025'. Empty: the chosen folder itself." })) }),
    async execute(_id: string, { ordner }: { ordner?: string }) {
      return imOrdner(async (dir) => {
        const { eintraege, mehr } = await auflisten(dir, ordner ?? "");
        if (!eintraege.length) return "Der Ordner ist leer.";
        const kb = (b?: number) => (b === undefined ? "" : b < 1024 ? ` (${b} B)` : ` (${Math.round(b / 1024)} KB)`);
        return eintraege.map((e) => (e.ordner ? `[Ordner] ${e.name}` : `${e.name}${kb(e.bytes)}`)).join("\n") + (mehr ? `\n… und ${mehr} weitere` : "");
      });
    },
  };

  const lese = {
    name: "ordner_datei_lesen",
    label: "Datei im Ordner lesen",
    description: "Reads the text of a file in the chosen folder: PDF, Word, Excel, PowerPoint, OpenOffice, text and CSV. Long files are cut; the result says so.",
    parameters: Type.Object({ datei: Type.String({ description: "Path relative to the chosen folder, e.g. 'Klausuren/Klausur1.docx'." }) }),
    async execute(_id: string, { datei }: { datei: string }) {
      return imOrdner(async (dir) => {
        const r = await lesen(dir, datei);
        return [r.info ? `(${r.info})` : "", r.text, r.gekuerzt ? "[Der Text wurde gekürzt, die Datei ist länger.]" : ""].filter(Boolean).join("\n");
      });
    },
  };

  const neu = {
    name: "ordner_datei_anlegen",
    label: "Datei im Ordner anlegen",
    description:
      "Creates a NEW text file (.txt, .md, .csv or .html) in the chosen folder, also in a new subfolder. Never overwrites: if the file exists it fails. Use it for notes, lists and texts the teacher wants as a file; finished worksheets and tests come from the material tools.",
    parameters: Type.Object({ datei: Type.String({ description: "Path relative to the chosen folder, with the file ending." }), inhalt: Type.String({ description: "The whole text of the file." }) }),
    async execute(_id: string, { datei, inhalt }: { datei: string; inhalt: string }) {
      return imOrdner(async (dir) => `Angelegt: ${(await schreiben(dir, datei, inhalt)).pfad}`);
    },
  };

  const ersetzen = {
    name: "ordner_datei_ersetzen",
    label: "Datei im Ordner ersetzen",
    description: "Replaces the whole content of an existing text file (.txt, .md, .csv or .html) in the chosen folder. The teacher is asked first. Read the file before so nothing gets lost.",
    parameters: Type.Object({ datei: Type.String({ description: "Path relative to the chosen folder." }), inhalt: Type.String({ description: "The new, complete text of the file." }) }),
    ask: ({ datei }: { datei: string }) => `Soll ich die Datei „${datei}“ in deinem gewählten Ordner ersetzen? Der alte Inhalt ist danach weg.`,
    async execute(_id: string, { datei, inhalt }: { datei: string; inhalt: string }) {
      return imOrdner(async (dir) => `Ersetzt: ${(await schreiben(dir, datei, inhalt, true)).pfad}`);
    },
  };

  return [ansehen, lese, neu, ersetzen] as unknown as TeacherTool[];
}

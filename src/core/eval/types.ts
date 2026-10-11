import type { PptxInfo } from "./pptx.ts";

export interface Criterion {
  id: string;
  /** P Pädagogik, R Anspruch, O Form, M Gesprächsführung. */
  gruppe: string;
  kriterium: string;
  bestandenWenn: string;
  hinweis: string;
  /** When set, the criterion only counts if this condition holds for the case; otherwise it is skipped, not failed. */
  bedingung: string;
  /** "Programm" is decided by code, "Prüfer" by the judge model. */
  art: "Programm" | "Prüfer";
}

export interface EvalCase {
  id: string;
  skill: string;
  /** What the teacher types, one message per turn. Later turns answer the assistant's questions. */
  nachrichten: string[];
  /** Pictures attached to the first message, by name (see bilder.ts). */
  bilder?: string[];
  /** Changes to the invented starting folder (default: see seedWorkspace). */
  ausgang?: {
    /** Stand.md of 11a at the start, instead of the usual short one. */
    stand?: { aktuelleReihe?: string; zuletztBehandelt?: string; naechsteStunde?: string; offen?: string[]; besonderheiten?: string };
  };
  /** What the program can expect, so checks know what applies. */
  erwartet: {
    /** Stand.md must be rewritten and every one of these words must stand in it afterwards (any case). */
    standNeu?: string[];
    /** Number (1-based) of the lesson row that must have the status "gehalten" afterwards. */
    gehalten?: number;
    /** Regular expressions that must match nothing in Stand.md and Reihe.md afterwards (names, grades). */
    verboten?: string[];
    /** Stand.md must not be longer after the session than before. */
    nichtLaenger?: boolean;
    /** Klasse.md must be read before Stand.md, and Reihe.md only after both. */
    leseOrdnung?: boolean;
    /** Reihe.md must not be read at all. */
    ohneReihe?: boolean;
    /** A file must be created. */
    material?: boolean;
    /** Largest accepted page count per PDF. Default 2. */
    maxSeiten?: number;
    /** Date (e.g. "21.10.") the material must be entered under in the lesson table. */
    eintrag?: string;
    /** The assistant must not change anything in the working folder. */
    nurLesen?: boolean;
    /** Number of student versions (differentiation). */
    fassungen?: number;
    /** No file may be created in the first turn (the plan is shown first). */
    erstVorschlag?: boolean;
    /** Text that must stand in the saved assessment rules or templates at the end (see Transcript.gespeichert). */
    gespeichert?: string;
    /** A PowerPoint file must be created. */
    praesentation?: boolean;
    /** Allowed number of slides after the title slide: [least, most]. */
    folien?: [number, number];
    /** The first answer asks at most this many questions. */
    maxFragen?: number;
    /** The slides must hold a sketch of a program window with numbered blank areas. */
    oberflaeche?: boolean;
  };
}

export interface Turn {
  user: string;
  assistant: string;
  steps: string[];
  fragen: string[];
  /** Labels of steps the program refused or that failed (for example a slide with too much text), kept to understand a run. */
  fehlgeschlagen?: string[];
}

export interface FileInfo {
  name: string;
  art: "pdf" | "docx" | "pptx" | "andere";
  /** Structure of a PowerPoint file, for checks the plain text cannot answer. */
  pptx?: PptxInfo;
  text: string;
  seiten?: number;
}

export interface Transcript {
  turns: Turn[];
  files: FileInfo[];
  /** Lesson table of the series as saved at the end. */
  tabelle: string;
  /** Klasse.md and Stand.md as the assistant could read them, so the judge knows what is really in the folder. */
  ordner?: string;
  /** Text on the pictures that were attached, so the judge can compare. */
  vorlage?: string;
  /** What stands in the saved assessment rules and in the teacher's own templates at the end, so the judge can see what was written there. */
  gespeichert?: string;
  /** Stand.md of 11a as raw text before and after the run. */
  stand?: { vorher: string; nachher: string };
  /** All Reihe.md files of 11a as raw text after the run. */
  reihe?: string;
  kosten: number;
}

export interface Verdict {
  id: string;
  /** null: does not apply to this case. */
  bestanden: boolean | null;
  grund: string;
}

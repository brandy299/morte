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
  /** What the program can expect, so checks know what applies. */
  erwartet: {
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
  };
}

export interface Turn {
  user: string;
  assistant: string;
  steps: string[];
  fragen: string[];
}

export interface FileInfo {
  name: string;
  art: "pdf" | "docx" | "andere";
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
  /** Text of Reihe.md before the run, to see what changed. */
  kosten: number;
}

export interface Verdict {
  id: string;
  /** null: does not apply to this case. */
  bestanden: boolean | null;
  grund: string;
}

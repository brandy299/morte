/** Fixed status words (see CLAUDE.md). Queries depend on them, so no free text. */
export const STATUS = ["geplant", "Material fertig", "gehalten"] as const;
export type Status = (typeof STATUS)[number];

export interface Stunde {
  datum: string;
  stunde: string;
  thema: string;
  material: string;
  status: string;
}

const HEADER = "| Datum | Stunde | Thema | Material | Status |";
const SEPARATOR = "|---|---|---|---|---|";

const cell = (s: string) => s.replace(/\|/g, "/").replace(/\s+/g, " ").trim();

const row = (s: Stunde) => `| ${[s.datum, s.stunde, s.thema, s.material, s.status].map(cell).join(" | ")} |`;

/** Finds the table under "## Stunden" and returns its rows plus the line range it occupies. */
function locateTable(lines: string[]) {
  const start = lines.findIndex((l) => /^##\s+Stunden\s*$/.test(l));
  if (start < 0) return undefined;
  let first = -1;
  let last = -1;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith("|")) {
      if (first < 0) first = i;
      last = i;
    } else if (first >= 0) break;
    else if (/^##\s/.test(line)) break;
  }
  return { start, first, last };
}

export function parseStunden(markdown: string): Stunde[] {
  const lines = markdown.split(/\r?\n/);
  const t = locateTable(lines);
  if (!t || t.first < 0) return [];
  return lines
    .slice(t.first + 2, t.last + 1) // skip header and separator
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
    .filter((c) => c.length >= 5 && c.some(Boolean))
    .map(([datum = "", stunde = "", thema = "", material = "", status = ""]) => ({ datum, stunde, thema, material, status }));
}

/** Replaces the table in `markdown` with `stunden`. Everything else in the file stays untouched. */
export function writeStunden(markdown: string, stunden: Stunde[]): string {
  const lines = markdown.split(/\r?\n/);
  const table = [HEADER, SEPARATOR, ...stunden.map(row)];
  const t = locateTable(lines);
  if (!t) return `${markdown.trimEnd()}\n\n## Stunden\n${table.join("\n")}\n`;
  if (t.first < 0) {
    lines.splice(t.start + 1, 0, ...table);
  } else {
    lines.splice(t.first, t.last - t.first + 1, ...table);
  }
  return lines.join("\n");
}

/**
 * Inserts or updates a row. With `nr` (1-based) that row is updated, which is how a planned lesson
 * without a date gets its date. Otherwise the row is found by date and period.
 * Empty fields in `patch` keep the old value.
 */
export function upsertStunde(stunden: Stunde[], patch: Partial<Stunde> & { nr?: number }): Stunde[] {
  const key = (s: { datum?: string; stunde?: string }) => `${cell(s.datum ?? "")}|${cell(s.stunde ?? "")}`.toLowerCase();
  const i = patch.nr !== undefined ? patch.nr - 1 : stunden.findIndex((s) => key(s) === key(patch));
  if (i < 0 || i >= stunden.length) {
    return [...stunden, { datum: patch.datum ?? "", stunde: patch.stunde ?? "", thema: patch.thema ?? "", material: patch.material ?? "", status: patch.status || "geplant" }];
  }
  const old = stunden[i]!;
  const merged: Stunde = {
    datum: patch.datum || old.datum,
    stunde: patch.stunde || old.stunde,
    thema: patch.thema || old.thema,
    material: patch.material || old.material,
    status: patch.status || old.status,
  };
  return stunden.map((s, j) => (j === i ? merged : s));
}

export interface AblaufSchritt {
  thema: string;
  /** e.g. a phase of the complete action (Informieren, Planen, ...) or any label the teacher uses. */
  phase?: string;
  /** What happens in this lesson. */
  inhalt?: string;
  /** What the students produce. */
  produkt?: string;
}

const line = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim();

export function newReiheMarkdown(f: {
  thema: string;
  lernfeld?: string;
  lehrplan?: string;
  zeitraum?: string;
  ziele?: string[];
  leistungsnachweis?: string;
  szenario?: string;
  handlungssituation?: string;
  handlungsprodukt?: string;
  ablauf?: AblaufSchritt[];
  stunden?: Stunde[];
}): string {
  const ziele = (f.ziele ?? []).map(line).filter(Boolean);
  const situation = f.handlungssituation?.trim();
  const ablauf = (f.ablauf ?? []).map((s, i) => {
    const extra = [s.inhalt && line(s.inhalt), s.produkt && `Ergebnis: ${line(s.produkt)}`].filter(Boolean).join(" ");
    return `${i + 1}. ${line(s.thema)}${s.phase ? ` (${line(s.phase)})` : ""}${extra ? `: ${extra}` : ""}`;
  });
  return `# Reihe: ${line(f.thema)}

Lernfeld: ${line(f.lernfeld)}
Lehrplan: ${line(f.lehrplan)}
Zeitraum: ${line(f.zeitraum)}
Kompetenzen / Ziele:${ziele.length ? `\n${ziele.map((z) => `- ${z}`).join("\n")}` : ""}
Leistungsnachweis: ${line(f.leistungsnachweis)}
Szenario: ${line(f.szenario)}
Handlungsprodukt: ${line(f.handlungsprodukt)}
${situation ? `\n## Handlungssituation\n${situation.replace(/\r?\n/g, "\n").replace(/^#+\s*/gm, "")}\n` : ""}${ablauf.length ? `\n## Ablauf\n${ablauf.join("\n")}\n` : ""}
## Stunden
${[HEADER, SEPARATOR, ...(f.stunden ?? []).map(row)].join("\n")}

## Notizen
`;
}

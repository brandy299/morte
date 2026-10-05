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

/** Inserts or updates a row, keyed by date and period. Empty fields in `patch` keep the old value. */
export function upsertStunde(stunden: Stunde[], patch: Partial<Stunde> & Pick<Stunde, "datum" | "stunde">): Stunde[] {
  const key = (s: { datum: string; stunde: string }) => `${cell(s.datum)}|${cell(s.stunde)}`.toLowerCase();
  const i = stunden.findIndex((s) => key(s) === key(patch));
  if (i < 0) {
    return [...stunden, { thema: "", material: "", status: "geplant", ...patch }];
  }
  const old = stunden[i]!;
  const merged: Stunde = {
    datum: old.datum,
    stunde: old.stunde,
    thema: patch.thema || old.thema,
    material: patch.material || old.material,
    status: patch.status || old.status,
  };
  return stunden.map((s, j) => (j === i ? merged : s));
}

export function newReiheMarkdown(f: {
  thema: string;
  lernfeld?: string;
  lehrplan?: string;
  zeitraum?: string;
  leistungsnachweis?: string;
  szenario?: string;
}): string {
  return `# Reihe: ${f.thema}

Lernfeld: ${f.lernfeld ?? ""}
Lehrplan: ${f.lehrplan ?? ""}
Zeitraum: ${f.zeitraum ?? ""}
Kompetenzen / Ziele:
Leistungsnachweis: ${f.leistungsnachweis ?? ""}
Szenario: ${f.szenario ?? ""}

## Stunden
${HEADER}
${SEPARATOR}

## Notizen
`;
}

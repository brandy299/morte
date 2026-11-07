/** What a class name like "HHUC" probably stands for. Only used as a suggestion the teacher confirms. */
export interface Deutung {
  schulform: string;
  /** Plain text for the "Stufe" answer, e.g. "Höhere Handelsschule Unterstufe Klasse C". */
  stufe: string;
}

// Bildungsgänge at the Berufskolleg (NRW). Longest abbreviation first, so "HBFS" is not read as "HB" + "FS".
const BILDUNGSGANG: [string, string][] = [
  ["HBFS", "Höhere Berufsfachschule"],
  ["BFS", "Berufsfachschule"],
  ["FOS", "Fachoberschule"],
  ["HH", "Höhere Handelsschule"],
];
const STUFE: Record<string, string> = { U: "Unterstufe", M: "Mittelstufe", O: "Oberstufe" };

/** "HHUC" gives Höhere Handelsschule, Unterstufe, Klasse C. Returns undefined when the name does not fit the pattern. */
export function deuteKlassenname(raw: string): Deutung | undefined {
  const name = raw.trim().toUpperCase();
  for (const [kuerzel, text] of BILDUNGSGANG) {
    if (!name.startsWith(kuerzel)) continue;
    const m = /^([UMO])?([A-Z]|\d{1,2})$/.exec(name.slice(kuerzel.length));
    if (!m || (!m[1] && !/^[A-Z]$/.test(m[2]!) && !/^\d/.test(m[2]!))) continue;
    return { schulform: "Berufskolleg", stufe: [text, m[1] && STUFE[m[1]], `Klasse ${m[2]}`].filter(Boolean).join(" ") };
  }
  return undefined;
}

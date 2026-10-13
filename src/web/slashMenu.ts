import type { VorlageInfo } from "./api.ts";

/** The word after a leading "/" while the teacher types it, or undefined when the input is not a slash command (a space ends it). */
export const slashQuery = (input: string): string | undefined => /^\/([^\s/]*)$/.exec(input)?.[1];

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** One line for the menu: the first sentence of the description, short. */
export function kurz(beschreibung: string, max = 170): string {
  const first = beschreibung.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0] ?? "";
  const line = first.replace(/[.!?]$/, "");
  if (line.length <= max) return line;
  // Cut at a word, so the line does not end in the middle of one.
  const cut = line.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Templates that match what is typed after the slash: the title or the name starts with it first, then contains it. Own ones before bundled within a group. */
export function filterVorlagen(vorlagen: VorlageInfo[], query: string): VorlageInfo[] {
  const q = fold(query);
  if (!q) return vorlagen;
  const rank = (v: VorlageInfo) => {
    const t = fold(v.titel);
    const n = fold(v.name);
    if (t.startsWith(q) || n.startsWith(q)) return 0;
    if (t.includes(q) || n.includes(q)) return 1;
    return 2;
  };
  return vorlagen
    .map((v) => ({ v, r: rank(v) }))
    .filter((x) => x.r < 2)
    .sort((a, b) => a.r - b.r || Number(b.v.eigene) - Number(a.v.eigene) || a.v.titel.localeCompare(b.v.titel, "de"))
    .map((x) => x.v);
}

/** The text that goes into the input when one is picked. The assistant sees the name of the template and loads it. */
export const startText = (v: VorlageInfo) => `Nutze die Anleitung „${v.titel}“: `;

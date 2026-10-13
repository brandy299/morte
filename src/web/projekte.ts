import type { ConversationInfo } from "./api.ts";

export interface Gruppen {
  /** Project folders by name (German order), each with its conversations newest first. */
  projekte: { name: string; gespraeche: ConversationInfo[] }[];
  /** Conversations without a folder, newest first. */
  ohne: ConversationInfo[];
}

/** Splits the list (newest first) into project folders and loose conversations. */
export function gruppiere(history: ConversationInfo[]): Gruppen {
  const map = new Map<string, ConversationInfo[]>();
  const ohne: ConversationInfo[] = [];
  for (const c of history) {
    if (!c.projekt) ohne.push(c);
    else map.set(c.projekt, [...(map.get(c.projekt) ?? []), c]);
  }
  const projekte = [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "de")).map(([name, gespraeche]) => ({ name, gespraeche }));
  return { projekte, ohne };
}

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir } from "../paths.ts";
import type { Rueckmeldung } from "./rueckmeldung.ts";
import type { StoredMessage } from "./transcript.ts";

export { applyEvent, settle, type StoredMessage } from "./transcript.ts";

/** What is needed to continue a conversation: what the chat showed, and the model's own memory of it. */
export interface Conversation {
  id: string;
  titel: string;
  erstellt: string;
  aktualisiert: string;
  anzeige: StoredMessage[];
  /** Model messages without the system prompt, pictures replaced by "[Bild]". Opaque to everything but the agent layer. */
  modell: unknown[];
  /** Usage numbers of this conversation, so the ring shows the right fill after reopening. */
  verbrauch?: unknown;
  /** Times and counts of every model request and tool (no content). Opaque to everything but the agent layer and the export. */
  ablauf?: unknown[];
  /** "Passt" / "Passt nicht" of the teacher on the material of this conversation. */
  rueckmeldungen?: Rueckmeldung[];
  /** Name of the project folder the teacher put this conversation in. */
  projekt?: string;
}

export interface ConversationInfo {
  id: string;
  titel: string;
  aktualisiert: string;
  projekt?: string;
}

export const PROJEKT_MAX = 40;

/** Clean name of a project folder. Throws a message for the teacher when it is empty or too long. */
export function projektName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim() : "";
  if (!name) throw new Error("Der Name des Projekts fehlt.");
  if ([...name].length > PROJEKT_MAX) throw new Error(`Der Name ist zu lang (höchstens ${PROJEKT_MAX} Zeichen).`);
  return name;
}

const dir = () => join(dataDir(), "Gespräche");
const ID = /^[0-9a-f-]{36}$/;
const file = (id: string) => {
  if (!ID.test(id)) throw new Error("invalid conversation id");
  return join(dir(), `${id}.json`);
};
/** Small companion file with just the list data, so the sidebar never has to read whole conversations. */
const metaFile = (id: string) => join(dir(), `${id}.meta.json`);

export const newConversationId = () => randomUUID();

/** Title from the first question: one line, short. */
export function titleFrom(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > 60 ? `${line.slice(0, 57)}…` : line || "Gespräch";
}

export async function saveConversation(c: Omit<Conversation, "aktualisiert" | "erstellt"> & { erstellt?: string }): Promise<void> {
  await mkdir(dir(), { recursive: true });
  const now = new Date().toISOString();
  const old = await loadConversation(c.id);
  // Feedback is written on its own, so a save of the running conversation must not lose it.
  // The same for the project folder, which is set from the sidebar.
  const full: Conversation = { ...c, rueckmeldungen: c.rueckmeldungen ?? old?.rueckmeldungen, projekt: c.projekt ?? old?.projekt, erstellt: old?.erstellt ?? c.erstellt ?? now, aktualisiert: now };
  await writeFile(file(c.id), JSON.stringify(full));
  await writeFile(metaFile(c.id), JSON.stringify({ id: c.id, titel: c.titel, aktualisiert: now, ...(full.projekt ? { projekt: full.projekt } : {}) } satisfies ConversationInfo));
}

/** Puts a conversation into a project folder, or takes it out when `projekt` is undefined. Keeps the time of the last change. Returns false when there is no such conversation. */
export async function setzeProjekt(id: string, projekt: string | undefined): Promise<boolean> {
  const c = await loadConversation(id);
  if (!c) return false;
  const next = { ...c, projekt };
  if (!projekt) delete next.projekt;
  await writeFile(file(id), JSON.stringify(next));
  await writeFile(metaFile(id), JSON.stringify({ id, titel: c.titel, aktualisiert: c.aktualisiert, ...(projekt ? { projekt } : {}) } satisfies ConversationInfo));
  return true;
}

/** Replaces the feedback of a saved conversation, leaving everything else (and the time of the last change) as it is. */
export async function saveRueckmeldungen(id: string, rueckmeldungen: Rueckmeldung[]): Promise<void> {
  const c = await loadConversation(id);
  if (!c) return;
  await writeFile(file(id), JSON.stringify({ ...c, rueckmeldungen }));
}

export async function loadConversation(id: string): Promise<Conversation | undefined> {
  try {
    return JSON.parse(await readFile(file(id), "utf8")) as Conversation;
  } catch {
    return undefined;
  }
}

/** Newest first. Reads only the small list files. */
export async function listConversations(limit = 50): Promise<ConversationInfo[]> {
  let names: string[];
  try {
    names = await readdir(dir());
  } catch {
    return [];
  }
  const infos: ConversationInfo[] = [];
  for (const n of names.filter((n) => n.endsWith(".json") && !n.endsWith(".meta.json"))) {
    const id = n.slice(0, -5);
    let info: ConversationInfo | undefined;
    try {
      info = JSON.parse(await readFile(metaFile(id), "utf8")) as ConversationInfo;
    } catch {
      // A conversation saved before the list files existed: read it once and write its list file.
      const c = await loadConversation(id).catch(() => undefined);
      if (c) {
        info = { id: c.id, titel: c.titel, aktualisiert: c.aktualisiert, ...(c.projekt ? { projekt: c.projekt } : {}) };
        await writeFile(metaFile(id), JSON.stringify(info)).catch(() => {});
      }
    }
    if (info) infos.push(info);
  }
  return infos.sort((a, b) => b.aktualisiert.localeCompare(a.aktualisiert)).slice(0, limit);
}

export async function deleteConversation(id: string): Promise<void> {
  await rm(file(id), { force: true });
  await rm(metaFile(id), { force: true });
}

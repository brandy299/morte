import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir } from "../paths.ts";
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
}

export interface ConversationInfo {
  id: string;
  titel: string;
  aktualisiert: string;
}

const dir = () => join(dataDir(), "Gespräche");
const ID = /^[0-9a-f-]{36}$/;
const file = (id: string) => {
  if (!ID.test(id)) throw new Error("invalid conversation id");
  return join(dir(), `${id}.json`);
};

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
  const full: Conversation = { ...c, erstellt: old?.erstellt ?? c.erstellt ?? now, aktualisiert: now };
  await writeFile(file(c.id), JSON.stringify(full));
}

export async function loadConversation(id: string): Promise<Conversation | undefined> {
  try {
    return JSON.parse(await readFile(file(id), "utf8")) as Conversation;
  } catch {
    return undefined;
  }
}

/** Newest first. */
export async function listConversations(limit = 50): Promise<ConversationInfo[]> {
  let names: string[];
  try {
    names = (await readdir(dir())).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  const infos: ConversationInfo[] = [];
  for (const n of names) {
    const c = await loadConversation(n.slice(0, -5)).catch(() => undefined);
    if (c) infos.push({ id: c.id, titel: c.titel, aktualisiert: c.aktualisiert });
  }
  return infos.sort((a, b) => b.aktualisiert.localeCompare(a.aktualisiert)).slice(0, limit);
}

export async function deleteConversation(id: string): Promise<void> {
  await rm(file(id), { force: true });
}

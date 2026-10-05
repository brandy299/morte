export interface UsageSnapshot {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  contextTokens: number;
  contextWindow: number;
  vision: boolean;
}
export interface ImageAttachment { data: string; mimeType: string }
export interface UsageInfo {
  session?: UsageSnapshot;
  month: { input: number; output: number; cost: number };
  balance?: { text: string };
}
export const getUsage = async (): Promise<UsageInfo> => (await fetch("/api/usage")).json();

export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "step_start"; id: string; label: string }
  | { type: "step_end"; id: string; ok: boolean }
  | { type: "thinking"; active: boolean }
  | { type: "usage"; usage: UsageSnapshot }
  | { type: "material"; title: string; name: string; path: string; preview?: boolean }
  | { type: "confirm"; id: string; question: string }
  | { type: "error"; message: string }
  | { type: "done" };

/** Reads server-sent events from a response stream and hands each one to `onEvent`. */
async function readEvents<T>(body: ReadableStream<Uint8Array<ArrayBuffer>>, onEvent: (e: T) => void) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
      if (data) onEvent(JSON.parse(data) as T);
    }
  }
}

/** Sends a message and reads the server-sent events from the response stream. */
export async function sendMessage(text: string, images: ImageAttachment[], onEvent: (e: ChatEvent) => void, signal: AbortSignal) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, images }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Keine Verbindung zum Assistenten.");
  }
  await readEvents(res.body, onEvent);
}

export async function resetChat() {
  await fetch("/api/chat/reset", { method: "POST" });
}

export interface ModelOption { id: string; name: string; vision: boolean; recommended: boolean }
export interface ProviderOption { id: string; name: string; models: ModelOption[] }
export interface ConnectionResult {
  passed: boolean;
  checks: { id: string; label: string; state: "ok" | "failed" | "skipped" }[];
  hint?: string;
}
export interface SetupStatus { configured: boolean; provider?: string; model?: string; storage?: "keychain" | "file" }

const post = async <T,>(url: string, body?: unknown): Promise<T> => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Das hat nicht geklappt.");
  return res.json();
};

export const getStatus = async (): Promise<SetupStatus> => (await fetch("/api/setup/status")).json();
export const getOptions = async (): Promise<ProviderOption[]> => (await (await fetch("/api/setup/options")).json()).providers;
export const testSetup = (b: { provider: string; model: string; apiKey: string }) => post<ConnectionResult>("/api/setup/test", b);
export const saveSetup = (b: { provider: string; model: string; apiKey: string }) => post<{ ok: true }>("/api/setup/save", b);
export const startDemo = () => post<{ ok: true }>("/api/setup/demo");

export interface ReiheInfo { name: string; stunden: number; gehalten: number; ohneMaterial: number }
export interface FachInfo { name: string; reihen: ReiheInfo[] }
export interface KlasseInfo { name: string; faecher: FachInfo[] }
export interface NewClass { name: string; schulform: string; stufe: string; kursniveau: string; faecher: string[]; besonderheiten: string }

export const getTree = async (): Promise<KlasseInfo[]> => (await (await fetch("/api/workspace/tree")).json()).klassen;
export const answerConfirm = (id: string, allow: boolean) => post<{ ok: true }>("/api/chat/confirm", { id, allow });

/** Returns an error message in plain German, or null on success. */
export async function createClass(input: NewClass): Promise<string | null> {
  const res = await fetch("/api/workspace/klasse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.ok) return null;
  return (await res.json().catch(() => ({}))).error ?? "Das hat nicht geklappt.";
}

export interface Material { title: string; name: string; path: string }
export const materialUrl = (m: Material, download = false) => `/api/material?path=${encodeURIComponent(m.path)}${download ? "&download=1" : ""}`;

export interface ConversationInfo { id: string; titel: string; aktualisiert: string }
export interface StoredMessage {
  role: "user" | "assistant";
  text: string;
  bilder?: number;
  steps: { id: string; label: string; state: "running" | "done" | "failed" }[];
  materials?: Material[];
  error?: string;
}

export const getHistory = async (): Promise<{ gespraeche: ConversationInfo[]; aktuell?: string }> => (await fetch("/api/history")).json();
export const openHistory = async (id: string): Promise<{ anzeige: StoredMessage[]; usage: UsageSnapshot } | null> => {
  const res = await fetch("/api/history/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
  return res.ok ? res.json() : null;
};
export const deleteHistory = (id: string) => fetch(`/api/history/${id}`, { method: "DELETE" });

// ---------- Lehrpläne ----------

export interface LehrplanInfo { name: string; hasPlan: boolean; hasBewertung: boolean; abschnitte: number; klassen: string[] }
export interface LehrplaeneData { lehrplaene: LehrplanInfo[]; klassen: string[] }
export interface PruefErgebnis {
  token: string;
  dateiname: string;
  art: "pdf" | "text";
  seiten?: number;
  bilder?: number;
  anfragen?: number;
  kostenUsd?: number;
  minuten?: number;
  zeichen?: number;
}
export type UmwandelEvent =
  | { type: "fortschritt"; done: number; total: number; label: string }
  | { type: "fertig"; name: string; warnungen: string[]; abschnitte: number; gliederung: { ebene: number; titel: string }[] }
  | { type: "fehler"; message: string };

export const getLehrplaene = async (): Promise<LehrplaeneData> => (await fetch("/api/lehrplan")).json();

export async function pruefeLehrplan(file: File): Promise<PruefErgebnis | { error: string }> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/lehrplan/pruefen", { method: "POST", body: form }).catch(() => undefined);
  if (!res) return { error: "Keine Verbindung zu morte." };
  return res.json().catch(() => ({ error: "Das hat nicht geklappt." }));
}

/** Returns an error text when the conversion could not start, `{ existiert: true }` when the name is taken, otherwise null after the stream ended. */
export async function wandleLehrplanUm(
  b: { token: string; name: string; ersetzen?: boolean },
  onEvent: (e: UmwandelEvent) => void,
  signal: AbortSignal,
): Promise<{ error: string; existiert?: boolean } | null> {
  const res = await fetch("/api/lehrplan/umwandeln", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b), signal });
  if (!res.ok || !res.body) return res.json().catch(() => ({ error: "Das hat nicht geklappt." }));
  await readEvents(res.body, onEvent);
  return null;
}

export const ordneLehrplanZu = (name: string, klassen: string[]) => post<{ ok: true }>("/api/lehrplan/zuordnen", { name, klassen });
export const entferneLehrplan = (name: string) => fetch(`/api/lehrplan/${encodeURIComponent(name)}`, { method: "DELETE" });

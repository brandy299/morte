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
  | { type: "material"; title: string; name: string; path: string }
  | { type: "confirm"; id: string; question: string }
  | { type: "error"; message: string }
  | { type: "done" };

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
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
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
      if (data) onEvent(JSON.parse(data) as ChatEvent);
    }
  }
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
  if (!res.ok) throw new Error("Das hat nicht geklappt.");
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

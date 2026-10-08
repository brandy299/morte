import type { MaterialDatei } from "./materialListe.ts";
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

export interface Antwort { text: string; erklaerung: string }
export interface Frage { frage: string; antworten: Antwort[]; empfohlen: number; grund: string }
export interface Gegeben { frage: string; antwort: string; empfohlen: boolean; eigene?: boolean }

export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "step_start"; id: string; label: string; material?: boolean }
  | { type: "step_end"; id: string; ok: boolean }
  | { type: "thinking"; active: boolean }
  | { type: "usage"; usage: UsageSnapshot }
  | { type: "material"; title: string; name: string; path: string; preview?: boolean }
  | { type: "confirm"; id: string; question: string }
  | { type: "fragen"; id: string; fragen: Frage[] }
  | { type: "fragen_beantwortet"; id: string; antworten: Gegeben[] }
  | { type: "retry"; attempt: number; max: number; seconds: number; message: string; dropText: number }
  | { type: "error"; message: string; retryable?: boolean; dropText?: number }
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

export interface FileText { name: string; text: string }
export interface FileRead { art: string; text: string; info?: string; gekuerzt: boolean; bilder?: ImageAttachment[] }

/** Lets the server read an attached file (PDF, Word, Excel, …). Returns a plain-German problem text when it cannot be read. */
export async function readFileOnServer(file: File): Promise<FileRead | string> {
  try {
    const res = await fetch(`/api/anhang?name=${encodeURIComponent(file.name)}`, { method: "POST", body: file });
    const body = await res.json().catch(() => ({}));
    return res.ok ? body : `„${file.name}“: ${body.error ?? "Das konnte ich nicht lesen."}`;
  } catch {
    return `„${file.name}“ konnte ich nicht hochladen.`;
  }
}

/** Posts to a chat route and reads the server-sent events from the response stream. */
async function streamChat(path: string, body: unknown, onEvent: (e: ChatEvent) => void, signal: AbortSignal) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) {
    const answer = await res.json().catch(() => ({}));
    throw new Error(answer.error ?? "Keine Verbindung zum Assistenten.");
  }
  await readEvents(res.body, onEvent);
}

export const sendMessage = (text: string, images: ImageAttachment[], files: FileText[], onEvent: (e: ChatEvent) => void, signal: AbortSignal) =>
  streamChat("/api/chat", { text, images, dateien: files }, onEvent, signal);

/** Goes on with a failed answer ("Nochmal versuchen") without asking the question again. */
export const retryMessage = (onEvent: (e: ChatEvent) => void, signal: AbortSignal) => streamChat("/api/chat/retry", {}, onEvent, signal);

export async function resetChat() {
  await fetch("/api/chat/reset", { method: "POST" });
}

export interface ModelOption { id: string; name: string; vision: boolean; recommended: boolean }
export interface ProviderOption { id: string; name: string; custom?: boolean; models: ModelOption[] }
export interface ConnectionResult {
  passed: boolean;
  checks: { id: string; label: string; state: "ok" | "failed" | "skipped" }[];
  hint?: string;
  detail?: string;
}
export interface SetupStatus { configured: boolean; provider?: string; model?: string; baseUrl?: string; contextWindow?: number; storage?: "keychain" | "file"; notice?: string }

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
export interface SetupBody { provider: string; model: string; apiKey: string; baseUrl?: string; contextWindow?: number }
export const testSetup = (b: SetupBody) => post<ConnectionResult>("/api/setup/test", b);
export const saveSetup = (b: SetupBody) => post<{ ok: true }>("/api/setup/save", b);
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
/** One download with several material files as zip. */
export const zipUrl = (paths: string[], name?: string) => `/api/material/zip?${[...paths.map((p) => `path=${encodeURIComponent(p)}`), ...(name ? [`name=${encodeURIComponent(name)}`] : [])].join("&")}`;
export const materialUrl = (m: Material, download = false) => `/api/material?path=${encodeURIComponent(m.path)}${download ? "&download=1" : ""}`;

export interface ConversationInfo { id: string; titel: string; aktualisiert: string }
export interface StoredMessage {
  role: "user" | "assistant";
  text: string;
  bilder?: number;
  dateien?: string[];
  steps: { id: string; label: string; state: "running" | "done" | "failed" }[];
  materials?: Material[];
  fragen?: Gegeben[];
  error?: string;
  retryable?: boolean;
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
  if (!res) return { error: "Keine Verbindung zu Pult." };
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

// ---------- Stundenplan und Woche ----------

export interface PlanMeta { quelle: "datei" | "link"; name?: string; aktualisiert: string; von: string; bis: string; anzahl: number }
export interface PlanStatus { vorhanden: boolean; meta?: PlanMeta; hatLink: boolean }
export type Zuordnung = { klasse: string; fach: string } | null;
export interface TitelInfo { schluessel: string; titel: string; gruppe?: string; anzahl: number; beispiel?: string; zuordnung?: Zuordnung; vorschlag?: Zuordnung }
export interface Zustand { zustand: "nicht-zugeordnet" | "nicht-geplant" | "geplant" | "material-fertig" | "gehalten" }
export interface WochenStunde extends Zustand {
  uid: string; datum: string; von: string; bis: string; titel: string; gruppe?: string; ort?: string; beschreibung?: string;
  klasse?: string; fach?: string; reihe?: string; thema?: string; material?: string;
}
export interface Wochenansicht {
  montag: string;
  tage: { datum: string; tag: string; stunden: WochenStunde[] }[];
  fehlt: number; nichtGeplant: number; nichtZugeordnet: number;
}
export interface WocheAntwort { heute: string; woche?: Wochenansicht; zurueck: string; weiter: string }

const errorOf = async (res: Response) => ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Das hat nicht geklappt.";

export const getPlanStatus = async (): Promise<PlanStatus> => (await fetch("/api/stundenplan")).json();
export const getWoche = async (datum?: string): Promise<WocheAntwort> => (await fetch(`/api/woche${datum ? `?datum=${datum}` : ""}`)).json();
export const getTitel = async (): Promise<{ titel: TitelInfo[]; klassen: { name: string; faecher: string[] }[] }> => (await fetch("/api/stundenplan/titel")).json();

/** Each call returns an error text, or null on success. */
export async function ladePlanHoch(file: File): Promise<string | null> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/stundenplan/datei", { method: "POST", body: form });
  return res.ok ? null : errorOf(res);
}
export async function ladePlanVonLink(url: string): Promise<string | null> {
  const res = await fetch("/api/stundenplan/link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
  return res.ok ? null : errorOf(res);
}
export async function aktualisierePlan(): Promise<string | null> {
  const res = await fetch("/api/stundenplan/aktualisieren", { method: "POST" });
  return res.ok ? null : errorOf(res);
}
export const entfernePlan = () => fetch("/api/stundenplan", { method: "DELETE" });
export async function speichereZuordnung(zuordnung: Record<string, Zuordnung>): Promise<string | null> {
  const res = await fetch("/api/stundenplan/zuordnung", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ zuordnung }) });
  return res.ok ? null : errorOf(res);
}
export async function legeAb(l: { klasse: string; fach: string; datum: string; von: string }, file: File): Promise<{ error: string } | { datei: string; reihe: string }> {
  const form = new FormData();
  for (const [k, v] of Object.entries(l)) form.set(k, v);
  form.set("file", file);
  const res = await fetch("/api/woche/ablegen", { method: "POST", body: form });
  return res.ok ? res.json() : { error: await errorOf(res) };
}

// ---------- Vorlagen ----------

export interface VorlageInfo { name: string; titel: string; beschreibung: string; eigene: boolean }
export const getVorlagen = async (): Promise<VorlageInfo[]> => (await (await fetch("/api/vorlagen")).json()).vorlagen;
export const entferneVorlage = (name: string) => fetch(`/api/vorlagen/${encodeURIComponent(name)}`, { method: "DELETE" });

// ---------- Datenordner ----------

export interface OrdnerInfo { pfad: string; fest: boolean; standard: string; plattform: string; waehlen: boolean }
const ordnerCall = async (path: string, body?: unknown): Promise<OrdnerInfo & { error?: string }> => {
  const res = await fetch(`/api/ordner${path}`, body === undefined ? { method: path ? "POST" : "GET" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Das hat nicht geklappt.");
  return data;
};
export const getOrdner = () => ordnerCall("");
export const openOrdner = () => ordnerCall("/oeffnen");
export const resetOrdner = () => ordnerCall("/standard");
export const moveOrdner = (pfad: string) => ordnerCall("/aendern", { pfad });
export const chooseOrdner = async (): Promise<string | null> => (await (await fetch("/api/ordner/waehlen", { method: "POST" })).json()).pfad;

/** Sends the choices for the assistant's questions. `null` skips them. Returns a problem text, or null when it worked. */
export async function answerFragen(id: string, antworten: { antwort: string; eigene?: boolean }[] | null): Promise<string | null> {
  const res = await fetch("/api/chat/fragen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, antworten }) });
  return res.ok ? null : ((await res.json().catch(() => ({}))).error ?? "Das hat nicht geklappt.");
}

export const getMaterialListe = async (): Promise<MaterialDatei[]> => (await (await fetch("/api/material/liste")).json()).dateien;

export interface SchuleInfo { name: string; hasLogo: boolean }
const schuleAntwort = async (res: Response): Promise<SchuleInfo> => {
  if (res.ok) return res.json();
  throw new Error((await res.json().catch(() => ({}))).error ?? "Das hat nicht geklappt.");
};
export const getSchule = async (): Promise<SchuleInfo> => (await fetch("/api/schule")).json();
export const saveSchulname = async (name: string) => schuleAntwort(await fetch("/api/schule", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }));
export const saveSchullogo = async (file: File) => schuleAntwort(await fetch("/api/schule/logo", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: file }));
export const removeSchullogo = async () => schuleAntwort(await fetch("/api/schule/logo", { method: "DELETE" }));
export const schullogoUrl = (version: number) => `/api/schule/logo?v=${version}`;

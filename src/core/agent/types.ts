/**
 * Events the rest of the app sees. No pi types leave src/core/agent,
 * so the agent core can be swapped without touching server or UI.
 */
export type ChatEvent =
  | { type: "text"; delta: string }
  /** `material`: this step builds a file, so the preview can show that something is coming. */
  | { type: "step_start"; id: string; label: string; material?: boolean }
  | { type: "step_end"; id: string; ok: boolean }
  | { type: "thinking"; active: boolean }
  | { type: "usage"; usage: UsageSnapshot }
  /** A finished file for the preview. `path` is relative to the working folder. `preview: false` lists it without opening it. */
  | { type: "material"; title: string; name: string; path: string; preview?: boolean }
  /** The teacher must say yes or no before a tool changes files. Answer with ChatSession.answer(id, allow). */
  | { type: "confirm"; id: string; question: string }
  /** A try failed for a short-lived reason and is repeated after `seconds`. The text of the failed try (`dropText` characters) is withdrawn. */
  | { type: "retry"; attempt: number; max: number; seconds: number; message: string; dropText: number }
  /** The answer failed for good. `retryable`: the teacher can press "Nochmal versuchen". `dropText`: characters of the failed try to withdraw. */
  | { type: "error"; message: string; retryable?: boolean; dropText?: number }
  | { type: "done" };

/** Running numbers of the current conversation. Cost is an estimate in US dollars. */
export interface UsageSnapshot {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  /** How much of the model's memory the conversation fills right now. */
  contextTokens: number;
  contextWindow: number;
  /** Model understands images. */
  vision: boolean;
}

export interface ImageAttachment {
  /** Base64 without the data: prefix. */
  data: string;
  mimeType: string;
}

export interface ChatSession {
  /** Sends one user message and streams events until the answer is complete. */
  send(text: string, onEvent: (event: ChatEvent) => void, images?: ImageAttachment[]): Promise<void>;
  /** Tries the last question again after a failure, without asking it twice. Same events as `send`. */
  retry(onEvent: (event: ChatEvent) => void): Promise<void>;
  /** There is a failed answer that `retry` can take up. */
  canRetry(): boolean;
  usage(): UsageSnapshot;
  /** What is needed to continue this conversation later: the model's messages (pictures reduced to text) and the usage numbers. */
  history(): { messages: unknown[]; usage: UsageSnapshot };
  /** Continues an earlier conversation. Replaces the current one. */
  restore(state: { messages: unknown[]; usage?: Partial<UsageSnapshot> }): void;
  /** Answers a `confirm` event. */
  answer(id: string, allow: boolean): void;
  abort(): void;
  reset(): void;
}

export interface AgentSettings {
  /** Provider id, e.g. "anthropic", "openai", "deepseek", or "demo" (offline). */
  provider: string;
  model?: string;
  /** Read from the keychain by the server; if empty, pi falls back to the provider's environment variable. */
  apiKey?: string;
  /** Only for provider "custom": address of an OpenAI-compatible server. */
  baseUrl?: string;
  /** Only for provider "custom": size of the model's memory in tokens, if known. */
  contextWindow?: number;
}

export interface ModelOption {
  id: string;
  name: string;
  /** Model understands images (from the pi model catalog). */
  vision: boolean;
  recommended: boolean;
}

export interface ProviderOption {
  id: string;
  name: string;
  /** The teacher types address and model name herself (no catalog). */
  custom?: boolean;
  models: ModelOption[];
}

export type CheckState = "ok" | "failed" | "skipped";

export interface ConnectionResult {
  /** True when the model can chat, call tools and understand images. */
  passed: boolean;
  checks: { id: "chat" | "tools" | "vision"; label: string; state: CheckState }[];
  /** Plain-language hint for the teacher when something failed. */
  hint?: string;
}

/**
 * Events the rest of the app sees. No pi types leave src/core/agent,
 * so the agent core can be swapped without touching server or UI.
 */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "step_start"; id: string; label: string }
  | { type: "step_end"; id: string; ok: boolean }
  | { type: "thinking"; active: boolean }
  /** The teacher must say yes or no before a tool changes files. Answer with ChatSession.answer(id, allow). */
  | { type: "confirm"; id: string; question: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface ChatSession {
  /** Sends one user message and streams events until the answer is complete. */
  send(text: string, onEvent: (event: ChatEvent) => void): Promise<void>;
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

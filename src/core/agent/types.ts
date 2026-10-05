/**
 * Events the rest of the app sees. No pi types leave src/core/agent,
 * so the agent core can be swapped without touching server or UI.
 */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "step_start"; id: string; label: string }
  | { type: "step_end"; id: string; ok: boolean }
  | { type: "thinking"; active: boolean }
  | { type: "error"; message: string }
  | { type: "done" };

export interface ChatSession {
  /** Sends one user message and streams events until the answer is complete. */
  send(text: string, onEvent: (event: ChatEvent) => void): Promise<void>;
  abort(): void;
  reset(): void;
}

export interface AgentSettings {
  /** Provider id, e.g. "anthropic", "openai", "deepseek", or "demo" (offline). */
  provider: string;
  model?: string;
}

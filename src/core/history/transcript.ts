import type { ChatEvent } from "../agent/index.ts";

/** One message as shown in the chat. Built from the same events the live chat receives. */
export interface StoredMessage {
  role: "user" | "assistant";
  text: string;
  /** Number of attached pictures. The pictures themselves are not kept. */
  bilder?: number;
  steps: { id: string; label: string; state: "running" | "done" | "failed" }[];
  materials?: { title: string; name: string; path: string }[];
  error?: string;
}

/** Applies one chat event to the assistant message it belongs to. */
export function applyEvent(m: StoredMessage, e: ChatEvent): StoredMessage {
  switch (e.type) {
    case "text":
      return { ...m, text: m.text + e.delta };
    case "step_start":
      return { ...m, steps: [...m.steps, { id: e.id, label: e.label, state: "running" }] };
    case "step_end":
      return { ...m, steps: m.steps.map((s) => (s.id === e.id ? { ...s, state: e.ok ? "done" : "failed" } : s)) };
    case "material":
      return { ...m, materials: [...(m.materials ?? []), { title: e.title, name: e.name, path: e.path }] };
    case "error":
      return { ...m, error: e.message };
    default:
      return m;
  }
}

/** Steps still "running" when a turn ends were cut off (for example by "Anhalten"). */
export const settle = (m: StoredMessage): StoredMessage => ({
  ...m,
  steps: m.steps.map((s) => (s.state === "running" ? { ...s, state: "failed" as const } : s)),
});

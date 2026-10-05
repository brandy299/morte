import type { AgentMessage } from "@earendil-works/pi-agent-core";

/** Share of the model's memory that triggers a summary before the next question. */
export const COMPACT_AT = 0.8;
/** The newest part of the conversation stays word for word. Never more than this share of the window. */
const KEEP_TOKENS = 15_000;
const KEEP_SHARE = 0.2;

/** Rough size: about four characters per token. Good enough to place a cut, not for billing. */
export function estimateTokens(message: AgentMessage): number {
  const m = message as { content?: unknown };
  const parts = typeof m.content === "string" ? [m.content] : Array.isArray(m.content) ? m.content : [];
  let chars = 0;
  for (const p of parts) {
    if (typeof p === "string") chars += p.length;
    else if (p && typeof p === "object") {
      const part = p as { type?: string; text?: string; thinking?: string; arguments?: unknown };
      if (part.type === "image") chars += 4800; // roughly 1200 tokens per picture
      else chars += (part.text ?? part.thinking ?? "").length + (part.arguments ? JSON.stringify(part.arguments).length : 0);
    }
  }
  return Math.ceil(chars / 4);
}

export interface Split {
  /** Leading system messages (prompt and tool declarations). They stay as they are. */
  head: AgentMessage[];
  /** Older part that will be replaced by a summary. */
  old: AgentMessage[];
  /** Newest part, kept word for word. Always starts with a user message. */
  recent: AgentMessage[];
}

/**
 * Cuts the conversation at the start of a user message, so a tool call is never separated from its result.
 * Keeps as many of the newest turns as fit into `keepTokens`, but always at least the last turn.
 * Returns undefined when there is nothing older to summarize.
 */
export function splitForCompaction(messages: AgentMessage[], keepTokens: number): Split | undefined {
  let start = 0;
  while (start < messages.length && messages[start]!.role === "system") start++;
  const body = messages.slice(start);

  const turnStarts = body.flatMap((m, i) => (m.role === "user" ? [i] : []));
  if (turnStarts.length < 2) return undefined;

  let cut = turnStarts.at(-1)!;
  let kept = body.slice(cut).reduce((n, m) => n + estimateTokens(m), 0);
  for (const i of turnStarts.slice(0, -1).reverse()) {
    const size = body.slice(i, cut).reduce((n, m) => n + estimateTokens(m), 0);
    if (kept + size > keepTokens) break;
    kept += size;
    cut = i;
  }
  if (cut === 0) return undefined;
  return { head: messages.slice(0, start), old: body.slice(0, cut), recent: body.slice(cut) };
}

export const keepTokensFor = (contextWindow: number) => Math.min(KEEP_TOKENS, Math.floor(contextWindow * KEEP_SHARE));

const TOOL_RESULT_LIMIT = 600;

/** Plain text of the older conversation for the summarizer. Pictures and long tool output are shortened. */
export function renderTranscript(messages: AgentMessage[]): string {
  const lines: string[] = [];
  for (const message of messages) {
    const m = message as { role: string; content?: unknown; toolName?: string };
    const parts = typeof m.content === "string" ? [{ type: "text", text: m.content }] : Array.isArray(m.content) ? m.content : [];
    for (const p of parts as { type?: string; text?: string; name?: string; arguments?: unknown }[]) {
      if (p.type === "image") lines.push(`${label(m.role)}: [Bild]`);
      else if (p.type === "toolCall") lines.push(`Assistent nutzt Werkzeug ${p.name}`);
      else if (p.type === "text" && p.text) {
        const text = m.role === "toolResult" && p.text.length > TOOL_RESULT_LIMIT ? `${p.text.slice(0, TOOL_RESULT_LIMIT)} …` : p.text;
        lines.push(`${label(m.role)}: ${text}`);
      }
    }
  }
  return lines.join("\n");
}

const label = (role: string) => (role === "user" ? "Lehrkraft" : role === "assistant" ? "Assistent" : "Ergebnis");

export const SUMMARY_SYSTEM = `Du fasst ein Gespräch zwischen einer Lehrkraft und einem Arbeitsassistenten zusammen, damit der Assistent später nahtlos weiterarbeiten kann.
Schreibe auf Deutsch in kurzen Stichpunkten. Halte fest: Klasse und Fach, was die Lehrkraft will, getroffene Entscheidungen, fertiges Material und was noch offen ist.
Erfinde nichts. Übernimm keine Schülernamen und keine Noten, auch wenn sie im Gespräch vorkommen.
Antworte nur mit der Zusammenfassung.`;

export const SUMMARY_PREFIX = "Zusammenfassung des bisherigen Gesprächs (Teile davon sind ausgeblendet):";

/** Puts the summary in front of the first kept user message, so roles keep alternating. */
export function withSummary(recent: AgentMessage[], summary: string): AgentMessage[] {
  const [first, ...rest] = recent;
  if (!first || first.role !== "user") return recent;
  const note = { type: "text" as const, text: `${SUMMARY_PREFIX}\n${summary.trim()}\n\nNeue Nachricht der Lehrkraft:` };
  const content = typeof first.content === "string" ? [note, { type: "text" as const, text: first.content }] : [note, ...first.content];
  return [{ ...first, content }, ...rest];
}

/** True when the provider refused a request because it was too long. */
export const isTooLong = (raw?: string) =>
  !!raw && /too long|too large|context.{0,20}(length|window|limit)|maximum context|exceeds? the (context|limit)|token limit/i.test(raw);

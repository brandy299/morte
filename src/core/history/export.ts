import type { Conversation } from "./index.ts";

/** Model messages as the agent layer stores them. Read defensively: this file only looks, it never changes anything. */
interface Part { type?: string; text?: string; name?: string; arguments?: unknown }
interface ModelMessage { role?: string; content?: string | Part[]; toolName?: string; isError?: boolean; provider?: string; model?: string; stopReason?: string; errorMessage?: string }

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}\n… (gekürzt, ${text.length - max} Zeichen mehr)` : text);
const fence = (text: string, lang = "") => {
  // A fence longer than any run of backticks inside the text, so the content cannot break out of it.
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const f = "`".repeat(longest + 1);
  return `${f}${lang}\n${text}\n${f}`;
};
const textOf = (content: ModelMessage["content"]): string =>
  typeof content === "string" ? content : (content ?? []).flatMap((p) => (p.type === "text" && p.text ? [p.text] : [])).join("\n");

/**
 * A readable record of a conversation for finding out what went wrong or well: what was asked, what the assistant said,
 * which tools it called with which content, and what they answered. No keys are in it, because none are stored in a conversation.
 */
export function exportMarkdown(c: Conversation, info: { version: string; now?: Date }): string {
  const messages = c.modell as ModelMessage[];
  const first = messages.find((m) => m.role === "assistant" && m.model);
  const out: string[] = [
    `# Gespräch: ${c.titel}`,
    "",
    `- Exportiert: ${(info.now ?? new Date()).toISOString()}`,
    `- Pult Version: ${info.version}`,
    `- Modell: ${first ? `${first.provider ?? "?"} / ${first.model}` : "unbekannt"}`,
    `- Begonnen: ${c.erstellt}, zuletzt: ${c.aktualisiert}`,
    c.verbrauch ? `- Verbrauch: ${JSON.stringify(c.verbrauch)}` : "",
    "",
    "Bitte vor dem Weitergeben prüfen, dass keine Namen von Schülerinnen und Schülern darin stehen.",
    "",
    "---",
    "",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");

  for (const m of messages) {
    if (m.role === "user") {
      out.push("## Lehrkraft", "", textOf(m.content), "");
    } else if (m.role === "assistant") {
      const parts = Array.isArray(m.content) ? m.content : [];
      const text = parts.flatMap((p) => (p.type === "text" && p.text ? [p.text] : [])).join("\n");
      out.push(`## Pult${m.stopReason === "error" ? " (Fehler)" : ""}`, "");
      if (text) out.push(text, "");
      for (const p of parts) {
        if (p.type === "toolCall") out.push(`**Werkzeug: \`${p.name}\`**`, "", fence(cut(JSON.stringify(p.arguments, null, 2), 12000), "json"), "");
      }
      if (m.errorMessage) out.push(`Fehlermeldung: ${m.errorMessage}`, "");
    } else if (m.role === "toolResult") {
      const body = textOf(m.content);
      // The text of a loaded skill is long and identical every time, the start is enough to see which one it was.
      const limit = m.toolName === "skill_laden" ? 300 : 3000;
      out.push(`**Antwort des Werkzeugs \`${m.toolName}\`${m.isError ? " (Fehler)" : ""}**`, "", fence(cut(body, limit)), "");
    }
  }
  return `${out.join("\n").trimEnd()}\n`;
}

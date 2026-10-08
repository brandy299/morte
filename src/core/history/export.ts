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
  if (c.ablauf?.length) out.push(...renderLog(c.ablauf as LogLine[]));
  return `${out.join("\n").trimEnd()}\n`;
}

/** One entry of the conversation's log as stored. Read defensively, like the messages. */
interface LogLine { kind?: string; at?: string; ms?: number; firstOutputMs?: number; input?: number; output?: number; reasoning?: number; end?: string; error?: string; name?: string; ok?: boolean; problem?: string; reason?: string }

const seconds = (ms = 0) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
const sum = (lines: LogLine[], pick: (l: LogLine) => number | undefined) => lines.reduce((n, l) => n + (pick(l) ?? 0), 0);

/** Where the time went: a short summary, then every step in order. Only times and counts. */
function renderLog(lines: LogLine[]): string[] {
  const start = Math.min(...lines.map((l) => Date.parse(l.at ?? "")).filter(Number.isFinite));
  const sorted = [...lines].sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  const of = (kind: string) => lines.filter((l) => l.kind === kind);
  const requests = of("request");
  const modelMs = sum(requests, (l) => l.ms);
  const written = sum(requests, (l) => l.output);
  const teacherMs = sum(of("teacher"), (l) => l.ms);
  const failedTools = of("tool").filter((l) => !l.ok).length;
  const cutOff = requests.filter((l) => l.end === "length").length;
  const out = [
    "---",
    "",
    "## Ablauf (nur Zeiten und Mengen, keine Inhalte)",
    "",
    `- Antworten insgesamt: ${seconds(sum(of("turn"), (l) => l.ms))}`,
    `- Modell: ${seconds(modelMs)} in ${requests.length} Anfragen, ${written} Tokens geschrieben${modelMs > 0 ? `, etwa ${Math.round(written / (modelMs / 1000))} Tokens pro Sekunde` : ""}`,
    `- Werkzeuge: ${seconds(sum(of("tool"), (l) => l.ms) - teacherMs)}, davon ${failedTools} fehlgeschlagen`,
    `- Warten auf die Lehrkraft: ${seconds(teacherMs)}`,
    `- Wiederholungen: ${of("retry").length}, abgeschnittene Antworten: ${cutOff}`,
    "",
    "| Zeit | Schritt | Dauer | Erste Ausgabe nach | Gelesen | Geschrieben (davon Denken) | Ende |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const l of sorted) {
    const at = Date.parse(l.at ?? "");
    const offset = Number.isFinite(at) ? Math.round((at - start) / 1000) : 0;
    const time = `+${Math.floor(offset / 60)}:${String(offset % 60).padStart(2, "0")}`;
    if (l.kind === "request") {
      out.push(`| ${time} | Modell | ${seconds(l.ms)} | ${l.firstOutputMs === undefined ? "–" : seconds(l.firstOutputMs)} | ${l.input ?? 0} | ${l.output ?? 0}${l.reasoning ? ` (${l.reasoning})` : ""} | ${l.end ?? ""}${l.error ? `: ${l.error.replace(/\|/g, "/")}` : ""} |`);
    } else if (l.kind === "tool") {
      out.push(`| ${time} | Werkzeug \`${l.name}\` | ${seconds(l.ms)} |  |  |  | ${l.ok ? "ok" : `Fehler${l.problem ? `: ${l.problem.replace(/\|/g, "/")}` : ""}`} |`);
    } else if (l.kind === "teacher") {
      out.push(`| ${time} | Warten auf die Lehrkraft | ${seconds(l.ms)} |  |  |  |  |`);
    } else if (l.kind === "summary") {
      out.push(`| ${time} | Zusammenfassung | ${seconds(l.ms)} |  |  |  | ${l.ok ? "ok" : "Fehler"} |`);
    } else if (l.kind === "retry") {
      out.push(`| ${time} | Neuer Versuch (${l.reason}) |  |  |  |  |  |`);
    } else if (l.kind === "turn") {
      out.push(`| ${time} | **Nachricht der Lehrkraft, bis zur fertigen Antwort** | ${seconds(l.ms)} |  |  |  |  |`);
    }
  }
  return out;
}

import { Agent } from "@earendil-works/pi-agent-core";
import { resolveModel } from "./models.ts";
import { tools } from "./tools.ts";
import type { AgentSettings, ChatEvent, ChatSession } from "./types.ts";

const SYSTEM_PROMPT = `Du bist morte, ein ruhiger Arbeitsassistent für Lehrkräfte.
Antworte auf Deutsch, in einfacher Sprache ohne Fachbegriffe.
Erfinde nichts: Fehlt eine Angabe, frag kurz nach.
Bitte nie um Schülernamen, Noten oder Fotos von Klassenarbeiten. Es gibt nur Klassen und Kurse.`;

export function createChatSession(settings: AgentSettings): ChatSession {
  const { models, model, onTurnEnd } = resolveModel(settings);

  const agent = new Agent({
    initialState: { systemPrompt: SYSTEM_PROMPT, model, tools },
    streamFn: models.streamSimple.bind(models),
    getApiKey: async () => settings.apiKey,
  });

  let emit: (event: ChatEvent) => void = () => {};
  let thinking = false;
  const setThinking = (active: boolean) => {
    if (thinking === active) return;
    thinking = active;
    emit({ type: "thinking", active });
  };

  agent.subscribe((event) => {
    switch (event.type) {
      case "message_update": {
        const e = event.assistantMessageEvent;
        if (e.type === "thinking_start") setThinking(true);
        else if (e.type === "thinking_end") setThinking(false);
        else if (e.type === "text_delta") emit({ type: "text", delta: e.delta });
        break;
      }
      case "tool_execution_start": {
        const tool = tools.find((t) => t.name === event.toolName);
        emit({ type: "step_start", id: event.toolCallId, label: tool?.label ?? "Arbeite weiter" });
        break;
      }
      case "tool_execution_end":
        emit({ type: "step_end", id: event.toolCallId, ok: !event.isError });
        break;
    }
  });

  return {
    async send(text, onEvent) {
      emit = onEvent;
      try {
        await agent.prompt(text);
        const last = agent.state.messages.at(-1);
        if (last?.role === "assistant" && last.stopReason === "error") {
          onEvent({ type: "error", message: friendlyError(last.errorMessage) });
        }
      } catch (err) {
        onEvent({ type: "error", message: friendlyError(err instanceof Error ? err.message : String(err)) });
      } finally {
        setThinking(false);
        onTurnEnd?.();
        onEvent({ type: "done" });
        emit = () => {};
      }
    },
    abort: () => agent.abort(),
    reset: () => agent.reset(),
  };
}

function friendlyError(raw?: string): string {
  if (raw && /api key|apikey|unauthor|401|authenticat/i.test(raw)) {
    return "Der Zugang zur KI fehlt oder ist nicht gültig. Bitte prüfe den Zugangsschlüssel.";
  }
  return "Das hat gerade nicht geklappt. Bitte versuche es gleich noch einmal.";
}

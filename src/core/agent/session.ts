import { Agent } from "@earendil-works/pi-agent-core";
import { resolveModel } from "./models.ts";
import { tools } from "./tools.ts";
import type { AgentSettings, ChatEvent, ChatSession } from "./types.ts";

const SYSTEM_PROMPT = `Du bist morte, ein ruhiger Arbeitsassistent für Lehrkräfte.
Antworte auf Deutsch, in einfacher Sprache ohne Fachbegriffe.
Erfinde nichts: Fehlt eine Angabe, frag kurz nach.
Bitte nie um Schülernamen, Noten oder Fotos von Klassenarbeiten. Es gibt nur Klassen und Kurse.

Arbeitsordner: Du kennst die Klassen der Lehrkraft nur über deine Werkzeuge.
- Lesereihenfolge pro Klasse und Fach: erst klasse_lesen, dann stand_lesen, und reihe_lesen nur bei Bedarf.
- Bei "Wo stehen wir in 11a?" lies Klasse und Stand und fasse kurz zusammen. Bei "Wo fehlt noch Material?" nutze material_luecken.
- Statuswörter einer Stunde sind fest: geplant, Material fertig, gehalten.
- Wenn die Lehrkraft eine Arbeitssitzung beendet oder etwas Wichtiges entschieden wurde, halte den Stand mit stand_schreiben fest. Lies vorher den alten Stand und übernimm, was noch stimmt. Halte ihn kurz, es steht dort nie ein Schülername.
- Fehlt eine Angabe (zum Beispiel ein Datum), frag nach. Trage nichts ein, was du nicht weißt.`;

export function createChatSession(settings: AgentSettings, resolve: typeof resolveModel = resolveModel): ChatSession {
  const { models, model, onTurnEnd } = resolve(settings);

  const agent = new Agent({
    initialState: { systemPrompt: SYSTEM_PROMPT, model, tools },
    streamFn: models.streamSimple.bind(models),
    getApiKey: async () => settings.apiKey,
    beforeToolCall: async ({ toolCall, args }, signal) => {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (!tool?.ask) return undefined;
      const allowed = await askTeacher(toolCall.id, tool.ask(args), signal);
      return allowed ? undefined : { block: true, reason: "Die Lehrkraft möchte das nicht. Frag nach, was stattdessen gewünscht ist." };
    },
  });

  const pending = new Map<string, (allow: boolean) => void>();
  const askTeacher = (id: string, question: string, signal?: AbortSignal) =>
    new Promise<boolean>((resolve) => {
      pending.set(id, resolve);
      signal?.addEventListener("abort", () => answer(id, false), { once: true });
      emit({ type: "confirm", id, question });
    });
  const answer = (id: string, allow: boolean) => {
    pending.get(id)?.(allow);
    pending.delete(id);
  };

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
    answer,
    abort: () => {
      for (const id of [...pending.keys()]) answer(id, false);
      agent.abort();
    },
    reset: () => agent.reset(),
  };
}

function friendlyError(raw?: string): string {
  if (raw && /api key|apikey|unauthor|401|authenticat/i.test(raw)) {
    return "Der Zugang zur KI fehlt oder ist nicht gültig. Bitte prüfe den Zugangsschlüssel.";
  }
  return "Das hat gerade nicht geklappt. Bitte versuche es gleich noch einmal.";
}

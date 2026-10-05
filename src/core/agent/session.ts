import { Agent } from "@earendil-works/pi-agent-core";
import { resolveModel } from "./models.ts";
import { tools } from "./tools.ts";
import type { AgentSettings, ChatEvent, ChatSession, UsageSnapshot } from "./types.ts";

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

function buildPrompt(skills: { name: string; description: string }[]): string {
  if (skills.length === 0) return SYSTEM_PROMPT;
  const list = skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");
  return `${SYSTEM_PROMPT}

Anleitungen (Skills): Passt eine Anfrage zu einer dieser Anleitungen, lade sie zuerst mit skill_laden und folge ihr. Lade nie mehrere gleichzeitig, wenn eine reicht. Erwähne gegenüber der Lehrkraft nie Dateinamen oder Werkzeugnamen, sag nur, was sie bekommt.
${list}`;
}

export interface SessionDeps {
  resolve?: typeof resolveModel;
  /** Called after every answer with what it used, e.g. to add it to the monthly total. */
  /** Name and description of every available skill. Only these short texts go into the prompt. */
  skills?: { name: string; description: string }[];
  onUsage?: (delta: { input: number; output: number; cost: number }) => void;
}

export function createChatSession(settings: AgentSettings, deps: SessionDeps = {}): ChatSession {
  const { models, model, onTurnEnd } = (deps.resolve ?? resolveModel)(settings);
  const vision = model.input.includes("image");
  const totals = { input: 0, output: 0, cost: 0, context: 0 };
  const snapshot = (): UsageSnapshot => ({
    inputTokens: totals.input,
    outputTokens: totals.output,
    cost: totals.cost,
    contextTokens: totals.context,
    contextWindow: model.contextWindow,
    vision,
  });

  const agent = new Agent({
    initialState: { systemPrompt: buildPrompt(deps.skills ?? []), model, tools },
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
      case "message_end": {
        const m = event.message;
        if (m.role === "assistant" && m.usage.totalTokens > 0) {
          const input = m.usage.input + m.usage.cacheRead + m.usage.cacheWrite;
          totals.input += input;
          totals.output += m.usage.output;
          totals.cost += m.usage.cost.total;
          totals.context = m.usage.totalTokens;
          deps.onUsage?.({ input, output: m.usage.output, cost: m.usage.cost.total });
          emit({ type: "usage", usage: snapshot() });
        }
        break;
      }
      case "tool_execution_start": {
        const tool = tools.find((t) => t.name === event.toolName);
        emit({ type: "step_start", id: event.toolCallId, label: tool?.label ?? "Arbeite weiter" });
        break;
      }
      case "tool_execution_end": {
        emit({ type: "step_end", id: event.toolCallId, ok: !event.isError });
        const material = event.result?.details?.material;
        if (!event.isError && material) emit({ type: "material", ...material });
        break;
      }
    }
  });

  return {
    async send(text, onEvent, images = []) {
      emit = onEvent;
      try {
        if (images.length > 0 && !vision) {
          onEvent({ type: "error", message: "Dieses Modell versteht keine Bilder. Wähle in den Einstellungen ein Modell mit Bildern." });
          return;
        }
        await agent.prompt(text, images.map((i) => ({ type: "image" as const, data: i.data, mimeType: i.mimeType })));
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
    usage: snapshot,
    abort: () => {
      for (const id of [...pending.keys()]) answer(id, false);
      agent.abort();
    },
    reset: () => {
      agent.reset();
      Object.assign(totals, { input: 0, output: 0, cost: 0, context: 0 });
    },
  };
}

function friendlyError(raw?: string): string {
  if (raw && /api key|apikey|unauthor|401|authenticat/i.test(raw)) {
    return "Der Zugang zur KI fehlt oder ist nicht gültig. Bitte prüfe den Zugangsschlüssel.";
  }
  return "Das hat gerade nicht geklappt. Bitte versuche es gleich noch einmal.";
}

import { createModels, type Api, type Model, type Provider, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { deepseekProvider } from "@earendil-works/pi-ai/providers/deepseek";
import { CUSTOM_ID, customProvider } from "./custom.ts";
import type { AgentSettings } from "./types.ts";

export const PROVIDERS: Record<string, { name: string; make: () => Provider; recommended: string[] }> = {
  anthropic: { name: "Claude (Anthropic)", make: anthropicProvider, recommended: ["claude-sonnet-5-5", "claude-haiku-4-5"] },
  openai: { name: "OpenAI (ChatGPT)", make: openaiProvider, recommended: ["gpt-5.4", "gpt-5.4-mini"] },
  deepseek: { name: "DeepSeek", make: deepseekProvider, recommended: ["deepseek-flash"] },
};

type ResolvedModel = {
  models: ReturnType<typeof createModels>;
  model: Model<Api>;
  /** Called after each turn (demo mode re-queues its scripted answer). */
  onTurnEnd?: () => void;
};

export function resolveModel(settings: AgentSettings): ResolvedModel {
  if (settings.provider === "demo") return demoModel();
  if (settings.provider === CUSTOM_ID) {
    const { provider, model } = customProvider({ baseUrl: settings.baseUrl ?? "", model: settings.model ?? "", contextWindow: settings.contextWindow });
    const models = createModels();
    models.setProvider(provider);
    return { models, model };
  }

  const entry = PROVIDERS[settings.provider];
  if (!entry) throw new Error(`Unbekannter Anbieter: ${settings.provider}`);
  const models = createModels();
  models.setProvider(entry.make());
  const id = settings.model ?? entry.recommended[0];
  const model = id ? models.getModel(settings.provider, id) : undefined;
  if (!model) throw new Error(`Modell nicht gefunden: ${settings.provider}/${id}`);
  return { models, model };
}

/** Offline model with scripted answers, so the UI can be tried without an API key. */
function demoModel() {
  const faux = fauxProvider({ tokensPerSecond: 40 });
  const models = createModels();
  models.setProvider(faux.provider);
  const model = faux.getModel();
  const queueAnswer = () => {
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall("datum_heute", {})], { stopReason: "toolUse" }),
      fauxAssistantMessage([
        fauxText(
          "Das ist der Demo-Modus, es ist noch keine KI angebunden. " +
            "Ich habe gerade das heutige Datum nachgesehen, damit du die Fortschrittsanzeige siehst.\n\n" +
            "**Tipp:** Trag einen Zugang ein, dann antworte ich wirklich.",
        ),
      ]),
    ]);
  };
  queueAnswer();
  return { models, model, onTurnEnd: queueAnswer };
}

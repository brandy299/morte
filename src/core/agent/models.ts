import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { deepseekProvider } from "@earendil-works/pi-ai/providers/deepseek";
import type { AgentSettings } from "./types.ts";

/** Default model per provider; a short list of recommended ones comes with the setup step. */
type ResolvedModel = {
  models: ReturnType<typeof createModels>;
  model: NonNullable<ReturnType<ReturnType<typeof createModels>["getModel"]>>;
  /** Called after each turn (demo mode re-queues its scripted answer). */
  onTurnEnd?: () => void;
};

const DEFAULT_MODEL: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5.4",
  deepseek: "deepseek-flash",
};

export function resolveModel(settings: AgentSettings) {
  return resolve(settings);
}

function resolve(settings: AgentSettings): ResolvedModel {
  if (settings.provider === "demo") return demoModel();

  const models = createModels();
  switch (settings.provider) {
    case "anthropic":
      models.setProvider(anthropicProvider());
      break;
    case "openai":
      models.setProvider(openaiProvider());
      break;
    case "deepseek":
      models.setProvider(deepseekProvider());
      break;
    default:
      throw new Error(`Unbekannter Anbieter: ${settings.provider}`);
  }
  const id = settings.model ?? DEFAULT_MODEL[settings.provider];
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

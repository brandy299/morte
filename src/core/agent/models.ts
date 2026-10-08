import { createModels, type Api, type Model, type Provider, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { deepseekProvider } from "@earendil-works/pi-ai/providers/deepseek";
import { opencodeGoProvider } from "@earendil-works/pi-ai/providers/opencode-go";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { CUSTOM_ID, customProvider } from "./custom.ts";
import type { AgentSettings } from "./types.ts";

export const PROVIDERS: Record<string, { name: string; make: () => Provider; recommended: string[] }> = {
  anthropic: { name: "Claude (Anthropic)", make: anthropicProvider, recommended: ["claude-sonnet-5-5", "claude-haiku-4-5"] },
  openai: { name: "OpenAI (ChatGPT)", make: openaiProvider, recommended: ["gpt-5.4", "gpt-5.4-mini"] },
  openrouter: { name: "OpenRouter (viele Modelle, ein Zugang)", make: openrouterProvider, recommended: [
      "deepseek/deepseek-v4.1-flash",
      "z-ai/glm-5.3-flash",
      "qwen/qwen3.8-flash",
      "xiaomi/mimo-v2.6-flash",
      "moonshotai/kimi-k3",
      "anthropic/claude-haiku-4.5",
      "google/gemini-2.5-flash",
    ],
  },
  "opencode-go": {
    name: "OpenCode Go (Abo für viele Modelle)",
    make: opencodeGoProvider,
    recommended: ["deepseek-v4.1-flash", "glm-5.3-flash", "qwen3.8-flash", "mimo-v2.6-flash", "kimi-k3"],
  },
  deepseek: { name: "DeepSeek", make: deepseekProvider, recommended: ["deepseek-flash"] },
};

/** Thrown when a model cannot do what Pult needs from a main model. The message is for teachers. */
export class ModelNotAllowed extends Error {}

/**
 * A main model must understand images (Vision) and call tools. The catalog only knows images;
 * tool calling is proven by the connection test (see setup.ts), and saving needs that test.
 * Returns a plain-language reason, or undefined when the catalog gives no objection.
 */
export function modelProblem(model: Pick<Model<Api>, "input"> & Partial<Pick<Model<Api>, "provider" | "id">>, blocked: Record<string, string> = BLOCKED): string | undefined {
  return visionProblem(model) ?? blockedProblem(model, blocked);
}

/** The catalog says the model cannot read pictures. */
export function visionProblem(model: Pick<Model<Api>, "input">): string | undefined {
  return model.input.includes("image")
    ? undefined
    : "Dieses Modell kann keine Bilder lesen. Pult braucht ein Modell, das Bilder versteht und Dateiaufgaben übernimmt. Bitte wähle ein anderes.";
}

/**
 * Models that Pult does not allow because they did not work reliably enough in the quality checks (evals/BASELINE.md).
 * Key: `provider/model` as in the catalog, value: the reason in plain words, without a full stop at the end.
 * A model goes on this list only after all skills are measured and the limit is set (docs/entscheidungen/014-sperrliste.md).
 * Blocked models are not listed, cannot be saved and are not used. Only the quality checks (npm run eval) may use them, to measure them.
 */
export const BLOCKED: Record<string, string> = {};

function blockedProblem(model: Partial<Pick<Model<Api>, "provider" | "id">>, blocked: Record<string, string>): string | undefined {
  const reason = model.provider && model.id ? blocked[`${model.provider}/${model.id}`] : undefined;
  return reason ? `Dieses Modell ist für Pult gesperrt: ${reason}. Bitte wähle ein anderes.` : undefined;
}

/**
 * Checks a choice without any network call: the model must exist and the catalog must not rule it out.
 * Throws ModelNotAllowed (plain-language reason) or a plain Error for an unknown model.
 */
export function checkChoice(settings: AgentSettings): void {
  if (settings.provider === "demo") return;
  const problem = modelProblem(resolveModel(settings).model);
  if (problem) throw new ModelNotAllowed(problem);
}

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

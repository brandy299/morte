import { createProvider, type Api, type Model } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

export const CUSTOM_ID = "custom";
export const DEFAULT_CONTEXT = 32_000;

/** Plain-language problem with an address or model, shown to the teacher as it is. */
export class CustomProviderError extends Error {}

const PRIVATE_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|.+\.local|[^.]+)$/i;

/**
 * Checks the address of an OpenAI-compatible server. Only https:// may leave this computer or the school network,
 * plain http:// is fine for the own machine and for private addresses.
 */
export function checkBaseUrl(raw: string | undefined): string {
  const text = (raw ?? "").trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new CustomProviderError("Die Adresse ist nicht gültig. Sie sieht zum Beispiel so aus: https://api.beispiel.de/v1");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new CustomProviderError("Die Adresse muss mit https:// beginnen.");
  if (url.protocol === "http:" && !PRIVATE_HOST.test(url.hostname)) {
    throw new CustomProviderError("Eine Adresse mit http:// ist nur auf diesem Computer oder im Schulnetz erlaubt. Für das Internet braucht sie https://.");
  }
  if (url.username || url.password) throw new CustomProviderError("Bitte trage Benutzername und Passwort nicht in die Adresse ein, sondern als Zugangsschlüssel.");
  return text;
}

/**
 * A provider for any server that speaks the OpenAI chat format (school servers, LM Studio, Ollama, vLLM, proxies).
 * What the model can do is not known, so pictures are assumed and the connection test decides.
 */
export function customProvider(opts: { baseUrl: string; model: string; contextWindow?: number }) {
  const baseUrl = checkBaseUrl(opts.baseUrl);
  const id = opts.model.trim();
  if (!id) throw new CustomProviderError("Bitte gib den Namen des Modells an.");
  const model: Model<"openai-completions"> = {
    id,
    name: id,
    api: "openai-completions",
    provider: CUSTOM_ID,
    baseUrl,
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: opts.contextWindow && opts.contextWindow >= 2000 ? Math.floor(opts.contextWindow) : DEFAULT_CONTEXT,
    maxTokens: 8192,
    // Many compatible servers do not know these OpenAI-only options.
    compat: { supportsDeveloperRole: false, supportsReasoningEffort: false },
  };
  const provider = createProvider({
    id: CUSTOM_ID,
    name: "Eigener Anbieter",
    baseUrl,
    // The key (if any) is passed with every request; a server without key works too.
    auth: { apiKey: { name: "Eigener Anbieter", resolve: async () => ({ auth: {} }) } },
    models: [model as Model<Api>],
    api: openAICompletionsApi(),
  });
  return { provider, model: model as Model<Api> };
}

/**
 * The key to send. Servers without a key (local ones) ignore it, but the client library insists on one,
 * so a placeholder is used when the teacher left the field empty.
 */
export const keyFor = (provider: string, apiKey?: string): string | undefined => (provider === CUSTOM_ID ? apiKey || "ohne-schluessel" : apiKey);

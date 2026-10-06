import { keyFor } from "./custom.ts";
import { resolveModel } from "./models.ts";
import type { AgentSettings } from "./types.ts";

/** One-off request to the chosen model, outside the chat (for example to format a long document). */
export interface CompleteRequest {
  system: string;
  text: string;
  /** Base64 pictures, e.g. a scanned page. */
  images?: { data: string; mimeType: string }[];
}

export interface Completer {
  complete(request: CompleteRequest, signal?: AbortSignal): Promise<string>;
  vision: boolean;
  /** Catalog prices in US dollars per million tokens. Missing when the model has no known price. */
  price?: { input: number; output: number };
}

export interface CompleterDeps {
  resolve?: typeof resolveModel;
  onUsage?: (delta: { input: number; output: number; cost: number }) => void;
}

export function createCompleter(settings: AgentSettings, deps: CompleterDeps = {}): Completer {
  const { models, model } = (deps.resolve ?? resolveModel)(settings);
  const price = model.cost && (model.cost.input > 0 || model.cost.output > 0) ? { input: model.cost.input, output: model.cost.output } : undefined;
  return {
    vision: model.input.includes("image"),
    price,
    async complete(request, signal) {
      const content = request.images?.length
        ? [{ type: "text" as const, text: request.text }, ...request.images.map((i) => ({ type: "image" as const, data: i.data, mimeType: i.mimeType }))]
        : request.text;
      const reply = await models.completeSimple(
        model,
        { systemPrompt: request.system, messages: [{ role: "user", content, timestamp: Date.now() }] },
        { apiKey: keyFor(settings.provider, settings.apiKey), signal, maxTokens: Math.min(model.maxTokens, 16000) },
      );
      // A failed request can still have cost something.
      if (reply.usage.totalTokens > 0) deps.onUsage?.({ input: reply.usage.input + reply.usage.cacheRead + reply.usage.cacheWrite, output: reply.usage.output, cost: reply.usage.cost.total });
      if (reply.stopReason === "error" || reply.stopReason === "aborted") throw new Error(reply.errorMessage ?? "request failed");
      return reply.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("\n");
    },
  };
}

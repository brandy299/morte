import type { ProviderOption, SetupStatus } from "./api.ts";

export interface ModelInfoData {
  /** Short name for the small label. */
  name: string;
  provider: string;
  vision: boolean | undefined;
  /** Plain-language price line, or undefined when the catalog has no price. */
  price?: string;
  memory?: string;
}

const de = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: n < 10 && n % 1 ? 2 : 0, maximumFractionDigits: 2 });

/** "DeepSeek: DeepSeek V4.1 Flash" (OpenRouter style) becomes "DeepSeek V4.1 Flash". */
export const shortName = (name: string) => name.replace(/^[^:]{1,30}:\s+/, "");

export function memoryText(tokens: number): string {
  return tokens >= 1_000_000 ? `${de(tokens / 1_000_000)} Mio. Tokens` : `${tokens.toLocaleString("de-DE")} Tokens`;
}

/** What the teacher sees about the model in use. Undefined while there is no model (not set up yet). */
export function modelInfo(status: Pick<SetupStatus, "configured" | "provider" | "model">, providers: ProviderOption[]): ModelInfoData | undefined {
  if (!status.configured || !status.provider) return undefined;
  if (status.provider === "demo") return { name: "Demo ohne KI", provider: "Demo", vision: undefined };
  const provider = providers.find((p) => p.id === status.provider);
  const model = provider?.models.find((m) => m.id === status.model);
  const cost = model?.cost && (model.cost.input > 0 || model.cost.output > 0) ? model.cost : undefined;
  return {
    name: model ? shortName(model.name) : (status.model ?? "unbekannt"),
    provider: provider?.name ?? status.provider,
    vision: model?.vision,
    price: cost ? `lesen ${de(cost.input)} US-$, schreiben ${de(cost.output)} US-$ je 1 Mio. Tokens` : undefined,
    memory: model?.contextWindow ? memoryText(model.contextWindow) : undefined,
  };
}

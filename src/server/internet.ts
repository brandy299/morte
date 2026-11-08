import type { Hono } from "hono";
import { deepseekDienst, exaDienst, openrouterDienst, type Dienst } from "../core/internet/index.ts";
import { internetAn, setzeInternet } from "../core/internet/einstellung.ts";
import { addUsage } from "../core/usage/index.ts";
import { keyName, type AppState } from "./state.ts";

const kosten = (dollar: number) => void addUsage({ input: 0, output: 0, cost: dollar }).catch(() => {});

/**
 * The search service for the keys on this computer: DeepSeek when there is a DeepSeek key (own search API,
 * cheapest), else OpenRouter when it is the chosen provider (its web plugin needs a model). Otherwise Exa's free endpoint without a key.
 */
export async function suchDienst(state: AppState): Promise<Dienst> {
  const deepseek = await state.secrets.get(keyName("deepseek")).catch(() => undefined);
  if (deepseek) return deepseekDienst(deepseek, { onKosten: kosten });
  const choice = state.choice;
  if (choice?.provider === "openrouter" && choice.model) {
    const key = await state.secrets.get(keyName("openrouter")).catch(() => undefined);
    if (key) return openrouterDienst(key, choice.model, { onKosten: kosten });
  }
  return exaDienst();
}

export function internetRoutes(app: Hono, state: AppState) {
  app.get("/api/internet", async (c) => c.json({ an: await internetAn(), dienst: (await suchDienst(state))?.name ?? null }));
  app.post("/api/internet", async (c) => {
    const { an } = await c.req.json<{ an?: unknown }>().catch(() => ({ an: undefined }));
    if (typeof an !== "boolean") return c.json({ error: "Bitte an oder aus wählen." }, 400);
    await setzeInternet(an);
    return c.json({ an, dienst: (await suchDienst(state))?.name ?? null });
  });
}

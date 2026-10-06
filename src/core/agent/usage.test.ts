import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@earendil-works/pi-ai";
import { beforeEach, describe, expect, it } from "vitest";
import { createChatSession, fetchBalance, type ChatEvent } from "./index.ts";
import { addUsage, monthUsage } from "../usage/index.ts";

function session(onUsage?: (d: { input: number; output: number; cost: number }) => void, vision = true) {
  const faux = fauxProvider({ models: [{ id: "m", input: vision ? ["text", "image"] : ["text"] }] });
  faux.setResponses([fauxAssistantMessage([fauxText("Hallo zusammen, das ist eine Antwort.")]), fauxAssistantMessage([fauxText("Noch eine.")])]);
  const models = createModels();
  models.setProvider(faux.provider);
  return createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }), onUsage });
}

describe("usage", () => {
  beforeEach(async () => {
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-usage-"));
  });

  it("reports tokens and context after an answer and adds up over turns", async () => {
    const seen: { input: number; output: number }[] = [];
    const s = session((d) => seen.push(d));
    const events: ChatEvent[] = [];
    await s.send("Hallo", (e) => events.push(e));
    const first = s.usage();
    expect(first.outputTokens).toBeGreaterThan(0);
    expect(first.contextTokens).toBeGreaterThan(0);
    expect(first.contextWindow).toBeGreaterThan(first.contextTokens);
    expect(events.some((e) => e.type === "usage")).toBe(true);
    await s.send("Noch mal", () => {});
    expect(s.usage().outputTokens).toBeGreaterThan(first.outputTokens);
    expect(seen).toHaveLength(2);
    s.reset();
    expect(s.usage().outputTokens).toBe(0);
  });

  it("keeps a monthly total on disk", async () => {
    await Promise.all([addUsage({ input: 10, output: 5, cost: 0.01 }), addUsage({ input: 20, output: 5, cost: 0.02 })]);
    expect(await monthUsage()).toEqual({ input: 30, output: 10, cost: 0.03 });
  });

  it("refuses images for a model without vision, in plain words", async () => {
    const s = session(undefined, false);
    const events: ChatEvent[] = [];
    await s.send("Was ist das?", (e) => events.push(e), [{ data: "AAAA", mimeType: "image/png" }]);
    expect(events).toContainEqual(expect.objectContaining({ type: "error", message: expect.stringContaining("keine Bilder") }));
  });
});

describe("fetchBalance", () => {
  const ok = (body: unknown) => (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;
  it("reads the DeepSeek balance", async () => {
    const b = await fetchBalance("deepseek", "key", ok({ balance_infos: [{ currency: "CNY", total_balance: "4.2" }] }));
    expect(b?.text).toBe("4,20 CNY");
  });
  it("shows the smaller of the key limit and the account credit for OpenRouter", async () => {
    const answer = (data: unknown) => ({ ok: true, json: async () => ({ data }) }) as Response;
    const by = (key: unknown, credits: unknown) => (async (url: string | URL | Request) => (String(url).includes("credits") ? answer(credits) : answer(key))) as typeof fetch;
    expect((await fetchBalance("openrouter", "k", by({ limit_remaining: 50 }, { total_credits: 50, total_usage: 36.97 })))?.text).toBe("13,03 USD");
    expect((await fetchBalance("openrouter", "k", by({ limit_remaining: 5 }, { total_credits: 50, total_usage: 36.97 })))?.text).toBe("5,00 USD");
    expect((await fetchBalance("openrouter", "k", by({ limit_remaining: null }, { total_credits: 50, total_usage: 36.97 })))?.text).toBe("13,03 USD");
  });
  it("has nothing to show for providers without a balance query", async () => {
    expect(await fetchBalance("anthropic", "key", ok({}))).toBeUndefined();
  });
  it("hides errors", async () => {
    const failing = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect(await fetchBalance("deepseek", "key", failing)).toBeUndefined();
  });
});

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { SecretStore } from "../core/secrets/index.ts";
import { createApp, loadState } from "./index.ts";
import { suchDienst } from "./internet.ts";

const memoryStore = (data: Record<string, string> = {}): SecretStore => ({ kind: "file", get: async (n) => data[n], set: async (n, v) => void (data[n] = v), delete: async (n) => void delete data[n] });

let home: string;
beforeEach(async () => {
  home = process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-internet-"));
});

describe("web search setting (server)", () => {
  it("is on by default, can be switched off and stays off", async () => {
    const app = createApp(await loadState(memoryStore()));
    expect(await (await app.request("/api/internet")).json()).toEqual({ an: true, dienst: null });
    const res = await app.request("/api/internet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ an: false }) });
    expect((await res.json()).an).toBe(false);
    expect(await readFile(join(home, "Einstellungen", "Internet.md"), "utf8")).toMatch(/Internet: aus/);
    expect((await (await createApp(await loadState(memoryStore())).request("/api/internet")).json()).an).toBe(false);
  });

  it("refuses anything but on or off", async () => {
    const app = createApp(await loadState(memoryStore()));
    expect((await app.request("/api/internet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ an: "ja" }) })).status).toBe(400);
  });

  it("searches over DeepSeek when there is a DeepSeek key, else over OpenRouter when it is the chosen provider, else not", async () => {
    const state = await loadState(memoryStore({ "apikey:openrouter": "or", "apikey:deepseek": "ds" }));
    state.choice = { provider: "openrouter", model: "deepseek/deepseek-v4" };
    expect((await suchDienst(state))?.name).toBe("DeepSeek");

    const nurOpenrouter = await loadState(memoryStore({ "apikey:openrouter": "or" }));
    nurOpenrouter.choice = { provider: "openrouter", model: "deepseek/deepseek-v4" };
    expect((await suchDienst(nurOpenrouter))?.name).toBe("OpenRouter");

    const anderer = await loadState(memoryStore({ "apikey:openrouter": "or", "apikey:opencode-go": "go" }));
    anderer.choice = { provider: "opencode-go", model: "glm-5" };
    expect(await suchDienst(anderer)).toBeUndefined();
  });
});

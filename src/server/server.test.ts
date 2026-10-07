import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, loadState } from "./index.ts";
import { PROVIDERS } from "../core/agent/models.ts";
import type { ConnectionResult } from "../core/agent/index.ts";
import type { SecretStore } from "../core/secrets/index.ts";

const memoryStore = (): SecretStore & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return {
    kind: "file",
    data,
    get: async (n) => data[n],
    set: async (n, v) => void (data[n] = v),
    delete: async (n) => void delete data[n],
  };
};
const pass: ConnectionResult = { passed: true, checks: [] };
const fail: ConnectionResult = { passed: false, checks: [], hint: "Dieses Modell kann keine Dateiaufgaben übernehmen. Bitte wähle ein anderes Modell." };

let home: string;
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pult-server-"));
  process.env.PULT_HOME = home;
});

const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const providerFile = () => readFile(join(home, "Einstellungen", "Provider.md"), "utf8").catch(() => undefined);

const noVision = Object.entries(PROVIDERS)
  .flatMap(([provider, p]) => p.make().getModels().filter((m) => !m.input.includes("image")).map((m) => ({ provider, model: m.id })))[0]!;
const good = { provider: "anthropic", model: "claude-sonnet-5-5" };

describe("only models that can do the job are accepted", () => {
  it("rejects saving without a passed test and stores nothing", async () => {
    const secrets = memoryStore();
    const state = await loadState(secrets);
    const test = vi.fn(async () => fail);
    const app = createApp(state, { testConnection: test });
    const res = await post(app, "/api/setup/save", { ...good, apiKey: "sk-geheim" });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("Dateiaufgaben");
    expect(test).toHaveBeenCalledTimes(1);
    expect(secrets.data).toEqual({});
    expect(await providerFile()).toBeUndefined();
    expect(state.session).toBeUndefined();
  });

  it("saves after a passed test without testing a second time", async () => {
    const secrets = memoryStore();
    const state = await loadState(secrets);
    const test = vi.fn(async () => pass);
    const app = createApp(state, { testConnection: test });
    await post(app, "/api/setup/test", { ...good, apiKey: "sk-a" });
    const res = await post(app, "/api/setup/save", { ...good, apiKey: "sk-a" });
    expect(res.status).toBe(200);
    expect(test).toHaveBeenCalledTimes(1);
    expect(secrets.data).toEqual({ "apikey:anthropic": "sk-a" });
    expect(await providerFile()).toContain("Modell: claude-sonnet-5-5");
    expect(state.session).toBeDefined();
  });

  it("tests again when the model or key differs from the one that passed", async () => {
    const state = await loadState(memoryStore());
    const test = vi.fn(async () => pass);
    const app = createApp(state, { testConnection: test });
    await post(app, "/api/setup/test", { ...good, apiKey: "sk-a" });
    await post(app, "/api/setup/save", { ...good, model: "claude-haiku-4-5", apiKey: "sk-a" });
    await post(app, "/api/setup/save", { ...good, apiKey: "sk-andere" });
    expect(test).toHaveBeenCalledTimes(3);
  });

  it("refuses a model without images even when a test says yes, and stores nothing", async () => {
    const secrets = memoryStore();
    const state = await loadState(secrets);
    const app = createApp(state, { testConnection: async () => pass });
    const res = await post(app, "/api/setup/save", { ...noVision, apiKey: "sk-x" });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("keine Bilder");
    expect(secrets.data).toEqual({});
    expect(await providerFile()).toBeUndefined();
  });

  it("never offers a model without images", async () => {
    const app = createApp(await loadState(memoryStore()));
    const { providers } = await (await app.request("/api/setup/options")).json();
    const all = providers.flatMap((p: { models: { vision: boolean }[] }) => p.models);
    expect(all.length).toBeGreaterThan(10);
    expect(all.every((m: { vision: boolean }) => m.vision)).toBe(true);
    const ids = providers.flatMap((p: { id: string; models: { id: string }[] }) => p.models.map((m) => `${p.id}/${m.id}`));
    expect(ids).not.toContain(`${noVision.provider}/${noVision.model}`);
  });

  it("does not run a saved model without images, says why, and asks to choose again", async () => {
    await mkdir(join(home, "Einstellungen"), { recursive: true });
    await writeFile(join(home, "Einstellungen", "Provider.md"), `# Provider\n\nAnbieter: ${noVision.provider}\nModell: ${noVision.model}\n`);
    const state = await loadState(memoryStore());
    expect(state.session).toBeUndefined();
    const status = await (await createApp(state).request("/api/setup/status")).json();
    expect(status.configured).toBe(false);
    expect(status.notice).toContain("keine Bilder");
    const chat = await post(createApp(state), "/api/chat", { text: "Hallo" });
    expect(chat.status).toBe(409);
  });

  it("starts normally with a good saved model and shows no notice", async () => {
    await mkdir(join(home, "Einstellungen"), { recursive: true });
    await writeFile(join(home, "Einstellungen", "Provider.md"), `# Provider\n\nAnbieter: ${good.provider}\nModell: ${good.model}\n`);
    const state = await loadState(memoryStore());
    expect(state.session).toBeDefined();
    const status = await (await createApp(state).request("/api/setup/status")).json();
    expect(status).toMatchObject({ configured: true, model: good.model });
    expect(status.notice).toBeUndefined();
  });

  it("keeps the demo mode working", async () => {
    const state = await loadState(memoryStore());
    const res = await post(createApp(state), "/api/setup/demo", {});
    expect(res.status).toBe(200);
    expect(state.session).toBeDefined();
  });
});

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BLOCKED } from "../core/agent/index.ts";
import type { SecretStore } from "../core/secrets/index.ts";
import { createApp, loadState } from "./index.ts";

const memoryStore = (): SecretStore & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { kind: "file", data, get: async (n) => data[n], set: async (n, v) => void (data[n] = v), delete: async (n) => void delete data[n] };
};
const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) => app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const blocked = { provider: "anthropic", model: "claude-haiku-4-5" };

let home: string;
beforeEach(async () => {
  home = process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-sperr-"));
  BLOCKED["anthropic/claude-haiku-4-5"] = "Es hat in den Prüfungen zu oft nicht gespeichert";
});
afterEach(() => {
  for (const k of Object.keys(BLOCKED)) delete BLOCKED[k];
});

describe("block list (server)", () => {
  it("turns down a blocked model in the test and when saving, even if a test said yes, and stores nothing", async () => {
    const secrets = memoryStore();
    const state = await loadState(secrets);
    const test = vi.fn(async () => ({ passed: true, checks: [] }));
    state.runTest = test as never;
    const app = createApp(state);
    for (const path of ["/api/setup/test", "/api/setup/save"]) {
      const res = await post(app, path, { ...blocked, apiKey: "sk-x" });
      expect(res.status, path).toBe(422);
      expect((await res.json()).error, path).toMatch(/gesperrt.*nicht gespeichert/);
    }
    expect(test).not.toHaveBeenCalled(); // nothing is sent to the blocked model
    expect(secrets.data).toEqual({});
    expect(await readFile(join(home, "Einstellungen", "Provider.md"), "utf8").catch(() => undefined)).toBeUndefined();
  });

  it("does not offer it", async () => {
    const app = createApp(await loadState(memoryStore()));
    const { providers } = await (await app.request("/api/setup/options")).json();
    const ids = providers.flatMap((p: { id: string; models: { id: string }[] }) => p.models.map((m) => `${p.id}/${m.id}`));
    expect(ids).not.toContain("anthropic/claude-haiku-4-5");
    expect(ids).toContain("anthropic/claude-sonnet-5-5");
  });

  it("does not run a model that was saved before it was blocked, says why, and asks to choose again", async () => {
    await mkdir(join(home, "Einstellungen"), { recursive: true });
    await writeFile(join(home, "Einstellungen", "Provider.md"), `# Provider\n\nAnbieter: ${blocked.provider}\nModell: ${blocked.model}\n`);
    const state = await loadState(memoryStore());
    expect(state.session).toBeUndefined();
    const status = await (await createApp(state).request("/api/setup/status")).json();
    expect(status.configured).toBe(false);
    expect(status.notice).toMatch(/gesperrt.*nicht gespeichert/);
    expect((await post(createApp(state), "/api/chat", { text: "Hallo" })).status).toBe(409);
  });
});

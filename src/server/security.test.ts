import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { saveProviderSettings } from "../core/settings/index.ts";
import { createApp, loadState } from "./index.ts";

const secrets = { kind: "file" as const, get: async () => undefined, set: async () => {}, delete: async () => {} };
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  process.env.MORTE_HOME = await mkdtemp(join(tmpdir(), "morte-sec-"));
  app = createApp({ secrets, session: undefined, configured: undefined });
});

const get = (headers: Record<string, string>) => app.request("/api/setup/status", { headers });
const post = (headers: Record<string, string>) =>
  app.request("/api/chat/reset", { method: "POST", headers: { "content-type": "text/plain", ...headers }, body: "{}" });

describe("only this computer may use the API", () => {
  it("answers local names, with or without a port", async () => {
    for (const host of ["localhost:3001", "127.0.0.1:5173", "localhost", "[::1]:3001"]) expect((await get({ host })).status).toBe(200);
  });

  it("refuses a foreign name pointing at this computer (DNS rebinding)", async () => {
    expect((await get({ host: "evil.example:3001" })).status).toBe(403);
  });

  it("refuses requests from a page on another origin, even simple ones without a preflight", async () => {
    expect((await post({ host: "localhost:3001", origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ host: "localhost:3001", origin: "http://localhost:9999" })).status).toBe(403); // other port = other page
    expect((await post({ host: "localhost:3001", origin: "not a url" })).status).toBe(403);
  });

  it("accepts the app's own page", async () => {
    expect((await post({ host: "localhost:3001", origin: "http://localhost:3001" })).status).toBe(200);
  });

  it("accepts the development server only when it is announced", async () => {
    const viaDev = { host: "127.0.0.1:3001", origin: "http://localhost:5173" }; // Vite forwards with the server's own Host
    expect((await post(viaDev)).status).toBe(403);
    process.env.MORTE_DEV_PORT = "5173";
    try {
      expect((await post(viaDev)).status).toBe(200);
      expect((await post({ host: "127.0.0.1:3001", origin: "https://evil.example:5173" })).status).toBe(403);
    } finally {
      delete process.env.MORTE_DEV_PORT;
    }
  });
});

describe("setup that cannot work", () => {
  it("starts without a session instead of failing when the saved model is gone", async () => {
    await saveProviderSettings({ provider: "anthropic", model: "modell-das-es-nicht-mehr-gibt" });
    const state = await loadState(secrets);
    expect(state.session).toBeUndefined();
    expect(state.configured).toBeUndefined();
    const status = await (await createApp(state).request("/api/setup/status")).json();
    expect(status.configured).toBe(false);
  });

  it("does not keep a model that cannot be used", async () => {
    const res = await app.request("/api/setup/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "anthropic", model: "gibt-es-nicht" }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/kenne ich nicht/);
    const { loadProviderSettings } = await import("../core/settings/index.ts");
    expect(await loadProviderSettings()).toBeUndefined();
  });
});

import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createChatSession, listProviders, testConnection, type ChatSession } from "../core/agent/index.ts";
import { createSecretStore, type SecretStore } from "../core/secrets/index.ts";
import { loadProviderSettings, saveProviderSettings } from "../core/settings/index.ts";

/** Holds the current chat session; it is rebuilt after the setup changes provider, model or key. */
export interface AppState {
  secrets: SecretStore;
  session: ChatSession | undefined;
  configured: { provider: string; model: string } | undefined;
}

const keyName = (provider: string) => `apikey:${provider}`;

async function buildSession(state: AppState, choice: { provider: string; model?: string }) {
  const apiKey = choice.provider === "demo" ? undefined : await state.secrets.get(keyName(choice.provider));
  state.session?.abort();
  state.session = createChatSession({ ...choice, apiKey });
}

export async function loadState(secrets: SecretStore): Promise<AppState> {
  const state: AppState = { secrets, session: undefined, configured: undefined };
  const saved = await loadProviderSettings();
  if (saved) {
    state.configured = saved;
    await buildSession(state, saved);
  }
  return state;
}

export function createApp(state: AppState) {
  const app = new Hono();
  let busy = false;

  app.get("/api/setup/status", (c) =>
    c.json({ configured: Boolean(state.session), ...state.configured, storage: state.secrets.kind }),
  );
  app.get("/api/setup/options", (c) => c.json({ providers: listProviders() }));

  app.post("/api/setup/test", async (c) => {
    const { provider, model, apiKey } = await c.req.json<{ provider: string; model: string; apiKey?: string }>();
    const key = apiKey?.trim() || (await state.secrets.get(keyName(provider)));
    return c.json(await testConnection({ provider, model, apiKey: key }));
  });

  app.post("/api/setup/save", async (c) => {
    const { provider, model, apiKey } = await c.req.json<{ provider: string; model: string; apiKey?: string }>();
    if (apiKey?.trim()) await state.secrets.set(keyName(provider), apiKey.trim());
    await saveProviderSettings({ provider, model });
    state.configured = { provider, model };
    await buildSession(state, { provider, model });
    return c.json({ ok: true });
  });

  app.post("/api/setup/demo", async (c) => {
    state.configured = undefined;
    await buildSession(state, { provider: "demo" });
    return c.json({ ok: true });
  });

  app.post("/api/chat", async (c) => {
    const session = state.session;
    if (!session) return c.json({ error: "Bitte richte zuerst die KI ein." }, 409);
    const { text } = await c.req.json<{ text?: string }>();
    if (!text?.trim()) return c.json({ error: "Bitte schreibe zuerst etwas." }, 400);
    if (busy) return c.json({ error: "Ich arbeite noch an der letzten Frage." }, 409);
    busy = true;
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => session.abort());
      try {
        await session.send(text, (event) => {
          void stream.writeSSE({ data: JSON.stringify(event) });
        });
      } finally {
        busy = false;
      }
    });
  });

  app.post("/api/chat/reset", (c) => {
    state.session?.reset();
    return c.json({ ok: true });
  });

  return app;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

if (process.argv[1]?.endsWith("server/index.ts") || process.argv[1]?.endsWith("server/index.js")) {
  const app = createApp(await loadState(await createSecretStore()));
  const webDir = join(process.cwd(), "dist", "web");
  // Production: serve the built UI. In development Vite serves it and proxies /api here.
  app.get("*", async (c) => {
    const rel = normalize(c.req.path).replace(/^(\.\.[/\\])+/, "");
    const file = join(webDir, rel === "/" ? "index.html" : rel);
    if (!file.startsWith(webDir)) return c.notFound();
    try {
      const body = await readFile(file);
      return c.body(body, 200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    } catch {
      return c.notFound();
    }
  });
  const port = Number(process.env.PORT ?? 3001);
  serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, () =>
    console.log(`morte läuft auf http://localhost:${port}`),
  );
}

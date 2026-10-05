import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createChatSession, fetchBalance, listProviders, testConnection, type ChatSession, type ImageAttachment } from "../core/agent/index.ts";
import { createSecretStore, type SecretStore } from "../core/secrets/index.ts";
import { createClass, initWorkspace, listTree, materialFile, UserError } from "../core/workspace/index.ts";
import { listSkills } from "../core/skills/index.ts";
import { addUsage, monthUsage } from "../core/usage/index.ts";
import { loadProviderSettings, saveProviderSettings } from "../core/settings/index.ts";

/** Holds the current chat session; it is rebuilt after the setup changes provider, model or key. */
export interface AppState {
  secrets: SecretStore;
  session: ChatSession | undefined;
  configured: { provider: string; model: string } | undefined;
  /** Last choice, so "Neues Gespräch" can rebuild the session and pick up new skills. */
  choice?: { provider: string; model?: string };
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES = 4;
const MAX_IMAGE_BASE64 = 7_000_000; // about 5 MB of image

const keyName = (provider: string) => `apikey:${provider}`;

async function buildSession(state: AppState, choice: { provider: string; model?: string }) {
  const apiKey = choice.provider === "demo" ? undefined : await state.secrets.get(keyName(choice.provider));
  state.choice = choice;
  state.session?.abort();
  const { skills } = await listSkills();
  state.session = createChatSession({ ...choice, apiKey }, { skills, onUsage: (d) => void addUsage(d).catch(() => {}) });
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

  app.get("/api/usage", async (c) => {
    const provider = state.configured?.provider;
    const key = provider ? await state.secrets.get(keyName(provider)) : undefined;
    return c.json({
      session: state.session?.usage(),
      month: await monthUsage(),
      balance: provider ? await fetchBalance(provider, key) : undefined,
    });
  });

  app.post("/api/chat", async (c) => {
    const session = state.session;
    if (!session) return c.json({ error: "Bitte richte zuerst die KI ein." }, 409);
    const { text, images = [] } = await c.req.json<{ text?: string; images?: ImageAttachment[] }>();
    if (!text?.trim()) return c.json({ error: "Bitte schreibe zuerst etwas." }, 400);
    const bad = images.length > MAX_IMAGES || images.some((i) => !IMAGE_TYPES.includes(i.mimeType) || i.data.length > MAX_IMAGE_BASE64);
    if (bad) return c.json({ error: "Bilder gehen nur als JPG, PNG, WebP oder GIF, höchstens vier Stück und jeweils unter 5 MB." }, 400);
    if (busy) return c.json({ error: "Ich arbeite noch an der letzten Frage." }, 409);
    busy = true;
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => session.abort());
      try {
        await session.send(
          text,
          (event) => {
            void stream.writeSSE({ data: JSON.stringify(event) });
          },
          images,
        );
      } finally {
        busy = false;
      }
    });
  });

  app.post("/api/chat/confirm", async (c) => {
    const { id, allow } = await c.req.json<{ id: string; allow: boolean }>();
    state.session?.answer(id, Boolean(allow));
    return c.json({ ok: true });
  });

  app.get("/api/workspace/tree", async (c) => c.json({ klassen: await listTree() }));

  app.post("/api/workspace/klasse", async (c) => {
    try {
      const name = await createClass(await c.req.json());
      return c.json({ name });
    } catch (err) {
      if (err instanceof UserError) return c.json({ error: err.message }, 400);
      throw err;
    }
  });

  app.get("/api/material", async (c) => {
    const file = await materialFile(c.req.query("path") ?? "");
    if (!file) return c.notFound();
    const name = encodeURIComponent(file.split(/[\\/]/).pop()!);
    const disposition = c.req.query("download") ? "attachment" : "inline";
    return c.body(await readFile(file), 200, {
      "content-type": "application/pdf",
      "content-disposition": `${disposition}; filename*=UTF-8''${name}`,
    });
  });

  app.post("/api/chat/reset", async (c) => {
    if (state.choice) await buildSession(state, state.choice);
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
  await initWorkspace();
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

import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { serve } from "@hono/node-server";
import { Hono, type MiddlewareHandler } from "hono";
import { streamSSE } from "hono/streaming";
import { checkBaseUrl, createChatSession, CUSTOM_ID, CustomProviderError, fetchBalance, listProviders, testConnection, type ChatSession, type ImageAttachment } from "../core/agent/index.ts";
import { createSecretStore, type SecretStore } from "../core/secrets/index.ts";
import { createClass, initWorkspace, listTree, materialFile, UserError } from "../core/workspace/index.ts";
import { applyEvent, deleteConversation, listConversations, loadConversation, newConversationId, saveConversation, settle, titleFrom, type StoredMessage } from "../core/history/index.ts";
import { listSkills } from "../core/skills/index.ts";
import { addUsage, monthUsage } from "../core/usage/index.ts";
import { lehrplanRoutes } from "./lehrplan.ts";
import { keyName, type AppState } from "./state.ts";

export type { AppState };
import { loadProviderSettings, saveProviderSettings } from "../core/settings/index.ts";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES = 4;
interface SetupBody {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  contextWindow?: number;
}

const MAX_IMAGE_BASE64 = 7_000_000; // about 5 MB of image


async function buildSession(state: AppState, choice: NonNullable<AppState["choice"]>) {
  const apiKey = choice.provider === "demo" ? undefined : await state.secrets.get(keyName(choice.provider));
  state.choice = choice;
  state.conversation = undefined; // a new session starts a new conversation
  state.session?.abort();
  const { skills } = await listSkills();
  state.session = createChatSession({ ...choice, apiKey }, { skills, onUsage: (d) => void addUsage(d).catch(() => {}) });
}

export async function loadState(secrets: SecretStore): Promise<AppState> {
  const state: AppState = { secrets, session: undefined, configured: undefined };
  const saved = await loadProviderSettings();
  if (saved) {
    try {
      await buildSession(state, saved);
      state.configured = saved;
    } catch {
      // The saved model is gone (for example removed from the catalog after an update). Start with the setup screen.
      state.session = undefined;
    }
  }
  return state;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const hostnameOf = (hostHeader: string) => hostHeader.replace(/:\d+$/, "").toLowerCase();

/**
 * The server only listens on this computer, but a web page the teacher has open could still talk to it
 * (forms and "simple" requests need no permission, and DNS tricks can point a foreign name at 127.0.0.1).
 * So the API only answers requests for a local name, and requests that come from a page on another origin are refused.
 */
export function localOnly(): MiddlewareHandler {
  return async (c, next) => {
    const host = c.req.header("host");
    if (host && !LOCAL_HOSTS.has(hostnameOf(host))) return c.json({ error: "Nicht erlaubt." }, 403);
    const origin = c.req.header("origin");
    if (origin) {
      let originHost: string;
      try {
        originHost = new URL(origin).host;
      } catch {
        return c.json({ error: "Nicht erlaubt." }, 403);
      }
      // The page must be this app: same address, or in development the Vite dev server (MORTE_DEV_PORT) that forwards to us.
      const devPort = process.env.MORTE_DEV_PORT;
      const fromDevServer = Boolean(devPort) && originHost.toLowerCase().endsWith(`:${devPort}`);
      const sameAddress = !host || originHost.toLowerCase() === host.toLowerCase();
      if (!LOCAL_HOSTS.has(hostnameOf(originHost)) || !(sameAddress || fromDevServer)) {
        return c.json({ error: "Nicht erlaubt." }, 403);
      }
    }
    await next();
  };
}

export function createApp(state: AppState) {
  const app = new Hono();
  app.use("/api/*", localOnly());
  let busy = false;

  app.get("/api/setup/status", (c) =>
    c.json({ configured: Boolean(state.session), ...state.configured, storage: state.secrets.kind }),
  );
  app.get("/api/setup/options", (c) => c.json({ providers: listProviders() }));

  app.post("/api/setup/test", async (c) => {
    const { provider, model, apiKey, baseUrl, contextWindow } = await c.req.json<SetupBody>();
    const key = apiKey?.trim() || (await state.secrets.get(keyName(provider)));
    return c.json(await testConnection({ provider, model, apiKey: key, baseUrl, contextWindow }));
  });

  app.post("/api/setup/save", async (c) => {
    const { provider, model, apiKey, baseUrl, contextWindow } = await c.req.json<SetupBody>();
    const choice = { provider, model, ...(provider === CUSTOM_ID ? { baseUrl: baseUrl?.trim(), contextWindow } : {}) };
    try {
      if (provider === CUSTOM_ID) choice.baseUrl = checkBaseUrl(baseUrl);
      if (apiKey?.trim()) await state.secrets.set(keyName(provider), apiKey.trim());
      await buildSession(state, choice);
    } catch (err) {
      return c.json({ error: err instanceof CustomProviderError ? err.message : "Dieses Modell kenne ich nicht. Bitte wähle ein anderes." }, 400);
    }
    await saveProviderSettings(choice);
    state.configured = choice;
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
    const conversation = (state.conversation ??= { id: newConversationId(), titel: titleFrom(text), anzeige: [] });
    let answer: StoredMessage = { role: "assistant", text: "", steps: [] };
    conversation.anzeige.push({ role: "user", text, bilder: images.length || undefined, steps: [] });
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => session.abort());
      try {
        await session.send(
          text,
          (event) => {
            answer = applyEvent(answer, event);
            void stream.writeSSE({ data: JSON.stringify(event) });
          },
          images,
        );
      } finally {
        conversation.anzeige.push(settle(answer));
        const { messages, usage } = session.history();
        await saveConversation({ id: conversation.id, titel: conversation.titel, anzeige: conversation.anzeige, modell: messages, verbrauch: usage }).catch(() => {});
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

  app.get("/api/history", async (c) => c.json({ gespraeche: await listConversations(), aktuell: state.conversation?.id }));

  app.post("/api/history/open", async (c) => {
    const { id } = await c.req.json<{ id: string }>();
    if (busy) return c.json({ error: "Ich arbeite noch an der letzten Frage." }, 409);
    const saved = await loadConversation(id).catch(() => undefined);
    if (!saved || !state.choice) return c.json({ error: "Dieses Gespräch gibt es nicht mehr." }, 404);
    await buildSession(state, state.choice);
    state.session!.restore({ messages: saved.modell, usage: saved.verbrauch as never });
    state.conversation = { id: saved.id, titel: saved.titel, anzeige: saved.anzeige };
    return c.json({ anzeige: saved.anzeige, usage: state.session!.usage() });
  });

  app.delete("/api/history/:id", async (c) => {
    const id = c.req.param("id");
    // The answer that is still being written would save the conversation again, so wait until it is done.
    if (busy && state.conversation?.id === id) return c.json({ error: "Dieses Gespräch läuft gerade. Bitte warte, bis die Antwort fertig ist." }, 409);
    await deleteConversation(id).catch(() => {});
    if (state.conversation?.id === id && state.choice) await buildSession(state, state.choice);
    return c.json({ ok: true });
  });

  app.post("/api/chat/reset", async (c) => {
    if (state.choice) await buildSession(state, state.choice);
    return c.json({ ok: true });
  });

  lehrplanRoutes(app, state);

  return app;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
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

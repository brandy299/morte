import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createChatSession, type AgentSettings, type ChatSession } from "../core/agent/index.ts";

/** Settings come from the environment for now; the setup step with key storage follows in Phase 1. */
function settingsFromEnv(): AgentSettings {
  return {
    provider: process.env.MORTE_PROVIDER ?? "demo",
    model: process.env.MORTE_MODEL,
  };
}

export function createApp(session: ChatSession) {
  const app = new Hono();
  let busy = false;

  app.post("/api/chat", async (c) => {
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
    session.reset();
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
  const app = createApp(createChatSession(settingsFromEnv()));
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

import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkBaseUrl, createChatSession, testConnection, type ChatEvent } from "./index.ts";

/** A small server that speaks the OpenAI chat format, so the real network code of the app is used. */
interface Mock {
  url: string;
  requests: { auth?: string; body: any }[];
  server: Server;
  /** Behaviour switches. */
  sees: { images: boolean; tools: boolean };
  status?: number;
}

async function startMock(): Promise<Mock> {
  const mock: Mock = { url: "", requests: [], server: undefined as unknown as Server, sees: { images: true, tools: true } };
  const read = (req: IncomingMessage) => new Promise<string>((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
  mock.server = createServer(async (req, res) => {
    const body = JSON.parse((await read(req)) || "{}");
    mock.requests.push({ auth: req.headers.authorization, body });
    if (mock.status && mock.status !== 200) {
      res.writeHead(mock.status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "model not found" } }));
      return;
    }
    const messages: any[] = body.messages ?? [];
    const last = messages.at(-1);
    const hasImage = messages.some((m) => Array.isArray(m.content) && m.content.some((p: any) => p.type === "image_url"));
    const chunk = (delta: object, finish: string | null = null) =>
      `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 0, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
    const text = (t: string) => [chunk({ role: "assistant", content: t.slice(0, 3) }), chunk({ content: t.slice(3) }), chunk({}, "stop")];
    let parts: string[];
    if (last?.role === "tool") parts = text("Heute ist ein schöner Tag.");
    else if (hasImage) parts = mock.sees.images ? text("Rot") : text("Ich sehe kein Bild.");
    else if (body.tools?.length && /Werkzeug/.test(JSON.stringify(last)) && mock.sees.tools) {
      parts = [
        chunk({ role: "assistant", tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "datum_heute", arguments: "" } }] }),
        chunk({ tool_calls: [{ index: 0, function: { arguments: "{}" } }] }),
        chunk({}, "tool_calls"),
      ];
    } else if (body.tools?.length && /Datum/.test(JSON.stringify(last))) parts = [...text("Das Datum steht oben."), ];
    else parts = text("Hallo");
    parts.push(`data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 0, model: body.model, choices: [], usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 } })}\n\n`, "data: [DONE]\n\n");
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(parts.join(""));
  });
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", r));
  mock.url = `http://127.0.0.1:${(mock.server.address() as AddressInfo).port}/v1`;
  return mock;
}

let mock: Mock;
beforeEach(async () => {
  mock = await startMock();
});
afterEach(() => new Promise<void>((r) => mock.server.close(() => r())));

describe("checkBaseUrl", () => {
  it("accepts https and private http addresses, removes a trailing slash", () => {
    expect(checkBaseUrl("https://api.beispiel.de/v1/")).toBe("https://api.beispiel.de/v1");
    for (const ok of ["http://localhost:11434/v1", "http://127.0.0.1:8080/v1", "http://192.168.1.20:1234/v1", "http://10.0.0.5/v1", "http://schulserver/v1", "http://ki.schule.local/v1"]) expect(checkBaseUrl(ok)).toBe(ok);
  });
  it("explains in plain words what is wrong", () => {
    expect(() => checkBaseUrl("")).toThrow(/nicht gültig/);
    expect(() => checkBaseUrl("ftp://x.de")).toThrow(/https/);
    expect(() => checkBaseUrl("http://api.beispiel.de/v1")).toThrow(/https/);
    expect(() => checkBaseUrl("https://user:pw@api.beispiel.de")).toThrow(/Zugangsschlüssel/);
  });
});

describe("own OpenAI-compatible server", () => {
  it("passes the connection test when it can chat, call tools and see pictures", async () => {
    const result = await testConnection({ provider: "custom", model: "mein-modell", baseUrl: mock.url, apiKey: "geheim" });
    expect(result.checks.map((c) => c.state)).toEqual(["ok", "ok", "ok"]);
    expect(result.passed).toBe(true);
    expect(mock.requests[0]!.auth).toBe("Bearer geheim");
    expect(mock.requests[0]!.body.model).toBe("mein-modell");
  });

  it("works without a key, as local servers do", async () => {
    const result = await testConnection({ provider: "custom", model: "m", baseUrl: mock.url });
    expect(result.passed).toBe(true);
  });

  it("tells when the model cannot see pictures, because the catalog does not know", async () => {
    mock.sees.images = false;
    const result = await testConnection({ provider: "custom", model: "m", baseUrl: mock.url });
    expect(result.checks.find((c) => c.id === "vision")!.state).toBe("failed");
    expect(result.hint).toMatch(/keine Bilder/);
  });

  it("says plainly when the server is not reachable, and when the model or path is wrong", async () => {
    const down = await testConnection({ provider: "custom", model: "m", baseUrl: "http://127.0.0.1:9/v1" });
    expect(down.passed).toBe(false);
    expect(down.hint).toMatch(/erreiche den Server/);
    mock.status = 404;
    const wrong = await testConnection({ provider: "custom", model: "gibt-es-nicht", baseUrl: mock.url });
    expect(wrong.hint).toMatch(/kennt dieses Modell/);
    const bad = await testConnection({ provider: "custom", model: "m", baseUrl: "http://api.beispiel.de/v1" });
    expect(bad.hint).toMatch(/https/);
  });

  it("runs a whole chat with a tool call through the real network path", async () => {
    const session = createChatSession({ provider: "custom", model: "m", baseUrl: mock.url, apiKey: "k" });
    const events: ChatEvent[] = [];
    await session.send("Bitte nutze das Werkzeug für das Datum", (e) => events.push(e));
    expect(events).toContainEqual(expect.objectContaining({ type: "step_start", label: "Datum nachsehen" }));
    expect(events).toContainEqual({ type: "step_end", id: expect.any(String), ok: true });
    expect(events.filter((e) => e.type === "text").map((e) => (e as { delta: string }).delta).join("")).toBe("Heute ist ein schöner Tag.");
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(session.usage().outputTokens).toBeGreaterThan(0);
    // The teacher's system prompt and the tool declarations reached the server.
    const first = mock.requests[0]!.body;
    expect(first.messages[0].role).toBe("system");
    expect(first.tools.map((t: any) => t.function.name)).toContain("klassen_uebersicht");
    expect(first.stream).toBe(true);
  });

  it("shows a calm message when the server fails in the middle of a chat", async () => {
    mock.status = 500;
    const session = createChatSession({ provider: "custom", model: "m", baseUrl: mock.url });
    const events: ChatEvent[] = [];
    await session.send("Hallo", (e) => events.push(e));
    expect(events).toContainEqual({ type: "error", message: expect.stringMatching(/nicht geklappt/) });
    expect(events.at(-1)).toEqual({ type: "done" });
  });
});

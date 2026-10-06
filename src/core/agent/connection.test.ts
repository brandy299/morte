import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createModels } from "@earendil-works/pi-ai";
import { opencodeGoProvider } from "@earendil-works/pi-ai/providers/opencode-go";
import { createChatSession, type ChatEvent } from "./index.ts";

type Step = "ok" | "cut" | "hang" | number;
const chunk = (content: string, finish?: string) =>
  `data: ${JSON.stringify({ id: "1", object: "chat.completion.chunk", choices: [{ index: 0, delta: content ? { role: "assistant", content } : {}, ...(finish ? { finish_reason: finish } : {}) }], ...(finish ? { usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 } } : {}) })}\n\n`;

/** A model server that behaves as scripted: one step per request, the last step repeats. */
async function fakeModel(steps: Step[]) {
  const seen: string[] = [];
  const headers: Record<string, string | string[] | undefined>[] = [];
  let n = 0;
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      seen.push(body);
      headers.push(req.headers);
      const step = steps[Math.min(n++, steps.length - 1)]!;
      if (typeof step === "number") {
        res.writeHead(step, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: step === 401 ? "Incorrect API key provided" : "failure" } }));
      }
      if (step === "hang") return;
      res.writeHead(200, { "content-type": "text/event-stream" });
      if (step === "cut") {
        res.write(chunk("Hallo, ich fan"));
        return setTimeout(() => res.socket?.destroy(), 50);
      }
      res.write(chunk("Hallo, es klappt."));
      res.write(chunk("", "stop"));
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  servers.push(server);
  const port = (server.address() as AddressInfo).port;
  return { url: `http://127.0.0.1:${port}/v1`, seen, headers, requests: () => n };
}
const servers: Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) {
    s.closeAllConnections();
    s.close();
  }
});

const session = (url: string, extra: Parameters<typeof createChatSession>[1] = {}) =>
  createChatSession({ provider: "custom", baseUrl: url, model: "m", apiKey: "k" }, { sleep: async () => {}, ...extra });
const textOf = (events: ChatEvent[]) => events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");

describe("connection problems", () => {
  it("tries again by itself after short failures and says so", async () => {
    const m = await fakeModel([503, 429, "ok"]);
    const events: ChatEvent[] = [];
    await session(m.url).send("Hallo", (e) => events.push(e));
    const retries = events.filter((e) => e.type === "retry");
    expect(retries).toHaveLength(2);
    expect(retries[0]).toMatchObject({ attempt: 1, max: 3 });
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(textOf(events)).toBe("Hallo, es klappt.");
    expect(events.at(-1)?.type).toBe("done");
  });

  it("takes back the text of a cut answer and asks the question only once", async () => {
    const m = await fakeModel(["cut", "ok"]);
    const events: ChatEvent[] = [];
    const s = session(m.url);
    await s.send("Hallo", (e) => events.push(e));
    const retry = events.find((e) => e.type === "retry");
    expect(retry).toMatchObject({ attempt: 1, dropText: "Hallo, ich fan".length });
    expect(events.some((e) => e.type === "error")).toBe(false);
    // The failed half answer is not in the conversation, the question is there once.
    const messages = s.history().messages as { role: string; content: unknown }[];
    expect(messages.filter((x) => x.role === "user")).toHaveLength(1);
    expect(JSON.stringify(messages)).not.toContain("ich fan");
  });

  it("does not retry a wrong key, and offers no retry button for it", async () => {
    const m = await fakeModel([401]);
    const events: ChatEvent[] = [];
    await session(m.url).send("Hallo", (e) => events.push(e));
    expect(events.some((e) => e.type === "retry")).toBe(false);
    expect(events.find((e) => e.type === "error")).toMatchObject({ retryable: false, message: expect.stringContaining("Zugangsschlüssel") });
    expect(m.requests()).toBe(1);
  });

  it("gives up after three automatic tries, then 'retry' continues without a second question", async () => {
    const m = await fakeModel([503, 503, 503, 503, "ok"]);
    const s = session(m.url);
    const first: ChatEvent[] = [];
    await s.send("Hallo", (e) => first.push(e));
    expect(first.filter((e) => e.type === "retry")).toHaveLength(3);
    expect(first.find((e) => e.type === "error")).toMatchObject({ retryable: true, message: expect.stringContaining("mehrmals") });
    expect(m.requests()).toBe(4);
    expect(s.canRetry()).toBe(true);

    const second: ChatEvent[] = [];
    await s.retry((e) => second.push(e));
    expect(textOf(second)).toBe("Hallo, es klappt.");
    expect(second.some((e) => e.type === "error")).toBe(false);
    const users = (s.history().messages as { role: string }[]).filter((x) => x.role === "user");
    expect(users).toHaveLength(1);
    expect(s.canRetry()).toBe(false);
  });

  it("notices a connection that goes silent and tries again", async () => {
    const m = await fakeModel(["hang", "ok"]);
    const events: ChatEvent[] = [];
    await session(m.url, { stallSeconds: 0.3 }).send("Hallo", (e) => events.push(e));
    expect(events.find((e) => e.type === "retry")).toMatchObject({ attempt: 1 });
    expect(textOf(events)).toBe("Hallo, es klappt.");
  }, 15000);

  it("says plainly when the provider cannot be reached at all", async () => {
    const events: ChatEvent[] = [];
    await session("http://127.0.0.1:1/v1").send("Hallo", (e) => events.push(e));
    expect(events.filter((e) => e.type === "retry")).toHaveLength(3);
    const error = events.find((e) => e.type === "error");
    expect(error).toMatchObject({ retryable: true, message: expect.stringContaining("Internetverbindung") });
  });

  it("does not retry after the teacher pressed stop", async () => {
    const m = await fakeModel(["hang"]);
    const events: ChatEvent[] = [];
    const s = session(m.url, { stallSeconds: 60 });
    const run = s.send("Hallo", (e) => events.push(e));
    await new Promise((r) => setTimeout(r, 200));
    s.abort();
    await run;
    expect(events.some((e) => e.type === "retry" || e.type === "error")).toBe(false);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("sends OpenCode's routing header with every request (chat and summary alike)", async () => {
    const m = await fakeModel(["ok"]);
    const models = createModels();
    models.setProvider(opencodeGoProvider());
    const model = { ...models.getModel("opencode-go", "deepseek-v4.1-flash")!, baseUrl: m.url };
    const events: ChatEvent[] = [];
    await createChatSession({ provider: "opencode-go", apiKey: "k" }, { resolve: () => ({ models, model }) }).send("Hallo", (e) => events.push(e));
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(m.headers[0]!["x-opencode-session"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});

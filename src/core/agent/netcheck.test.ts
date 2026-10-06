import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { codeOf, diagnoseNetwork, explain } from "./netcheck.ts";
import { testConnection } from "./setup.ts";

const failing = (code: string) => (async () => { throw Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("x"), { code }) }); }) as unknown as typeof fetch;

describe("network diagnosis", () => {
  it("finds the error code behind 'fetch failed'", () => {
    expect(codeOf(Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }))).toBe("ENOTFOUND");
    expect(codeOf(new Error("plain"))).toBe("UNKNOWN");
  });

  it("explains certificate problems, blocked names and refused connections differently", async () => {
    expect((await diagnoseNetwork("https://openrouter.ai/api/v1", failing("UNABLE_TO_VERIFY_LEAF_SIGNATURE"))).text).toMatch(/Zertifikat/);
    expect((await diagnoseNetwork("https://openrouter.ai/api/v1", failing("ENOTFOUND"))).text).toMatch(/Name des Anbieters/);
    expect((await diagnoseNetwork("https://openrouter.ai/api/v1", failing("ECONNRESET"))).text).toMatch(/Sperre|Proxy/);
    expect(explain("SOMETHING_ELSE")).toMatch(/Internetverbindung/);
  });

  it("says the address is fine when it answers, whatever the status", async () => {
    const server = createServer((_req, res) => res.writeHead(401).end());
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    const result = await diagnoseNetwork(`http://127.0.0.1:${port}/v1`);
    server.close();
    expect(result).toMatchObject({ reachable: true, code: "HTTP 401" });
  });
});

describe("connection test details", () => {
  it("gives the hint from the network check and technical details without the key", async () => {
    const resolve = () => ({
      models: { completeSimple: async () => ({ stopReason: "error", errorMessage: "Connection error. sk-geheim", content: [] }) },
      model: { input: ["text"], baseUrl: "https://opencode.ai/zen/go/v1" },
    }) as never;
    const result = await testConnection({ provider: "opencode-go", apiKey: "sk-geheim" }, resolve, async () => ({ code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE", reachable: false, text: "Zertifikat-Hinweis" }));
    expect(result.hint).toBe("Zertifikat-Hinweis");
    expect(result.detail).toContain("UNABLE_TO_VERIFY_LEAF_SIGNATURE");
    expect(result.detail).toContain("https://opencode.ai");
    expect(result.detail).not.toContain("sk-geheim");
  });

  it("points to key and model when the provider is reachable but refuses", async () => {
    const resolve = () => ({
      models: { completeSimple: async () => ({ stopReason: "error", errorMessage: "weird", content: [] }) },
      model: { input: ["text"], baseUrl: "https://example.org/v1" },
    }) as never;
    const result = await testConnection({ provider: "x" }, resolve, async () => ({ code: "HTTP 400", reachable: true, text: "" }));
    expect(result.hint).toMatch(/Zugangsschlüssel und Modell/);
  });
});

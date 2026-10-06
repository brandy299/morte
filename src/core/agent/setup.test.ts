import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { listProviders, testConnection } from "./index.ts";

function fauxResolver(responses: ReturnType<typeof fauxAssistantMessage>[]) {
  const faux = fauxProvider();
  faux.setResponses(responses);
  const models = createModels();
  models.setProvider(faux.provider);
  return () => ({ models, model: faux.getModel() });
}

describe("listProviders", () => {
  it("lists recommended models first and flags vision", () => {
    const anthropic = listProviders().find((p) => p.id === "anthropic")!;
    expect(anthropic.models[0]!.id).toBe("claude-sonnet-5-5");
    expect(anthropic.models.some((m) => m.vision)).toBe(true);
  });

  it("offers every recommended model that exists in the catalog, for OpenRouter and OpenCode Go", () => {
    for (const id of ["openrouter", "opencode-go"]) {
      const provider = listProviders().find((p) => p.id === id)!;
      const recommended = provider.models.filter((m) => m.recommended);
      expect(recommended.length, id).toBeGreaterThanOrEqual(5);
      expect(provider.models.slice(0, recommended.length).every((m) => m.recommended), id).toBe(true);
    }
    const openrouter = listProviders().find((p) => p.id === "openrouter")!;
    expect(openrouter.models.some((m) => m.id.startsWith("z-ai/glm") && m.recommended)).toBe(true);
    expect(openrouter.models.some((m) => m.id.startsWith("qwen/") && m.recommended)).toBe(true);
  });
});

describe("testConnection", () => {
  it("passes when chat, tool call and image answer all work", async () => {
    const result = await testConnection(
      { provider: "x" },
      fauxResolver([
        fauxAssistantMessage([fauxText("Hallo")]),
        fauxAssistantMessage([fauxToolCall("datum_heute", {})], { stopReason: "toolUse" }),
        fauxAssistantMessage([fauxText("Rot")]),
      ]),
    );
    expect(result.checks.map((c) => c.state)).toEqual(["ok", "ok", "ok"]);
    expect(result.passed).toBe(true);
  });

  it("explains in plain words when the model cannot call tools", async () => {
    const result = await testConnection(
      { provider: "x" },
      fauxResolver([
        fauxAssistantMessage([fauxText("Hallo")]),
        fauxAssistantMessage([fauxText("Heute ist Montag")]),
        fauxAssistantMessage([fauxText("Rot")]),
      ]),
    );
    expect(result.passed).toBe(false);
    expect(result.hint).toContain("Dateiaufgaben");
  });

  it("reports a bad key without technical details", async () => {
    const result = await testConnection(
      { provider: "x" },
      fauxResolver([fauxAssistantMessage([], { stopReason: "error", errorMessage: "401 invalid api key" })]),
    );
    expect(result.passed).toBe(false);
    expect(result.hint).toContain("Zugangsschlüssel");
  });
});

import { describe, expect, it } from "vitest";
import { keyHint } from "./keyHint.ts";

describe("keyHint", () => {
  it("says nothing when the key fits the provider or is unknown", () => {
    expect(keyHint("openrouter", "sk-or-v1-abc")).toBeUndefined();
    expect(keyHint("anthropic", "sk-ant-api03-abc")).toBeUndefined();
    expect(keyHint("deepseek", "sk-1234")).toBeUndefined();
    expect(keyHint("openrouter", "")).toBeUndefined();
  });
  it("points to the right provider when the key belongs to another one", () => {
    expect(keyHint("anthropic", "sk-or-v1-abc")).toContain("OpenRouter");
    expect(keyHint("openrouter", "sk-ant-api03-abc")).toContain("Claude (Anthropic)");
  });
  it("ignores spaces around the key", () => {
    expect(keyHint("anthropic", "  sk-or-v1-abc ")).toContain("OpenRouter");
  });
});

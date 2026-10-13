import { describe, expect, it } from "vitest";
import type { ProviderOption } from "./api.ts";
import { memoryText, modelInfo, shortName } from "./modelInfo.ts";

const providers: ProviderOption[] = [
  { id: "openrouter", name: "OpenRouter (viele Modelle, ein Zugang)", models: [
    { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek: DeepSeek V4.1 Flash", vision: true, recommended: true, cost: { input: 0.3, output: 1.2 }, contextWindow: 1048576 },
    { id: "free/model", name: "Free Model", vision: false, recommended: false, cost: { input: 0, output: 0 } },
  ] },
];

describe("shortName", () => {
  it("drops the maker prefix of OpenRouter names and keeps other names", () => {
    expect(shortName("DeepSeek: DeepSeek V4.1 Flash")).toBe("DeepSeek V4.1 Flash");
    expect(shortName("Claude Sonnet 5.5")).toBe("Claude Sonnet 5.5");
  });
});

describe("memoryText", () => {
  it("uses millions for big memories and plain numbers for small ones", () => {
    expect(memoryText(1048576)).toBe("1,05 Mio. Tokens");
    expect(memoryText(128000)).toBe("128.000 Tokens");
  });
});

describe("modelInfo", () => {
  it("collects name, provider, price and memory from the catalog", () => {
    const i = modelInfo({ configured: true, provider: "openrouter", model: "deepseek/deepseek-v4.1-flash" }, providers)!;
    expect(i.name).toBe("DeepSeek V4.1 Flash");
    expect(i.provider).toContain("OpenRouter");
    expect(i.vision).toBe(true);
    expect(i.price).toBe("lesen 0,30 US-$, schreiben 1,20 US-$ je 1 Mio. Tokens");
    expect(i.memory).toBe("1,05 Mio. Tokens");
  });
  it("gives no price when the catalog says zero or nothing", () => {
    expect(modelInfo({ configured: true, provider: "openrouter", model: "free/model" }, providers)!.price).toBeUndefined();
  });
  it("falls back to the stored ids for an unknown or own model", () => {
    const i = modelInfo({ configured: true, provider: "eigener", model: "llama-70b" }, providers)!;
    expect(i.name).toBe("llama-70b");
    expect(i.price).toBeUndefined();
  });
  it("says Demo in demo mode and nothing before setup", () => {
    expect(modelInfo({ configured: true, provider: "demo" }, [])!.name).toBe("Demo ohne KI");
    expect(modelInfo({ configured: false }, providers)).toBeUndefined();
  });
});

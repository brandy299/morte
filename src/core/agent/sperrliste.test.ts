import { afterEach, describe, expect, it } from "vitest";
import { BLOCKED, checkChoice, listProviders, ModelNotAllowed, modelProblem } from "./index.ts";
import { createChatSession } from "./index.ts";

const model = { provider: "openrouter", id: "z-ai/glm-5.3-flash", input: ["text" as const, "image" as const] };
const settings = { provider: "openrouter", model: "z-ai/glm-5.3-flash", apiKey: "x" };

afterEach(() => {
  for (const k of Object.keys(BLOCKED)) delete BLOCKED[k];
});

describe("block list for models that did not work reliably enough", () => {
  it("starts empty: a model is only blocked after all skills are measured and the limit is set", () => {
    expect(BLOCKED).toEqual({});
    expect(modelProblem(model)).toBeUndefined();
  });

  it("names the reason in plain words and asks to choose another model", () => {
    const list = { "openrouter/z-ai/glm-5.3-flash": "Es speichert Bewertungsregeln nur selten" };
    expect(modelProblem(model, list)).toBe("Dieses Modell ist für Pult gesperrt: Es speichert Bewertungsregeln nur selten. Bitte wähle ein anderes.");
    expect(modelProblem({ ...model, id: "anderes" }, list)).toBeUndefined();
    expect(modelProblem({ ...model, provider: "custom" }, list)).toBeUndefined(); // the key is provider and model, a model of the same name elsewhere is not meant
  });

  it("the missing pictures come first, as before", () => {
    expect(modelProblem({ ...model, input: ["text" as const] }, { "openrouter/z-ai/glm-5.3-flash": "x" })).toMatch(/keine Bilder/);
  });

  it("a blocked model is not offered, cannot be chosen and is not run, and only measuring may run it", () => {
    BLOCKED["openrouter/z-ai/glm-5.3-flash"] = "Es speichert Bewertungsregeln nur selten";
    const ids = listProviders().flatMap((p) => p.models.map((m) => `${p.id}/${m.id}`));
    expect(ids).not.toContain("openrouter/z-ai/glm-5.3-flash");
    expect(ids).toContain("openrouter/deepseek/deepseek-v4.1-flash");
    expect(() => checkChoice(settings)).toThrow(ModelNotAllowed);
    expect(() => checkChoice(settings)).toThrow(/gesperrt.*Bewertungsregeln/);
    expect(() => createChatSession(settings)).toThrow(ModelNotAllowed);
    expect(() => createChatSession(settings, { measuring: true })).not.toThrow();
  });
});

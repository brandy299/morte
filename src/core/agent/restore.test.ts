import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { createChatSession } from "./index.ts";

const make = () => {
  const faux = fauxProvider({ models: [{ id: "m", input: ["text", "image"] }] });
  faux.setResponses(["Antwort 1", "Antwort 2", "Antwort 3"].map((t) => fauxAssistantMessage([fauxText(t)])));
  const models = createModels();
  models.setProvider(faux.provider);
  return createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) });
};

describe("history and restore", () => {
  it("continues an earlier conversation with its messages and usage", async () => {
    const first = make();
    await first.send("Frage 1", () => {});
    await first.send("Frage 2", () => {});
    const saved = JSON.parse(JSON.stringify(first.history())); // as if read back from disk
    expect(saved.messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);

    const second = make();
    second.restore(saved);
    expect(second.usage().outputTokens).toBe(first.usage().outputTokens);
    await second.send("Frage 3", () => {});
    expect(second.history().messages).toHaveLength(6);
    expect(second.usage().outputTokens).toBeGreaterThan(first.usage().outputTokens);
  });

  it("does not keep pictures, the model sees a note instead", async () => {
    const s = make();
    await s.send("Was ist das?", () => {}, [{ data: "AAAA", mimeType: "image/png" }]);
    const text = JSON.stringify(s.history().messages);
    expect(text).not.toContain("AAAA");
    expect(text).toContain("[Bild]");
  });
});

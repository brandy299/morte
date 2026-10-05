import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { createChatSession } from "./index.ts";
import { resolveModel } from "./models.ts";
import type { ChatEvent } from "./index.ts";

describe("chat session (demo model)", () => {
  it("streams text, reports the tool step, and finishes", async () => {
    const session = createChatSession({ provider: "demo" });
    const events: ChatEvent[] = [];
    await session.send("Hallo", (e) => events.push(e));

    const types = events.map((e) => e.type);
    expect(types).toContain("step_start");
    expect(types).toContain("step_end");
    expect(types.at(-1)).toBe("done");
    const start = events.find((e) => e.type === "step_start");
    expect(start).toMatchObject({ label: "Datum nachsehen" });
    const text = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
    expect(text).toContain("Demo-Modus");
  });

  it("can answer a second message", async () => {
    const session = createChatSession({ provider: "demo" });
    await session.send("Eins", () => {});
    const events: ChatEvent[] = [];
    await session.send("Zwei", (e) => events.push(e));
    expect(events.some((e) => e.type === "text")).toBe(true);
    expect(events.some((e) => e.type === "error")).toBe(false);
  });
});

describe("long conversations", () => {
  const small = (settings: Parameters<typeof resolveModel>[0]) => {
    const r = resolveModel(settings);
    return { ...r, model: { ...r.model, contextWindow: 300 } };
  };

  it("summarizes the older part once the context is nearly full, and says so", async () => {
    const summaries: string[] = [];
    const session = createChatSession({ provider: "demo" }, {
      resolve: small,
      summarize: async (t) => (summaries.push(t), "- 11a, Bruchrechnung"),
    });
    await session.send("Wir planen Bruchrechnung für die 11a, bitte ausführlich.", () => {});
    await session.send("Das Thema ist Brüche erweitern und kürzen.", () => {});
    const events: ChatEvent[] = [];
    await session.send("Und nun das Arbeitsblatt dazu.", (e) => events.push(e));

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toContain("Bruchrechnung");
    const start = events.find((e) => e.type === "step_start" && e.id === "compact");
    expect(start).toMatchObject({ label: "Fasse das bisherige Gespräch kurz zusammen" });
    expect(events.find((e) => e.type === "step_end" && e.id === "compact")).toMatchObject({ ok: true });
    expect(events.some((e) => e.type === "error")).toBe(false);
  });

  it("carries on with the full conversation when the summary fails", async () => {
    const session = createChatSession({ provider: "demo" }, {
      resolve: small,
      summarize: async () => {
        throw new Error("down");
      },
    });
    await session.send("Eins", () => {});
    await session.send("Zwei", () => {});
    const events: ChatEvent[] = [];
    await session.send("Drei", (e) => events.push(e));
    expect(events.find((e) => e.type === "step_end" && e.id === "compact")).toMatchObject({ ok: false });
    expect(events.some((e) => e.type === "text")).toBe(true);
    expect(events.some((e) => e.type === "error")).toBe(false);
  });
});

describe("provider says the conversation is too long", () => {
  it("shortens once and asks again without showing an error", async () => {
    const faux = fauxProvider({ tokensPerSecond: 0 });
    const models = createModels();
    models.setProvider(faux.provider);
    const model = faux.getModel();
    const ok = () => fauxAssistantMessage([fauxText("Fertig.")]);
    faux.setResponses([ok(), ok(), fauxAssistantMessage([], { stopReason: "error", errorMessage: "prompt is too long: 210000 tokens > 200000 maximum" }), ok()]);

    const summaries: string[] = [];
    const session = createChatSession({ provider: "demo" }, {
      resolve: () => ({ models, model }),
      summarize: async (t) => (summaries.push(t), "- Stichpunkt"),
    });
    await session.send("Eins", () => {});
    await session.send("Zwei", () => {});
    const events: ChatEvent[] = [];
    await session.send("Drei", (e) => events.push(e));

    expect(summaries).toHaveLength(1);
    expect(events.find((e) => e.type === "step_end" && e.id === "compact")).toMatchObject({ ok: true });
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("")).toContain("Fertig.");
  });
});

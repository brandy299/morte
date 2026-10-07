import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { createChatSession, type ChatEvent } from "./index.ts";

const args = {
  fragen: [
    {
      frage: "Wie lang soll die Stunde sein?",
      antworten: [
        { text: "45 Minuten", erklaerung: "Eine Einzelstunde." },
        { text: "90 Minuten", erklaerung: "Eine Doppelstunde." },
      ],
      empfohlen: 2,
      grund: "Für eine Bewerbung braucht ihr Zeit zum Schreiben.",
    },
  ],
};

function session(responses: ReturnType<typeof fauxAssistantMessage>[]) {
  const faux = fauxProvider({ tokensPerSecond: 1000 });
  const models = createModels();
  models.setProvider(faux.provider);
  faux.setResponses(responses);
  return createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) });
}

describe("questions from the assistant", () => {
  it("shows the questions, waits for the choices and hands them back to the model", async () => {
    const s = session([
      fauxAssistantMessage([fauxToolCall("fragen_stellen", args)], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Dann plane ich 90 Minuten.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Plane eine Stunde", (e) => {
      events.push(e);
      if (e.type === "fragen") expect(s.answerQuestions(e.id, [{ antwort: "90 Minuten" }])).toBe(true);
    });
    const asked = events.find((e) => e.type === "fragen");
    expect(asked).toMatchObject({ fragen: [{ empfohlen: 2 }] });
    expect(events.find((e) => e.type === "step_start")).toMatchObject({ label: "Stelle ein paar Fragen" });
    expect(events.find((e) => e.type === "fragen_beantwortet")).toMatchObject({ antworten: [{ antwort: "90 Minuten", empfohlen: true }] });
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(JSON.stringify(s.history().messages)).toContain("Antwort: 90 Minuten (deine Empfehlung)");
  });

  it("rejects choices that do not belong to the questions and keeps waiting", async () => {
    const s = session([
      fauxAssistantMessage([fauxToolCall("fragen_stellen", args)], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Ok.")]),
    ]);
    const results: boolean[] = [];
    await s.send("Plane", (e) => {
      if (e.type !== "fragen") return;
      results.push(s.answerQuestions(e.id, [{ antwort: "7 Minuten" }]));
      results.push(s.answerQuestions(e.id, [{ antwort: "45 Minuten" }]));
    });
    expect(results).toEqual([false, true]);
  });

  it("tells the model when the teacher skipped, and sends the model back a clear error for incomplete questions", async () => {
    const bad = { fragen: [{ ...args.fragen[0], grund: "" }] };
    const s = session([
      fauxAssistantMessage([fauxToolCall("fragen_stellen", bad)], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxToolCall("fragen_stellen", args)], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Gut.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Plane", (e) => {
      events.push(e);
      if (e.type === "fragen") s.answerQuestions(e.id, undefined);
    });
    // The first call never reached the screen, the second did.
    expect(events.filter((e) => e.type === "fragen")).toHaveLength(1);
    const history = JSON.stringify(s.history().messages);
    expect(history).toContain("grund");
    expect(history).toContain("nicht beantwortet");
  });

  it("stops waiting when the teacher presses stop", async () => {
    const s = session([fauxAssistantMessage([fauxToolCall("fragen_stellen", args)], { stopReason: "toolUse" }), fauxAssistantMessage([fauxText("x")])]);
    const run = s.send("Plane", (e) => {
      if (e.type === "fragen") setTimeout(() => s.abort(), 20);
    });
    await expect(run).resolves.toBeUndefined();
  });
});

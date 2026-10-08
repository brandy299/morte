import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { validationProblem, type LogEntry } from "./ablauf.ts";
import { createChatSession } from "./index.ts";

const frage = {
  frage: "Wie lang soll die Stunde sein?",
  antworten: [
    { text: "45 Minuten", erklaerung: "Eine Einzelstunde." },
    { text: "90 Minuten", erklaerung: "Eine Doppelstunde." },
  ],
  empfohlen: 2,
  grund: "Mehr Zeit zum Schreiben.",
};

const { frage: _, ...withoutQuestion } = frage;

function session(responses: ReturnType<typeof fauxAssistantMessage>[]) {
  const faux = fauxProvider({ tokensPerSecond: 1000 });
  const models = createModels();
  models.setProvider(faux.provider);
  faux.setResponses(responses);
  return createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) });
}

describe("log of a conversation", () => {
  it("records every model request, tool, wait for the teacher and the whole turn, without content", async () => {
    const s = session([
      // A call that does not fit the tool: the question text is missing, and the answers carry a secret word.
      fauxAssistantMessage([fauxToolCall("fragen_stellen", { fragen: [{ ...withoutQuestion, grund: "GEHEIMWORT" }] })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxToolCall("fragen_stellen", { fragen: [frage] })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Dann plane ich 90 Minuten.")]),
    ]);
    await s.send("Plane eine Stunde", (e) => {
      if (e.type === "fragen") setTimeout(() => s.answerQuestions(e.id, [{ antwort: "90 Minuten" }]), 30);
    });
    const { log } = s.history();
    expect(log.map((l) => l.kind)).toEqual(["request", "tool", "request", "teacher", "tool", "request", "turn"]);

    const requests = log.filter((l): l is Extract<LogEntry, { kind: "request" }> => l.kind === "request");
    for (const r of requests) {
      expect(r.output).toBeGreaterThan(0);
      expect(r.firstOutputMs).toBeGreaterThanOrEqual(0);
      expect(r.firstOutputMs).toBeLessThanOrEqual(r.ms);
    }
    expect(requests.map((r) => r.end)).toEqual(["toolUse", "toolUse", "stop"]);

    const tools = log.filter((l): l is Extract<LogEntry, { kind: "tool" }> => l.kind === "tool");
    expect(tools[0]).toMatchObject({ name: "fragen_stellen", ok: false, problem: expect.stringContaining("frage") });
    expect(tools[1]).toMatchObject({ name: "fragen_stellen", ok: true });
    const wait = log.find((l) => l.kind === "teacher")!;
    expect(wait.ms).toBeGreaterThanOrEqual(25);
    expect(tools[1]!.ms).toBeGreaterThanOrEqual(wait.ms); // the wait is part of the tool time
    const turn = log.at(-1) as Extract<LogEntry, { kind: "turn" }>;
    expect(turn.ms).toBeGreaterThanOrEqual(tools[1]!.ms);

    const text = JSON.stringify(log);
    expect(text).not.toContain("GEHEIMWORT");
    expect(text).not.toContain("Plane eine Stunde");
    expect(text).not.toContain("90 Minuten");
  });

  it("is kept when a conversation is reopened, and continues", async () => {
    const first = session([fauxAssistantMessage([fauxText("Antwort 1")])]);
    await first.send("Frage 1", () => {});
    const saved = JSON.parse(JSON.stringify(first.history())); // as if read back from disk
    const second = session([fauxAssistantMessage([fauxText("Antwort 2")])]);
    second.restore(saved);
    await second.send("Frage 2", () => {});
    expect(second.history().log.map((l) => l.kind)).toEqual(["request", "turn", "request", "turn"]);
    second.reset();
    expect(second.history().log).toEqual([]);
  });
});

describe("validationProblem", () => {
  it("keeps the wrong fields and drops the arguments that follow them", () => {
    const text = 'Validation failed for tool "arbeitsblatt_erstellen":\n  - titel: must have required properties titel\n  - aufgaben.0: must be object\n\nReceived arguments:\n{\n  "aufgaben": "geheim"\n}';
    expect(validationProblem(text)).toBe("titel: must have required properties titel; aufgaben.0: must be object");
  });

  it("keeps nothing of other errors, they may quote the teacher's content", () => {
    expect(validationProblem("Die Klasse 11a gibt es nicht.")).toBeUndefined();
  });
});

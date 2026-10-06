import { describe, expect, it } from "vitest";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { isTooLong, keepTokensFor, renderTranscript, splitForCompaction, withSummary } from "./compaction.ts";

const user = (text: string): AgentMessage => ({ role: "user", content: text, timestamp: 0 });
const assistant = (text: string): AgentMessage => ({ role: "assistant", content: [{ type: "text", text }] }) as unknown as AgentMessage;
const toolCall = (): AgentMessage => ({ role: "assistant", content: [{ type: "toolCall", id: "1", name: "klasse_lesen", arguments: { klasse: "11a" } }] }) as unknown as AgentMessage;
const toolResult = (text: string): AgentMessage => ({ role: "toolResult", toolCallId: "1", toolName: "klasse_lesen", content: [{ type: "text", text }] }) as unknown as AgentMessage;
const system = (): AgentMessage => ({ role: "system", content: "Du bist Pult." }) as unknown as AgentMessage;

describe("splitForCompaction", () => {
  const long = "x".repeat(4000); // about 1000 tokens

  it("keeps the newest turns that fit and cuts at a user message", () => {
    const messages = [system(), user(long), assistant(long), user(long), assistant(long), user("kurz"), assistant("ok")];
    const split = splitForCompaction(messages, 2200)!;
    expect(split.head).toHaveLength(1);
    expect(split.recent.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(split.old.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("never separates a tool call from its result", () => {
    const messages = [user(long), toolCall(), toolResult(long), assistant(long), user("weiter"), assistant("ok")];
    const split = splitForCompaction(messages, 10)!;
    expect(split.old.map((m) => m.role)).toEqual(["user", "assistant", "toolResult", "assistant"]);
    expect(split.recent[0]!.role).toBe("user");
  });

  it("keeps at least the last turn even if it is larger than the budget", () => {
    const split = splitForCompaction([user("a"), assistant("b"), user(long), assistant(long)], 10)!;
    expect(split.recent).toHaveLength(2);
  });

  it("does nothing when there is only one turn", () => {
    expect(splitForCompaction([system(), user(long), assistant(long)], 10)).toBeUndefined();
  });

  it("does nothing when everything fits", () => {
    expect(splitForCompaction([user("a"), assistant("b"), user("c"), assistant("d")], 100_000)).toBeUndefined();
  });
});

describe("renderTranscript", () => {
  it("names speakers, marks pictures and shortens long tool output", () => {
    const img = { role: "user", content: [{ type: "image", data: "AAAA", mimeType: "image/png" }, { type: "text", text: "Was ist das?" }], timestamp: 0 } as unknown as AgentMessage;
    const text = renderTranscript([img, toolCall(), toolResult("y".repeat(5000))]);
    expect(text).toContain("Lehrkraft: [Bild]");
    expect(text).toContain("Lehrkraft: Was ist das?");
    expect(text).toContain("Assistent nutzt Werkzeug klasse_lesen");
    expect(text.length).toBeLessThan(900);
    expect(text).not.toContain("AAAA");
  });
});

describe("withSummary", () => {
  it("puts the summary into the first kept user message", () => {
    const out = withSummary([user("Frage"), assistant("Antwort")], "- 11a, Mathe");
    expect(out).toHaveLength(2);
    const first = out[0] as { content: { text: string }[] };
    expect(first.content[0]!.text).toContain("- 11a, Mathe");
    expect(first.content[1]!.text).toBe("Frage");
  });
});

describe("limits", () => {
  it("scales the kept part with small context windows", () => {
    expect(keepTokensFor(200_000)).toBe(15_000);
    expect(keepTokensFor(32_000)).toBe(6_400);
  });
  it("recognizes 'too long' errors of the big providers", () => {
    expect(isTooLong("prompt is too long: 210000 tokens > 200000 maximum")).toBe(true);
    expect(isTooLong("This model's maximum context length is 128000 tokens")).toBe(true);
    expect(isTooLong("Your input exceeds the context window of this model")).toBe(true);
    expect(isTooLong("401 unauthorized")).toBe(false);
  });
});

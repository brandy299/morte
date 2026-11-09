import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { createChatSession, type ChatEvent } from "./index.ts";
import { stilMerken } from "./stilwahl.ts";

const args = (art = "erklaerstueck", ids = ["editorial-serif", "neo-brutalism", "tokyo-night"]) => ({
  art,
  stile: ids.map((id) => ({ id, grund: `Der Stil ${id} passt gut zu diesem Thema.` })),
  empfohlen: 1,
});

function session(responses: ReturnType<typeof fauxAssistantMessage>[]) {
  const faux = fauxProvider({ tokensPerSecond: 1000 });
  const models = createModels();
  models.setProvider(faux.provider);
  faux.setResponses(responses);
  return createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) });
}

describe("choosing a look from three pictures", () => {
  it("shows three looks as pictures, with the recommended one marked, and hands the pick back as an id", async () => {
    const s = session([
      fauxAssistantMessage([fauxToolCall("stil_waehlen", args())], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Dann nehme ich Nacht.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Mach ein Erklärstück", (e) => {
      events.push(e);
      if (e.type === "fragen") expect(s.answerQuestions(e.id, [{ antwort: "Nacht" }])).toBe(true);
    });
    const asked = events.find((e) => e.type === "fragen") as Extract<ChatEvent, { type: "fragen" }>;
    expect(asked.fragen).toHaveLength(1);
    const f = asked.fragen[0]!;
    expect(f.antworten.map((a) => a.text)).toEqual(["Editorial", "Neo-Brutalismus", "Nacht"]);
    expect(f.empfohlen).toBe(1);
    for (const a of f.antworten) {
      expect(a.bild, a.text).toMatch(/^<svg [^>]*viewBox="0 0 1280 720"/);
      expect(a.bild).not.toMatch(/<script|onload|url\(|@import/i); // drawn by Pult itself: no code, nothing loaded
    }
    expect(events.find((e) => e.type === "step_start")).toMatchObject({ label: "Stile zeigen" });
    expect(JSON.stringify(s.history().messages)).toContain("Gewählter Stil: tokyo-night");
  });

  it("shows sample slides for a presentation", async () => {
    const s = session([fauxAssistantMessage([fauxToolCall("stil_waehlen", args("praesentation"))], { stopReason: "toolUse" }), fauxAssistantMessage([fauxText("Ok.")])]);
    const events: ChatEvent[] = [];
    await s.send("Mach Folien", (e) => {
      events.push(e);
      if (e.type === "fragen") s.answerQuestions(e.id, [{ antwort: "Editorial" }]);
    });
    const asked = events.find((e) => e.type === "fragen") as Extract<ChatEvent, { type: "fragen" }>;
    expect(asked.fragen[0]!.frage).toContain("Präsentation");
    expect(asked.fragen[0]!.antworten[0]!.bild).toMatch(/viewBox="0 0 960 540"[\s\S]*Titel der Folie/);
  });

  it("takes the teacher's own wish in words and tells the model to find the nearest look", async () => {
    const s = session([fauxAssistantMessage([fauxToolCall("stil_waehlen", args())], { stopReason: "toolUse" }), fauxAssistantMessage([fauxText("Ok.")])]);
    await s.send("x", (e) => {
      if (e.type === "fragen") s.answerQuestions(e.id, [{ antwort: "etwas mit Comic", eigene: true }]);
    });
    expect(JSON.stringify(s.history().messages)).toContain("nächstpassenden");
  });

  it("refuses an unknown id, two equal looks and a missing reason, so the model corrects the call", async () => {
    const s = session([
      fauxAssistantMessage([fauxToolCall("stil_waehlen", args("erklaerstueck", ["editorial-serif", "gibtesnicht", "tokyo-night"]))], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxToolCall("stil_waehlen", args("erklaerstueck", ["editorial-serif", "editorial-serif", "tokyo-night"]))], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Ok.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("x", (e) => events.push(e));
    expect(events.some((e) => e.type === "fragen")).toBe(false);
    const history = JSON.stringify(s.history().messages);
    expect(history).toContain("does not exist");
    expect(history).toContain("must be different");
  });
});

describe("remembering the picked look", () => {
  it("fills in stil when a retry leaves it out, and never overrides one that is given", async () => {
    const seen: any[] = [];
    const fake = (name: string) => ({ name, execute: async (_id: string, p: any) => void seen.push(p) });
    const gewaehlt = new Map<string, string>([["erklaerstueck_erstellen", "swiss-grid"]]);
    const [e, pr, other] = stilMerken([fake("erklaerstueck_erstellen"), fake("praesentation_erstellen"), fake("arbeitsblatt_erstellen")], gewaehlt);
    await e!.execute("1", { thema: "a" });
    await e!.execute("2", { thema: "b", stil: "nord" });
    await pr!.execute("3", { thema: "c" });
    await other!.execute("4", { thema: "d" });
    expect(seen).toEqual([{ thema: "a", stil: "swiss-grid" }, { thema: "b", stil: "nord" }, { thema: "c" }, { thema: "d" }]);
  });
});

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { beforeAll, describe, expect, it } from "vitest";
import { createChatSession } from "./index.ts";
import type { ChatEvent } from "./index.ts";

const blatt = { titel: "Brüche", aufgaben: [{ text: "Kürze 4/8.", loesung: "1/2" }] };

function make(responses: ReturnType<typeof fauxAssistantMessage>[]) {
  const faux = fauxProvider({ tokensPerSecond: 0 });
  const models = createModels();
  models.setProvider(faux.provider);
  faux.setResponses(responses);
  return { faux, session: createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) }) };
}
const made = () => [
  fauxAssistantMessage([fauxToolCall("arbeitsblatt_erstellen", blatt)], { stopReason: "toolUse" }),
  fauxAssistantMessage([fauxText("Das Blatt ist fertig.")]),
];

describe("Material prüfen", () => {
  beforeAll(async () => {
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-pruefen-"));
  });

  it("looks at new material once more when switched on", async () => {
    const { faux, session } = make([...made(), fauxAssistantMessage([fauxText("Geprüft: alles stimmig.")])]);
    const events: ChatEvent[] = [];
    await session.send("Mach ein Blatt.", (e) => events.push(e), [], { pruefen: true });
    expect(faux.state.callCount).toBe(3);
    expect(events.find((e) => e.type === "step_start" && e.id === "pruefen")).toBeTruthy();
    expect(events.find((e) => e.type === "step_end" && e.id === "pruefen")).toMatchObject({ ok: true });
    expect(events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("")).toContain("Geprüft:");
  });

  it("does not check when switched off", async () => {
    const { faux, session } = make(made());
    await session.send("Mach ein Blatt.", () => {}, [], { pruefen: false });
    expect(faux.state.callCount).toBe(2);
  });

  it("does not check when nothing was made", async () => {
    const { faux, session } = make([fauxAssistantMessage([fauxText("Hallo.")])]);
    await session.send("Hallo", () => {}, [], { pruefen: true });
    expect(faux.state.callCount).toBe(1);
  });
});

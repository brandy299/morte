import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@earendil-works/pi-ai";
import { beforeEach, describe, expect, it } from "vitest";
import { createChatSession } from "../core/agent/index.ts";
import { createApp, type AppState } from "./index.ts";

let app: ReturnType<typeof createApp>;
let state: AppState;
const json = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const ask = async (text: string, dateien: { name: string; text: string }[] = []) => (await app.request("/api/chat", json({ text, dateien }))).text();

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-gedaechtnis-"));
  state = { secrets: { kind: "file", get: async () => undefined, set: async () => {}, delete: async () => {} }, session: undefined, configured: undefined };
  app = createApp(state);
  // A model with a memory of 20,000 tokens, so that a file of 30,000 characters fills more than half.
  const faux = fauxProvider({ models: [{ id: "m", input: ["text", "image"], contextWindow: 20_000 }], tokensPerSecond: 0 });
  faux.setResponses(Array.from({ length: 6 }, () => fauxAssistantMessage([fauxText("Antwort.")])));
  const models = createModels();
  models.setProvider(faux.provider);
  state.session = createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) });
});

describe("memory of the model and what the teacher sees", () => {
  it("shows the attachment as before while the model only keeps a note", async () => {
    const content = "Aufgabe: Nenne drei Flüsse. ".repeat(1100); // about 30,000 characters
    await ask("Mach daraus ein Blatt.", [{ name: "arbeitsblatt.docx", text: content }]);
    await ask("Mach Aufgabe 3 leichter.");
    await ask("Und noch eine Frage.");

    // Screen: the first message is complete, with the name of the file.
    const shown = state.conversation!.anzeige;
    expect(shown[0]).toMatchObject({ role: "user", text: "Mach daraus ein Blatt.", dateien: ["arbeitsblatt.docx"] });
    expect(shown.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant", "user", "assistant"]);

    // Memory of the model: the text of the file is gone, a note stands in its place.
    const memory = JSON.stringify(state.session!.history().messages);
    expect(memory).toContain("[Anhang: arbeitsblatt.docx, nicht mehr im Gedächtnis]");
    expect(memory).not.toContain("Nenne drei Flüsse");
    expect(memory).toContain("Mach daraus ein Blatt."); // the question itself stays

    // The export of the conversation shows the file name as well.
    const saved = await (await app.request(`/api/history/${state.conversation!.id}/export`)).text();
    expect(saved).toContain("arbeitsblatt.docx");
  });

  it("turns down a message that is far too big, with a plain answer on the screen", async () => {
    const body = await ask("Fass das zusammen.", [{ name: "buch.txt", text: "x".repeat(79_000) }]);
    expect(body).toContain("zu viel auf einmal");
    expect(body).not.toMatch(/"type":"text"/);
  });
});

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp, type AppState } from "./index.ts";

let app: ReturnType<typeof createApp>;
let state: AppState;
const json = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "morte-server-"));
  state = { secrets: { kind: "file", get: async () => undefined, set: async () => {}, delete: async () => {} }, session: undefined, configured: undefined };
  app = createApp(state);
  await app.request("/api/setup/demo", { method: "POST" }); // offline demo model
});

const ask = async (text: string) => (await app.request("/api/chat", json({ text }))).text();

describe("conversation history", () => {
  it("saves a conversation after the answer and lists it", async () => {
    await ask("Hallo zusammen");
    const { gespraeche, aktuell } = await (await app.request("/api/history")).json();
    expect(gespraeche).toHaveLength(1);
    expect(gespraeche[0].titel).toBe("Hallo zusammen");
    expect(aktuell).toBe(gespraeche[0].id);
  });

  it("keeps several questions in one conversation and starts a new one after reset", async () => {
    await ask("Eins");
    await ask("Zwei");
    expect((await (await app.request("/api/history")).json()).gespraeche).toHaveLength(1);
    await app.request("/api/chat/reset", { method: "POST" });
    await ask("Drei");
    expect((await (await app.request("/api/history")).json()).gespraeche.map((g: { titel: string }) => g.titel).sort()).toEqual(["Drei", "Eins"]);
  });

  it("reopens an earlier conversation with its messages, steps and usage", async () => {
    await ask("Erste Frage");
    const id = (await (await app.request("/api/history")).json()).aktuell;
    await app.request("/api/chat/reset", { method: "POST" });
    await ask("Andere Frage");
    const res = await app.request("/api/history/open", json({ id }));
    const { anzeige, usage } = await res.json();
    expect(anzeige.map((m: { role: string }) => m.role)).toEqual(["user", "assistant"]);
    expect(anzeige[0].text).toBe("Erste Frage");
    expect(anzeige[1].steps[0].label).toBe("Datum nachsehen");
    expect(anzeige[1].text).toContain("Demo-Modus");
    expect(usage.contextTokens).toBeGreaterThan(0);
    // Asking on goes on in the same conversation.
    await ask("Weiter");
    const saved = await (await app.request("/api/history")).json();
    expect(saved.gespraeche).toHaveLength(2);
    expect(state.conversation!.anzeige).toHaveLength(4);
  });

  it("saves the log with the conversation, keeps when it began and puts it into the export", async () => {
    await ask("Erste Frage");
    const id = state.conversation!.id;
    const begun = state.conversation!.erstellt;
    await new Promise((r) => setTimeout(r, 15));
    await ask("Zweite Frage");
    const md = await (await app.request(`/api/history/${id}/export`)).text();
    expect(md).toContain(`- Begonnen: ${begun}, zuletzt: `);
    expect(md).not.toContain(`zuletzt: ${begun}`);
    expect(md).toContain("## Ablauf");
    expect(md.match(/\*\*Nachricht der Lehrkraft, bis zur fertigen Antwort\*\*/g)).toHaveLength(2);
    // Reopened, the log goes on.
    await app.request("/api/chat/reset", { method: "POST" });
    await app.request("/api/history/open", json({ id }));
    await ask("Dritte Frage");
    const again = await (await app.request(`/api/history/${id}/export`)).text();
    expect(again.match(/\*\*Nachricht der Lehrkraft, bis zur fertigen Antwort\*\*/g)).toHaveLength(3);
  });

  it("answers plainly for a conversation that is gone, and deletes", async () => {
    const gone = await app.request("/api/history/open", json({ id: "00000000-0000-0000-0000-000000000000" }));
    expect(gone.status).toBe(404);
    await ask("Weg damit");
    const id = (await (await app.request("/api/history")).json()).aktuell;
    await app.request(`/api/history/${id}`, { method: "DELETE" });
    expect((await (await app.request("/api/history")).json()).gespraeche).toHaveLength(0);
  });

  it("does not bring a conversation back by deleting it while its answer is still being written", async () => {
    const running = app.request("/api/chat", json({ text: "Lange Frage" }));
    await new Promise((r) => setTimeout(r, 30));
    const id = state.conversation!.id;
    const res = await app.request(`/api/history/${id}`, { method: "DELETE" });
    expect(res.status).toBe(409);
    await (await running).text();
    expect((await (await app.request("/api/history")).json()).gespraeche).toHaveLength(1);
    expect((await app.request(`/api/history/${id}`, { method: "DELETE" })).status).toBe(200);
    expect((await (await app.request("/api/history")).json()).gespraeche).toHaveLength(0);
  });
});

describe("feedback on material (server)", () => {
  it("saves it, returns it when the conversation is opened again, and exports without the sentence unless asked", async () => {
    await ask("Hallo");
    const id = (await (await app.request("/api/history")).json()).aktuell;
    const { saveConversation, loadConversation } = await import("../core/history/index.ts");
    const saved = (await loadConversation(id))!;
    const pfad = "Exporte/2026-10-14_Arbeitsblatt-X.pdf";
    await saveConversation({ ...saved, anzeige: [...saved.anzeige, { role: "assistant", text: "Fertig", steps: [], materials: [{ title: "X", name: "x.pdf", path: pfad }] }] });
    const res = await app.request(`/api/history/${id}/rueckmeldung`, json({ pfad, wertung: "passt-nicht", satz: "Zu lang." }));
    expect(res.status).toBe(200);
    expect((await app.request(`/api/history/${id}/rueckmeldung`, json({ pfad: "nein.pdf", wertung: "passt" }))).status).toBe(400);
    expect((await app.request(`/api/history/${id}/rueckmeldung`, { method: "POST", body: "kein json" })).status).toBe(400);
    const opened = await (await app.request("/api/history/open", json({ id }))).json();
    expect(opened.rueckmeldungen).toMatchObject([{ pfad, wertung: "passt-nicht", satz: "Zu lang." }]);
    const plain = await (await app.request("/api/rueckmeldungen/export")).text();
    expect(plain).not.toContain("Zu lang");
    expect(plain).toContain('"material": "Arbeitsblatt"');
    expect(await (await app.request("/api/rueckmeldungen/export?mitSatz=1")).text()).toContain("Zu lang");
    expect((await app.request("/api/rueckmeldungen/export")).headers.get("content-disposition")).toMatch(/^attachment; filename="pult-rueckmeldungen-\d{4}-\d\d-\d\d\.json"$/);
  });
});

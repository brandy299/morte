import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { applyEvent, deleteConversation, listConversations, loadConversation, newConversationId, projektName, saveConversation, setzeProjekt, settle, titleFrom, type StoredMessage } from "./index.ts";

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-history-"));
});

describe("transcript", () => {
  it("builds the answer from chat events and marks cut-off steps as failed", () => {
    let m: StoredMessage = { role: "assistant", text: "", steps: [] };
    for (const e of [
      { type: "step_start", id: "a", label: "Klassen ansehen" },
      { type: "step_end", id: "a", ok: true },
      { type: "step_start", id: "b", label: "Stand festhalten" },
      { type: "text", delta: "Hal" },
      { type: "text", delta: "lo" },
      { type: "material", title: "Blatt", name: "b.pdf", path: "Exporte/b.pdf" },
      { type: "thinking", active: true },
    ] as const) m = applyEvent(m, e);
    expect(m.text).toBe("Hallo");
    expect(m.materials).toHaveLength(1);
    expect(settle(m).steps.map((s) => s.state)).toEqual(["done", "failed"]);
  });
});

describe("transcript after a failed try", () => {
  it("withdraws the text of a failed try and keeps the error until the next try", () => {
    let m: StoredMessage = { role: "assistant", text: "", steps: [] };
    m = applyEvent(m, { type: "text", delta: "Gut: " });
    m = applyEvent(m, { type: "text", delta: "halbe Antwort" });
    m = applyEvent(m, { type: "error", message: "Verbindung weg", retryable: true, dropText: "halbe Antwort".length });
    expect(m).toMatchObject({ text: "Gut: ", error: "Verbindung weg", retryable: true });
    m = applyEvent(m, { type: "retry", attempt: 0, max: 3, seconds: 0, message: "", dropText: 0 });
    expect(m.error).toBeUndefined();
    expect(m.retryable).toBeUndefined();
  });
});

describe("store", () => {
  it("saves, lists newest first, loads and deletes", async () => {
    const a = newConversationId();
    const b = newConversationId();
    await saveConversation({ id: a, titel: "Erstes", anzeige: [], modell: [] });
    await new Promise((r) => setTimeout(r, 5));
    await saveConversation({ id: b, titel: "Zweites", anzeige: [], modell: [{ role: "user" }] });
    expect((await listConversations()).map((c) => c.titel)).toEqual(["Zweites", "Erstes"]);
    const first = await loadConversation(a);
    await saveConversation({ id: a, titel: "Erstes", anzeige: [], modell: [] });
    expect((await loadConversation(a))!.erstellt).toBe(first!.erstellt); // creation date stays
    await deleteConversation(a);
    expect(await loadConversation(a)).toBeUndefined();
    expect(await listConversations()).toHaveLength(1);
  });

  it("lists from small files and repairs a missing one", async () => {
    const id = newConversationId();
    await saveConversation({ id, titel: "Mit Liste", anzeige: [], modell: [{ role: "user", content: "x".repeat(1000) }] });
    const { rm } = await import("node:fs/promises");
    await rm(join(process.env.PULT_HOME!, "Gespräche", `${id}.meta.json`));
    expect((await listConversations()).map((c) => c.titel)).toEqual(["Mit Liste"]);
    const { readdir } = await import("node:fs/promises");
    expect(await readdir(join(process.env.PULT_HOME!, "Gespräche"))).toContain(`${id}.meta.json`);
    await deleteConversation(id);
    expect(await readdir(join(process.env.PULT_HOME!, "Gespräche"))).toEqual([]);
  });

  it("refuses ids that are not generated ones", async () => {
    expect(await loadConversation("../../Einstellungen/Provider")).toBeUndefined();
    await expect(saveConversation({ id: "../x", titel: "x", anzeige: [], modell: [] })).rejects.toThrow();
    await expect(deleteConversation("../x")).rejects.toThrow();
  });

  it("makes short one-line titles", () => {
    expect(titleFrom("  Wo stehen\nwir in 11a?  ")).toBe("Wo stehen wir in 11a?");
    expect(titleFrom("x".repeat(100))).toHaveLength(58);
  });
});

describe("project folders", () => {
  const base = (id: string, titel: string) => ({ id, titel, anzeige: [], modell: [] as unknown[] });

  it("cleans the name and refuses an empty or too long one", () => {
    expect(projektName("  Klasse   11a \n Mathe ")).toBe("Klasse 11a Mathe");
    expect(() => projektName("   ")).toThrow(/fehlt/);
    expect(() => projektName(null)).toThrow(/fehlt/);
    expect(() => projektName("x".repeat(41))).toThrow(/zu lang/);
    expect(projektName("x".repeat(40))).toHaveLength(40);
  });

  it("puts a conversation in a folder, lists it there and keeps the time of the last change", async () => {
    const id = newConversationId();
    await saveConversation(base(id, "Prozentrechnung"));
    const before = (await listConversations())[0]!;
    expect(before.projekt).toBeUndefined();
    expect(await setzeProjekt(id, "Mathe 8b")).toBe(true);
    const after = (await listConversations())[0]!;
    expect(after.projekt).toBe("Mathe 8b");
    expect(after.aktualisiert).toBe(before.aktualisiert);
  });

  it("keeps the folder when the running conversation is saved again", async () => {
    const id = newConversationId();
    await saveConversation(base(id, "Dreisatz"));
    await setzeProjekt(id, "Mathe 8b");
    await saveConversation(base(id, "Dreisatz"));
    expect((await loadConversation(id))?.projekt).toBe("Mathe 8b");
    expect((await listConversations())[0]!.projekt).toBe("Mathe 8b");
  });

  it("takes a conversation out of the folder again", async () => {
    const id = newConversationId();
    await saveConversation(base(id, "Dreisatz"));
    await setzeProjekt(id, "Mathe 8b");
    await setzeProjekt(id, undefined);
    expect((await loadConversation(id))?.projekt).toBeUndefined();
    expect((await listConversations())[0]!.projekt).toBeUndefined();
  });

  it("says no for a conversation that does not exist", async () => {
    expect(await setzeProjekt(newConversationId(), "x")).toBe(false);
    expect(await setzeProjekt("../etc/passwd", "x")).toBe(false);
  });
});

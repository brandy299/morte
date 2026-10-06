import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { applyEvent, deleteConversation, listConversations, loadConversation, newConversationId, saveConversation, settle, titleFrom, type StoredMessage } from "./index.ts";

beforeEach(async () => {
  process.env.MORTE_HOME = await mkdtemp(join(tmpdir(), "morte-history-"));
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
    await rm(join(process.env.MORTE_HOME!, "Gespräche", `${id}.meta.json`));
    expect((await listConversations()).map((c) => c.titel)).toEqual(["Mit Liste"]);
    const { readdir } = await import("node:fs/promises");
    expect(await readdir(join(process.env.MORTE_HOME!, "Gespräche"))).toContain(`${id}.meta.json`);
    await deleteConversation(id);
    expect(await readdir(join(process.env.MORTE_HOME!, "Gespräche"))).toEqual([]);
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

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { saveVorlage } from "../core/skills/personal.ts";
import { createApp } from "./index.ts";

let app: ReturnType<typeof createApp>;
beforeEach(async () => {
  process.env.MORTE_HOME = await mkdtemp(join(tmpdir(), "morte-vorlagen-"));
  delete process.env.MORTE_SKILLS;
  app = createApp({ secrets: { kind: "file", get: async () => undefined, set: async () => {}, delete: async () => {} }, session: undefined, configured: undefined });
});

describe("templates", () => {
  it("lists bundled and own templates and deletes only the own ones", async () => {
    await saveVorlage(
      {
        titel: "Vokabeltest",
        beschreibung: "Erstellt einen kurzen Vokabeltest mit Lösungen. Nutze es bei „Vokabeltest“. Nicht für Klausuren.",
        anleitung: "1. Frag nach der Unit.\n2. Schreibe zehn Aufgaben von leicht nach schwer.\n3. Erstelle den Test mit `arbeitsblatt_erstellen` und gib die Lösungen an.\n4. Sag in einem Satz, was fertig ist. Der Test passt auf eine Seite und hat keine Namen von Lernenden.",
      },
      ["arbeitsblatt_erstellen"],
    );
    const { vorlagen } = await (await app.request("/api/vorlagen")).json();
    expect(vorlagen.find((v: { name: string }) => v.name === "vokabeltest")).toMatchObject({ eigene: true });
    expect(vorlagen.find((v: { name: string }) => v.name === "arbeitsblatt")).toMatchObject({ eigene: false });

    expect((await app.request("/api/vorlagen/arbeitsblatt", { method: "DELETE" })).status).toBe(400);
    expect((await app.request("/api/vorlagen/vokabeltest", { method: "DELETE" })).status).toBe(200);
    const after = await (await app.request("/api/vorlagen")).json();
    expect(after.vorlagen.some((v: { name: string }) => v.name === "vokabeltest")).toBe(false);
  });
});

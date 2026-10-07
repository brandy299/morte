import { describe, expect, it } from "vitest";
import { exportMarkdown } from "./export.ts";
import type { Conversation } from "./index.ts";

const conversation: Conversation = {
  id: "11111111-1111-1111-1111-111111111111",
  titel: "Arbeitsblatt BRD",
  erstellt: "2026-10-06T10:00:00.000Z",
  aktualisiert: "2026-10-06T10:05:00.000Z",
  anzeige: [],
  verbrauch: { inputTokens: 10 },
  modell: [
    { role: "user", content: "Mach ein Arbeitsblatt zum politischen System." },
    {
      role: "assistant",
      provider: "openrouter",
      model: "deepseek/deepseek-v4.1-flash",
      content: [
        { type: "thinking", text: "geheimes Nachdenken" },
        { type: "text", text: "Ich lege los." },
        { type: "toolCall", name: "arbeitsblatt_erstellen", arguments: { titel: "BRD", aufgaben: [{ text: "Nenne ```drei``` Organe." }] } },
      ],
    },
    { role: "toolResult", toolName: "skill_laden", content: [{ type: "text", text: "x".repeat(5000) }] },
    { role: "toolResult", toolName: "arbeitsblatt_erstellen", isError: true, content: [{ type: "text", text: "Es fehlt: die Aufgabe." }] },
    { role: "assistant", stopReason: "error", errorMessage: "503", content: [] },
  ],
};

describe("conversation export", () => {
  const md = exportMarkdown(conversation, { version: "0.1.0", now: new Date("2026-10-06T12:00:00Z") });

  it("tells who said what, with the tool calls and their answers", () => {
    expect(md).toContain("# Gespräch: Arbeitsblatt BRD");
    expect(md).toContain("- Modell: openrouter / deepseek/deepseek-v4.1-flash");
    expect(md).toContain("- Pult Version: 0.1.0");
    expect(md).toContain("## Lehrkraft\n\nMach ein Arbeitsblatt");
    expect(md).toContain("Ich lege los.");
    expect(md).toContain("**Werkzeug: `arbeitsblatt_erstellen`**");
    expect(md).toContain('"titel": "BRD"');
    expect(md).toContain("**Antwort des Werkzeugs `arbeitsblatt_erstellen` (Fehler)**");
    expect(md).toContain("## Pult (Fehler)");
    expect(md).toContain("Fehlermeldung: 503");
  });

  it("leaves out the model's private thinking and shortens long tool answers", () => {
    expect(md).not.toContain("geheimes Nachdenken");
    expect(md).toContain("gekürzt, 4700 Zeichen mehr");
  });

  it("fences code so that backticks in the content cannot break the layout", () => {
    const block = md.slice(md.indexOf("**Werkzeug:"));
    expect(block).toContain("````json");
  });
});

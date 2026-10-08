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

describe("log in the export", () => {
  const ablauf = [
    { kind: "tool", at: "2026-10-06T10:00:30.000Z", ms: 40000, name: "fragen_stellen", ok: true },
    { kind: "request", at: "2026-10-06T10:00:00.000Z", ms: 30000, firstOutputMs: 12000, input: 9000, output: 600, reasoning: 400, end: "toolUse" },
    { kind: "teacher", at: "2026-10-06T10:00:31.000Z", ms: 35000 },
    { kind: "tool", at: "2026-10-06T10:01:40.000Z", ms: 5, name: "arbeitsblatt_erstellen", ok: false, problem: "titel: must have required properties titel" },
    { kind: "request", at: "2026-10-06T10:01:10.000Z", ms: 90000, firstOutputMs: 2000, input: 10000, output: 2400, end: "length" },
    { kind: "retry", at: "2026-10-06T10:02:50.000Z", reason: "overloaded" },
    { kind: "turn", at: "2026-10-06T10:00:00.000Z", ms: 180000 },
  ];
  const md = exportMarkdown({ ...conversation, ablauf }, { version: "0.1.0" });
  const log = md.slice(md.indexOf("## Ablauf"));

  it("sums up where the time went", () => {
    expect(log).toContain("- Antworten insgesamt: 180,0 s");
    expect(log).toContain("- Modell: 120,0 s in 2 Anfragen, 3000 Tokens geschrieben, etwa 25 Tokens pro Sekunde");
    expect(log).toContain("- Werkzeuge: 5,0 s, davon 1 fehlgeschlagen"); // the teacher's 35 s are not tool time
    expect(log).toContain("- Warten auf die Lehrkraft: 35,0 s");
    expect(log).toContain("- Wiederholungen: 1, abgeschnittene Antworten: 1");
  });

  it("lists every step in the order it started", () => {
    const rows = log.split("\n").filter((l) => l.startsWith("| +"));
    expect(rows.map((r) => r.split(" | ")[1])).toEqual([
      "Modell",
      "**Nachricht der Lehrkraft, bis zur fertigen Antwort**",
      "Werkzeug `fragen_stellen`",
      "Warten auf die Lehrkraft",
      "Modell",
      "Werkzeug `arbeitsblatt_erstellen`",
      "Neuer Versuch (overloaded)",
    ]);
    expect(rows[0]).toBe("| +0:00 | Modell | 30,0 s | 12,0 s | 9000 | 600 (400) | toolUse |");
    expect(rows[5]).toContain("| +1:40 |");
    expect(rows[5]).toContain("Fehler: titel: must have required properties titel");
  });

  it("is left out for older conversations without a log", () => {
    expect(exportMarkdown(conversation, { version: "0.1.0" })).not.toContain("## Ablauf");
  });
});

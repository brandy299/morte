import { describe, expect, it } from "vitest";
import { fuegeDiktatEin, istGeraeusch, mikrofonFehler } from "./diktat.ts";

describe("dictation", () => {
  it("appends dictated text to what is already typed with one space", () => {
    expect(fuegeDiktatEin("", " Erstelle ein Arbeitsblatt. ")).toBe("Erstelle ein Arbeitsblatt.");
    expect(fuegeDiktatEin("Für die 11a:", "ein Quiz")).toBe("Für die 11a: ein Quiz");
    expect(fuegeDiktatEin("Für die 11a: ", "ein Quiz")).toBe("Für die 11a: ein Quiz");
    expect(fuegeDiktatEin("Zeile\n", "zwei")).toBe("Zeile\nzwei");
  });

  it("keeps the message as it was when nothing was recognised", () => {
    expect(fuegeDiktatEin("Hallo", "   ")).toBe("Hallo");
  });

  it("treats Whisper's silence markers as no speech", () => {
    for (const s of ["", "  ", "[Musik]", "(Stille)", "*Applaus*", "♪", "Untertitel der Amara.org-Community"]) expect(istGeraeusch(s), s).toBe(true);
    expect(istGeraeusch("Erstelle eine Klausur zur Bewerbung.")).toBe(false);
  });

  it("explains microphone problems in plain language", () => {
    expect(mikrofonFehler(new DOMException("x", "NotAllowedError"))).toMatch(/erlaube/i);
    expect(mikrofonFehler(new DOMException("x", "NotFoundError"))).toMatch(/kein Mikrofon/);
    expect(mikrofonFehler(new Error("?"))).toMatch(/Mikrofon geht gerade nicht/);
  });
});

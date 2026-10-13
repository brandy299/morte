import { describe, expect, it } from "vitest";
import { mitteilungsText, tabTitel } from "./mitteilung.ts";

describe("mitteilungsText", () => {
  it("names the finished material, three at most", () => {
    expect(mitteilungsText("fertig", ["Arbeitsblatt Prozent"]).text).toBe("Arbeitsblatt Prozent liegt bereit.");
    expect(mitteilungsText("fertig", ["A", "B", "C", "D", "E"]).text).toBe("A, B, C und 2 weitere liegt bereit.");
  });
  it("still says something when no material was made", () => {
    expect(mitteilungsText("fertig").text).toBe("Deine Antwort liegt bereit.");
  });
  it("tells a question and an error apart from done", () => {
    expect(mitteilungsText("frage").titel).toBe("Pult hat eine Rückfrage");
    expect(mitteilungsText("fehler").titel).toBe("Pult ist hängen geblieben");
    expect(new Set([tabTitel("fertig"), tabTitel("frage"), tabTitel("fehler")]).size).toBe(3);
  });
});

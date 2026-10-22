import { describe, expect, it } from "vitest";
import { nurFuerLehrkraft, szenenAntwort, szenenNotiz } from "./vorschau.ts";

describe("nurFuerLehrkraft", () => {
  it("recognises solution sheets and marking guides by the titles Pult gives them", () => {
    expect(nurFuerLehrkraft("Prozentrechnung im Handel – Grundaufgaben (Lösung)")).toBe(true);
    expect(nurFuerLehrkraft("Erwartungshorizont Klausur Geschäftsbriefe")).toBe(true);
  });
  it("leaves the sheets for the pupils alone", () => {
    expect(nurFuerLehrkraft("Prozentrechnung im Handel – Grundaufgaben")).toBe(false);
    expect(nurFuerLehrkraft("Klausur Geschäftsbriefe")).toBe(false);
    expect(nurFuerLehrkraft("Lösungen finden: ein Arbeitsblatt")).toBe(false);
  });
});

describe("szenenNotiz", () => {
  it("names the scene so the assistant knows where to change something", () => {
    expect(szenenNotiz(3, "Verdunstung")).toBe("Im Erklärstück, bei Szene 3 („Verdunstung“): ");
    expect(szenenNotiz(2, "")).toBe("Im Erklärstück, bei Szene 2: ");
    expect(szenenNotiz(0, "Der Wasserkreislauf")).toBe("Im Erklärstück, bei dem Titelbild: ");
  });
});

describe("szenenAntwort", () => {
  it("takes only a well-formed answer", () => {
    expect(szenenAntwort({ pult: "szene", n: 2, titel: "Wolken" })).toEqual({ n: 2, titel: "Wolken" });
    expect(szenenAntwort({ pult: "szene", n: "2" })).toBeNull();
    expect(szenenAntwort({ pult: "szene", n: -1 })).toBeNull();
    expect(szenenAntwort({ pult: "anderes", n: 1 })).toBeNull();
    expect(szenenAntwort("szene")).toBeNull();
    expect(szenenAntwort(null)).toBeNull();
  });
});

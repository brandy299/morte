import { describe, expect, it } from "vitest";
import { nurFuerLehrkraft } from "./vorschau.ts";

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

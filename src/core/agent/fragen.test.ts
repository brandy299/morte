import { describe, expect, it } from "vitest";
import { checkFragen, formatGegeben, matchGegeben, type Frage } from "./fragen.ts";

const frage = (over: Partial<Frage> = {}): Frage => ({
  frage: "Wie viele Stunden?",
  antworten: [
    { text: "Eine", erklaerung: "Kurzer Einstieg." },
    { text: "Drei", erklaerung: "Genug Zeit zum Üben." },
  ],
  empfohlen: 2,
  grund: "Bewerbungen brauchen Übung.",
  ...over,
});

describe("checkFragen", () => {
  it("accepts a complete question and demands a recommendation with a reason", () => {
    expect(checkFragen([frage()])).toBeUndefined();
    expect(checkFragen([frage({ empfohlen: 0 })])).toMatch(/empfohlen/);
    expect(checkFragen([frage({ empfohlen: 3 })])).toMatch(/empfohlen/);
    expect(checkFragen([frage({ grund: "" })])).toMatch(/grund/);
    expect(checkFragen([{ ...frage(), empfohlen: undefined }])).toMatch(/empfohlen/);
  });

  it("limits the number of questions and answers and wants every answer explained", () => {
    expect(checkFragen([])).toMatch(/1 and 4/);
    expect(checkFragen([1, 2, 3, 4, 5].map(() => frage()))).toMatch(/1 and 4/);
    expect(checkFragen([frage({ antworten: [{ text: "Nur eine", erklaerung: "x" }] })])).toMatch(/2 to 4/);
    expect(checkFragen([frage({ antworten: [{ text: "A", erklaerung: "" }, { text: "B", erklaerung: "y" }] })])).toMatch(/explanation/);
  });
});

describe("matchGegeben", () => {
  const fragen = [frage(), frage({ frage: "Mit Lösung?", antworten: [{ text: "Ja", erklaerung: "a" }, { text: "Nein", erklaerung: "b" }], empfohlen: 1 })];

  it("marks the recommended answer and own answers", () => {
    const got = matchGegeben(fragen, [{ antwort: "Eine" }, { antwort: "mit Hinweisen", eigene: true }]);
    expect(got).toEqual([
      { frage: "Wie viele Stunden?", antwort: "Eine", empfohlen: false },
      { frage: "Mit Lösung?", antwort: "mit Hinweisen", empfohlen: false, eigene: true },
    ]);
    expect(matchGegeben(fragen, [{ antwort: "Drei" }, { antwort: "Ja" }])!.map((g) => g.empfohlen)).toEqual([true, true]);
  });

  it("refuses answers that do not belong to the questions", () => {
    expect(matchGegeben(fragen, [{ antwort: "Drei" }])).toBeUndefined();
    expect(matchGegeben(fragen, [{ antwort: "Vier" }, { antwort: "Ja" }])).toBeUndefined();
    expect(matchGegeben(fragen, [{ antwort: "Drei" }, { antwort: "  ", eigene: true }])).toBeUndefined();
    expect(matchGegeben(fragen, "x")).toBeUndefined();
  });

  it("tells the model what was chosen", () => {
    const text = formatGegeben(matchGegeben(fragen, [{ antwort: "Drei" }, { antwort: "kommt drauf an", eigene: true }])!);
    expect(text).toContain("Antwort: Drei (deine Empfehlung)");
    expect(text).toContain("(eigene Antwort der Lehrkraft)");
  });
});

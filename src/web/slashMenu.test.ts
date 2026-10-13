import { describe, expect, it } from "vitest";
import type { VorlageInfo } from "./api.ts";
import { filterVorlagen, kurz, slashQuery, startText } from "./slashMenu.ts";

const v = (name: string, titel: string, eigene = false): VorlageInfo => ({ name, titel, beschreibung: "", eigene });
const alle = [v("arbeitsblatt", "Arbeitsblatt"), v("verstaendnis-check", "Verständnis-Check"), v("stunde-planen", "Stunde planen"), v("klausur", "Klausur"), v("mein-blatt", "Mein Arbeitsblatt Englisch", true)];

describe("slash menu", () => {
  it("opens only for a slash at the start with no space yet", () => {
    expect(slashQuery("/")).toBe("");
    expect(slashQuery("/arb")).toBe("arb");
    expect(slashQuery("/Verständnis")).toBe("Verständnis");
    for (const no of ["", "Hallo /arb", "/arb ", "/arb text", " /arb", "//", "/a/b"]) expect(slashQuery(no), no).toBeUndefined();
  });

  it("lists everything for a bare slash and filters by what is typed, ignoring case and accents", () => {
    expect(filterVorlagen(alle, "")).toHaveLength(5);
    expect(filterVorlagen(alle, "verstand").map((x) => x.name)).toEqual(["verstaendnis-check"]);
    expect(filterVorlagen(alle, "VERSTÄND").map((x) => x.name)).toEqual(["verstaendnis-check"]);
    expect(filterVorlagen(alle, "stunde").map((x) => x.name)).toEqual(["stunde-planen"]);
    expect(filterVorlagen(alle, "xyz")).toEqual([]);
  });

  it("puts matches at the start before matches inside, and the teacher's own before the bundled ones", () => {
    expect(filterVorlagen(alle, "blatt").map((x) => x.name)).toEqual(["mein-blatt", "arbeitsblatt"]); // both "contain" it: own first
    expect(filterVorlagen(alle, "arbeit").map((x) => x.name)).toEqual(["arbeitsblatt", "mein-blatt"]); // starts with it first
  });

  it("shows one short line of the description", () => {
    expect(kurz("Erstellt ein druckfertiges Arbeitsblatt als PDF. Nutze es bei Wünschen wie \"Blatt\".")).toBe("Erstellt ein druckfertiges Arbeitsblatt als PDF");
    expect(kurz("a".repeat(300))).toHaveLength(170);
    expect(kurz("a".repeat(300)).endsWith("…")).toBe(true);
    const lang = "Erstellt ein druckfertiges Arbeitsblatt als PDF (Graustufen) mit Material, gestaffelten Aufgaben und Schaubildern zu einem Thema für eine Klasse oder einen Kurs. Nutze es bei Wünschen.";
    expect(kurz(lang)).toBe("Erstellt ein druckfertiges Arbeitsblatt als PDF (Graustufen) mit Material, gestaffelten Aufgaben und Schaubildern zu einem Thema für eine Klasse oder einen Kurs");
    expect(kurz("Wort ".repeat(60).trim() + ".")).not.toMatch(/ …$|Wo…$/);
    expect(kurz("")).toBe("");
  });

  it("writes the start text with the title the assistant can find", () => {
    expect(startText(v("verstaendnis-check", "Verständnis-Check"))).toBe("Nutze die Anleitung „Verständnis-Check“: ");
  });
});

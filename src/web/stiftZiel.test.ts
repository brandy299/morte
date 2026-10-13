import { describe, expect, it } from "vitest";
import { selektor, type KnotenLike } from "./stiftZiel.ts";

const k = (tag: string, o: Partial<KnotenLike> = {}, eltern: KnotenLike | null = null): KnotenLike => ({ tag, klassen: [], typIndex: 1, typAnzahl: 1, eltern, ...o });

describe("selektor", () => {
  it("builds a short path with classes and the position among equal siblings", () => {
    const wurzel = k("DIV", { klassen: ["rueckmeldung"] }, k("SECTION", { klassen: ["file-group"] }, k("BODY")));
    const knopf = k("BUTTON", { klassen: ["rueck-knopf", "zweite", "dritte"], typIndex: 2, typAnzahl: 2 }, wurzel);
    expect(selektor(knopf)).toBe("section.file-group > div.rueckmeldung > button.rueck-knopf.zweite:nth-of-type(2)");
  });

  it("stops at the nearest element with an id", () => {
    const innen = k("P", {}, k("DIV", { id: "slash-liste" }, k("DIV", { klassen: ["aussen"] })));
    expect(selektor(innen)).toBe("div#slash-liste > p");
  });

  it("is at most four levels deep, skips body and ignores class names that are not safe", () => {
    let n = k("DIV", { klassen: ["a"] });
    for (const c of ["b", "c", "d", "e"]) n = k("DIV", { klassen: [c] }, n);
    expect(selektor(n).split(" > ")).toHaveLength(4);
    expect(selektor(k("SPAN", { klassen: ["ok", "1schlecht", "a b", "x:y"] }, k("BODY")))).toBe("span.ok");
  });
});

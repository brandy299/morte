import { describe, expect, it } from "vitest";
import { isModus, mitModus } from "./modus.ts";

describe("modes", () => {
  it("leaves the text alone when no mode is on", () => {
    expect(mitModus("Hallo", undefined)).toBe("Hallo");
  });
  it("adds the note for the series mode before the text", () => {
    const text = mitModus("Reihe zu Bruchrechnen", "reihe");
    expect(text).toContain("reihe-komplett");
    expect(text.endsWith("Reihe zu Bruchrechnen")).toBe(true);
  });
  it("accepts only known modes", () => {
    expect(isModus("reihe")).toBe(true);
    expect(isModus("alles")).toBe(false);
    expect(isModus(undefined)).toBe(false);
  });
});

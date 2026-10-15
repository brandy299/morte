import { describe, expect, it } from "vitest";
import { zeitpunkte } from "./video.ts";

describe("zeitpunkte", () => {
  it("has 30 pictures per second, from the start to exactly the end", () => {
    const t = zeitpunkte(2000);
    expect(t).toHaveLength(61);
    expect(t[0]).toBe(0);
    expect(t.at(-1)).toBe(2000);
    expect(t[1]).toBeCloseTo(33.33, 1);
  });

  it("does not run past the end when the length is no whole number of pictures", () => {
    const t = zeitpunkte(1010);
    expect(t.at(-1)).toBe(1010);
    expect(t.every((ms, i) => i === 0 || ms > t[i - 1]!)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { bildZeiten } from "./video.ts";

describe("bildZeiten", () => {
  it("draws a picture at the start, every 1/30 s, and one at the very end", () => {
    const z = bildZeiten(1000);
    expect(z).toHaveLength(31);
    expect(z[0]).toBe(0);
    expect(z[1]).toBe(33);
    expect(z.at(-1)).toBe(1000);
  });
  it("never goes past the end and rises steadily", () => {
    const z = bildZeiten(13_817);
    expect(Math.max(...z)).toBe(13_817);
    expect(z.every((t, i) => i === 0 || t >= z[i - 1]!)).toBe(true);
  });
  it("makes nothing for a piece that does not move", () => {
    expect(bildZeiten(0)).toEqual([]);
    expect(bildZeiten(Number.NaN)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { MUSTER, musterZurZeit, naechsterStart, UEBERGANG, WECHSEL } from "./warteMuster.ts";

/** Stands in for a canvas: records what is drawn and checks every value is a real number. */
function fakeCanvas() {
  const calls: string[] = [];
  const state: Record<string, unknown> = {};
  const ctx = new Proxy(state, {
    get: (s, key: string) =>
      key in s
        ? s[key]
        : (...args: unknown[]) => {
            for (const a of args) if (typeof a === "number" && !Number.isFinite(a)) throw new Error(`${key} got ${a}`);
            calls.push(key);
          },
    set: (s, key: string, value) => {
      if (key === "globalAlpha" && (typeof value !== "number" || value < 0 || value > 1)) throw new Error(`globalAlpha ${value}`);
      s[key] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe("waiting patterns", () => {
  it("each one draws something at any time, with sane numbers", () => {
    for (const m of MUSTER) {
      for (const t of [0, 0.5, 7.3, 61]) {
        const { ctx, calls } = fakeCanvas();
        m.draw(ctx, 40, 40, t, { ink: "#5f594e", accent: "#b4532a" });
        expect(calls.some((c) => c === "fill" || c === "stroke" || c === "strokeRect"), m.name).toBe(true);
      }
    }
  });

  it("take turns during a long wait, with a soft change at the end of each turn", () => {
    expect(musterZurZeit(2, 0)).toEqual({ jetzt: 2, naechstes: 3, blend: 0 });
    expect(musterZurZeit(2, WECHSEL - UEBERGANG - 0.01).blend).toBe(0);
    const mitten = musterZurZeit(2, WECHSEL - UEBERGANG / 2);
    expect(mitten.jetzt).toBe(2);
    expect(mitten.blend).toBeCloseTo(0.5);
    expect(musterZurZeit(2, WECHSEL)).toEqual({ jetzt: 3, naechstes: 0, blend: 0 });
    expect(musterZurZeit(3, WECHSEL).jetzt).toBe(0);
  });

  it("start each new wait with the next pattern, and with the first when nothing can be stored", () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const starts = Array.from({ length: MUSTER.length + 1 }, () => naechsterStart(store));
    expect(starts).toEqual([...MUSTER.map((_, i) => i), 0]);
    const kaputt = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(naechsterStart(kaputt)).toBe(0);
    expect(naechsterStart({ getItem: () => "unsinn", setItem: () => {} })).toBe(0);
  });
});

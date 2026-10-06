import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Guards the colors: text must stay readable (WCAG AA, 4.5:1) when someone changes the palette. */
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1] ?? "";
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe("colors", () => {
  const surfaces = ["paper", "paper-deep", "card", "accent-wash"];
  it.each(["ink", "ink-soft", "accent-deep", "danger-ink", "ok"])("%s is readable on every surface", (text) => {
    for (const surface of surfaces) {
      expect(token(text), text).not.toBe("");
      expect(ratio(token(text), token(surface)), `${text} auf ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("button text is readable on the accent color", () => {
    expect(ratio(token("accent-ink"), token("accent"))).toBeGreaterThanOrEqual(4.5);
  });
});

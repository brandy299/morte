import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Guards the colors: text must stay readable (WCAG AA, 4.5:1) when someone changes the palette. */
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/** Color values of one theme: the light basics, overridden by every block whose selector is in `selectors`. */
function theme(selectors: string[]): (name: string) => string {
  const values: Record<string, string> = {};
  const blocks = [...css.matchAll(/(:root[^{]*)\{([^}]*)\}/g)];
  const wanted = [":root", ...selectors];
  for (const selector of wanted) {
    for (const [, sel, body] of blocks) {
      if (sel!.trim() !== selector) continue;
      for (const m of body!.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) values[m[1]!] = m[2]!;
    }
  }
  return (name) => values[name] ?? "";
}

const themes: Record<string, string[]> = {
  hell: [],
  dunkel: [':root[data-theme="dark"]'],
  ...Object.fromEntries(["salbei", "blau", "pflaume"].flatMap((a) => [[`hell ${a}`, [`:root[data-accent="${a}"]`]], [`dunkel ${a}`, [':root[data-theme="dark"]', `:root[data-accent="${a}"]`, `:root[data-theme="dark"][data-accent="${a}"]`]]])),
};

describe.each(Object.entries(themes))("colors (%s)", (_name, selectors) => {
  const t = theme(selectors);
  const surfaces = ["paper", "paper-deep", "card", "accent-wash"];
  it.each(["ink", "ink-soft", "accent-deep", "danger-ink", "ok"])("%s is readable on every surface", (text) => {
    for (const surface of surfaces) {
      expect(t(text), text).not.toBe("");
      expect(ratio(t(text), t(surface)), `${text} auf ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("button text is readable on the accent color", () => {
    expect(ratio(t("accent-ink"), t("accent"))).toBeGreaterThanOrEqual(4.5);
  });
  it("text is readable on a lesson card tinted with each class color", () => {
    const mix = (a: string, b: string, share: number) => `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * share + parseInt(b.slice(i, i + 2), 16) * (1 - share)).toString(16).padStart(2, "0")).join("")}`;
    for (let k = 0; k < 8; k++) {
      const color = t(`k${k}`);
      expect(color, `k${k}`).not.toBe("");
      const tint = mix(color, t("card"), 0.12);
      expect(ratio(t("ink"), tint), `ink auf k${k}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t("ink-soft"), tint), `ink-soft auf k${k}`).toBeGreaterThanOrEqual(4.5);
      // The color itself carries the stripe and the dot: it must stand out from the page.
      expect(ratio(color, t("paper")), `k${k} auf Papier`).toBeGreaterThanOrEqual(2.6);
    }
  });
  it("status colors are readable on their washes", () => {
    expect(ratio(t("danger-ink"), t("danger-wash"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t("ok-ink"), t("ok-wash"))).toBeGreaterThanOrEqual(4.5);
  });
});

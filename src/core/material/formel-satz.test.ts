import { describe, expect, it } from "vitest";
import type { Gesetzt } from "./formel.ts";
import { anzeigeZeilen, klartext, MATH_SCALE, MIN_SCALE, setzeSatz, type Maße, type Op } from "./formel-satz.ts";

// A font with simple numbers: every character is 5 points wide at size 10, the baseline is 8 below the top, a line is 12 high.
const m: Maße = {
  breite: (t, _f, s) => t.length * 0.5 * s,
  ascent: (_f, s) => 0.8 * s,
  zeile: (_f, s) => 1.2 * s,
};
const o = { font: "Sans", size: 10, width: 200, lineGap: 2.5 };

/** A fake formula: `w` times the font size wide, `hoch` above and `tief` below the baseline. */
const fake = (breite: number, hoch = 0.7, tief = 0.2): Gesetzt => ({ breite, hoch, tief, body: "", box: [0, 0, 1, 1] });
const setze = (tex: string): Gesetzt | undefined => (tex.includes("kaputt") ? undefined : tex.startsWith("big") ? fake(Number(tex.slice(3)) || 30, 1.6, 0.9) : fake(tex.length * 0.1));

const text = (ops: Op[]) => ops.flatMap((op) => (op.t === "text" ? [op] : []));
const formeln = (ops: Op[]) => ops.flatMap((op) => (op.t === "formel" ? [op] : []));

describe("text with formulas", () => {
  it("leaves text without formulas to the normal drawing", () => {
    expect(setzeSatz("Ein ganz normaler Satz mit 5 $ und 6 $.", o, m, setze)).toBeUndefined();
    expect(klartext("Ein ganz normaler Satz mit 5 $ und 6 $.")).toBe("Ein ganz normaler Satz mit 5 $ und 6 $.");
    expect(klartext("Das kostet \\$5.")).toBe("Das kostet $5.");
    expect(klartext("Es gilt \\(x\\).")).toBeUndefined();
  });

  it("puts a formula in a sentence on the baseline of the text", () => {
    const s = setzeSatz("Es gilt \\(abcdef\\) hier.", o, m, setze)!;
    const [word] = text(s.ops);
    const [f] = formeln(s.ops);
    const sz = 10 * MATH_SCALE;
    const hoch = 0.7 * sz;
    // baseline of the text = top of the text + ascent. baseline of the formula = top of the drawing + height above the baseline.
    expect(word!.y + 8).toBeCloseTo(f!.y + hoch, 5);
    expect(f!.size).toBeCloseTo(sz, 5);
  });

  it("makes the line taller for a tall formula, so lines do not overlap", () => {
    const s = setzeSatz("Eins \\(big10\\) zwei\ndrei", o, m, setze)!;
    const [first, last] = [text(s.ops)[0]!, text(s.ops).at(-1)!];
    const f = formeln(s.ops)[0]!;
    const sz = 10 * MATH_SCALE;
    const lineBottom = f.y + (1.6 + 0.9) * sz;
    expect(f.y).toBeGreaterThanOrEqual(0);
    expect(first.y).toBeGreaterThanOrEqual(0);
    // "drei" is on the next line: below the whole tall formula.
    expect(last.y).toBeGreaterThanOrEqual(lineBottom);
    expect(s.hoehe).toBeGreaterThan(lineBottom);
  });

  it("breaks lines at spaces and keeps every piece inside the width", () => {
    const words = Array.from({ length: 40 }, (_, i) => `wort${i}`).join(" ");
    const s = setzeSatz(`${words} und \\(abc\\) zum Schluss`, o, m, setze)!;
    const lines = new Set(s.ops.map((op) => Math.round(op.y)));
    expect(lines.size).toBeGreaterThan(3);
    for (const op of s.ops) {
      const w = op.t === "text" ? m.breite(op.text, "Sans", 10) : op.g.breite * op.size;
      expect(op.x).toBeGreaterThanOrEqual(0);
      expect(op.x + w).toBeLessThanOrEqual(200 + 1e-6);
    }
  });

  it("keeps a full stop and a formula together", () => {
    const s = setzeSatz("\\(abc\\). Weiter", { ...o, width: 30 }, m, setze)!;
    const f = formeln(s.ops)[0]!;
    const dot = text(s.ops).find((op) => op.text === ".")!;
    expect(dot.x).toBeCloseTo(f.x + f.g.breite * f.size, 5); // no gap
    expect(Math.abs(dot.y + 8 - (f.y + 0.7 * f.size))).toBeLessThan(1e-6);
  });

  it("sets a formula on its own line centered, with text before and after", () => {
    const s = setzeSatz("Vorher \\[abcdefghij\\] nachher", o, m, setze)!;
    const [before, after] = text(s.ops);
    const f = formeln(s.ops)[0]!;
    expect(f.y).toBeGreaterThan(before!.y);
    expect(after!.y).toBeGreaterThan(f.y + (0.9 * f.size));
    expect(f.x).toBeCloseTo((200 - f.g.breite * f.size) / 2, 5);
  });

  it("aligns lines to the centre or the right when asked", () => {
    const left = setzeSatz("\\(abc\\)", o, m, setze)!;
    const right = setzeSatz("\\(abc\\)", { ...o, align: "right" }, m, setze)!;
    const centre = setzeSatz("\\(abc\\)", { ...o, align: "center" }, m, setze)!;
    const w = formeln(left.ops)[0]!.g.breite * formeln(left.ops)[0]!.size;
    expect(formeln(left.ops)[0]!.x).toBe(0);
    expect(formeln(right.ops)[0]!.x).toBeCloseTo(200 - w, 5);
    expect(formeln(centre.ops)[0]!.x).toBeCloseTo((200 - w) / 2, 5);
  });

  it("puts a label in front of the first line", () => {
    const s = setzeSatz("Setze \\(x\\) ein.", { ...o, lead: { text: "Tipp:", font: "Bold" } }, m, setze)!;
    expect(text(s.ops)[0]).toMatchObject({ text: "Tipp:", font: "Bold", x: 0 });
    expect(text(s.ops)[1]!.x).toBeGreaterThan(text(s.ops)[0]!.x + 5 * 5);
  });

  it("shows the raw text when the LaTeX is wrong, and goes on", () => {
    const s = setzeSatz("Vor \\(kaputt\\) und $kaputt2$ nach.", o, m, setze)!;
    expect(text(s.ops).map((t) => t.text).join(" ")).toContain("\\(kaputt\\)");
    expect(text(s.ops).map((t) => t.text).join(" ")).toContain("$kaputt2$");
    expect(text(s.ops).at(-1)!.text).toBe("nach.");
  });
});

describe("a formula on its own line that is too wide", () => {
  it("is made smaller to fit, down to the smallest scale", () => {
    // 22 times the font size is 233 points at the formula scale, the column is 200 wide: it needs about 86 %.
    const [l] = anzeigeZeilen("big22", 200, 10, true, setze)!;
    expect(l!.scale).toBeLessThan(1);
    expect(l!.scale).toBeGreaterThanOrEqual(MIN_SCALE);
    expect(l!.g.breite * 10 * MATH_SCALE * l!.scale).toBeLessThanOrEqual(200 + 1e-6);
  });

  it("is broken at operators when even the smallest scale is not enough", () => {
    const wide = (tex: string) => (/^[=+\-\\]?\s*x$/.test(tex.trim()) ? fake(1) : fake(tex.length * 0.55));
    const tex = Array.from({ length: 12 }, () => "abcdefgh").join(" + ");
    const lines = anzeigeZeilen(tex, 200, 10, true, wide)!;
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.g.breite * 10 * MATH_SCALE * l.scale).toBeLessThanOrEqual(200 + 1e-6);
  });

  it("gives up when one piece cannot be cut, so the raw text is shown", () => {
    expect(anzeigeZeilen("big60", 200, 10, true, setze)).toBeUndefined();
    const s = setzeSatz("Davor \\[big60\\] danach", o, m, setze)!;
    expect(formeln(s.ops)).toHaveLength(0);
    expect(text(s.ops).some((t) => t.text.includes("big60"))).toBe(true);
  });
});

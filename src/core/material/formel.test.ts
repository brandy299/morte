import { describe, expect, it } from "vitest";
import { formelStuecke, formelTeile, mightHaveFormula, onFormelWarning, repariereSteuerzeichen, setzeFormel } from "./formel.ts";

const formeln = (text: string) => formelTeile(text).flatMap((t) => ("tex" in t ? [t.tex] : []));
const plain = (text: string) => formelTeile(text).map((t) => ("text" in t ? t.text : "§")).join("");

describe("finding formulas in text", () => {
  it("finds all four ways to write them, in a sentence and on their own line", () => {
    expect(formelTeile("Es gilt \\(a^2\\) und $b^2$.")).toEqual([
      { text: "Es gilt " },
      { tex: "a^2", anzeige: false, roh: "\\(a^2\\)" },
      { text: " und " },
      { tex: "b^2", anzeige: false, roh: "$b^2$" },
      { text: "." },
    ]);
    expect(formelTeile("\\[x = 1\\] und $$y = 2$$").filter((t) => "tex" in t)).toMatchObject([{ tex: "x = 1", anzeige: true }, { tex: "y = 2", anzeige: true }]);
  });

  it("keeps money as text", () => {
    for (const text of ["Das kostet 5 $ und 6 $.", "Preis: $5 und $6.", "Es kostet 5$ oder 6$", "Ein $ allein", "5 $ + 3 $ = 8 $", "Tipp: $ vor dem Betrag", "Von $100 bis $200 Euro"]) {
      expect(formeln(text), text).toEqual([]);
    }
  });

  it("keeps Excel references as text", () => {
    for (const text of ["Schreibe =SUMME($A$1:$A$5) in die Zelle.", "Der Bezug $A1 bleibt fest.", "Ziehe A$1 nach unten", "=$B$2*C2 und =$B$3*C3"]) {
      expect(formeln(text), text).toEqual([]);
      expect(plain(text)).toBe(text);
    }
  });

  it("reads a dollar sign after a backslash as a dollar sign", () => {
    expect(plain("Das kostet \\$5 und \\$6.")).toBe("Das kostet $5 und $6.");
  });

  it("still finds a formula next to a price", () => {
    expect(formeln("Für 5 $ gilt $x^2$ mit \\(y\\).")).toEqual(["x^2", "y"]);
  });

  it("does not let a $ formula run over a line break, but a display formula may", () => {
    expect(formeln("$a\nb$")).toEqual([]);
    expect(formeln("\\[\\begin{cases} a \\\\ b \\end{cases}\\]")).toHaveLength(1);
  });

  it("leaves what does not close as text", () => {
    expect(formeln("Das ist \\(offen und $nie zu")).toEqual([]);
    expect(formeln("leer \\(\\) und $$$$")).toEqual([]);
  });

  it("is cheap to ask whether a text can have formulas", () => {
    expect(mightHaveFormula("ein ganz normaler Satz")).toBe(false);
    expect(mightHaveFormula("mit \\(x\\)")).toBe(true);
  });
});

describe("setting a formula", () => {
  const warnings: string[] = [];
  onFormelWarning((r) => warnings.push(r));

  it("gives measures in units of the font size", () => {
    const g = setzeFormel("\\frac{K \\cdot p \\cdot t}{100}", false)!;
    expect(g.breite).toBeGreaterThan(1);
    expect(g.hoch).toBeGreaterThan(0.5);
    expect(g.tief).toBeGreaterThan(0.2);
    expect(g.body).not.toContain("currentColor");
  });

  it("returns nothing for wrong LaTeX and warns without naming the formula", () => {
    warnings.length = 0;
    expect(setzeFormel("\\frac{1}{", false)).toBeUndefined();
    expect(setzeFormel("\\unbekannterbefehl", false)).toBeUndefined();
    expect(warnings).toHaveLength(2);
    expect(warnings.join(" ")).not.toMatch(/frac\{1\}/);
  });

  it("does not allow colors, links or loading more packages", () => {
    for (const tex of ["\\color{red}{x}", "\\href{http://example.org}{x}", "\\require{mhchem}", "\\newcommand{\\a}{b}"]) expect(setzeFormel(tex, false), tex).toBeUndefined();
  });

  it("sets the school formulas of the issue", () => {
    for (const tex of [
      "Z = \\frac{K \\cdot p \\cdot t}{100}",
      "W = \\frac{G \\cdot p}{100}",
      "x_{1,2} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}",
      "\\sqrt[3]{x}",
      "\\sum_{i=1}^{n} x_i",
      "f(x) = 2x^2 - 3x + 1",
      "\\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases}",
      "\\text{für } x > 0",
      "\\text{Ausgaben in €}",
    ]) expect(setzeFormel(tex, true), tex).toBeDefined();
  });
});

describe("breaking a long formula", () => {
  it("cuts at operators outside brackets, each next piece starting with its operator", () => {
    expect(formelStuecke("x_{1,2} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}")).toEqual(["x_{1,2}", "= -\\frac{p}{2}", "\\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}"]);
  });
  it("does not cut inside brackets, fractions or after another operator", () => {
    expect(formelStuecke("\\frac{a+b}{c-d}")).toEqual(["\\frac{a+b}{c-d}"]);
    expect(formelStuecke("a = -b")).toEqual(["a", "= -b"]);
    expect(formelStuecke("\\left( a + b \\right)")).toEqual(["\\left( a + b \\right)"]);
  });
});

describe("control characters from single backslashes in JSON", () => {
  it("turns a form feed, tab, backspace, return or line feed in front of letters back into the command", () => {
    // JSON: "\frac" becomes form feed + "rac", "\times" tab + "imes", "\beta" backspace + "eta", "\rho" return + "ho", "\neq" line feed + "eq".
    expect(repariereSteuerzeichen("\frac{a}{b} 3\times 4 \beta \rho a\neq b")).toBe("\\frac{a}{b} 3\\times 4 \\beta \\rho a\\neq b");
  });
  it("does not touch real spaces and line breaks", () => {
    expect(repariereSteuerzeichen("a\nb \\\\\n c")).toBe("a\nb \\\\\n c");
  });
  it("is applied to the formulas that are found", () => {
    expect(formeln("Es gilt \\(\frac{1}{2}\\) und \\[a\neq b\\].")).toEqual(["\\frac{1}{2}", "a\\neq b"]);
  });
  it("sets a decimal comma without a space after it", () => {
    expect(setzeFormel("2{,}5 \\cdot 3", false)).toBeDefined();
  });
});

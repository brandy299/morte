import { describe, expect, it } from "vitest";
import { classColors } from "./klassenfarbe.ts";

describe("classColors", () => {
  it("gives colors in alphabetical order", () => {
    expect([...classColors([{ name: "b" }, { name: "a" }]).entries()]).toEqual([["a", 0], ["b", 1]]);
  });
  it("lets a chosen color win and ignores a wrong one", () => {
    const c = classColors([{ name: "a", farbe: 6 }, { name: "b", farbe: 99 }]);
    expect(c.get("a")).toBe(6);
    expect(c.get("b")).toBe(1);
  });
});

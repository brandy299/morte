import { describe, expect, it } from "vitest";
import { isServerEntry } from "./index.ts";

describe("isServerEntry", () => {
  it("recognizes the start file with slashes and with Windows backslashes", () => {
    expect(isServerEntry("/home/u/pult/src/server/index.ts")).toBe(true);
    expect(isServerEntry("C:\\Users\\x\\pult\\src\\server\\index.ts")).toBe(true);
    expect(isServerEntry("src\\server\\index.ts")).toBe(true);
    expect(isServerEntry("dist/server/index.js")).toBe(true);
  });

  it("ignores other files and a missing path", () => {
    expect(isServerEntry("/x/node_modules/vitest/vitest.mjs")).toBe(false);
    expect(isServerEntry("/x/src/myserver/index.ts")).toBe(false);
    expect(isServerEntry(undefined)).toBe(false);
  });
});

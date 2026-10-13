import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { crlf, paketDateien, zipPaket } from "./paket.ts";

/** Reads path and Unix mode of every entry from the central directory of a zip. */
function modes(zip: Uint8Array): Record<string, number> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const out: Record<string, number> = {};
  for (let i = 0; i + 46 <= zip.length; i++) {
    if (v.getUint32(i, true) !== 0x02014b50) continue;
    const nameLen = v.getUint16(i + 28, true);
    const name = new TextDecoder().decode(zip.subarray(i + 46, i + 46 + nameLen));
    out[name] = v.getUint32(i + 38, true) >>> 16;
  }
  return out;
}

describe("paketDateien", () => {
  it("keeps what the app needs and drops tests, quality checks and research", () => {
    const kept = paketDateien(["src/server/index.ts", "src/core/a.test.ts", "evals/BASELINE.md", "docs/recherche/x.md", "docs/recherche-harnesse.md", "README.md", "design/logo/a.svg", "CLAUDE.md", "ROADMAP.md", ".claude/skills/x.md", "skills/a/SKILL.md", "package.json", "docs/anleitung-tester.md", "assets/a.png"]);
    expect(kept).toEqual(["src/server/index.ts", "skills/a/SKILL.md", "package.json", "assets/a.png"]);
  });
});

describe("zipPaket", () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  const zip = zipPaket("pult", [
    { path: "Pult starten.command", data: enc("#!/bin/bash\n") },
    { path: "Pult starten.bat", data: enc("@echo off\nnode x\n") },
    { path: "package.json", data: enc("{}") },
  ]);
  it("puts everything in one folder", () => {
    expect(Object.keys(unzipSync(zip)).sort()).toEqual(["pult/Pult starten.bat", "pult/Pult starten.command", "pult/package.json"]);
  });
  it("makes scripts executable and other files plain", () => {
    const m = modes(zip);
    expect(m["pult/Pult starten.command"]).toBe(0o100755);
    expect(m["pult/package.json"]).toBe(0o100644);
  });
  it("writes batch files with CRLF", () => {
    expect(new TextDecoder().decode(unzipSync(zip)["pult/Pult starten.bat"])).toBe("@echo off\r\nnode x\r\n");
    expect(crlf("a\r\nb\nc")).toBe("a\r\nb\r\nc");
  });
});

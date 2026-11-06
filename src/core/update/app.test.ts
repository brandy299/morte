import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkUpdate, startUpdate, UpdateError } from "./index.ts";

const SHA = "b".repeat(40);
const BASIS = "c".repeat(64);
let server: Server;
let dir: string;
const saved = { ...process.env };

const zipOf = (files: Record<string, string>) => Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, new TextEncoder().encode(v)]))));

async function publish(zip: Buffer, manifest: Record<string, unknown> = {}) {
  const json = { sha: SHA, basis: BASIS, pruefsumme: createHash("sha256").update(zip).digest("hex"), ...manifest };
  server = createServer((req, res) => {
    if (req.url === "/code.json") res.end(JSON.stringify(json));
    else if (req.url === "/code.zip") res.end(zip);
    else (res.statusCode = 404), res.end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.PULT_CODE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pult-appupd-"));
  mkdirSync(join(dir, "bibliotheken"));
  Object.assign(process.env, { PULT_APP: "1", PULT_BASIS: BASIS, PULT_APP_VERSION: "1.0.0", PULT_CODE_DIR: join(dir, "code"), PULT_NODE_MODULES: join(dir, "bibliotheken") });
});
afterEach(() => {
  server?.close();
  process.env = { ...saved };
  rmSync(dir, { recursive: true, force: true });
});

describe("update of the desktop app", () => {
  it("offers a new version and puts the new code in place with a link to the libraries", async () => {
    await publish(zipOf({ "package.json": "{}", "src/a.ts": "neu" }));
    expect((await checkUpdate()).verfuegbar).toBe(true);
    await startUpdate();
    const aktuell = join(dir, "code", "aktuell");
    expect(readFileSync(join(aktuell, "src", "a.ts"), "utf8")).toBe("neu");
    expect(readFileSync(join(aktuell, ".pult-stand"), "utf8")).toBe(SHA);
    expect(readFileSync(join(aktuell, ".basis"), "utf8")).toBe(`${BASIS}/1.0.0`);
    expect(existsSync(join(aktuell, "node_modules"))).toBe(true);
    // A second update replaces the first one completely.
    await startUpdate();
    expect(existsSync(join(dir, "code", "alt"))).toBe(false);
  });

  it("says a new installation is needed when the libraries or the shell changed, and touches nothing", async () => {
    await publish(zipOf({ "package.json": "{}" }), { basis: "d".repeat(64) });
    const info = await checkUpdate();
    expect(info.verfuegbar).toBe(false);
    expect(info.hinweis).toMatch(/neue Installation/);
    await expect(startUpdate()).rejects.toThrow(UpdateError);
    expect(existsSync(join(dir, "code"))).toBe(false);
  });

  it("refuses a package with a wrong checksum and an unfinished package, and leaves the old code alone", async () => {
    mkdirSync(join(dir, "code", "aktuell"), { recursive: true });
    writeFileSync(join(dir, "code", "aktuell", "marker"), "alt");
    await publish(zipOf({ "package.json": "{}" }), { pruefsumme: "e".repeat(64) });
    await expect(startUpdate()).rejects.toThrow(/beschädigt/);
    server.close();
    await publish(zipOf({ "src/a.ts": "ohne package.json" }));
    await expect(startUpdate()).rejects.toThrow(/nicht richtig/);
    expect(readFileSync(join(dir, "code", "aktuell", "marker"), "utf8")).toBe("alt");
  });

  it("does not write outside its folder when a package contains .. paths", async () => {
    await publish(zipOf({ "package.json": "{}", "../../boese.txt": "x" }));
    await startUpdate();
    expect(existsSync(join(dir, "boese.txt"))).toBe(false);
    expect(existsSync(join(dir, "code", "boese.txt"))).toBe(false);
  });
});

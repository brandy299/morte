import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { automatischAktualisieren, checkUpdate, startUpdate, UpdateError } from "./index.ts";
import { installerFuer, ladeInstaller } from "./app.ts";

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
    const aktuell = join(dir, "code", SHA);
    expect(readFileSync(join(aktuell, "src", "a.ts"), "utf8")).toBe("neu");
    expect(readFileSync(join(aktuell, ".pult-stand"), "utf8")).toBe(SHA);
    expect(readFileSync(join(aktuell, ".basis"), "utf8")).toBe(`${BASIS}/1.0.0`);
    expect(existsSync(join(aktuell, "node_modules"))).toBe(true);
    expect(readFileSync(join(dir, "code", "aktuell.txt"), "utf8")).toBe(SHA);
  });

  it("cannot update by itself when the libraries or the shell changed and there is no installer for this system, and touches nothing", async () => {
    await publish(zipOf({ "package.json": "{}" }), { basis: "d".repeat(64) });
    const info = await checkUpdate();
    expect(info.verfuegbar).toBe(false);
    expect(info.hinweis).toMatch(/Lade die neue Version/);
    await expect(startUpdate()).rejects.toThrow(UpdateError);
    expect(existsSync(join(dir, "code"))).toBe(false);
  });

  it("refuses a package with a wrong checksum and an unfinished package, and leaves the old code alone", async () => {
    mkdirSync(join(dir, "code", "a".repeat(40)), { recursive: true });
    writeFileSync(join(dir, "code", "a".repeat(40), "marker"), "alt");
    writeFileSync(join(dir, "code", "aktuell.txt"), "a".repeat(40));
    await publish(zipOf({ "package.json": "{}" }), { pruefsumme: "e".repeat(64) });
    await expect(startUpdate()).rejects.toThrow(/beschädigt/);
    server.close();
    await publish(zipOf({ "src/a.ts": "ohne package.json" }));
    await expect(startUpdate()).rejects.toThrow(/nicht richtig/);
    expect(readFileSync(join(dir, "code", "a".repeat(40), "marker"), "utf8")).toBe("alt");
    expect(readFileSync(join(dir, "code", "aktuell.txt"), "utf8")).toBe("a".repeat(40));
  });

  it("does not write outside its folder when a package contains .. paths", async () => {
    await publish(zipOf({ "package.json": "{}", "../../boese.txt": "x" }));
    await startUpdate();
    expect(existsSync(join(dir, "boese.txt"))).toBe(false);
    expect(existsSync(join(dir, "code", "boese.txt"))).toBe(false);
  });
});

describe("automatic update and installers", () => {
  it("fetches new code by itself, but only when it fits and is newer", async () => {
    await publish(zipOf({ "package.json": "{}" }));
    expect(await automatischAktualisieren()).toBe(true);
    expect(readFileSync(join(dir, "code", SHA, ".pult-stand"), "utf8")).toBe(SHA);
    process.env.PULT_AUTO_UPDATE = "0";
    rmSync(join(dir, "code"), { recursive: true, force: true });
    expect(await automatischAktualisieren()).toBe(false);
    expect(existsSync(join(dir, "code"))).toBe(false);
  });

  it("does not update by itself when the libraries changed, and never throws", async () => {
    await publish(zipOf({ "package.json": "{}" }), { basis: "d".repeat(64) });
    expect(await automatischAktualisieren()).toBe(false);
    server.close();
    process.env.PULT_CODE_URL = "http://127.0.0.1:1";
    expect(await automatischAktualisieren()).toBe(false);
  });

  it("names the installer for each system and refuses odd versions", () => {
    expect(installerFuer("0.3.0", "win32", "x64")?.name).toBe("Pult-0.3.0-win-x64.exe");
    expect(installerFuer("0.3.0", "darwin", "arm64")?.name).toBe("Pult-0.3.0-mac-arm64.dmg");
    expect(installerFuer("0.3.0", "darwin", "x64")?.name).toBe("Pult-0.3.0-mac-x64.dmg");
    expect(installerFuer("0.3.0", "linux", "x64")).toBeUndefined();
    expect(installerFuer("../0.3", "win32", "x64")).toBeUndefined();
  });

  it("downloads the installer and checks it against the list of the release", async () => {
    const inhalt = Buffer.from("installer");
    const summe = createHash("sha256").update(inhalt).digest("hex");
    let liste = `${summe}  Pult-0.3.0-win-x64.exe\n`;
    server = createServer((req, res) => {
      if (req.url === "/v0.3.0/SHA256SUMS.txt") res.end(liste);
      else if (req.url === "/v0.3.0/Pult-0.3.0-win-x64.exe") res.end(inhalt);
      else (res.statusCode = 404), res.end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    process.env.PULT_RELEASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const pfad = await ladeInstaller("0.3.0", "win32", "x64");
    expect(readFileSync(pfad)).toEqual(inhalt);
    liste = `${"0".repeat(64)}  Pult-0.3.0-win-x64.exe\n`;
    await expect(ladeInstaller("0.3.0", "win32", "x64")).rejects.toThrow(/beschädigt/);
    liste = "";
    await expect(ladeInstaller("0.3.0", "win32", "x64")).rejects.toThrow(/noch nicht fertig/);
    await expect(ladeInstaller("0.9.9", "win32", "x64")).rejects.toThrow(/noch nicht fertig/);
  });
});

describe("the folder in use is never replaced", () => {
  it("keeps the running folder when a newer version comes, points to the new one and leaves the libraries alone", async () => {
    const laufend = join(dir, "code", "a".repeat(40));
    mkdirSync(laufend, { recursive: true });
    writeFileSync(join(laufend, "marker"), "laeuft");
    writeFileSync(join(dir, "bibliotheken", "lib.js"), "bleibt");
    await publish(zipOf({ "package.json": "{}" }));
    await startUpdate();
    expect(readFileSync(join(dir, "code", "aktuell.txt"), "utf8")).toBe(SHA);
    // The old folder is removed when possible, but never through the link into the libraries.
    expect(readFileSync(join(dir, "bibliotheken", "lib.js"), "utf8")).toBe("bleibt");
    await startUpdate();
    expect(readFileSync(join(dir, "bibliotheken", "lib.js"), "utf8")).toBe("bleibt");
    expect(existsSync(join(dir, "code", SHA, "node_modules"))).toBe(true);
  });
});

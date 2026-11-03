// Runs scripts/aktualisieren.mjs against a copy of the program folder and a local stand-in for GitHub.
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const repo = join(import.meta.dirname, "..", "..");
const SHA = "a".repeat(40);
const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const sandbox = () => {
  const dir = mkdtempSync(join(tmpdir(), "pult-updtest-"));
  dirs.push(dir);
  return dir;
};

/** A program folder with an old version, an installed part and a node copy that must survive. */
function oldInstall() {
  const root = join(sandbox(), "Pult");
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "node_modules", "x"), { recursive: true });
  mkdirSync(join(root, "node"), { recursive: true });
  writeFileSync(join(root, "node_modules", "x", "i.js"), "keep");
  writeFileSync(join(root, "node", "marker"), "keep");
  writeFileSync(join(root, "package.json"), '{"v":"old"}');
  writeFileSync(join(root, "veraltet.txt"), "weg");
  cpSync(join(repo, "scripts", "aktualisieren.mjs"), join(root, "scripts", "aktualisieren.mjs"));
  return root;
}

async function serve(body: Buffer | null) {
  const server = createServer((_, res) => {
    res.statusCode = body ? 200 : 404;
    res.end(body ?? "");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/pult.tar.gz` };
}

/** Async on purpose: the stand-in server lives in this process and must keep answering while the updater runs. */
function runUpdater(root: string, quelle: string) {
  // Port 1 never answers, so the updater does not wait for an old server.
  return new Promise<void>((resolve) => {
    spawn(process.execPath, [join(root, "scripts", "aktualisieren.mjs"), SHA, "1"], {
      env: { ...process.env, PULT_QUELLE: quelle, PULT_UPDATE_OHNE_START: "1" },
      stdio: "ignore",
    }).on("close", () => resolve());
  });
}

function archive() {
  const src = sandbox();
  mkdirSync(join(src, "morte-main"));
  writeFileSync(join(src, "morte-main", "package.json"), '{"v":"new"}');
  writeFileSync(join(src, "morte-main", "neu.txt"), "da");
  const out = join(src, "a.tar.gz");
  spawnSync("tar", ["-czf", out, "-C", src, "morte-main"]);
  return readFileSync(out);
}

describe("aktualisieren.mjs", () => {
  it("replaces program files, keeps installed parts and the own node copy, and writes the version stamp", async () => {
    const root = oldInstall();
    const { server, url } = await serve(archive());
    try {
      await runUpdater(root, url);
    } finally {
      server.close();
    }
    expect(readFileSync(join(root, "package.json"), "utf8")).toContain("new");
    expect(existsSync(join(root, "neu.txt"))).toBe(true);
    expect(existsSync(join(root, "veraltet.txt"))).toBe(false);
    expect(readFileSync(join(root, "node_modules", "x", "i.js"), "utf8")).toBe("keep");
    expect(existsSync(join(root, "node", "marker"))).toBe(true);
    expect(readFileSync(join(root, ".pult-stand"), "utf8")).toBe(SHA);
  });

  it("leaves everything untouched when the download fails", async () => {
    const root = oldInstall();
    const { server, url } = await serve(null);
    try {
      await runUpdater(root, url);
    } finally {
      server.close();
    }
    expect(readFileSync(join(root, "package.json"), "utf8")).toContain("old");
    expect(existsSync(join(root, "veraltet.txt"))).toBe(true);
    expect(existsSync(join(root, ".pult-stand"))).toBe(false);
  });

  it("refuses to touch a development folder", async () => {
    const root = oldInstall();
    mkdirSync(join(root, ".git"));
    const { server, url } = await serve(archive());
    try {
      await runUpdater(root, url);
    } finally {
      server.close();
    }
    expect(existsSync(join(root, "veraltet.txt"))).toBe(true);
  });
});

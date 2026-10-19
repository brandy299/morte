// Runs the real install.sh, install.ps1 and "Pult starten.command" against a local stand-in for nodejs.org and GitHub.
// Node.js itself is faked by a tiny shell script that reports a version and, when it would start Pult, prints which copy ran.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { zipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repo = join(import.meta.dirname, "..", "..");
const NEW = "22.99.0";
const unix = process.platform !== "win32";
const findTool = (name: string, dirs: string[]) => dirs.map((d) => join(d, name)).find((p) => existsSync(p));
const systemDirs = (process.env.PATH ?? "").split(delimiter).concat(["/usr/bin", "/bin"]);
const pwsh = unix ? findTool("pwsh", systemDirs) : undefined;

/** A stand-in for node: `-v` and `-p` answer with the version, anything else means "start Pult". */
const fakeNode = (version: string) => `#!/bin/bash
case "$1" in
  -v) echo "v${version}" ;;
  -p) echo "${version.split(".")[0]}" ;;
  *) echo "LOS:$0" ;;
esac
`;

function run(cmd: string, args: string[], env: Record<string, string>, cwd: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code: code ?? -1, out }));
  });
}

const tarGz = async (dir: string, top: string, out: string) => {
  const r = await run("tar", ["-czf", out, "-C", dir, top], { PATH: process.env.PATH ?? "" }, dir);
  if (r.code !== 0) throw new Error(r.out);
  return readFileSync(out);
};

let base: string;
let server: Server;
let url: string;
let bin: string;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

beforeAll(async () => {
  if (!unix) return;
  base = mkdtempSync(join(tmpdir(), "pult-install-"));

  // Fake Node.js release: one tarball for all Mac/Linux names, one zip for the Windows names.
  const nodeTop = `node-v${NEW}-x`;
  mkdirSync(join(base, "n", nodeTop, "bin"), { recursive: true });
  writeFileSync(join(base, "n", nodeTop, "bin", "node"), fakeNode(NEW), { mode: 0o755 });
  const nodeTar = await tarGz(join(base, "n"), nodeTop, join(base, "node.tar.gz"));
  const exe = { os: 3, attrs: (0o100755 << 16) >>> 0 };
  // The Windows zip carries node.exe; the extra "node" lets PowerShell on Linux find the same file by name.
  const nodeZip = zipSync({ [`${nodeTop}/node.exe`]: [new TextEncoder().encode(fakeNode(NEW)), exe], [`${nodeTop}/node`]: [new TextEncoder().encode(fakeNode(NEW)), exe] });
  const names = ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64"].map((p) => `node-v${NEW}-${p}.tar.gz`);
  const zips = ["win-x64", "win-arm64"].map((p) => `node-v${NEW}-${p}.zip`);
  const sums = (wrong: boolean) =>
    [...names.map((n) => `${wrong ? "0".repeat(64) : sha(nodeTar)}  ${n}`), ...zips.map((n) => `${wrong ? "0".repeat(64) : sha(nodeZip)}  ${n}`)].join("\n") + "\n";

  // Fake Pult download, shaped like GitHub's archives (one top folder).
  const top = "morte-main";
  mkdirSync(join(base, "p", top, "scripts"), { recursive: true });
  writeFileSync(join(base, "p", top, "package.json"), "{}");
  writeFileSync(join(base, "p", top, "scripts", "los.mjs"), "");
  copyFileSync(join(repo, "Pult starten.command"), join(base, "p", top, "Pult starten.command"));
  const pultTar = await tarGz(join(base, "p"), top, join(base, "pult.tar.gz"));
  const pultZip = zipSync({ [`${top}/package.json`]: new TextEncoder().encode("{}"), [`${top}/scripts/los.mjs`]: new Uint8Array() });

  server = createServer((req, res) => {
    const path = req.url ?? "";
    const send = (body: string | Uint8Array) => res.end(body);
    if (path === "/pult.tar.gz") return send(pultTar);
    if (path === "/pult.zip") return send(pultZip);
    const m = /^\/(node|bad)\/(.+)$/.exec(path);
    if (m?.[2] === "SHASUMS256.txt") return send(sums(m[1] === "bad"));
    if (m && names.includes(m[2]!)) return send(nodeTar);
    if (m && zips.includes(m[2]!)) return send(nodeZip);
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // A PATH with the usual tools but without node.
  bin = join(base, "bin");
  mkdirSync(bin);
  for (const t of ["bash", "sh", "curl", "tar", "gzip", "awk", "sha256sum", "shasum", "mktemp", "uname", "rm", "mkdir", "find", "cp", "chmod", "mv", "dirname", "cat", "head", "sed", "grep", "env", "ls", "tr"]) {
    const p = findTool(t, ["/usr/bin", "/bin", "/usr/local/bin"]);
    if (p) symlinkSync(p, join(bin, t));
  }
});

afterAll(() => {
  server?.close();
  if (base) rmSync(base, { recursive: true, force: true });
});

// Each case starts real shells. PowerShell alone needs a few seconds to start on a cold CI machine, hence the long timeouts below.

/** A fresh case: its own Pult folder, optionally a fake system node of the given version. */
function scene(systemNode?: string) {
  const dir = mkdtempSync(join(base, "fall-"));
  const path = [bin];
  if (systemNode) {
    mkdirSync(join(dir, "sys"));
    writeFileSync(join(dir, "sys", "node"), fakeNode(systemNode), { mode: 0o755 });
    path.unshift(join(dir, "sys"));
  }
  return { dir, ziel: join(dir, "Pult"), PATH: path.join(delimiter) };
}

const sh = (s: ReturnType<typeof scene>, extra: Record<string, string> = {}) =>
  run("bash", [join(repo, "install.sh")], { PATH: s.PATH, HOME: s.dir, PULT_ZIEL: s.ziel, PULT_QUELLE: `${url}/pult.tar.gz`, PULT_NODE_QUELLE: `${url}/node`, ...extra }, s.dir);

describe.skipIf(!unix)("install.sh", { timeout: 60_000 }, () => {
  it("fetches its own Node.js when the computer has none, and starts Pult with it", async () => {
    const s = scene();
    const r = await sh(s);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain(`LOS:${s.ziel}/node/bin/node`);
  });

  it("fetches its own Node.js when the computer's one is too old, and the start file uses it later", async () => {
    const s = scene("18.0.0");
    const r = await sh(s);
    expect(r.out).toContain(`LOS:${s.ziel}/node/bin/node`);
    const start = await run("bash", [join(s.ziel, "Pult starten.command")], { PATH: s.PATH, HOME: s.dir }, s.dir);
    expect(start.out).toContain(`LOS:${s.ziel}/node/bin/node`);
  });

  it("leaves a suitable Node.js alone and downloads nothing", async () => {
    const s = scene("22.1.0");
    const r = await sh(s, { PULT_NODE_QUELLE: `${url}/down` });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain(`LOS:${s.dir}/sys/node`);
    expect(existsSync(join(s.ziel, "node"))).toBe(false);
  });

  it("renews an older own copy and keeps it through the update", async () => {
    const s = scene();
    mkdirSync(join(s.ziel, "node", "bin"), { recursive: true });
    writeFileSync(join(s.ziel, "node", "bin", "node"), fakeNode("22.1.0"), { mode: 0o755 });
    const r = await sh(s);
    expect(r.out).toContain("erneuere");
    const v = await run(join(s.ziel, "node", "bin", "node"), ["-v"], { PATH: s.PATH }, s.dir);
    expect(v.out.trim()).toBe(`v${NEW}`);
  });

  it("goes on with the own copy when nodejs.org cannot be reached", async () => {
    const s = scene();
    mkdirSync(join(s.ziel, "node", "bin"), { recursive: true });
    writeFileSync(join(s.ziel, "node", "bin", "node"), fakeNode("22.1.0"), { mode: 0o755 });
    const r = await sh(s, { PULT_NODE_QUELLE: `${url}/down` });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain(`LOS:${s.ziel}/node/bin/node`);
  });

  it("stops with a plain message on a wrong checksum and never touches a folder named in TMP", async () => {
    const s = scene();
    const fremd = join(s.dir, "fremd");
    mkdirSync(fremd);
    writeFileSync(join(fremd, "wichtig.txt"), "x");
    const r = await sh(s, { PULT_NODE_QUELLE: `${url}/bad`, TMP: fremd, TMPDIR: s.dir });
    expect(r.code).toBe(1);
    expect(r.out).toContain("Prüfsumme");
    expect(existsSync(join(fremd, "wichtig.txt"))).toBe(true);
  });

  it("stops with a plain message when Node.js cannot be downloaded and none is there", async () => {
    const s = scene();
    const r = await sh(s, { PULT_NODE_QUELLE: `${url}/down` });
    expect(r.code).toBe(1);
    expect(r.out).toContain("Der Download von Node.js hat nicht geklappt");
  });
});

describe.skipIf(!pwsh)("install.ps1 (PowerShell)", { timeout: 60_000 }, () => {
  const ps = (s: ReturnType<typeof scene>, extra: Record<string, string> = {}) =>
    run(pwsh!, ["-NoProfile", "-NonInteractive", "-File", join(repo, "install.ps1")], { PATH: s.PATH, HOME: s.dir, TEMP: s.dir, PULT_ZIEL: s.ziel, PULT_QUELLE: `${url}/pult.zip`, PULT_NODE_QUELLE: `${url}/node`, DOTNET_CLI_TELEMETRY_OPTOUT: "1", ...extra }, s.dir);

  it("fetches its own Node.js when the computer has none, and starts Pult with it", async () => {
    const s = scene();
    const r = await ps(s);
    expect(r.out).toContain(`LOS:${join(s.ziel, "node", "node")}`);
    expect(existsSync(join(s.ziel, "node", "node.exe"))).toBe(true);
    expect(existsSync(join(s.ziel, ".node-neu"))).toBe(false);
  });

  it("renews an older own copy, also when the computer's Node.js is fine", async () => {
    const s = scene("22.1.0");
    mkdirSync(join(s.ziel, "node"), { recursive: true });
    for (const f of ["node", "node.exe"]) writeFileSync(join(s.ziel, "node", f), fakeNode("22.1.0"), { mode: 0o755 });
    const r = await ps(s);
    expect(r.out).toContain("erneuere");
    const v = await run(join(s.ziel, "node", "node.exe"), ["-v"], { PATH: s.PATH }, s.dir);
    expect(v.out.trim()).toBe(`v${NEW}`);
  });

  it("stops with a plain message on a wrong checksum", async () => {
    const s = scene();
    const r = await ps(s, { PULT_NODE_QUELLE: `${url}/bad` });
    expect(r.out).toContain("Pruefsumme");
    expect(r.out).not.toContain("LOS:");
  });
});

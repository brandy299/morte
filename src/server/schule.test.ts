import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./index.ts";

const secrets = { kind: "file" as const, get: async () => undefined, set: async () => {}, delete: async () => {} };
const host = { host: "localhost:3001" };
let app: ReturnType<typeof createApp>;
let home: string;

beforeEach(async () => {
  home = process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-schule-api-"));
  app = createApp({ secrets, session: undefined, configured: undefined });
});

const png = () => {
  const c = createCanvas(200, 60);
  const x = c.getContext("2d");
  x.fillStyle = "#cc2200";
  x.fillRect(0, 0, 200, 60);
  return c.toBuffer("image/png");
};
const upload = (body: Uint8Array | string) => app.request("/api/schule/logo", { method: "POST", headers: { ...host, "content-type": "application/octet-stream" }, body: body as BodyInit });
const json = (body: unknown) => ({ method: "PUT", headers: { ...host, "content-type": "application/json" }, body: JSON.stringify(body) });

describe("school head in the settings (server)", () => {
  it("starts empty, saves name and logo, serves the gray logo, replaces it and removes it", async () => {
    expect(await (await app.request("/api/schule", { headers: host })).json()).toEqual({ name: "", hasLogo: false });
    expect((await app.request("/api/schule/logo", { headers: host })).status).toBe(404);

    expect(await (await app.request("/api/schule", json({ name: "Berufskolleg Musterstadt" }))).json()).toEqual({ name: "Berufskolleg Musterstadt", hasLogo: false });
    const saved = await upload(png());
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ name: "Berufskolleg Musterstadt", hasLogo: true });

    const logo = await app.request("/api/schule/logo", { headers: host });
    expect(logo.headers.get("content-type")).toBe("image/png");
    expect(logo.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await logo.arrayBuffer()).byteLength).toBeGreaterThan(100);
    expect(await readFile(join(home, "Einstellungen", "Schule.md"), "utf8")).toContain("Berufskolleg Musterstadt");

    expect(await (await app.request("/api/schule/logo", { method: "DELETE", headers: host })).json()).toEqual({ name: "Berufskolleg Musterstadt", hasLogo: false });
    expect(await (await app.request("/api/schule", json({ name: "" }))).json()).toEqual({ name: "", hasLogo: false });
  });

  it("turns down a file that is no picture, a name that is too long and a logo that is too big, with a German message", async () => {
    const text = await upload("Das ist ein Brief.");
    expect(text.status).toBe(400);
    expect((await text.json()).error).toMatch(/kein Bild/);

    const longName = await app.request("/api/schule", json({ name: "x".repeat(200) }));
    expect(longName.status).toBe(400);
    expect((await longName.json()).error).toMatch(/zu lang/);

    const big = await app.request("/api/schule/logo", { method: "POST", headers: { ...host, "content-length": String(4 * 1024 * 1024) }, body: "x" });
    expect(big.status).toBe(413);
    expect((await big.json()).error).toMatch(/zu groß/);
  });

  it("does not take a request from another site", async () => {
    const res = await app.request("/api/schule", { method: "PUT", headers: { host: "localhost:3001", origin: "https://boese.example", "content-type": "application/json" }, body: JSON.stringify({ name: "Fremd" }) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await (await app.request("/api/schule", { headers: host })).json()).toEqual({ name: "", hasLogo: false });
  });
});

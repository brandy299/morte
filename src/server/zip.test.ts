import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { zipFiles, zipName } from "../core/workspace/zip.ts";
import { createApp } from "./index.ts";

const secrets = { kind: "file" as const, get: async () => undefined, set: async () => {}, delete: async () => {} };
const host = { host: "localhost:3001" };
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  const home = (process.env.MORTE_HOME = await mkdtemp(join(tmpdir(), "morte-zip-")));
  await mkdir(join(home, "Exporte"), { recursive: true });
  await writeFile(join(home, "Exporte", "Blatt.pdf"), "pdf eins");
  await writeFile(join(home, "Exporte", "Loesung.pdf"), "pdf zwei");
  await writeFile(join(home, "Exporte", "geheim.sh"), "kein Material");
  await writeFile(join(home, "passwort.txt"), "außerhalb");
  app = createApp({ secrets, session: undefined, configured: undefined });
});

const url = (paths: string[], name?: string) => `/api/material/zip?${paths.map((p) => `path=${encodeURIComponent(p)}`).join("&")}${name ? `&name=${encodeURIComponent(name)}` : ""}`;

describe("zip of material", () => {
  it("packs the named files into one zip with a useful name", async () => {
    const res = await app.request(url(["Exporte/Blatt.pdf", "Exporte/Loesung.pdf"], "Der Wirtschaftskreislauf"), { headers: host });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(decodeURIComponent(res.headers.get("content-disposition")!)).toMatch(/Der-Wirtschaftskreislauf-\d{4}-\d\d-\d\d\.zip/);
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(["Blatt.pdf", "Loesung.pdf"]);
    expect(new TextDecoder().decode(files["Blatt.pdf"]!)).toBe("pdf eins");
  });

  it("leaves out everything that is not material in the data folder", async () => {
    const res = await app.request(url(["Exporte/Blatt.pdf", "Exporte/geheim.sh", "passwort.txt", "../passwort.txt", "Exporte/../passwort.txt"]), { headers: host });
    expect(Object.keys(unzipSync(new Uint8Array(await res.arrayBuffer())))).toEqual(["Blatt.pdf"]);
    expect((await app.request(url(["passwort.txt"]), { headers: host })).status).toBe(404);
    expect((await app.request("/api/material/zip", { headers: host })).status).toBe(400);
  });

  it("refuses foreign pages like the rest of the API", async () => {
    expect((await app.request(url(["Exporte/Blatt.pdf"]), { headers: { host: "evil.example" } })).status).toBe(403);
  });
});

describe("zip helpers", () => {
  it("numbers equal names and cleans odd characters", () => {
    const zip = unzipSync(zipFiles([{ name: "a.pdf", data: Uint8Array.of(1) }, { name: "a.pdf", data: Uint8Array.of(2) }, { name: "x/y:z.pdf", data: Uint8Array.of(3) }]));
    expect(Object.keys(zip).sort()).toEqual(["a-2.pdf", "a.pdf", "x_y_z.pdf"]);
  });

  it("names the zip after the title", () => {
    expect(zipName("Klausur 11a: Politik", new Date("2026-10-06T10:00:00Z"))).toBe("Klausur-11a-Politik-2026-10-06.zip");
    expect(zipName(undefined, new Date("2026-10-06T10:00:00Z"))).toBe("morte-material-2026-10-06.zip");
  });
});

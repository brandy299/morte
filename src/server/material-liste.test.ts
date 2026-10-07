import { mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./index.ts";

const secrets = { kind: "file" as const, get: async () => undefined, set: async () => {}, delete: async () => {} };
const host = { host: "localhost:3001" };
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  const home = (process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-liste-")));
  const material = join(home, "Klassen", "11a", "Business English", "01 Bewerbung", "Material");
  await mkdir(material, { recursive: true });
  await writeFile(join(material, "alt.pdf"), "a");
  await writeFile(join(material, "neu.docx"), "bb");
  await writeFile(join(material, "skript.sh"), "kein Material");
  await utimes(join(material, "alt.pdf"), new Date("2026-01-01"), new Date("2026-01-01"));
  await mkdir(join(home, "Klassen", "11a", "Business English", "02 Leer"), { recursive: true });
  app = createApp({ secrets, session: undefined, configured: undefined });
});

describe("material overview list", () => {
  it("lists material files of all classes, newest first, without other file types", async () => {
    const res = await app.request("/api/material/liste", { headers: host });
    const { dateien } = (await res.json()) as { dateien: { klasse: string; fach: string; reihe: string; name: string; path: string; size: number }[] };
    expect(dateien.map((d) => d.name)).toEqual(["neu.docx", "alt.pdf"]);
    expect(dateien[1]).toMatchObject({ klasse: "11a", fach: "Business English", reihe: "01 Bewerbung", size: 1, path: "Klassen/11a/Business English/01 Bewerbung/Material/alt.pdf" });
    // The path works with the download route.
    expect((await app.request(`/api/material?path=${encodeURIComponent(dateien[0]!.path)}`, { headers: host })).status).toBe(200);
  });

  it("is empty when there is nothing yet", async () => {
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-liste-"));
    expect(await (await app.request("/api/material/liste", { headers: host })).json()).toEqual({ dateien: [] });
  });
});

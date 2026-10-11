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
  await writeFile(join(material, "stueck.html"), "<script>1</script>");
  await utimes(join(material, "stueck.html"), new Date("2026-02-01"), new Date("2026-02-01"));
  await utimes(join(material, "alt.pdf"), new Date("2026-01-01"), new Date("2026-01-01"));
  await mkdir(join(home, "Klassen", "11a", "Business English", "02 Leer"), { recursive: true });
  app = createApp({ secrets, session: undefined, configured: undefined });
});

describe("material overview list", () => {
  it("lists material files of all classes, newest first, without other file types", async () => {
    const res = await app.request("/api/material/liste", { headers: host });
    const { dateien } = (await res.json()) as { dateien: { klasse: string; fach: string; reihe: string; name: string; path: string; size: number }[] };
    expect(dateien.map((d) => d.name)).toEqual(["neu.docx", "stueck.html", "alt.pdf"]);
    expect(dateien[2]).toMatchObject({ klasse: "11a", fach: "Business English", reihe: "01 Bewerbung", size: 1, path: "Klassen/11a/Business English/01 Bewerbung/Material/alt.pdf" });
    // The path works with the download route.
    expect((await app.request(`/api/material?path=${encodeURIComponent(dateien[0]!.path)}`, { headers: host })).status).toBe(200);
  });

  it("shows an explainer piece inline, but only inside a sandbox with no access to Pult and no network", async () => {
    const path = "Klassen/11a/Business English/01 Bewerbung/Material/stueck.html";
    const res = await app.request(`/api/material?path=${encodeURIComponent(path)}`, { headers: host });
    expect(res.headers.get("content-type")).toMatch(/^text\/html/);
    expect(res.headers.get("content-disposition")).toMatch(/^inline/);
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toMatch(/^sandbox allow-scripts;/);
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("allow-same-origin");
    const dl = await app.request(`/api/material?path=${encodeURIComponent(path)}&download=1`, { headers: host });
    expect(dl.headers.get("content-disposition")).toMatch(/^attachment/);
    expect(dl.headers.get("content-security-policy")).toContain("sandbox");
  });

  it("is empty when there is nothing yet", async () => {
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-liste-"));
    expect(await (await app.request("/api/material/liste", { headers: host })).json()).toEqual({ dateien: [] });
  });
});

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initWorkspace } from "../workspace/index.ts";
import { tools } from "./tools.ts";

const aufzeichnung = JSON.parse(await readFile(new URL("../commons/fixtures/suche-machtergreifung-1933.json", import.meta.url), "utf8"));
const foto = await readFile(new URL("../commons/fixtures/bild-960.jpg", import.meta.url));
const tool = (name: string) => tools.find((t) => t.name === name)!;
const run = (name: string, args: unknown) => tool(name).execute("t", args, undefined as never) as Promise<{ content: Array<{ type: string; text?: string; data?: string }>; details: any }>;

let requested: string[];
beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-ct-"));
  await initWorkspace();
  requested = [];
  vi.stubGlobal("fetch", async (u: URL) => {
    requested.push(String(u));
    if (u.hostname === "commons.wikimedia.org") return new Response(JSON.stringify(aufzeichnung), { status: 200 });
    if (u.hostname === "upload.wikimedia.org") return new Response(foto, { status: 200, headers: { "content-type": "image/jpeg" } });
    throw new Error(`unexpected host ${u.hostname}`);
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Commons-Werkzeuge", () => {
  it("haben deutsche Anzeigenamen", () => {
    expect(tool("commons_bilder_suchen").label).toBe("Bilder bei Wikimedia Commons suchen");
    expect(tool("commons_bild_einfuegen").label).toBe("Bild von Commons laden");
  });

  it("Suche zeigt Treffer mit Lizenz, Urheber und Vorschaubildern", async () => {
    const r = await run("commons_bilder_suchen", { suche: "Machtergreifung 1933" });
    const text = r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    expect(text).toContain("commons-5418919");
    expect(text).toContain("Lizenz: Public domain");
    expect(text).toContain("Urheber: Robert Sennecke");
    expect(r.content.filter((c) => c.type === "image").length).toBeGreaterThan(0);
    // The only commons.wikimedia.org request carries the search text and fixed fields, nothing else.
    const api = requested.filter((u) => u.startsWith("https://commons.wikimedia.org/"));
    expect(api).toHaveLength(1);
    expect(new URL(api[0]!).searchParams.get("gsrsearch")).toBe("Machtergreifung 1933");
    expect(requested.every((u) => /^https:\/\/(commons|upload)\.wikimedia\.org\//.test(u))).toBe(true);
  });

  it("fragt vor dem Einfügen nur, wenn ein Rechte-Hinweis da ist", async () => {
    // Recorded pages again, with the files that carry the Commons restriction "nazi" listed first.
    const pages = (aufzeichnung.query.pages as any[]).filter((p) => p.imageinfo[0].extmetadata.Restrictions?.value === "nazi" || p.pageid === 5418919);
    expect(pages.length).toBeGreaterThan(1);
    vi.stubGlobal("fetch", async (u: URL) => (u.hostname === "commons.wikimedia.org" ? new Response(JSON.stringify({ query: { pages } })) : new Response(foto)));
    await run("commons_bilder_suchen", { suche: "Plakat 1933" });
    const ask = tool("commons_bild_einfuegen").ask!;
    expect(ask({ id: "commons-5418919" })).toBeUndefined();
    const mit = pages.find((p) => p.imageinfo[0].extmetadata.Restrictions?.value === "nazi");
    const q = ask({ id: `commons-${mit.pageid}` });
    expect(q).toContain("Rechte-Hinweis");
    expect(q).toContain("Nationalsozialismus");
    expect(q).toContain("Soll ich es trotzdem");
  });

  it("Suche, Laden und Arbeitsblatt: PDF mit Bild und Quellenzeile", async () => {
    await run("commons_bilder_suchen", { suche: "Machtergreifung 1933" });
    const geladen = await run("commons_bild_einfuegen", { id: "commons-5418919" });
    expect(geladen.content[0]!.text).toContain("ist bereit");
    const r = await run("arbeitsblatt_erstellen", { titel: "Machtergreifung 1933", fach: "Geschichte", bild: "commons-5418919", aufgaben: [{ text: "Beschreibe das Foto.", zeilen: 3 }] });
    expect(r.content[0]!.text).toContain("ist fertig");
    expect(r.content[0]!.text).not.toContain("ohne diese Bilder");
    const pdf = await readFile(join(process.env.PULT_HOME!, r.details.materials[0].path));
    expect(pdf.length).toBeGreaterThan(foto.length / 2);
  });

  it("ein nicht geladenes Bild lässt das Blatt ohne Bild fertig werden und sagt, was fehlt", async () => {
    const r = await run("arbeitsblatt_erstellen", { titel: "Machtergreifung 1933", bild: "commons-424242", aufgaben: [{ text: "Beschreibe.", bild: "commons-7", zeilen: 2 }] });
    const text = r.content[0]!.text!;
    expect(text).toContain("ist fertig");
    expect(text).toContain("ohne diese Bilder fertig geworden");
    expect(text).toContain("Einleitung");
    expect(text).toContain("Aufgabe 1");
  });

  it("ohne Internet: verständliche Meldung statt Abbruch", async () => {
    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    });
    await expect(run("commons_bilder_suchen", { suche: "Reichstagsbrand" })).rejects.toThrow("nicht an Wikimedia Commons heran");
  });
});

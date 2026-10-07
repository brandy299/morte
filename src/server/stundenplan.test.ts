import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_ICS } from "../core/stundenplan/fixtures.ts";
import { createClass, createReihe, readReihe } from "../core/workspace/index.ts";
import { createApp } from "./index.ts";
import { checkLink } from "./stundenplan.ts";

let app: ReturnType<typeof createApp>;
const keys = new Map<string, string>();

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "morte-sps-"));
  keys.clear();
  app = createApp({
    secrets: { kind: "file", get: async (n) => keys.get(n), set: async (n, v) => void keys.set(n, v), delete: async (n) => void keys.delete(n) },
    session: undefined,
    configured: undefined,
  });
  await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
});
afterEach(() => vi.restoreAllMocks());

const form = (fields: Record<string, string | File>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const json = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const upload = (text = SAMPLE_ICS) => app.request("/api/stundenplan/datei", { method: "POST", body: form({ file: new File([text], "untis.ics") }) });

describe("timetable import", () => {
  it("takes a file, says what it covers, and then offers the titles", async () => {
    const res = await upload();
    expect((await res.json()).meta).toMatchObject({ quelle: "datei", anzahl: 6, von: "2026-10-12", bis: "2026-10-27" });
    expect(await (await app.request("/api/stundenplan")).json()).toMatchObject({ vorhanden: true, hatLink: false });
    const { titel, klassen } = await (await app.request("/api/stundenplan/titel")).json();
    expect(titel.map((t: { titel: string }) => t.titel)).toContain("Bus. Engl. 11a");
    expect(klassen).toEqual([{ name: "11a", faecher: ["Business English"] }]);
  });

  it("answers plainly to a file that is no timetable", async () => {
    const res = await upload("Das ist keine Datei");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/kein Kalender/);
    expect((await app.request("/api/stundenplan", {})).status).toBe(200);
  });

  it("loads from a link, keeps the link with the secrets, and refreshes from it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(SAMPLE_ICS));
    const res = await app.request("/api/stundenplan/link", json({ url: "webcal://untis.example.de/ical?key=GEHEIM" }));
    const { meta } = await res.json();
    expect(meta).toMatchObject({ quelle: "link", name: "untis.example.de/…" });
    expect(JSON.stringify(meta)).not.toContain("GEHEIM");
    expect(String(fetchMock.mock.calls[0]![0])).toBe("https://untis.example.de/ical?key=GEHEIM");
    expect(keys.get("ical-url")).toContain("GEHEIM");
    const { readFile: rf } = await import("node:fs/promises");
    expect(await rf(join(process.env.PULT_HOME!, "Stundenplan", "Quelle.json"), "utf8")).not.toContain("GEHEIM");
    expect((await app.request("/api/stundenplan/aktualisieren", { method: "POST" })).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await (await app.request("/api/stundenplan")).json()).toMatchObject({ hatLink: true });
  });

  it("explains a rejected link and a missing connection", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("no", { status: 403 }));
    expect((await (await app.request("/api/stundenplan/link", json({ url: "https://untis.example.de/x" }))).json()).error).toMatch(/nicht angenommen/);
    spy.mockImplementation(async () => {
      throw new Error("offline");
    });
    expect((await (await app.request("/api/stundenplan/link", json({ url: "https://untis.example.de/x" }))).json()).error).toMatch(/Internetverbindung/);
    expect((await (await app.request("/api/stundenplan/aktualisieren", { method: "POST" })).json()).error).toMatch(/kein Link/);
  });

  it("only fetches public https addresses", () => {
    expect(checkLink("webcal://a.example.de/x").protocol).toBe("https:");
    for (const bad of ["http://a.example.de/x", "https://localhost/x", "https://127.0.0.1/x", "https://192.168.1.5/x", "https://10.0.0.1/x", "https://intranet/x", "kein link", "ftp://a.de/x"]) {
      expect(() => checkLink(bad), bad).toThrow();
    }
  });

  it("removes the timetable and the stored link, but not the material", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(SAMPLE_ICS));
    await app.request("/api/stundenplan/link", json({ url: "https://untis.example.de/x" }));
    await app.request("/api/stundenplan", { method: "DELETE" });
    expect(await (await app.request("/api/stundenplan")).json()).toMatchObject({ vorhanden: false, hatLink: false });
  });
});

describe("week and drop", () => {
  beforeEach(async () => {
    await upload();
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
  });

  it("checks the assignment, and then shows the week with states", async () => {
    const bad = await app.request("/api/stundenplan/zuordnung", json({ zuordnung: { "englisch 11a": { klasse: "99z", fach: "x" } } }));
    expect(bad.status).toBe(400);
    const ok = await app.request("/api/stundenplan/zuordnung", json({ zuordnung: { "englisch 11a": { klasse: "11a", fach: "Business English" }, aufsicht: null } }));
    expect(ok.status).toBe(200);
    const res = await (await app.request("/api/woche?datum=2026-10-14")).json();
    expect(res.woche.montag).toBe("2026-10-12");
    expect(res.zurueck).toBe("2026-10-07");
    expect(res.weiter).toBe("2026-10-21");
    const monday = res.woche.tage[0].stunden[0];
    expect(monday).toMatchObject({ titel: "Englisch 11a", klasse: "11a", zustand: "nicht-geplant" });
    expect(res.woche.tage.at(-1).stunden).toEqual([]); // Friday: "Aufsicht" is not mine
    expect((await app.request("/api/woche?datum=gestern")).status).toBe(400);
  });

  it("files a dropped file in the series and enters it in the table", async () => {
    const res = await app.request("/api/woche/ablegen", {
      method: "POST",
      body: form({ file: new File(["Inhalt"], "Folien Interview.pptx"), klasse: "11a", fach: "Business English", datum: "2026-10-14", von: "09:45" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ reihe: "01 Bewerbung", datei: "2026-10-14_Mi0945_Folien-Interview.pptx" });
    expect(await readReihe("11a", "Business English", "Bewerbung")).toContain("Folien-Interview.pptx | Material fertig");
    // The file can be fetched again; a type that is not a picture or PDF is a download.
    const get = await app.request("/api/material?path=" + encodeURIComponent("Klassen/11a/Business English/01 Bewerbung/Material/2026-10-14_Mi0945_Folien-Interview.pptx"));
    expect(get.status).toBe(200);
    expect(get.headers.get("content-disposition")).toMatch(/^attachment/);
    expect(await get.text()).toBe("Inhalt");
  });

  it("refuses what it should, in plain words", async () => {
    const drop = (f: Record<string, string | File>) => app.request("/api/woche/ablegen", { method: "POST", body: form(f) });
    const base = { klasse: "11a", fach: "Business English", datum: "2026-10-14", von: "09:45" };
    expect((await (await drop({ ...base, file: new File(["x"], "virus.exe") })).json()).error).toMatch(/Dateityp/);
    expect((await (await drop({ ...base, datum: "morgen", file: new File(["x"], "a.pdf") })).json()).error).toMatch(/kenne ich nicht/);
    expect((await (await drop({ ...base, klasse: "99z", file: new File(["x"], "a.pdf") })).json()).error).toMatch(/gibt es nicht/);
    expect((await drop(base)).status).toBe(400);
  });

  it("serves pictures inline and never HTML or scripts", async () => {
    await app.request("/api/woche/ablegen", { method: "POST", body: form({ file: new File(["png"], "bild.png"), klasse: "11a", fach: "Business English", datum: "2026-10-14", von: "09:45" }) });
    const base = "Klassen/11a/Business English/01 Bewerbung/Material/";
    const img = await app.request("/api/material?path=" + encodeURIComponent(`${base}2026-10-14_Mi0945_bild.png`));
    expect(img.headers.get("content-type")).toBe("image/png");
    expect(img.headers.get("content-disposition")).toMatch(/^inline/);
    expect((await app.request("/api/material?path=" + encodeURIComponent(`${base}x.html`))).status).toBe(404);
    expect((await app.request("/api/material?path=" + encodeURIComponent("Stundenplan/untis.ics"))).status).toBe(404);
    void readFile;
  });
});

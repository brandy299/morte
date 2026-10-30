import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UserError } from "../workspace/index.ts";
import { bildHolen, dateityp, ERLAUBTE_HOSTS, holen, klartext, lizenzart, ohneDoppelt, pruefeTreffer, quellenzeile, rechteHinweise, skaliertUrl, suchen, trefferVon, umkodieren, type Deps, type Treffer } from "./index.ts";

// Real answer of commons.wikimedia.org, recorded on 2026-10-15 for "Machtergreifung 1933" (fields shortened).
const aufzeichnung = JSON.parse(await readFile(new URL("./fixtures/suche-machtergreifung-1933.json", import.meta.url), "utf8"));
const foto = await readFile(new URL("./fixtures/bild-960.jpg", import.meta.url));
const pages: any[] = aufzeichnung.query.pages;
const page = (title: string) => structuredClone(pages.find((p) => p.title.includes(title)));
const PD = () => page("146-1972-026-11");
const BYSA = () => page("102-15347");

/** A page with another license, made from a recorded one (the recording holds no NC or license-free file). */
const mitLizenz = (p: any, lizenz: string | undefined, extra: Record<string, unknown> = {}) => {
  const m = p.imageinfo[0].extmetadata;
  if (lizenz === undefined) delete m.LicenseShortName;
  else m.LicenseShortName.value = lizenz;
  for (const [k, v] of Object.entries(extra)) m[k] = { value: v };
  return p;
};

const antwort = (body: BodyInit | null, status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers });
const json = (o: unknown) => antwort(JSON.stringify(o), 200, { "content-type": "application/json" });

async function deps(handler: (url: URL, n: number) => Response | Promise<Response>): Promise<Deps & { urls: URL[]; waits: number[] }> {
  const urls: URL[] = [];
  const waits: number[] = [];
  return {
    cacheDir: await mkdtemp(join(tmpdir(), "pult-commons-")),
    urls,
    waits,
    sleep: async (ms) => void waits.push(ms),
    fetch: (async (u: URL) => {
      urls.push(new URL(u));
      return handler(new URL(u), urls.length);
    }) as unknown as typeof fetch,
  };
}

describe("Suche mit aufgezeichneter Antwort", () => {
  it("liefert höchstens 8 Treffer mit Lizenz und Urheber", async () => {
    const d = await deps(() => json(aufzeichnung));
    const { treffer, ausgelassen } = await suchen("Machtergreifung 1933", d);
    expect(treffer.length).toBe(8);
    expect(ausgelassen).toBeGreaterThan(0); // the PDF is left out
    for (const t of treffer) {
      expect(t.lizenz).toBeTruthy();
      expect(["gemeinfrei", "cc0", "cc-by", "cc-by-sa"]).toContain(t.lizenzart);
      expect(t.id).toMatch(/^commons-\d+$/);
      if (t.namensnennung) expect(t.urheber).toBeTruthy();
    }
    const pd = treffer.find((t) => t.lizenzart === "gemeinfrei");
    expect(pd).toBeDefined();
    expect(treffer.find((t) => t.id === "commons-5418919")).toMatchObject({ lizenz: "Public domain", urheber: "Robert Sennecke", namensnennung: false });
  });

  it("schickt nur den Suchtext, an die erlaubte Adresse, und merkt sich die Antwort", async () => {
    const d = await deps(() => json(aufzeichnung));
    await suchen("Machtergreifung 1933", d);
    expect(d.urls).toHaveLength(1);
    const u = d.urls[0]!;
    expect(u.hostname).toBe("commons.wikimedia.org");
    const frei = [...u.searchParams.entries()].filter(([k]) => k !== "gsrsearch").map(([k, v]) => `${k}=${v}`).join("&");
    expect(u.searchParams.get("gsrsearch")).toBe("Machtergreifung 1933");
    expect(frei).not.toMatch(/Klasse|\/|Users|home/i);
    await suchen("machtergreifung 1933", d); // second time from the cache
    expect(d.urls).toHaveLength(1);
  });

  it("lehnt leere und zu lange Suchtexte mit deutscher Meldung ab", async () => {
    const d = await deps(() => json(aufzeichnung));
    await expect(suchen("  ", d)).rejects.toThrow("Suchtext");
    await expect(suchen("x".repeat(121), d)).rejects.toThrow("zu lang");
    expect(d.urls).toHaveLength(0);
  });
});

describe("Lizenzfilter", () => {
  it("erlaubt gemeinfrei, CC0, CC BY, CC BY-SA", () => {
    expect(lizenzart("Public domain")).toBe("gemeinfrei");
    expect(lizenzart("PD-old-70")).toBe("gemeinfrei");
    expect(lizenzart("CC0")).toBe("cc0");
    expect(lizenzart("CC BY 4.0")).toBe("cc-by");
    expect(lizenzart("CC BY-SA 3.0 de")).toBe("cc-by-sa");
  });
  it("lehnt NC, ND, Unbekanntes und Leeres ab", () => {
    for (const l of ["CC BY-NC 2.0", "CC BY-NC-SA 3.0", "CC BY-ND 4.0", "Copyrighted free use", "All rights reserved", "", undefined]) expect(lizenzart(l), String(l)).toBeUndefined();
  });
  it("Treffer: Public domain, CC BY-SA kommen durch; CC BY-NC und fehlende Angabe nicht", () => {
    expect("treffer" in pruefeTreffer(PD())).toBe(true);
    expect("treffer" in pruefeTreffer(BYSA())).toBe(true);
    expect(pruefeTreffer(mitLizenz(PD(), "CC BY-NC 2.0"))).toMatchObject({ grund: expect.stringContaining("nicht erlaubt") });
    expect(pruefeTreffer(mitLizenz(PD(), undefined))).toMatchObject({ grund: "keine Lizenzangabe" });
  });
  it("Suche zeigt nur erlaubte Treffer, auch wenn die Antwort andere enthält", async () => {
    const mixed = { query: { pages: [PD(), BYSA(), mitLizenz(structuredClone(PD()), "CC BY-NC 2.0"), mitLizenz(structuredClone(PD()), undefined)].map((p, i) => ({ ...p, pageid: 100 + i, index: i })) } };
    const { treffer, ausgelassen } = await suchen("test", await deps(() => json(mixed)));
    expect(treffer).toHaveLength(2);
    expect(treffer.map((t) => t.lizenz)).toEqual(["Public domain", "CC BY-SA 3.0 de"]);
    expect(ausgelassen).toBe(2);
  });
  it("Urheber fehlt bei Namensnennungspflicht: nicht angeboten", () => {
    const p = BYSA();
    p.imageinfo[0].extmetadata.Artist.value = "";
    expect(pruefeTreffer(p)).toMatchObject({ grund: expect.stringContaining("Urheber") });
  });
  it("CC BY-SA lässt sich über die Konstante abschalten (Liste an einer Stelle)", async () => {
    const mod = await import("./index.ts");
    expect(mod.ERLAUBTE_LIZENZEN).toContain("cc-by-sa");
  });
});

describe("bild einfügen lehnt Unerlaubtes auch bei direktem Aufruf ab", () => {
  const gutes = (): Treffer => (pruefeTreffer(PD()) as { treffer: Treffer }).treffer;
  it("CC BY-NC", async () => {
    const d = await deps(() => antwort(foto));
    await expect(bildHolen({ ...gutes(), lizenz: "CC BY-NC 2.0", lizenzart: "cc-by-sa" }, d)).rejects.toThrow("darf Pult nicht einfügen");
    expect(d.urls).toHaveLength(0);
  });
  it("fehlende Lizenz", async () => {
    const d = await deps(() => antwort(foto));
    await expect(bildHolen({ ...gutes(), lizenz: "" }, d)).rejects.toThrow(UserError);
  });
  it("fehlender Urheber bei Namensnennung", async () => {
    const t = (pruefeTreffer(BYSA()) as { treffer: Treffer }).treffer;
    const d = await deps(() => antwort(foto));
    await expect(bildHolen({ ...t, urheber: undefined }, d)).rejects.toThrow("Urheber");
  });
  it("Adresse außerhalb von Commons", async () => {
    const d = await deps(() => antwort(foto));
    await expect(bildHolen({ ...gutes(), url: "https://example.com/a.jpg" }, d)).rejects.toThrow();
  });
  it("unbekannte Kennung", async () => {
    const d = await deps(() => antwort(foto));
    await expect(trefferVon("commons-999999999", d)).rejects.toThrow("kenne ich nicht");
    await expect(trefferVon("../../etc/passwd", d)).rejects.toThrow("ungültig");
  });
});

describe("Adresse", () => {
  const d = async () => deps(() => antwort("{}"));
  it("erlaubt nur die zwei Adressen", async () => {
    expect(ERLAUBTE_HOSTS).toEqual(["commons.wikimedia.org", "upload.wikimedia.org"]);
    const dd = await d();
    for (const bad of ["https://example.com/x", "http://commons.wikimedia.org/w/api.php", "https://thumb.wikimedia.org/a.jpg", "https://commons.wikimedia.org.evil.net/x", "https://evil.net/commons.wikimedia.org", "https://user:pw@commons.wikimedia.org/x", "https://commons.wikimedia.org:8443/x", "file:///etc/passwd", "ftp://commons.wikimedia.org/x"]) {
      await expect(holen(bad, dd), bad).rejects.toThrow(UserError);
    }
    expect(dd.urls).toHaveLength(0);
  });
  it("lehnt eine Weiterleitung auf eine andere Adresse ab", async () => {
    const dd = await deps((u) => (u.hostname === "commons.wikimedia.org" ? antwort(null, 302, { location: "https://evil.example/pic.jpg" }) : antwort("evil")));
    await expect(holen("https://commons.wikimedia.org/w/api.php", dd)).rejects.toThrow("nicht erlaubt");
    expect(dd.urls.map((u) => u.hostname)).toEqual(["commons.wikimedia.org"]);
  });
  it("lehnt eine Weiterleitung auf http ab, folgt einer erlaubten", async () => {
    const dd = await deps((u) => (u.pathname === "/a" ? antwort(null, 301, { location: "http://upload.wikimedia.org/b" }) : antwort("ok")));
    await expect(holen("https://commons.wikimedia.org/a", dd)).rejects.toThrow("nicht erlaubt");
    const ok = await deps((u) => (u.pathname === "/a" ? antwort(null, 301, { location: "https://upload.wikimedia.org/b" }) : antwort("ok")));
    expect(await (await holen("https://commons.wikimedia.org/a", ok)).text()).toBe("ok");
  });
  it("schickt einen User-Agent mit Pult und Projektadresse", async () => {
    let ua = "";
    const dd = await deps(() => antwort("ok"));
    const f = dd.fetch!;
    dd.fetch = (async (u: URL, init: RequestInit) => ((ua = String((init.headers as Record<string, string>)["User-Agent"])), f(u, init))) as unknown as typeof fetch;
    await holen("https://commons.wikimedia.org/x", dd);
    expect(ua).toContain("Pult");
    expect(ua).toContain("github.com/brandy299/morte");
  });
});

describe("Fehlerverhalten in einfacher Sprache", () => {
  it("bei 429 wartet es nach Retry-After und versucht es höchstens zweimal wieder", async () => {
    const dd = await deps((_u, n) => (n < 3 ? antwort("zu viele", 429, { "retry-after": "7" }) : json(aufzeichnung)));
    const r = await suchen("Test", dd);
    expect(r.treffer.length).toBeGreaterThan(0);
    expect(dd.waits).toEqual([7000, 7000]);
    expect(dd.urls).toHaveLength(3);
  });
  it("bei dauerhaftem 429 kommt eine verständliche Meldung statt stillem Abbruch", async () => {
    const dd = await deps(() => antwort("zu viele", 429, { "retry-after": "1" }));
    const err = await suchen("Test", dd).catch((e) => e);
    expect(err).toBeInstanceOf(UserError);
    expect(err.message).toContain("keine weiteren Anfragen");
    expect(err.message).toContain("ohne Bild");
    expect(dd.urls).toHaveLength(3);
  });
  it("ohne Internet", async () => {
    const dd = await deps(() => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    });
    const err = await suchen("Test", dd).catch((e) => e);
    expect(err).toBeInstanceOf(UserError);
    expect(err.message).toContain("nicht an Wikimedia Commons heran");
    expect(err.message).toContain("Internet");
  });
  it("bei Zeitüberschreitung", async () => {
    const dd = await deps(() => {
      throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
    });
    await expect(suchen("Test", dd)).rejects.toThrow("zu langsam");
  });
  it("bei Serverfehler", async () => {
    await expect(suchen("Test", await deps(() => antwort("kaputt", 503)))).rejects.toThrow("503");
  });
});

describe("Prüfung der Datei", () => {
  const gutes = (): Treffer => (pruefeTreffer(PD()) as { treffer: Treffer }).treffer;
  it("erkennt den Typ an den ersten Bytes, nicht am Namen", () => {
    expect(dateityp(foto)).toBe("image/jpeg");
    expect(dateityp(Buffer.from("<html>Wikimedia Error</html>"))).toBeUndefined();
    expect(dateityp(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeUndefined();
  });
  it("wandelt in Graustufen um, ohne Metadaten", async () => {
    const out = await umkodieren(foto);
    expect(dateityp(out.jpg)).toBe("image/jpeg");
    expect(out.jpg.includes(Buffer.from("Exif"))).toBe(false);
    expect(out.jpg.includes(Buffer.from("http://ns.adobe.com/xap"))).toBe(false);
    const { loadImage, createCanvas } = await import("@napi-rs/canvas");
    const img = await loadImage(out.jpg);
    const c = createCanvas(img.width, img.height).getContext("2d");
    c.drawImage(img, 0, 0);
    const px = c.getImageData(0, 0, img.width, img.height).data;
    let maxDiff = 0;
    for (let i = 0; i < px.length; i += 4 * 97) maxDiff = Math.max(maxDiff, Math.abs(px[i]! - px[i + 1]!), Math.abs(px[i + 1]! - px[i + 2]!));
    expect(maxDiff).toBeLessThanOrEqual(2);
  });
  it("Graustufen auch bei einem Farbfoto", async () => {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const cv = createCanvas(60, 40);
    const g = cv.getContext("2d");
    g.fillStyle = "#e02020";
    g.fillRect(0, 0, 30, 40);
    g.fillStyle = "#2040e0";
    g.fillRect(30, 0, 30, 40);
    const out = await umkodieren(cv.toBuffer("image/png"));
    const img = await loadImage(out.jpg);
    const c = createCanvas(60, 40).getContext("2d");
    c.drawImage(img, 0, 0);
    const [r, gg, b] = c.getImageData(10, 20, 1, 1).data;
    expect(Math.abs(r! - gg!)).toBeLessThanOrEqual(2);
    expect(Math.abs(gg! - b!)).toBeLessThanOrEqual(2);
  });
  it("lehnt HTML statt Bild und beschädigte Dateien ab", async () => {
    await expect(umkodieren(Buffer.from("<html>Fehler</html>"))).rejects.toThrow("kein Bild");
    await expect(umkodieren(Buffer.concat([foto.subarray(0, 300), Buffer.alloc(50, 7)]))).rejects.toThrow(UserError);
  });
  it("lädt, prüft und speichert; ein zweites Mal kommt es aus dem Zwischenspeicher", async () => {
    const dd = await deps(() => antwort(foto, 200, { "content-type": "image/jpeg" }));
    const q = await bildHolen(gutes(), dd);
    expect(q.quelle).toBe("Bild: To the power of Hitler. Urheber: Robert Sennecke. Lizenz: Public domain. Quelle: https://commons.wikimedia.org/wiki/File:Bundesarchiv_Bild_146-1972-026-11,_Machtübernahme_Hitlers.jpg");
    expect(dd.urls.map((u) => u.hostname)).toEqual(["upload.wikimedia.org"]);
    expect((await bildHolen(gutes(), dd)).jpg.equals(q.jpg)).toBe(true);
    expect(dd.urls).toHaveLength(1);
  });
  it("lehnt zu große Dateien ab", async () => {
    const dd = await deps(() => antwort(foto, 200, { "content-length": String(13 * 1024 * 1024) }));
    await expect(bildHolen(gutes(), dd)).rejects.toThrow("zu groß");
  });
  it("lehnt eine Fehlerseite statt des Bildes ab", async () => {
    const dd = await deps(() => antwort("<!DOCTYPE html><title>Wikimedia Error</title>", 200, { "content-type": "image/jpeg" }));
    await expect(bildHolen(gutes(), dd)).rejects.toThrow("kein JPG");
  });
  it("große Bilder und SVG werden als verkleinerte Kopie von upload.wikimedia.org geladen", async () => {
    const gross = { ...gutes(), breite: 4000, hoehe: 3000 };
    const dd = await deps(() => antwort(foto));
    await bildHolen(gross, dd);
    expect(dd.urls[0]!.pathname).toMatch(/\/thumb\/9\/93\/.+\/960px-/);
    expect(skaliertUrl("https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg?utm=x", 960)).toBe("https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/960px-Flag_of_Germany.svg.png");
    expect(skaliertUrl("https://example.com/wikipedia/commons/b/ba/x.svg", 960)).toBeUndefined();
  });
});

describe("Quellenzeile und Rechte-Hinweis", () => {
  it("kommt aus den Feldern der Schnittstelle, mit Titel, Urheber, Lizenz und Link", () => {
    const t = (pruefeTreffer(BYSA()) as { treffer: Treffer }).treffer;
    const z = quellenzeile(t);
    expect(z).toContain(t.titel);
    expect(z).toContain(t.urheber!);
    expect(z).toContain("CC BY-SA 3.0 de");
    expect(z).toContain("https://commons.wikimedia.org/wiki/File:");
  });
  it("fasst einen doppelt gelesenen Urheber zusammen (aufgezeichnet: Unknown author Unknown author)", () => {
    expect(ohneDoppelt("Unknown author Unknown author")).toBe("Unknown author");
    expect(ohneDoppelt("Robert Sennecke")).toBe("Robert Sennecke");
    expect(ohneDoppelt("Hans Hans Meier")).toBe("Hans Hans Meier");
  });
  it("macht aus HTML des Urhebers Klartext", () => {
    expect(klartext('<bdi><a href="x">Robert &amp; Sohn</a></bdi>')).toBe("Robert & Sohn");
    expect(klartext('<script>alert(1)</script>Text')).toBe("Text");
  });
  it("zeigt Restrictions in einfacher Sprache (aufgezeichnet: nazi)", () => {
    const p = pages.find((x) => x.imageinfo[0].extmetadata.Restrictions?.value === "nazi");
    const t = (pruefeTreffer(structuredClone(p)) as { treffer: Treffer }).treffer;
    expect(t.einschraenkungen).toEqual(["nazi"]);
    const hint = rechteHinweise(t).join(" ");
    expect(hint).toContain("Nationalsozialismus");
    expect(hint).toContain("erlaubt");
    expect(rechteHinweise({ einschraenkungen: [] })).toEqual([]);
    expect(rechteHinweise({ einschraenkungen: ["seltsam"] })[0]).toContain("seltsam");
  });
  it("trennt Restrictions nur an Komma, Strich und Semikolon (mehrere Wörter bleiben zusammen)", () => {
    const p = structuredClone(pages[0]);
    p.imageinfo[0].extmetadata.Restrictions = { value: "personality,freedom of panorama" };
    const t = (pruefeTreffer(p) as { treffer: Treffer }).treffer;
    expect(t.einschraenkungen).toEqual(["personality", "freedom of panorama"]);
    expect(rechteHinweise(t).join(" ")).toContain("Bauwerke");
  });
});

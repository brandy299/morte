import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { kontrast, STANDARD_STIL, STILE, stilInfo, stilZeile, themeCss } from "./stile.ts";
import { symbole, symbolMitId } from "./symbole.ts";
import { MaterialError } from "../material/layout.ts";
import { renderHtml, TAKT, vorschauSvg } from "./html.ts";
import { HINTERGRUENDE, LAYOUTS, MAX_SZENEN, parseErklaerstueck } from "./szene.ts";

const gut = {
  titel: "Der Wasserkreislauf",
  untertitel: "Wie Wasser immer wieder von vorn beginnt",
  szenen: [
    { layout: "aussage", kicker: "Worum es geht", titel: "Wasser geht nie verloren", text: "Es wechselt nur seinen Ort und seine Form: Meer, Wolke, Regen, Fluss.", symbol: "droplet" },
    { layout: "kreislauf", titel: "Das Wasser wandert im Kreis", punkte: [{ titel: "Meer", pfeil: "verdunstet", symbol: "droplets" }, { titel: "Wolke", pfeil: "regnet ab", symbol: "cloud" }, { titel: "Fluss", pfeil: "fließt zurück" }] },
    { layout: "zahl", zahl: "71 %", titel: "der Erde sind von Wasser bedeckt", text: "Nur ein kleiner Teil davon ist Süßwasser." },
    { layout: "merksatz", text: "Wasser verschwindet nicht, es wandert." },
  ],
};
const szene = (s: Record<string, unknown>) => parseErklaerstueck({ titel: "x", szenen: [s] });
const punkte = (n: number, mehr: Record<string, unknown> = {}) => Array.from({ length: n }, (_, i) => ({ titel: `Punkt ${i + 1}`, ...mehr }));

describe("parseErklaerstueck", () => {
  it("accepts good content and fills in look, tempo and background", () => {
    const e = parseErklaerstueck(gut);
    expect(e.szenen.map((s) => s.layout)).toEqual(["aussage", "kreislauf", "zahl", "merksatz"]);
    expect(e).toMatchObject({ stil: STANDARD_STIL, tempo: "mittel", hintergrund: "keiner" });
  });

  it("explains problems in plain words, with the scene and entry number", () => {
    expect(() => parseErklaerstueck({ titel: "x" })).toThrow("Es fehlen die Szenen.");
    expect(() => szene({ layout: "wolke", titel: "a" })).toThrow(/Szene 1: Das Layout \(layout\): „wolke“ gibt es nicht\. Erlaubt: punkte, schritte/);
    expect(() => szene({ layout: "punkte", punkte: punkte(3) })).toThrow(/Szene 1: Es fehlt: der Titel/);
    expect(() => szene({ layout: "punkte", titel: "a", punkte: [{ titel: "a" }, { text: "ohne Überschrift" }] })).toThrow(/Szene 1, Eintrag 2: Es fehlt: die Überschrift/);
    expect(() => szene({ layout: "punkte", titel: "a", punkte: punkte(2, { text: "x".repeat(111) }) })).toThrow(/Szene 1, Eintrag 1: .*zu lang/);
    expect(() => szene({ layout: "zahl", titel: "a" })).toThrow(/Szene 1: Es fehlt: die Zahl/);
    expect(() => szene({ layout: "merksatz" })).toThrow(/Szene 1: Es fehlt: der Merksatz/);
    expect(() => szene({ layout: "vergleich", titel: "a", punkte: punkte(2) })).toThrow(/Szene 1, Eintrag 1: Jede Seite eines Vergleichs braucht 1 bis 4 kurze Zeilen/);
    expect(() => szene({ layout: "zeitstrahl", titel: "a", punkte: punkte(3) })).toThrow(/Eintrag 1: Es fehlt: das Jahr oder Datum/);
    try {
      szene({ layout: "wolke" });
    } catch (e) {
      expect(e).toBeInstanceOf(MaterialError);
    }
  });

  it("limits scenes and the entries of each layout, and says what to do", () => {
    expect(() => parseErklaerstueck({ titel: "x", szenen: Array.from({ length: MAX_SZENEN + 1 }, () => gut.szenen[3]) })).toThrow(/Höchstens 10/);
    expect(() => szene({ layout: "punkte", titel: "a", punkte: punkte(7) })).toThrow(/braucht 2 bis 6 Einträge \(punkte\), es sind 7\. Verteile sie auf zwei Szenen/);
    expect(() => szene({ layout: "ablauf", titel: "a", punkte: punkte(1) })).toThrow(/braucht 2 bis 4 Einträge.*es sind 1\. Ergänze/);
    expect(() => szene({ layout: "vergleich", titel: "a", punkte: punkte(3, { liste: ["a"] }) })).toThrow(/braucht genau 2 Einträge/);
    expect(() => szene({ layout: "zahl", zahl: "5", titel: "a", punkte: punkte(2) })).toThrow(/Das Layout „zahl“ hat keine Einträge/);
    // five or more cards are narrow: their texts must be shorter
    expect(() => szene({ layout: "punkte", titel: "a", punkte: punkte(5, { text: "x".repeat(81) }) })).toThrow(/zu lang/);
    expect(szene({ layout: "punkte", titel: "a", punkte: punkte(4, { text: "x".repeat(81) }) }).szenen[0]!.punkte).toHaveLength(4);
  });

  it("keeps only what a layout shows", () => {
    const ablauf = szene({ layout: "ablauf", titel: "a", punkte: punkte(3, { pfeil: "weiter", zahl: "1900", liste: ["x"] }) }).szenen[0]!;
    expect(ablauf.punkte.map((p) => p.pfeil)).toEqual(["weiter", "weiter", undefined]); // the last station has no arrow
    expect(ablauf.punkte[0]).not.toHaveProperty("zahl");
    expect(szene({ layout: "kreislauf", titel: "a", punkte: punkte(3, { pfeil: "weiter" }) }).szenen[0]!.punkte[2]!.pfeil).toBe("weiter"); // back to the start
  });
});

describe("renderHtml", () => {
  const html = renderHtml(parseErklaerstueck(gut));

  it("is one self-contained file: no link, script or font from the net", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toMatch(/<link|src=|@import|https?:\/\/(?!www\.w3\.org)/);
    expect(html).not.toMatch(/url\((?!data:)/);
    expect(html).toContain("data:font/ttf;base64,");
  });

  it("has no random values and no clock, so the same description gives the same file", () => {
    expect(renderHtml(parseErklaerstueck(gut))).toBe(html);
    const eigen = html.slice(html.lastIndexOf("<script>"));
    expect(eigen).not.toMatch(/Math\.random|Date\.now|new Date/);
  });

  it("shows every scene as a slide in its layout, with the texts as real text, and escapes them", () => {
    for (const l of ["aussage", "kreislauf", "zahl", "merksatz"]) expect(html).toContain(`class="slide sz sz-${l}"`);
    expect(html).toContain("Wasser verschwindet nicht, es wandert.");
    expect(html).toContain(">71 %<");
    expect(html).toContain(symbolMitId("droplet")!.d);
    const frech = renderHtml(parseErklaerstueck({ titel: "a <b> & c", szenen: [{ layout: "merksatz", text: "<script>alert(1)</script>" }] }));
    expect(frech).toContain("a &lt;b&gt; &amp; c");
    expect(frech).not.toContain("<script>alert");
  });

  it("plans the timeline: every part appears in order, arrows are drawn, slower tempo takes longer", () => {
    const plan = (h: string) => JSON.parse(h.match(/const PLAN=(\{.*?\});\n/)![1]!) as { dauer: number; szenen: { id: string; start: number; ende: number; schritte: { id: string; at: number; art: string }[] }[] };
    const p = plan(html);
    expect(p.szenen.map((s) => s.id)).toEqual(["s0", "s1", "s2", "s3", "s4"]);
    // kreislauf with 3 stations: title, 3 cards, 2 arrows between them, the way back
    expect(p.szenen[2]!.schritte.map((x) => x.art)).toEqual(["ein", "ein", "pfeil", "ein", "pfeil", "ein", "ein"]);
    for (const s of p.szenen) {
      expect(s.schritte.map((x) => x.at)).toEqual([...s.schritte.map((x) => x.at)].sort((a, b) => a - b));
      for (const x of s.schritte) expect(html).toContain(`id="${x.id}"`);
      expect(s.ende).toBeGreaterThan(s.schritte.at(-1)!.at + TAKT.mittel.ein);
    }
    expect(plan(renderHtml(parseErklaerstueck({ ...gut, tempo: "ruhig" }))).dauer).toBeGreaterThan(p.dauer);
  });

  it("honours reduced motion and answers the preview's question about the scene", () => {
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain('e.data.pult!=="szene?"');
  });
});

describe("looks (stil)", () => {
  it("default to the standard look and explain an unknown one", () => {
    expect(parseErklaerstueck(gut).stil).toBe("editorial-serif");
    expect(() => parseErklaerstueck({ ...gut, stil: "wasserfarben" })).toThrow(/Der Stil \(stil\): „wasserfarben“ gibt es nicht\. Erlaubt: editorial-serif/);
  });

  it("each has a German name, a description and its own css from the kit, with colors that can be read", () => {
    expect(STILE.length).toBeGreaterThanOrEqual(20);
    expect(new Set(STILE.map((s) => s.id)).size).toBe(STILE.length);
    expect(new Set(STILE.map((s) => s.name)).size).toBe(STILE.length);
    for (const s of STILE) {
      expect(themeCss(s.id), s.id).toContain("--accent:");
      expect(themeCss(s.id), s.id).not.toMatch(/url\(|@import/); // nothing is loaded from anywhere
      const { farben: c } = stilInfo(s.id);
      for (const f of Object.values(c)) expect(f, s.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(kontrast(c.ink, c.bg), `${s.id} text`).toBeGreaterThanOrEqual(7);
      expect(kontrast(c.soft, c.bg), `${s.id} soft`).toBeGreaterThanOrEqual(4.5);
      expect(stilZeile(s)).toMatch(new RegExp(`^${s.id}: ${s.name}; `));
    }
  });

  it("draw a whole piece in the look's colors and fonts: Fraunces only where a serif shows", () => {
    const mit = (stil: string) => renderHtml(parseErklaerstueck({ ...gut, stil }));
    expect(mit("tokyo-night")).toContain("--bg:#1a1b26");
    expect(mit("tokyo-night")).not.toContain('font-family:"Fraunces";src');
    expect(mit("editorial-serif")).toContain('font-family:"Fraunces";src');
    expect(mit("editorial-serif").length).toBeGreaterThan(mit("tokyo-night").length);
    expect(mit("blueprint")).toContain("--font-display:var(--font-mono)");
  });

  it("never leave arrows, numbers or the small line in a color that cannot be read", () => {
    // yellow on cream: signs and the kicker take the text color, text on the yellow circle is dark
    const gelb = renderHtml(parseErklaerstueck({ ...gut, stil: "neo-brutalism" }));
    expect(gelb).toContain("--zeichen:var(--text-1)");
    expect(gelb).toContain("--auf-akzent:#111111");
    expect(gelb).toContain(":root .kicker{color:var(--text-2)}");
    const rot = renderHtml(parseErklaerstueck({ ...gut, stil: "editorial-serif" }));
    expect(rot).toContain("--zeichen:var(--accent)");
    expect(rot).toContain("--auf-akzent:#ffffff");
    expect(rot).not.toContain(":root .kicker{color");
  });

  it("show a still sample picture for the screen: rules stay inside their own box, no script, nothing loaded", () => {
    for (const s of STILE) {
      const bild = vorschauSvg(s.id);
      expect(bild, s.id).toMatch(/^<svg [^>]*viewBox="0 0 1280 720"/);
      expect(bild, s.id).not.toMatch(/<script|onload|url\(|@import|:root|data:font/);
      expect(bild, s.id).toContain(`.pv-${s.id}{`);
      expect(bild, s.id).not.toMatch(/\}\s*body\{/);
    }
  });
});

describe("symbols", () => {
  it("come from the set, with the German name to search by", () => {
    expect(symbole().length).toBeGreaterThan(200);
    expect(symbolMitId("droplet")).toMatchObject({ de: "Tropfen" });
  });

  it("are checked: an unknown one is explained", () => {
    expect(() => szene({ layout: "punkte", titel: "a", punkte: punkte(2, { symbol: "einhorn" }) })).toThrow(/Diese Symbole gibt es nicht: „einhorn“ \(Szene 1, Eintrag 1\), „einhorn“ \(Szene 1, Eintrag 2\)\. Such mit symbole_suchen/);
    expect(() => szene({ layout: "aussage", titel: "a", text: "b", symbol: "einhorn" })).toThrow(/Dieses Symbol gibt es nicht: „einhorn“ \(Szene 1\)/);
  });
});

describe("quiet backgrounds", () => {
  const muster = HINTERGRUENDE.filter((h) => h !== "keiner");

  it("are off unless chosen, and an unknown one is explained", () => {
    expect(parseErklaerstueck(gut).hintergrund).toBe("keiner");
    expect(parseErklaerstueck({ ...gut, hintergrund: "flecken" }).hintergrund).toBe("flecken");
    expect(() => parseErklaerstueck({ ...gut, hintergrund: "konfetti" })).toThrow(/Der Hintergrund: „konfetti“ gibt es nicht\. Erlaubt: wellenlinien/);
  });

  it("go into the file only when there is one", () => {
    expect(renderHtml(parseErklaerstueck({ ...gut, hintergrund: "punktraster" }))).toMatch(/id="hg"[\s\S]*PULT_HINTERGRUND/);
    const ohne = renderHtml(parseErklaerstueck(gut));
    expect(ohne).not.toContain('id="hg"');
    expect(ohne).not.toContain("var PULT_HINTERGRUND");
  });

  it("each one draws at any moment with sane numbers, and without chance: the same moment gives the same strokes", () => {
    const code = readFileSync(new URL("../../../assets/animation/hintergrund.js", import.meta.url), "utf8");
    const box: Record<string, unknown> = {};
    runInNewContext(code, box);
    const alle = box.PULT_HINTERGRUND as Record<string, (c: unknown, w: number, h: number, t: number, f: unknown) => void>;
    expect(Object.keys(alle).sort()).toEqual([...muster].sort());
    const aufzeichnen = (name: string, t: number) => {
      const log: string[] = [];
      const gradient = { addColorStop: () => {} };
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (s, key: string) =>
          key in s
            ? s[key]
            : (...args: unknown[]) => {
                for (const a of args) if (typeof a === "number" && !Number.isFinite(a)) throw new Error(`${name}: ${key} got ${a}`);
                log.push(`${key}(${args.map((a) => (typeof a === "number" ? a.toFixed(2) : String(a))).join(",")})`);
                return gradient;
              },
        set: (s, key: string, v) => {
          if (key === "globalAlpha" && (typeof v !== "number" || v < 0 || v > 1)) throw new Error(`${name}: globalAlpha ${v}`);
          s[key] = v;
          log.push(`${key}=${String(v)}`);
          return true;
        },
      });
      alle[name]!(ctx, 1280, 720, t, { accent: "#3f6b4a", fills: ["#cfe0b8", "#e8dcb0", "#bcd5de"], ton: "#7fa56a" });
      return log;
    };
    for (const name of muster) {
      for (const t of [0, 3.7, 42]) {
        const a = aufzeichnen(name, t);
        expect(a.some((x) => /^(fill|stroke|fillRect)\(/.test(x)), name).toBe(true);
        expect(aufzeichnen(name, t), name).toEqual(a);
      }
      expect(aufzeichnen(name, 1), name).not.toEqual(aufzeichnen(name, 6));
    }
  });
});

// Real browser checks run only where Playwright and Chromium exist (not a dependency of Pult, nothing is downloaded).
const browser = await (async () => {
  try {
    const dir = process.env.PULT_PLAYWRIGHT_DIR ?? "/opt/node22/lib/node_modules";
    const { chromium } = createRequire(import.meta.url)(createRequire(import.meta.url).resolve("playwright", { paths: [dir] }));
    const exe = process.env.PULT_CHROMIUM ?? "/opt/pw-browsers/chromium";
    return await chromium.launch({ executablePath: exe });
  } catch {
    return undefined;
  }
})();

/** The longest content each layout allows, in wide letters: if this fits, everything fits. */
const voll = (stil: string) => {
  const t = (n: number) => "Wirtschaftswachstum und Massenarbeitslosigkeit ".repeat(8).slice(0, n).trim();
  const p = (n: number, titel: number, text: number, mehr: Record<string, unknown> = {}) => Array.from({ length: n }, () => ({ titel: t(titel), text: text ? t(text) : undefined, ...mehr }));
  return parseErklaerstueck({
    titel: t(80), untertitel: t(120), kopf: t(60), stil, hintergrund: "punktraster",
    szenen: [
      { layout: "punkte", kicker: t(40), titel: t(70), text: t(120), punkte: p(6, 40, 80, { symbol: "droplet" }) },
      { layout: "punkte", kicker: t(40), titel: t(70), punkte: p(4, 40, 110, { symbol: "droplet" }) },
      { layout: "schritte", kicker: t(40), titel: t(70), punkte: p(5, 40, 80) },
      { layout: "ablauf", kicker: t(40), titel: t(70), punkte: p(4, 36, 90, { pfeil: t(18), symbol: "droplet" }) },
      { layout: "kreislauf", kicker: t(40), titel: t(70), punkte: p(4, 36, 90, { pfeil: t(18), symbol: "droplet" }) },
      { layout: "zahl", kicker: t(40), zahl: "12,5 Mio", titel: t(70), text: t(160) },
      { layout: "vergleich", kicker: t(40), titel: t(70), punkte: p(2, 36, 0, { liste: [t(70), t(70), t(70), t(70)] }) },
      { layout: "zeitstrahl", kicker: t(40), titel: t(70), punkte: p(5, 32, 80, { zahl: "12.12.1949" }) },
      { layout: "aussage", kicker: t(40), titel: t(70), text: t(280), symbol: "droplet" },
      { layout: "merksatz", kicker: t(40), text: t(170), quelle: t(60) },
    ],
  });
};

describe.skipIf(!browser)("in a real browser", () => {
  const open = async (html: string) => {
    const page = await browser!.newPage({ viewport: { width: 1280, height: 780 } });
    const problems: string[] = [];
    const requests: string[] = [];
    page.on("console", (m: { type(): string; text(): string }) => m.type() === "error" && problems.push(m.text()));
    page.on("pageerror", (e: Error) => problems.push(String(e)));
    page.on("request", (r: { url(): string }) => requests.push(r.url()));
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate("window.ready");
    return { page, problems, requests };
  };
  const html = renderHtml(parseErklaerstueck({ ...gut, hintergrund: "wellenlinien" }));

  it("starts without errors and asks for nothing from the net", async () => {
    const { page, problems, requests } = await open(html);
    expect(problems).toEqual([]);
    expect(requests.filter((u) => !u.startsWith("data:") && !u.startsWith("about:"))).toEqual([]);
    expect(await page.evaluate("window.dauer")).toBeGreaterThan(5000);
    await page.close();
  });

  it("shows the same picture at the same moment, in two runs", async () => {
    const shots: Buffer[] = [];
    for (let run = 0; run < 2; run++) {
      const { page } = await open(html);
      await page.evaluate("window.seek(9500)");
      shots.push(await page.screenshot());
      await page.close();
    }
    expect(shots[0]!.equals(shots[1]!)).toBe(true);
  }, 60000);

  it("draws the background and moves it with the timeline, not with the clock", async () => {
    const { page } = await open(html);
    const bild = () => page.evaluate("document.getElementById('hg').toDataURL()") as Promise<string>;
    await page.evaluate("window.seek(1000)");
    const frueh = await bild();
    await page.evaluate("window.seek(6000)");
    const spaet = await bild();
    await page.waitForTimeout(400);
    await page.evaluate("window.seek(1000)");
    expect(frueh).not.toBe(spaet);
    expect(await bild()).toBe(frueh);
    await page.close();
  }, 60000);

  it("cuts nothing off: the longest allowed content of every layout stays inside its slide, in every look", async () => {
    // Every part of every slide must lie inside the slide's box once the page has fitted it.
    const pruefen = `(() => { const out = []; document.querySelectorAll(".slide").forEach((s) => { const r = s.getBoundingClientRect(); s.querySelectorAll(".t").forEach((t) => { const b = t.getBoundingClientRect(); if (b.left < r.left - 1 || b.right > r.right + 1 || b.top < r.top - 1 || b.bottom > r.bottom + 1) out.push(s.id + " " + t.id); }); }); return out; })()`;
    for (const s of STILE) {
      const { page, problems } = await open(renderHtml(voll(s.id)));
      expect(problems, s.id).toEqual([]);
      expect(await page.evaluate(pruefen), s.id).toEqual([]);
      await page.close();
    }
  }, 180000);
});

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { katalog, stilZeile } from "./stile.ts";
import { MaterialError } from "../material/layout.ts";
import { farbenFuer, PALETTE, renderHtml, STIL, TAKT } from "./html.ts";
import { H, HINTERGRUENDE, hintergrundFuer, LAGEN, MAX_ELEMENTE, MAX_SZENEN, parseErklaerstueck, setzen, STILE, STIL_HINTERGRUND, stueckSetzen, W, type Box } from "./szene.ts";

const gut = {
  titel: "Der Wasserkreislauf",
  untertitel: "Wie Wasser immer wieder von vorn beginnt",
  szenen: [
    {
      titel: "Das Wasser steigt auf",
      elemente: [
        { art: "form", form: "sonne", lage: "oben-links", id: "s" },
        { art: "form", form: "wasser", lage: "unten-links", id: "w" },
        { art: "kasten", text: "Die Sonne erwärmt das Wasser", lage: "unten-rechts", id: "k" },
        { art: "form", form: "wolke", lage: "oben-rechts", id: "c" },
        { art: "pfeil", von: "w", nach: "c", text: "Verdunstung" },
      ],
    },
    { titel: "Wie viel Wasser ist das?", elemente: [{ art: "zahl", zahl: "71 %", text: "der Erde sind von Wasser bedeckt", lage: "mitte" }, { art: "text", text: "Nur ein kleiner Teil ist Süßwasser.", lage: "unten" }] },
  ],
};
const szene = (elemente: unknown[], titel?: string) => parseErklaerstueck({ titel: "x", szenen: [{ titel, elemente }] });

describe("parseErklaerstueck", () => {
  it("accepts good content and fills in palette and tempo", () => {
    const e = parseErklaerstueck(gut);
    expect(e.szenen).toHaveLength(2);
    expect(e.palette).toBe("wasser");
    expect(e.tempo).toBe("mittel");
  });

  it("explains problems in plain words, with the scene and element number", () => {
    expect(() => parseErklaerstueck({ titel: "x", szenen: [] })).toThrow("Es fehlen die Szenen.");
    expect(() => parseErklaerstueck({ szenen: gut.szenen })).toThrow("Es fehlt: der Titel.");
    expect(() => parseErklaerstueck({ titel: "x", szenen: [{ elemente: [{ art: "video", lage: "mitte" }] }] })).toThrow(/Szene 1, Element 1: Die Art: „video“ gibt es nicht\. Erlaubt: text, kasten/);
    expect(() => szene([{ art: "text", lage: "mitte" }])).toThrow("Szene 1, Element 1: Es fehlt: der Text.");
    expect(() => szene([{ art: "text", text: "a", lage: "ganz-weit-weg" }])).toThrow(/Die Lage: „ganz-weit-weg“ gibt es nicht/);
    expect(() => szene([{ art: "kasten", text: "x".repeat(81), lage: "mitte" }])).toThrow(/zu lang \(höchstens 80 Zeichen\)/);
    expect(() => parseErklaerstueck({ titel: "x", palette: "neon", szenen: gut.szenen })).toThrow(/„neon“ gibt es nicht/);
  });

  it("limits scenes and elements", () => {
    const eins = { elemente: [{ art: "text", text: "a", lage: "mitte" }] };
    expect(() => parseErklaerstueck({ titel: "x", szenen: Array.from({ length: MAX_SZENEN + 1 }, () => eins) })).toThrow(/Höchstens 10/);
    expect(() => szene(Array.from({ length: MAX_ELEMENTE + 1 }, () => ({ art: "text", text: "a", lage: "mitte" })))).toThrow(/Höchstens 8/);
  });

  it("checks that arrows point at real elements", () => {
    const a = { art: "kasten", text: "A", lage: "links", id: "a" };
    const b = { art: "kasten", text: "B", lage: "rechts", id: "b" };
    expect(() => szene([a, b, { art: "pfeil", von: "a", nach: "z" }])).toThrow("Der Pfeil zeigt auf „z“, das es in dieser Szene nicht gibt");
    expect(() => szene([a, b, { art: "pfeil", von: "a", nach: "a" }])).toThrow("beginnt und endet im selben Element");
    expect(() => szene([a, { ...b, id: "a" }])).toThrow("kommt zweimal vor");
    expect(() => szene([a, b, { art: "pfeil", id: "p", von: "a", nach: "b" }, { art: "pfeil", von: "a", nach: "p" }])).toThrow("nicht auf einen anderen Pfeil");
  });
});

const boxes = (g: ReturnType<typeof setzen>): Box[] => [
  ...(g.titel ? [g.titel] : []),
  ...g.elemente.flatMap((e): Box[] => (e.teil.k === "pfeil" ? (e.teil.etikett ? [e.teil.etikett] : []) : [e.teil])),
];

describe("layout", () => {
  it("keeps every part inside the stage and apart from every other part", () => {
    for (const g of stueckSetzen(parseErklaerstueck(gut))) {
      const bs = boxes(g);
      for (const b of bs) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(W);
        expect(b.y + b.h).toBeLessThanOrEqual(H);
      }
      bs.forEach((a, i) => bs.slice(i + 1).forEach((b) => expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false)));
    }
  });

  it("wraps long text instead of letting it run over the edge, in every cell", () => {
    const lang = "Donaudampfschifffahrtsgesellschaft und viele Wörter";
    for (const lage of LAGEN) {
      const [g] = stueckSetzen(szene([{ art: "text", text: lang, lage }]));
      const t = g!.elemente[0]!.teil as Box;
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + t.w).toBeLessThanOrEqual(W);
      expect(t.y + t.h).toBeLessThanOrEqual(H);
    }
  });

  it("refuses a cell that is too full, and says what to do", () => {
    const viel = Array.from({ length: 5 }, (_, i) => ({ art: "kasten", text: `Ein Kasten mit etwas Text Nummer ${i}`, lage: "mitte" }));
    expect(() => stueckSetzen(szene(viel))).toThrow(MaterialError);
    expect(() => stueckSetzen(szene(viel))).toThrow(/In „mitte“ ist zu viel\. Verteile die Elemente/);
  });

  it("refuses an arrow that would run across another element", () => {
    const e = szene([
      { art: "kasten", text: "A", lage: "links", id: "a" },
      { art: "kasten", text: "Dazwischen", lage: "mitte" },
      { art: "kasten", text: "B", lage: "rechts", id: "b" },
      { art: "pfeil", von: "a", nach: "b" },
    ]);
    expect(() => stueckSetzen(e)).toThrow(/geht über ein anderes Element/);
  });

  it("stacks several elements of one cell on top of each other", () => {
    const [g] = stueckSetzen(szene([{ art: "text", text: "Eins", lage: "mitte" }, { art: "text", text: "Zwei", lage: "mitte" }]));
    const [a, b] = g!.elemente.map((x) => x.teil as Box);
    expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.h);
  });
});

describe("renderHtml", () => {
  const html = renderHtml(parseErklaerstueck(gut));

  it("is one self-contained file: no link, script or font from the net", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toMatch(/(src|href)=["']https?:/);
    expect(html).not.toMatch(/url\(["']?https?:/);
    expect(html).toContain("anime.js");
    expect(html).toContain("@font-face");
  });

  it("has no random values and no clock, so the same description gives the same file", () => {
    expect(renderHtml(parseErklaerstueck(gut))).toBe(html);
    expect(html.replace(/<script>[\s\S]*?<\/script>/, "")).not.toMatch(/Math\.random|Date\.now|performance\.now/);
  });

  it("offers a text version for screen readers and honours reduced motion", () => {
    expect(html).toContain('<li>Die Sonne erwärmt das Wasser</li>');
    expect(html).toContain("prefers-reduced-motion: reduce");
    expect(html).toContain('<button id="zurueck"');
  });

  it("has enough contrast for the text on every palette", () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    for (const c of [...Object.values(PALETTE), ...Object.values(STIL).flatMap((x) => (x.farben ? [x.farben] : []))]) {
      for (const fill of [c.bg, ...c.fills]) expect(ratio(c.ink, fill)).toBeGreaterThanOrEqual(7);
      expect(ratio(c.accent, c.bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(c.soft, c.bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(TAKT.zuegig.schritt).toBeLessThan(TAKT.ruhig.schritt);
  });
});

describe("quiet backgrounds", () => {
  const muster = HINTERGRUENDE.filter((h) => h !== "keiner");

  it("take turns when none is chosen: the title decides, the same piece keeps its own", () => {
    expect(muster).toContain(hintergrundFuer("Der Wasserkreislauf"));
    expect(parseErklaerstueck(gut).hintergrund).toBe(hintergrundFuer(gut.titel));
    const gesehen = new Set(Array.from({ length: 60 }, (_, i) => hintergrundFuer(`Thema ${i}`)));
    expect([...gesehen].sort()).toEqual([...muster].sort());
  });

  it("can be chosen or switched off, and an unknown one is explained", () => {
    expect(parseErklaerstueck({ ...gut, hintergrund: "flecken" }).hintergrund).toBe("flecken");
    expect(parseErklaerstueck({ ...gut, hintergrund: "keiner" }).hintergrund).toBe("keiner");
    expect(() => parseErklaerstueck({ ...gut, hintergrund: "konfetti" })).toThrow(/Der Hintergrund: „konfetti“ gibt es nicht\. Erlaubt: wellenlinien/);
  });

  it("go into the file only when there is one", () => {
    expect(renderHtml(parseErklaerstueck({ ...gut, hintergrund: "punktraster" }))).toMatch(/id="hg"[\s\S]*PULT_HINTERGRUND/);
    const ohne = renderHtml(parseErklaerstueck({ ...gut, hintergrund: "keiner" }));
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
      alle[name]!(ctx, W, H, t, { accent: PALETTE.wiese.accent, fills: PALETTE.wiese.fills, ton: PALETTE.wiese.huegel });
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

describe.skipIf(!browser)("in a real browser", () => {
  const html = renderHtml(parseErklaerstueck(gut));
  const open = async () => {
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

  it("starts without errors and asks for nothing from the net", async () => {
    const { page, problems, requests } = await open();
    expect(problems).toEqual([]);
    expect(requests.filter((u) => !u.startsWith("data:") && !u.startsWith("about:"))).toEqual([]);
    expect(await page.evaluate("window.dauer")).toBeGreaterThan(5000);
    await page.close();
  });

  it("shows the same picture at the same moment, in two runs", async () => {
    const shots: Buffer[] = [];
    for (let run = 0; run < 2; run++) {
      const { page } = await open();
      await page.evaluate("window.seek(9500)");
      shots.push(await page.screenshot());
      await page.close();
    }
    expect(shots[0]!.equals(shots[1]!)).toBe(true);
  }, 60000);

  it("draws the background and moves it with the timeline, not with the clock", async () => {
    const { page } = await open();
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
});

describe("looks (stil)", () => {
  it("default to watercolor and explain an unknown one", () => {
    expect(parseErklaerstueck(gut).stil).toBe("wasserfarben");
    expect(() => parseErklaerstueck({ ...gut, stil: "konfetti" })).toThrow(/Der Stil \(stil\): „konfetti“ gibt es nicht\. Erlaubt: wasserfarben, brutalismus/);
  });

  it("give each look its own background unless one is chosen", () => {
    for (const [stil, hg] of Object.entries(STIL_HINTERGRUND)) {
      expect(parseErklaerstueck({ ...gut, stil }).hintergrund).toBe(hg);
      expect(parseErklaerstueck({ ...gut, stil, hintergrund: "keiner" }).hintergrund).toBe("keiner");
    }
  });

  it("draw every look to a file with its own colors, and only watercolor with the wobbly filter", () => {
    const html = Object.fromEntries(STILE.map((stil) => [stil, renderHtml(parseErklaerstueck({ ...gut, stil }))]));
    for (const stil of STILE) {
      expect(html[stil], stil).toContain(`<rect width="${W}" height="${H}" fill="${farbenFuer({ stil, palette: "wasser" }).bg}"/>`);
      expect(html[stil], stil).toContain('<button id="zurueck"');
    }
    expect(html.wasserfarben).toContain('filter="url(#wc)"');
    for (const stil of ["brutalismus", "zeitung", "blaupause"] as const) expect(html[stil], stil).not.toContain('<g filter="url(#wc)"');
    // brutalism: hard shadow plus thick outline on the box
    expect(html.brutalismus).toContain('stroke-width="6"');
    // the palette only matters for watercolor
    expect(renderHtml(parseErklaerstueck({ ...gut, stil: "zeitung", palette: "abend" }))).toBe(html.zeitung);
  });

  it("keep the sans look smaller than it needs to be: only the font in use goes into the file", () => {
    expect(renderHtml(parseErklaerstueck({ ...gut, stil: "brutalismus" }))).toContain("font-weight:700");
    expect(renderHtml(parseErklaerstueck(gut))).toContain("font-weight:600");
  });
});

describe("catalog of looks", () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

  it("holds many looks, none named after a company, each readable", () => {
    const k = katalog();
    expect(k.length).toBeGreaterThanOrEqual(30);
    expect(new Set(k.map((s) => s.id)).size).toBe(k.length);
    for (const s of k) {
      for (const f of [s.bg, ...s.fills]) expect(ratio(s.ink, f), `${s.id} text on ${f}`).toBeGreaterThanOrEqual(7);
      expect(ratio(s.accent, s.bg), `${s.id} accent`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(s.soft, s.bg), `${s.id} soft`).toBeGreaterThanOrEqual(4.5);
    }
    for (const marke of ["ferrari", "binance", "stripe", "spotify", "tesla"]) expect(k.map((s) => s.id)).not.toContain(marke);
  });

  it("can be chosen by id and draw a whole piece in its own colors", () => {
    for (const s of katalog()) {
      const e = parseErklaerstueck({ ...gut, stil: s.id });
      expect(e.stil).toBe(s.id);
      const html = renderHtml(e);
      expect(html, s.id).toContain(`<rect width="${W}" height="${H}" fill="${s.bg}"/>`);
      expect(html, s.id).not.toContain("url(#wc)\"><rect");
    }
  });

  it("describes a look in a line the assistant can use", () => {
    const z = stilZeile(katalog().find((s) => s.id === "neobrutalism")!);
    expect(z).toMatch(/^neobrutalism: Neobrutalism/);
    expect(z).toContain("harte Schatten");
  });
});

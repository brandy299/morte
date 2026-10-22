import { createRequire } from "node:module";
import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import type { Bild } from "../bilder/index.ts";
import { PALETTE } from "../animation/html.ts";
import { daten, FEEDBACK, renderUebung } from "./html.ts";
import { lueckenTeile, MAX_SCHRITTE, parseUebung } from "./schema.ts";

const gut = {
  titel: "Das Fenster von PowerPoint",
  untertitel: "Eine Übung",
  schritte: [
    { art: "info", titel: "Worum geht es?", text: "PowerPoint hat fünf Bereiche.", punkte: ["Menüband", "Arbeitsfläche"] },
    { art: "auswahl", frage: "Wo sind die Befehle?", optionen: [{ text: "Im Menüband", richtig: true, erklaerung: "Dort sind sie." }, { text: "In der Statusleiste", richtig: false }] },
    { art: "lueckentext", aufgabe: "Ergänze.", text: "Die {Arbeitsfläche|Folie} ist in der {Mitte}.", hilfe: true },
    { art: "zuordnung", aufgabe: "Ordne zu.", paare: [{ links: "Menüband", rechts: "Befehle" }, { links: "Statusleiste", rechts: "Zoom" }, { links: "Notizfeld", rechts: "Hinweise" }] },
    { art: "offen", aufgabe: "Beschreibe.", woerter: 5, musterloesung: "So." },
    { art: "checkliste", titel: "Das kann ich", punkte: ["Ich kenne die Bereiche", "Ich finde die Befehle"] },
  ],
};
const eins = (schritt: unknown) => parseUebung({ titel: "x", schritte: [schritt] });

describe("parseUebung", () => {
  it("accepts good content and fills in the palette", () => {
    const u = parseUebung(gut);
    expect(u.schritte).toHaveLength(6);
    expect(u.palette).toBe("wasser");
    expect(u.schritte[1]).toMatchObject({ art: "auswahl", mehrere: false });
  });

  it("explains problems in plain words with the step number", () => {
    expect(() => parseUebung({ titel: "x", schritte: [] })).toThrow("Es fehlen die Schritte.");
    expect(() => parseUebung({ schritte: gut.schritte })).toThrow("Es fehlt: der Titel.");
    expect(() => eins({ art: "video" })).toThrow(/Schritt 1: Die Art „video“ gibt es nicht\. Erlaubt: info, auswahl/);
    expect(() => parseUebung({ titel: "x", schritte: Array.from({ length: MAX_SCHRITTE + 1 }, () => gut.schritte[0]) })).toThrow(/Höchstens 20/);
    expect(() => eins({ art: "info", titel: "T" })).toThrow("Schritt 1: Eine Info braucht einen Text oder Punkte.");
    expect(() => eins({ art: "info", text: "x" })).toThrow("Schritt 1: Es fehlt: der Titel.");
  });

  it("checks multiple choice: at least one right and one wrong answer, no duplicates, every flag set", () => {
    const o = (text: string, richtig?: boolean) => ({ text, richtig });
    expect(() => eins({ art: "auswahl", frage: "F", optionen: [o("a", false), o("b", false)] })).toThrow("Keine Antwort ist als richtig markiert.");
    expect(() => eins({ art: "auswahl", frage: "F", optionen: [o("a", true), o("b", true)] })).toThrow("Alle Antworten sind als richtig markiert");
    expect(() => eins({ art: "auswahl", frage: "F", optionen: [o("a", true), o("A", false)] })).toThrow("denselben Text");
    expect(() => eins({ art: "auswahl", frage: "F", optionen: [o("a", true), o("b")] })).toThrow("Schritt 1, Antwort 2: Es fehlt, ob die Antwort richtig ist");
    expect(() => eins({ art: "auswahl", frage: "F", optionen: [o("a", true)] })).toThrow("Nötig sind 2 bis 5");
    expect(eins({ art: "auswahl", frage: "F", optionen: [o("a", true), o("b", true), o("c", false)] }).schritte[0]).toMatchObject({ mehrere: true });
  });

  it("reads gaps with alternatives and refuses broken ones", () => {
    expect(lueckenTeile("Die {Sonne|Sterne} scheint {hell}.", "S")).toEqual([{ text: "Die " }, { luecke: ["Sonne", "Sterne"] }, { text: " scheint " }, { luecke: ["hell"] }, { text: "." }]);
    expect(() => eins({ art: "lueckentext", text: "Kein Loch." })).toThrow("hat keine Lücke");
    expect(() => eins({ art: "lueckentext", text: "Ein {} Loch." })).toThrow("Eine Lücke ist leer");
    expect(() => eins({ art: "lueckentext", text: "Offen {Loch" })).toThrow("passen nicht zusammen");
    expect(() => eins({ art: "lueckentext", text: "{a}{b}{c}{d}{e}{f}{g}" })).toThrow("7 Lücken");
  });

  it("checks pairs: two to six, every side unique", () => {
    const p = (links: string, rechts: string) => ({ links, rechts });
    expect(() => eins({ art: "zuordnung", aufgabe: "A", paare: [p("a", "x")] })).toThrow("Nötig sind 2 bis 6");
    expect(() => eins({ art: "zuordnung", aufgabe: "A", paare: [p("a", "x"), p("b", "X")] })).toThrow("auf der rechten Seite denselben Text");
    expect(() => eins({ art: "zuordnung", aufgabe: "A", paare: [p("a", "x"), p("A", "y")] })).toThrow("auf der linken Seite denselben Text");
  });

  it("checks the word goal and the checklist", () => {
    expect(() => eins({ art: "offen", aufgabe: "A", woerter: 0 })).toThrow("von 1 bis 300");
    expect(() => eins({ art: "checkliste", titel: "T", punkte: ["nur einer"] })).toThrow("mindestens 2 Einträge");
  });
});

describe("renderUebung", () => {
  const u = parseUebung(gut);
  const html = renderUebung(u);

  it("is one self-contained file: no link, script, font or picture from the net", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toMatch(/(src|href)=["']https?:/);
    expect(html).not.toMatch(/url\(["']?https?:/);
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie/);
    expect(html).toContain("@font-face");
  });

  it("is the same file every time", () => {
    expect(renderUebung(parseUebung(gut))).toBe(html);
  });

  it("puts the right sides of pairs in a fixed order that is never the order of the left sides", () => {
    const z = daten(u).schritte[3]! as { rechts: string[]; paare: { rechts: string }[] };
    expect([...z.rechts].sort()).toEqual(z.paare.map((p) => p.rechts).sort());
    expect(z.rechts).not.toEqual(z.paare.map((p) => p.rechts));
  });

  it("cannot be broken out of by text from the model", () => {
    const evil = renderUebung(parseUebung({ titel: "</title><script>alert(1)</script>", schritte: [{ art: "info", titel: "</script><img src=x onerror=alert(1)>", text: "<b>x</b>" }] }));
    expect(evil).not.toContain("<script>alert(1)");
    expect(evil).not.toContain("<img src=x");
    expect(evil.match(/<\/script>/g)).toHaveLength(2);
  });

  it("has enough contrast for right and wrong feedback and the text on every palette", () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    expect(ratio(FEEDBACK.okInk, FEEDBACK.okBg)).toBeGreaterThanOrEqual(7);
    expect(ratio(FEEDBACK.badInk, FEEDBACK.badBg)).toBeGreaterThanOrEqual(7);
    for (const c of Object.values(PALETTE)) {
      expect(ratio(c.ink, "#fffaf0")).toBeGreaterThanOrEqual(7);
      expect(ratio("#ffffff", c.accent)).toBeGreaterThanOrEqual(4.5); // white text on the main button
      expect(ratio(c.soft, c.bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(c.ink, c.fills[0])).toBeGreaterThanOrEqual(7); // explanation boxes
    }
  });
});

// Real browser checks run only where Playwright and Chromium exist (not a dependency of Pult, nothing is downloaded).
const browser = await (async () => {
  try {
    const dir = process.env.PULT_PLAYWRIGHT_DIR ?? "/opt/node22/lib/node_modules";
    const req = createRequire(import.meta.url);
    const { chromium } = req(req.resolve("playwright", { paths: [dir] }));
    return await chromium.launch({ executablePath: process.env.PULT_CHROMIUM ?? "/opt/pw-browsers/chromium" });
  } catch {
    return undefined;
  }
})();

describe.skipIf(!browser)("in a real browser", () => {
  const html = renderUebung(parseUebung(gut));
  const open = async () => {
    const page = await browser!.newPage({ viewport: { width: 420, height: 820 } });
    const problems: string[] = [];
    const requests: string[] = [];
    page.on("console", (m: { type(): string; text(): string }) => m.type() === "error" && problems.push(m.text()));
    page.on("pageerror", (e: Error) => problems.push(String(e)));
    page.on("request", (r: { url(): string }) => requests.push(r.url()));
    await page.setContent(html, { waitUntil: "load" });
    return { page, problems, requests };
  };

  it("runs through all steps, marks right and wrong, and counts at the end, without errors or requests", async () => {
    const { page, problems, requests } = await open();
    const click = (t: string) => page.click(`button:has-text("${t}")`);
    await click("Weiter"); // info
    await page.click("text=In der Statusleiste");
    await click("Prüfen");
    expect(await page.textContent(".meldung")).toBe("Nicht ganz.");
    expect(await page.locator(".option.bad").count()).toBe(1);
    expect(await page.locator(".option.fehlt").count()).toBe(1);
    await click("Weiter");
    const gaps = page.locator("input.luecke");
    await gaps.nth(0).fill("  folie ");
    await gaps.nth(1).fill("Mitte.");
    await click("Prüfen");
    expect(await page.textContent(".meldung")).toBe("Richtig.");
    await click("Weiter");
    const sels = page.locator("select");
    await sels.nth(0).selectOption("Befehle");
    await sels.nth(1).selectOption("Zoom");
    await sels.nth(2).selectOption("Zoom");
    await click("Prüfen");
    expect(await page.textContent(".meldung")).toBe("2 von 3 richtig zugeordnet.");
    await click("Weiter");
    await page.fill("textarea", "Eins zwei drei");
    expect(await page.textContent(".zaehler")).toContain("3 Wörter");
    await click("Weiter");
    await page.locator("input[type=checkbox]").first().check();
    await click("Fertig");
    expect(await page.textContent(".ergebnis")).toBe("Du hast 4 von 6 richtig.");
    expect(problems).toEqual([]);
    expect(requests.filter((u) => !u.startsWith("data:") && !u.startsWith("about:"))).toEqual([]);
    await page.close();
  }, 60000);

  it("asks for an answer before it checks, and keeps the checked state when going back", async () => {
    const { page } = await open();
    await page.click('button:has-text("Weiter")');
    await page.click('button:has-text("Prüfen")');
    expect(await page.textContent(".meldung")).toBe("Wähle zuerst eine Antwort.");
    await page.click("text=Im Menüband");
    await page.click('button:has-text("Prüfen")');
    await page.click('button:has-text("Weiter")');
    await page.click('button:has-text("Zurück")');
    expect(await page.locator(".option.ok").count()).toBe(1);
    expect(await page.locator('button:has-text("Prüfen")').isHidden()).toBe(true);
    await page.close();
  }, 30000);

  it("shows nothing wrong in reduced motion and reads the result aloud", async () => {
    const { page } = await open();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.click('button:has-text("Weiter")');
    await page.click("text=Im Menüband");
    await page.click('button:has-text("Prüfen")');
    expect(await page.textContent("#ansage")).not.toBeNull();
    await page.close();
  }, 30000);
});


// ---- "Wo klickst du?" ----

/** An invented window, drawn here: no real program, no real data. The ribbon is big, the button sits inside it. */
const bildMit = (id: string, extra: Partial<Bild> = {}): Bild => {
  const c = createCanvas(1200, 700);
  const g = c.getContext("2d");
  g.fillStyle = "#dddddd";
  g.fillRect(0, 0, 1200, 700);
  return {
    id,
    titel: "Fenster eines Beispielprogramms",
    programm: "Beispiel",
    breite: 1200,
    hoehe: 700,
    png: c.toBuffer("image/png"),
    elemente: [
      { id: "menueband", name: "Menüband", ort: "oben", rechteck: [0, 40, 1200, 110] },
      { id: "fett", name: "Fett", ort: "Start › Schriftart › Fett", rechteck: [100, 60, 60, 40] },
      { id: "status", name: "Statusleiste", rechteck: [0, 670, 1200, 30] },
    ],
    ...extra,
  };
};
const klick = (bild: Bild | undefined, extra: object = {}) => ({ art: "klick", aufgabe: "Wo schaltest du den Text fett?", bildDaten: bild, ziel: "fett", ...extra });

describe("klick step (Wo klickst du?)", () => {
  it("accepts a place of the picture and carries the picture", () => {
    const u = eins(klick(bildMit("fenster")));
    expect(u.schritte[0]).toMatchObject({ art: "klick", ziel: "fett", aufgabe: "Wo schaltest du den Text fett?" });
  });

  it("explains in plain words: no picture, unknown place, a picture with a single place", () => {
    expect(() => eins(klick(undefined))).toThrow("Schritt 1: Das Bild fehlt.");
    expect(() => eins(klick(bildMit("fenster"), { ziel: "gibtsnicht" }))).toThrow(/Die Stelle „gibtsnicht“ gibt es im Bild „fenster“ nicht\. Vorhanden: menueband, fett, status\./);
    expect(() => eins(klick(bildMit("fenster"), { ziel: undefined }))).toThrow("die gesuchte Stelle");
    expect(() => eins(klick(bildMit("allein", { elemente: [{ id: "fett", name: "Fett", rechteck: [0, 0, 10, 10] }] })))).toThrow("nur eine Stelle");
  });

  it("limits the number and the total size of the pictures", () => {
    const vier = ["a", "b", "c", "d"].map((id) => klick(bildMit(id)));
    expect(() => parseUebung({ titel: "x", schritte: vier })).toThrow(/benutzt 4 verschiedene Bilder\. Höchstens 3/);
    const gross = bildMit("gross", { png: Buffer.alloc(13 * 1024 * 1024) });
    expect(() => eins(klick(gross))).toThrow("zusammen zu groß");
    const dreiMal = ["a", "a", "a", "a"].map((id) => klick(bildMit(id)));
    expect(parseUebung({ titel: "x", schritte: dreiMal }).schritte).toHaveLength(4); // the same picture is one picture
  });

  it("puts every picture into the page once and lists the places biggest first", () => {
    const u = parseUebung({ titel: "x", schritte: [klick(bildMit("fenster")), klick(bildMit("fenster"), { ziel: "status", aufgabe: "Wo ist die Statusleiste?" })] });
    const d = daten(u);
    expect(Object.keys(d.bilder)).toEqual(["fenster"]);
    expect(d.bilder.fenster!.src).toMatch(/^data:image\/png;base64,/);
    expect(d.bilder.fenster!.elemente.map((e) => e.id)).toEqual(["menueband", "status", "fett"]); // by area, so the small button lies on top of the ribbon
    expect(d.schritte[0]).toMatchObject({ art: "klick", bild: "fenster", ziel: "fett" });
    expect(JSON.stringify(d.schritte)).not.toContain("data:image"); // the steps name the picture, they do not carry it
    const html = renderUebung(u);
    expect(html.match(/data:image\/png;base64,/g)).toHaveLength(1);
  });
});

describe.skipIf(!browser)("klick step in a real browser", () => {
  const open = async () => {
    const page = await browser!.newPage({ viewport: { width: 420, height: 820 } });
    const problems: string[] = [];
    page.on("pageerror", (e: Error) => problems.push(String(e)));
    await page.setContent(renderUebung(parseUebung({ titel: "Fenster", schritte: [klick(bildMit("fenster"))] })), { waitUntil: "load" });
    return { page, problems };
  };

  it("takes a click on the small place inside the big one, not on the big one", async () => {
    const { page, problems } = await open();
    await page.click('button.stelle[aria-label="Fett"]');
    expect(await page.textContent(".meldung")).toBe("Richtig: Fett.");
    expect(await page.locator("button.stelle.ok").count()).toBe(1);
    expect(await page.textContent(".erkl")).toContain("Start › Schriftart › Fett");
    expect(problems).toEqual([]);
    await page.close();
  }, 30000);

  it("counts a click beside every place as a miss, shows the wrong place, and gives three tries", async () => {
    const { page } = await open();
    await page.click('button.stelle[aria-label="Menüband"]', { position: { x: 200, y: 12 } });
    expect(await page.textContent(".meldung")).toBe("Das war „Menüband“, nicht die gesuchte Stelle. Noch 2 Versuche.");
    expect(await page.locator("button.stelle.bad").count()).toBe(1);
    await page.click(".bildkarte img", { position: { x: 10, y: 100 } });
    expect(await page.textContent(".meldung")).toBe("Dort ist nichts Gesuchtes. Noch 1 Versuch.");
    await page.click('button.stelle[aria-label="Statusleiste"]');
    expect(await page.textContent(".meldung")).toContain("Hier ist sie: Fett.");
    expect(await page.locator("button.stelle.ok").count()).toBe(1);
    expect(await page.locator("button.stelle:not(:disabled)").count()).toBe(0);
    await page.close();
  }, 30000);

  it("works with the keyboard and keeps the result when going back", async () => {
    const { page } = await open();
    await page.focus('button.stelle[aria-label="Fett"]');
    await page.keyboard.press("Enter");
    expect(await page.textContent(".meldung")).toBe("Richtig: Fett.");
    expect(await page.textContent(".ergebnis, .zahl")).toContain("Schritt 1 von 1");
    await page.click('button:has-text("Fertig")');
    expect(await page.textContent(".ergebnis")).toBe("Du hast 1 von 1 richtig.");
    await page.click('button.link:has-text("Wo schaltest")');
    expect(await page.locator("button.stelle.ok").count()).toBe(1);
    await page.close();
  }, 30000);
});


describe("karten step (flashcards)", () => {
  const karten = [{ vorne: "to rely on", hinten: "sich verlassen auf" }, { vorne: "to apply for", hinten: "sich bewerben um" }];
  it("accepts 2 to 12 cards with different fronts", () => {
    expect(eins({ art: "karten", titel: "Vokabeln", karten }).schritte[0]).toMatchObject({ art: "karten", karten });
  });
  it("explains in plain words: too few, too many, empty side, same front", () => {
    expect(() => eins({ art: "karten", titel: "T", karten: [karten[0]] })).toThrow("Es sind 1 Karten. Nötig sind 2 bis 12.");
    expect(() => eins({ art: "karten", titel: "T", karten: Array.from({ length: 13 }, (_, i) => ({ vorne: `v${i}`, hinten: "h" })) })).toThrow("Nötig sind 2 bis 12");
    expect(() => eins({ art: "karten", titel: "T", karten: [karten[0], { vorne: "x", hinten: "" }] })).toThrow("Schritt 1, Karte 2");
    expect(() => eins({ art: "karten", titel: "T", karten: [karten[0], { vorne: "TO RELY ON", hinten: "x" }] })).toThrow("dieselbe Vorderseite");
    expect(() => eins({ art: "karten", titel: "T" })).toThrow("Es fehlen die Karten.");
  });
});

describe.skipIf(!browser)("karten step in a real browser", () => {
  it("turns the cards, counts what was known and does not count for the score", async () => {
    const page = await browser!.newPage({ viewport: { width: 420, height: 820 } });
    const problems: string[] = [];
    page.on("pageerror", (e: Error) => problems.push(String(e)));
    const karten = [{ vorne: "to rely on", hinten: "sich verlassen auf" }, { vorne: "to apply for", hinten: "sich bewerben um" }];
    await page.setContent(renderUebung(parseUebung({ titel: "V", schritte: [{ art: "karten", titel: "Vokabeln", karten }] })), { waitUntil: "load" });
    expect(await page.textContent(".kartentext")).toBe("to rely on");
    await page.click('button:has-text("Umdrehen")');
    expect(await page.textContent(".kartentext")).toBe("sich verlassen auf");
    await page.click('button:has-text("Gewusst")');
    expect(await page.textContent(".zaehler")).toBe("Karte 2 von 2");
    await page.click('button:has-text("Umdrehen")');
    await page.click('button:has-text("Noch üben")');
    expect(await page.textContent(".ergebnis")).toBe("Gewusst: 1 von 2.");
    await page.click('button:has-text("Fertig")');
    expect(await page.locator(".ergebnis").count()).toBe(0); // no score line: cards are a self-check
    expect(await page.textContent("h2")).toBe("Geschafft");
    expect(problems).toEqual([]);
    await page.close();
  }, 30000);
});


describe("kreuzwort step (crossword)", () => {
  const woerter = [
    { wort: "Wirtschaft", hinweis: "Alles, was mit Herstellen und Verkaufen zu tun hat" },
    { wort: "Angebot", hinweis: "Was Firmen zum Kauf anbieten" },
    { wort: "Nachfrage", hinweis: "Was Kunden kaufen wollen" },
    { wort: "Preis", hinweis: "Das kostet etwas" },
    { wort: "Markt", hinweis: "Hier treffen sich Käufer und Verkäufer" },
  ];
  const gitterVon = (w = woerter) => (eins({ art: "kreuzwort", titel: "Markt", kreuzwoerter: w }).schritte[0] as Extract<ReturnType<typeof parseUebung>["schritte"][number], { art: "kreuzwort" }>).gitter;

  it("lays every word on the grid, crossing only at shared letters and never side by side", () => {
    const g = gitterVon();
    expect(g.eintraege).toHaveLength(5);
    const zellen = new Map<string, string>();
    for (const e of g.eintraege) {
      for (let i = 0; i < e.wort.length; i++) {
        const r = e.zeile + (e.richtung === "senkrecht" ? i : 0), c = e.spalte + (e.richtung === "waagerecht" ? i : 0);
        expect(r).toBeLessThan(g.zeilen);
        expect(c).toBeLessThan(g.spalten);
        const da = zellen.get(`${r},${c}`);
        if (da !== undefined) expect(da).toBe(e.wort[i]); // a crossing has the same letter in both words
        zellen.set(`${r},${c}`, e.wort[i]!);
      }
    }
    // every run of two or more letters in the grid is one of the words, so nothing touches by accident
    const laeufe = new Set<string>();
    for (let r = 0; r < g.zeilen; r++) for (let c = 0; c < g.spalten; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
        if (!zellen.has(`${r},${c}`) || zellen.has(`${r - dr},${c - dc}`)) continue;
        let w = "", k = 0;
        while (zellen.has(`${r + dr * k},${c + dc * k}`)) w += zellen.get(`${r + dr * k},${c + dc * k}`)!, k++;
        if (w.length > 1) laeufe.add(w);
      }
    }
    expect([...laeufe].sort()).toEqual(woerter.map((w) => w.wort.toUpperCase()).sort());
  });

  it("numbers the clues in reading order and gives the same grid every time", () => {
    const g = gitterVon();
    expect(g.eintraege.map((e) => e.nr)).toEqual([...g.eintraege.map((e) => e.nr)].sort((a, b) => a - b));
    expect(g.eintraege[0]!.nr).toBe(1);
    expect(gitterVon()).toEqual(g);
  });

  it("explains in plain words: count, letters, short word, doubles, a word that does not fit", () => {
    expect(() => gitterVon(woerter.slice(0, 3))).toThrow("Es sind 3 Wörter. Nötig sind 4 bis 10.");
    expect(() => gitterVon([...woerter.slice(0, 4), { wort: "Zwei Worte", hinweis: "x" }])).toThrow("darf nur aus Buchstaben bestehen");
    expect(() => gitterVon([...woerter.slice(0, 4), { wort: "ab", hinweis: "x" }])).toThrow("zu kurz");
    expect(() => gitterVon([...woerter.slice(0, 4), { wort: "preis", hinweis: "x" }])).toThrow("zweimal");
    expect(() => gitterVon([...woerter.slice(0, 4), { wort: "Jux", hinweis: "x" }])).toThrow(/„JUX“ lässt sich nicht ins Rätsel legen/);
    expect(() => eins({ art: "kreuzwort", titel: "T" })).toThrow("Es fehlen die Wörter.");
  });
});

describe.skipIf(!browser)("kreuzwort step in a real browser", () => {
  it("types along the word, checks by word and shows the right letters", async () => {
    const page = await browser!.newPage({ viewport: { width: 420, height: 900 } });
    const problems: string[] = [];
    page.on("pageerror", (e: Error) => problems.push(String(e)));
    const u = parseUebung({ titel: "R", schritte: [{ art: "kreuzwort", titel: "Markt", kreuzwoerter: [
      { wort: "Wirtschaft", hinweis: "a" }, { wort: "Angebot", hinweis: "b" }, { wort: "Nachfrage", hinweis: "c" }, { wort: "Preis", hinweis: "d" }, { wort: "Markt", hinweis: "e" },
    ] }] });
    await page.setContent(renderUebung(u), { waitUntil: "load" });
    await page.click('button:has-text("Prüfen")');
    expect(await page.textContent(".meldung")).toBe("Trage zuerst mindestens einen Buchstaben ein.");
    const erster = u.schritte[0]!.art === "kreuzwort" ? u.schritte[0]!.gitter.eintraege.find((e) => e.nr === 1)! : undefined;
    await page.locator(".gitter input").first().click();
    await page.keyboard.type(erster!.wort.slice(0, 3));
    expect(await page.locator(".gitter input").evaluateAll((l: Element[]) => l.map((i) => (i as HTMLInputElement).value).join(""))).toBe(erster!.wort.slice(0, 3));
    await page.click('button:has-text("Prüfen")');
    expect(await page.textContent(".meldung")).toBe("0 von 5 Wörtern stimmen. Die richtigen Buchstaben stehen jetzt im Gitter.");
    expect(await page.locator(".gitter input.ok").count()).toBe(3);
    expect(await page.locator(".gitter input.bad").count()).toBeGreaterThan(10);
    expect(problems).toEqual([]);
    await page.close();
  }, 30000);
});

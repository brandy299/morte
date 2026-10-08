import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { bildNamen, fixtureBild } from "./bilder.ts";
import { BLOCKED } from "../agent/index.ts";
import { PROGRAMM } from "./checks.ts";
import { parseCsv } from "./csv.ts";
import { judgeCase, judgePrompt, parseVerdicts } from "./judge.ts";
import { markdown, rates } from "./report.ts";
import { runCase } from "./run.ts";
import { loadSuites } from "./suite.ts";
import type { Criterion, EvalCase, Transcript } from "./types.ts";

const evalsDir = join(process.cwd(), "evals");
const turn = (assistant: string, extra: Partial<Transcript["turns"][number]> = {}) => ({ user: "x", assistant, steps: [], fragen: [], ...extra });
const transcript = (over: Partial<Transcript> = {}): Transcript => ({ turns: [turn("Fertig.")], files: [], tabelle: "", kosten: 0, ...over });
const kase = (erwartet: EvalCase["erwartet"] = {}): EvalCase => ({ id: "t", skill: "arbeitsblatt", nachrichten: ["x"], erwartet });
const crit = (id: string, art: Criterion["art"] = "Prüfer"): Criterion => ({ id, gruppe: "P", kriterium: id, bestandenWenn: "…", hinweis: "", bedingung: "", art });

describe("csv", () => {
  it("reads quotes, commas and line breaks inside fields", () => {
    expect(parseCsv('a,b\n"x, y","sie sagte ""ja""\nund ging"\n')).toEqual([["a", "b"], ["x, y", 'sie sagte "ja"\nund ging']]);
  });
});

describe("the criteria and test sets in evals/", () => {
  it("load, have unique ids, and every program criterion has a check", async () => {
    const suites = await loadSuites(evalsDir);
    expect(suites.length).toBeGreaterThanOrEqual(7);
    for (const s of suites) {
      expect(s.faelle.length, s.skill).toBeGreaterThanOrEqual(2);
      for (const k of s.kriterien.filter((x) => x.art === "Programm")) expect(PROGRAMM[k.id], `${s.skill}: ${k.id}`).toBeTypeOf("function");
    }
  });

  it("cover the bundled skills that make material or answer teachers, and name only skills that exist", async () => {
    const suites = (await loadSuites(evalsDir)).map((s) => s.skill);
    const bundled = (await readdir(join(process.cwd(), "skills"))).filter((n) => !n.startsWith("."));
    for (const name of suites) expect(bundled, `Zu evals/${name} fehlt die Anleitung`).toContain(name);
    for (const name of ["arbeitsblatt", "differenzieren", "klausur", "lernsituation", "stunde-planen", "stunde-vorbereiten", "verstaendnis-check"]) expect(suites).toContain(name);
  });
});

describe("pictures for test cases", () => {
  it("are drawn from invented sheets and every test case names one that exists", async () => {
    const b = await fixtureBild("telephoning");
    expect(b.mimeType).toBe("image/png");
    expect(Buffer.from(b.data, "base64").subarray(1, 4).toString()).toBe("PNG");
    expect(b.text).toContain("Telephoning");
    expect(b.text).toContain("I'll put you through.");
    const cases = (await loadSuites(evalsDir)).flatMap((s) => s.faelle);
    for (const name of cases.flatMap((c) => c.bilder ?? [])) expect(bildNamen(), name).toContain(name);
    expect(cases.filter((c) => c.bilder?.length).length).toBeGreaterThanOrEqual(2);
  });
});

describe("checks the program can decide", () => {
  it("catches technical words in answers", () => {
    expect(PROGRAMM["G-TECHNIK"]!(kase(), transcript({ turns: [turn("Ich rufe arbeitsblatt_erstellen auf.")] })).bestanden).toBe(false);
    expect(PROGRAMM["G-TECHNIK"]!(kase(), transcript({ turns: [turn("Die Datei Blatt.pdf ist fertig.")] })).bestanden).toBe(false);
    expect(PROGRAMM["G-TECHNIK"]!(kase(), transcript({ turns: [turn("Das Blatt ist fertig, du siehst es rechts.")] })).bestanden).toBe(true);
  });

  it("counts pages, checks the note about the missing curriculum, and skips what does not apply", () => {
    const pdf = (seiten: number, text = "Ohne hinterlegten Lehrplan erstellt") => ({ name: "a.pdf", art: "pdf" as const, text, seiten });
    expect(PROGRAMM["G-SEITEN"]!(kase(), transcript({ files: [pdf(4)] })).bestanden).toBe(false);
    expect(PROGRAMM["G-SEITEN"]!(kase({ maxSeiten: 4 }), transcript({ files: [pdf(4)] })).bestanden).toBe(true);
    expect(PROGRAMM["G-SEITEN"]!(kase(), transcript()).bestanden).toBeNull();
    expect(PROGRAMM["G-HINWEIS"]!(kase(), transcript({ files: [pdf(1, "kein Hinweis")] })).bestanden).toBe(false);
    expect(PROGRAMM["G-MATERIAL"]!(kase({ material: true }), transcript()).bestanden).toBe(false);
    expect(PROGRAMM["G-MATERIAL"]!(kase(), transcript()).bestanden).toBeNull();
  });

  it("reads the lesson table for the date and for material", () => {
    const withMaterial = "| Datum | Stunde | Thema | Material | Status |\n|---|---|---|---|---|\n| 14.10. |  | Anschreiben | a.pdf | Material fertig |";
    const without = withMaterial.replace("a.pdf", "");
    expect(PROGRAMM["G-TABELLE"]!(kase({ eintrag: "14.10." }), transcript({ tabelle: withMaterial })).bestanden).toBe(true);
    expect(PROGRAMM["G-TABELLE"]!(kase({ eintrag: "14.10." }), transcript({ tabelle: without })).bestanden).toBe(false);
    expect(PROGRAMM["G-TABELLE"]!(kase({ eintrag: "15.10." }), transcript({ tabelle: withMaterial })).bestanden).toBe(false);
  });

  it("insists on reading only, on the number of versions, and on showing the plan first", () => {
    expect(PROGRAMM["G-NURLESEN"]!(kase({ nurLesen: true }), transcript({ turns: [turn("x", { fragen: ["Darf ich …?"] })] })).bestanden).toBe(false);
    expect(PROGRAMM["G-NURLESEN"]!(kase({ nurLesen: true }), transcript()).bestanden).toBe(true);
    const sheet = (n: string) => ({ name: `2026_Arbeitsblatt-X-${n}.pdf`, art: "pdf" as const, text: "", seiten: 1 });
    expect(PROGRAMM["G-FASSUNGEN"]!(kase({ fassungen: 3 }), transcript({ files: [sheet("Basis"), sheet("Standard")] })).bestanden).toBe(false);
    expect(PROGRAMM["G-VORSCHLAG"]!(kase({ erstVorschlag: true }), transcript({ turns: [turn("Vorschlag …"), turn("Angelegt", { steps: ["Lernsituation anlegen"], fragen: ["Darf ich …?"] })] })).bestanden).toBe(true);
    expect(PROGRAMM["G-VORSCHLAG"]!(kase({ erstVorschlag: true }), transcript({ turns: [turn("Angelegt", { steps: ["Lernsituation anlegen"] })] })).bestanden).toBe(false);
  });
});

describe("the judge", () => {
  const list = [crit("P1"), crit("P2"), crit("P3")];

  it("reads the answer even with words around it, and marks missing ones as not judged", () => {
    const v = parseVerdicts('Hier das Ergebnis:\n[{"id":"P1","bestanden":true,"grund":"ok"},{"id":"P2","bestanden":false,"grund":"Aufgabe 2 falsch"}]\nFertig.', list);
    expect(v).toEqual([
      { id: "P1", bestanden: true, grund: "ok" },
      { id: "P2", bestanden: false, grund: "Aufgabe 2 falsch" },
      { id: "P3", bestanden: null, grund: expect.stringContaining("nicht beurteilt") },
    ]);
    expect(() => parseVerdicts("kein JSON", list)).toThrow(/kein JSON/);
  });

  it("sends the conversation, the material, the table and every criterion to the judge", async () => {
    const t = transcript({ files: [{ name: "Blatt.pdf", art: "pdf", text: "Aufgabe 1: Nenne drei Teile.", seiten: 1 }], tabelle: "| 14.10. |" });
    const seen: string[] = [];
    const judge = { vision: false, complete: async (r: { system: string; text: string }) => (seen.push(r.text), '[{"id":"P1","bestanden":true,"grund":"x"}]') };
    expect(await judgeCase(judge, kase(), t, [crit("P1")])).toEqual([{ id: "P1", bestanden: true, grund: "x" }]);
    expect(seen[0]).toContain("Aufgabe 1: Nenne drei Teile.");
    expect(seen[0]).toContain("| 14.10. |");
    expect(judgePrompt(kase(), t, [crit("P1")])).toContain("P1 [P] P1");
  });
});

describe("the report", () => {
  it("counts pass rates per criterion and lists what failed, without counting skipped criteria", () => {
    const results = [
      { fall: kase(), kosten: 0.1, verdicts: [{ id: "P1", bestanden: true, grund: "" }, { id: "P2", bestanden: null, grund: "" }] },
      { fall: { ...kase(), id: "u" }, kosten: 0.2, verdicts: [{ id: "P1", bestanden: false, grund: "Aufgabe 3 ist falsch" }, { id: "P2", bestanden: true, grund: "" }] },
    ];
    const r = rates([crit("P1"), crit("P2")], results);
    expect(r.map((x) => [x.id, x.bestanden, x.gezaehlt])).toEqual([["P1", 1, 2], ["P2", 1, 1]]);
    const md = markdown({ skill: "arbeitsblatt", kriterien: [crit("P1"), crit("P2")], results, modell: "m", pruefer: "p", datum: "d" });
    expect(md).toContain("| P1 | P | P1 | 1/2 (50 %) |");
    expect(md).toContain("Aufgabe 3 ist falsch");
    expect(md).toContain("0.30 US-$");
  });
});

describe("measuring a blocked model", () => {
  it("is allowed in the quality checks, so a model can be measured before it is blocked or after", async () => {
    const faux = fauxProvider();
    faux.setResponses([fauxAssistantMessage([fauxText("Hallo.")])]);
    const models = createModels();
    models.setProvider(faux.provider);
    const model = faux.getModel();
    BLOCKED[`${model.provider}/${model.id}`] = "Test";
    try {
      const t = await runCase({ ...kase(), nachrichten: ["Hallo"] }, { provider: "x" }, { resolve: () => ({ models, model }) });
      expect(t.turns[0]!.assistant).toContain("Hallo.");
    } finally {
      delete BLOCKED[`${model.provider}/${model.id}`];
    }
  });
});

describe("running a case", () => {
  it("plays the messages in a fresh invented folder and collects words, steps, files and the table", async () => {
    const faux = fauxProvider();
    faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall("arbeitsblatt_erstellen", { titel: "Das Anschreiben", fach: "Business English", klasse: "11a", reihe: "Bewerbung", datum: "14.10.", aufgaben: [{ text: "Nenne zwei Teile eines Anschreibens.", zeilen: 2, loesung: "Betreff, Anrede" }] })],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxText("Das Blatt ist fertig, mit Lösungen.")]),
    ]);
    const models = createModels();
    models.setProvider(faux.provider);
    const t = await runCase({ ...kase({ material: true, eintrag: "14.10." }), nachrichten: ["Arbeitsblatt zum Anschreiben am 14.10."] }, { provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) });
    expect(t.turns[0]!.assistant).toContain("Das Blatt ist fertig");
    expect(t.turns[0]!.steps).toContain("Arbeitsblatt erstellen");
    expect(t.turns[0]!.fragen).toEqual([]); // a new worksheet needs no confirmation
    expect(t.files.map((f) => f.name)).toEqual(expect.arrayContaining([expect.stringMatching(/Arbeitsblatt-Das-Anschreiben\.pdf/), expect.stringMatching(/Loesung.*Lösungsblatt/)]));
    expect(t.files.find((f) => f.art === "pdf" && !/Lösungsblatt/.test(f.name))).toMatchObject({ seiten: 1, text: expect.stringContaining("Nenne zwei Teile") });
    expect(t.tabelle).toMatch(/\| 14\.10\. \|.*Arbeitsblatt-Das-Anschreiben\.pdf/);
    for (const id of ["G-TECHNIK", "G-SEITEN", "G-MATERIAL", "G-HINWEIS", "G-TABELLE"]) expect(PROGRAMM[id]!(kase({ material: true, eintrag: "14.10." }), t).bestanden, id).toBe(true);
    expect(process.env.PULT_HOME ?? "").not.toContain("pult-eval-"); // the folder of the run is gone and the setting restored
  });
});

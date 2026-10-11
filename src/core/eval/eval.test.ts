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

  it("have a test case in which details are missing, and one question that is answered later, for the assessment rules and the own templates", async () => {
    const suites = await loadSuites(evalsDir, ["bewertung", "vorlage-bauen"]);
    expect(suites.map((x) => x.skill)).toEqual(["bewertung", "vorlage-bauen"]);
    for (const x of suites) expect(x.faelle.some((f) => f.nachrichten.length >= 2), x.skill).toBe(true);
  });

  it("cover the bundled skills that make material or answer teachers, and name only skills that exist", async () => {
    const suites = (await loadSuites(evalsDir)).map((s) => s.skill);
    const bundled = (await readdir(join(process.cwd(), "skills"))).filter((n) => !n.startsWith("."));
    // "stand" tests the working folder (Stand.md), not a bundled skill.
    for (const name of suites.filter((n) => n !== "stand")) expect(bundled, `Zu evals/${name} fehlt die Anleitung`).toContain(name);
    for (const name of ["arbeitsblatt", "bewertung", "differenzieren", "klausur", "lernsituation", "praesentation", "stunde-planen", "stunde-vorbereiten", "verstaendnis-check", "vorlage-bauen"]) expect(suites).toContain(name);
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

describe("saved rules and own templates", () => {
  it("the check G-GESPEICHERT looks at what really stands in the folder, not at what the assistant says", () => {
    const kase2 = (gespeichert?: string) => kase({ gespeichert });
    const said = transcript({ turns: [turn("Die Vorlage ist gespeichert.")] });
    expect(PROGRAMM["G-GESPEICHERT"]!(kase2(), said).bestanden).toBeNull();
    expect(PROGRAMM["G-GESPEICHERT"]!(kase2("=== Eigene Vorlage:"), said).bestanden).toBe(false);
    expect(PROGRAMM["G-GESPEICHERT"]!(kase2("=== Eigene Vorlage:"), transcript({ gespeichert: "=== Eigene Vorlage: x ===\ntext" })).bestanden).toBe(true);
  });

  it("the judge is asked again when its answer is no list, and the case is not played again", async () => {
    let asked = 0;
    const judge = { vision: false, complete: async () => (++asked < 3 ? "Ich denke, alles ist gut." : '[{"id":"P1","bestanden":true,"grund":"x"}]') };
    expect(await judgeCase(judge, kase(), transcript(), [crit("P1")])).toEqual([{ id: "P1", bestanden: true, grund: "x" }]);
    expect(asked).toBe(3);
    const bad = { vision: false, complete: async () => "nie JSON" };
    await expect(judgeCase(bad, kase(), transcript(), [crit("P1")])).rejects.toThrow(/kein JSON/);
  });

  it("are collected at the end of a run and shown to the judge", async () => {
    const faux = fauxProvider();
    faux.setResponses([
      fauxAssistantMessage(
        [
          fauxToolCall("bewertung_speichern", { lehrplan: "Neue Regeln", klassen: ["11a"], bereiche: [{ kurz: "I", name: "Wiedergeben", anteil: 100 }], notenschluessel: [{ note: "1", abProzent: 90 }, { note: "6", abProzent: 0 }] }),
          fauxToolCall("vorlage_speichern", {
            titel: "Vokabeltest",
            beschreibung: "Erstellt Vokabeltests mit Zuordnung und Lückensätzen. Nutze es bei Wünschen wie Vokabeltest oder Wörtertest. Nicht für Klausuren.",
            anleitung: "1. Frag nach dem Thema und der Klasse, höchstens zwei Dinge.\n2. Schreibe zehn Vokabeln als Zuordnung und fünf Lückensätze mit Wortliste.\n3. Erstelle den Test mit `arbeitsblatt_erstellen`, eine Seite, mit Lösungsblatt.\n4. Antworte in einem Satz ohne Dateinamen und ohne Werkzeugnamen. Halte dich an diese Regeln und erfinde nichts, was die Lehrkraft nicht gesagt hat.",
          }),
        ],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxText("Gespeichert.")]),
    ]);
    const models = createModels();
    models.setProvider(faux.provider);
    const t = await runCase(kase(), { provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) });
    expect(t.gespeichert).toContain("Bewertungsregeln: Neue Regeln");
    expect(t.gespeichert).toContain("ab 90 %");
    expect(t.gespeichert).toContain("Eigene Vorlage: vokabeltest");
    expect(t.gespeichert).toContain("Nicht für Klausuren");
    expect(judgePrompt(kase(), t, [crit("P1")])).toContain("## GESPEICHERT");
    expect(judgePrompt(kase(), t, [crit("P1")])).toContain("Neue Regeln");
    expect(judgePrompt(kase(), transcript(), [crit("P1")])).toContain("(nichts)");
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

describe("checks for Stand.md", () => {
  const stand = (nachher: string, vorher = "# Stand: 11a\nAlt\n") => ({ vorher, nachher });
  const neu = "# Stand: 11a · Business English\n\nZuletzt behandelt: Lebenslauf\nNächste Stunde: Vorstellungsgespräch\n";
  const festgehalten = [turn("Fertig.", { steps: ["Klasse nachlesen", "Stand nachlesen", "Stand festhalten"] })];
  const tabelle = (...s: string[]) => ["| Datum | Stunde | Thema | Material | Status |", "|---|---|---|---|---|", ...s.map((x, i) => `| 1${i}.10. | Mi 3 | Thema | | ${x} |`)].join("\n");

  it("S-ORDNUNG wants Klasse, then Stand, then Reihe only when needed", () => {
    const run = (steps: string[], erwartet: EvalCase["erwartet"] = { leseOrdnung: true }) => PROGRAMM["S-ORDNUNG"]!(kase(erwartet), transcript({ turns: [turn("x", { steps })] })).bestanden;
    expect(run(["Klasse nachlesen", "Stand nachlesen"])).toBe(true);
    expect(run(["Stand nachlesen", "Klasse nachlesen"])).toBe(false);
    expect(run(["Klasse nachlesen"])).toBe(false);
    expect(run(["Stand nachlesen"])).toBe(true); // stand_lesen includes Klasse.md
    expect(run(["Reihe nachlesen"])).toBe(false);
    expect(run(["Klasse nachlesen", "Reihe nachlesen", "Stand nachlesen"])).toBe(false);
    expect(run(["Reihe nachlesen", "Stand nachlesen"])).toBe(false);
    expect(run(["Klasse nachlesen", "Stand nachlesen", "Reihe nachlesen"])).toBe(true);
    expect(run(["Klasse nachlesen", "Stand nachlesen", "Reihe nachlesen"], { leseOrdnung: true, ohneReihe: true })).toBe(false);
    expect(run([], {})).toBeNull();
  });

  it("S-UEBERSCHRIEBEN needs a changed Stand with one heading that names the new things", () => {
    const e = { standNeu: ["Lebenslauf", "vorstellungsgespräch"] };
    const check = (t: Partial<Transcript>) => PROGRAMM["S-UEBERSCHRIEBEN"]!(kase(e), transcript(t)).bestanden;
    expect(check({ turns: festgehalten, stand: stand(neu) })).toBe(true);
    expect(check({ turns: [turn("x")], stand: stand(neu) })).toBe(false);
    expect(check({ turns: festgehalten, stand: stand(neu, neu) })).toBe(false);
    expect(check({ turns: festgehalten, stand: stand(`${neu}\n${neu}`) })).toBe(false);
    expect(check({ turns: festgehalten, stand: stand("# Stand: 11a\nLebenslauf\n") })).toBe(false);
    expect(PROGRAMM["S-UEBERSCHRIEBEN"]!(kase(), transcript()).bestanden).toBeNull();
  });

  it("S-STATUS wants the held lesson on gehalten and only the fixed words", () => {
    const check = (t: string) => PROGRAMM["S-STATUS"]!(kase({ gehalten: 2 }), transcript({ tabelle: t })).bestanden;
    expect(check(tabelle("geplant", "gehalten", "Material fertig"))).toBe(true);
    expect(check(tabelle("geplant", "geplant"))).toBe(false);
    expect(check(tabelle("geplant", "gehalten", "erledigt"))).toBe(false);
    expect(PROGRAMM["S-STATUS"]!(kase(), transcript()).bestanden).toBeNull();
  });

  it("S-NAMEN finds names and grades in Stand and Reihe", () => {
    const e = { verboten: ["Kevin", "\\b(Note|eine|einer)\\s+[1-6]\\b"] };
    const check = (nachher: string, reihe: string) => PROGRAMM["S-NAMEN"]!(kase(e), transcript({ stand: stand(nachher), reihe })).bestanden;
    expect(check(neu, "# Reihe")).toBe(true);
    expect(check(`${neu}Besonderheiten: Kevin stört`, "")).toBe(false);
    expect(check(neu, "Notizen: hatte eine 5")).toBe(false);
    expect(PROGRAMM["S-NAMEN"]!(kase(), transcript()).bestanden).toBeNull();
  });

  it("S-KURZ fails when Stand grew or was not written", () => {
    const check = (t: Partial<Transcript>) => PROGRAMM["S-KURZ"]!(kase({ nichtLaenger: true }), transcript(t)).bestanden;
    expect(check({ turns: festgehalten, stand: stand("kurz", "etwas länger") })).toBe(true);
    expect(check({ turns: festgehalten, stand: stand("viel länger als vorher", "kurz") })).toBe(false);
    expect(check({ stand: stand("kurz", "etwas länger") })).toBe(false);
    expect(PROGRAMM["S-KURZ"]!(kase(), transcript()).bestanden).toBeNull();
  });
});

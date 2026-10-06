import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { beforeEach, describe, expect, it } from "vitest";
import { createChatSession, type ChatEvent } from "./index.ts";
import { createClass, createReihe, initWorkspace, readReihe } from "../workspace/index.ts";

let home: string;
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "morte-agent-"));
  process.env.MORTE_HOME = home;
  await initWorkspace();
  await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
});

function session(responses: ReturnType<typeof fauxAssistantMessage>[]) {
  const faux = fauxProvider();
  faux.setResponses(responses);
  const models = createModels();
  models.setProvider(faux.provider);
  return createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }) });
}

const standCall = fauxToolCall("stand_schreiben", {
  klasse: "11a",
  fach: "Business English",
  aktuelleReihe: "01 Bewerbung",
  offen: ["Wortschatz wiederholen"],
});
const standFile = () => join(home, "Klassen", "11a", "Business English", "Stand.md");

describe("workspace tools in the chat", () => {
  it("reads without asking and answers from the folder", async () => {
    const s = session([
      fauxAssistantMessage([fauxToolCall("klassen_uebersicht", {})], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Du hast die 11a.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Welche Klassen habe ich?", (e) => events.push(e));
    expect(events.some((e) => e.type === "confirm")).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: "step_start", label: "Klassen ansehen" }));
  });

  it("asks before writing and writes after yes", async () => {
    const s = session([
      fauxAssistantMessage([standCall], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Gespeichert.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Wir sind fertig für heute", (e) => {
      events.push(e);
      if (e.type === "confirm") s.answer(e.id, true);
    });
    const confirm = events.find((e) => e.type === "confirm");
    expect(confirm).toMatchObject({ question: expect.stringContaining("11a, Business English") });
    expect(await readFile(standFile(), "utf8")).toContain("Aktuelle Reihe: 01 Bewerbung");
  });

  it("writes nothing after no", async () => {
    const s = session([
      fauxAssistantMessage([standCall], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Dann lasse ich es.")]),
    ]);
    await s.send("Fertig", (e) => {
      if (e.type === "confirm") s.answer(e.id, false);
    });
    expect(await readFile(standFile(), "utf8")).not.toContain("01 Bewerbung");
  });
});

describe("skills in the chat", () => {
  it("loads a skill on request and reports the step in German", async () => {
    const skills = join(home, "Skills", "arbeitsblatt");
    await mkdir(skills, { recursive: true });
    await writeFile(join(skills, "SKILL.md"), "---\nname: arbeitsblatt\ndescription: Arbeitsblatt bauen.\n---\nSchritt 1");
    const faux = fauxProvider();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall("skill_laden", { name: "arbeitsblatt" })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Fertig.")]),
    ]);
    const models = createModels();
    models.setProvider(faux.provider);
    const s = createChatSession(
      { provider: "x" },
      { resolve: () => ({ models, model: faux.getModel() }), skills: [{ name: "arbeitsblatt", description: "Arbeitsblatt bauen." }] },
    );
    const events: ChatEvent[] = [];
    await s.send("Bau ein Arbeitsblatt", (e) => events.push(e));
    expect(events).toContainEqual(expect.objectContaining({ type: "step_start", label: "Anleitung laden" }));
    expect(events).toContainEqual({ type: "step_end", id: expect.any(String), ok: true });
  });
});

describe("worksheet tool", () => {
  it("asks, builds the PDF, files it in the Reihe, enters it in the table and sends it to the preview", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    const s = session([
      fauxAssistantMessage(
        [
          fauxToolCall("arbeitsblatt_erstellen", {
            titel: "Interview Basics", fach: "Business English", klasse: "11a", reihe: "Bewerbung", datum: "14.10.", stunde: "Mi 3",
            aufgaben: [{ text: "Nenne drei typische Fragen.", zeilen: 3 }],
          }),
        ],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxText("Fertig, eine Seite.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Arbeitsblatt zum Interview", (e) => {
      events.push(e);
      if (e.type === "confirm") s.answer(e.id, true);
    });
    expect(events).toContainEqual(expect.objectContaining({ type: "step_start", label: "Arbeitsblatt erstellen", material: true }));
    const material = events.find((e) => e.type === "material");
    expect(material).toMatchObject({ title: "Interview Basics", path: expect.stringContaining("01 Bewerbung/Material/") });
    expect(await readFile(join(home, (material as { path: string }).path))).toBeInstanceOf(Buffer);
    expect(await readReihe("11a", "Business English", "Bewerbung")).toMatch(/\| 14\.10\. \| Mi 3 \| Interview Basics \| .*Arbeitsblatt-Interview-Basics\.pdf \| Material fertig \|/);
  });

  it("makes a teacher's copy with the answers, keeps several versions on one lesson and can read them back", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    const call = (niveau: string) =>
      fauxToolCall("arbeitsblatt_erstellen", {
        titel: "Interview Basics", fach: "Business English", klasse: "11a", reihe: "Bewerbung", datum: "14.10.", stunde: "Mi 3", niveau,
        aufgaben: [{ text: "Nenne eine typische Frage im Interview.", zeilen: 2, loesung: "Zum Beispiel: Tell me about yourself." }],
      });
    const s = session([
      fauxAssistantMessage([call("Basis")], { stopReason: "toolUse" }),
      fauxAssistantMessage([call("Erweiterung")], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxToolCall("material_lesen", { klasse: "11a", fach: "Business English", reihe: "Bewerbung" })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Fertig.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Zwei Niveaus bitte", (e) => {
      events.push(e);
      if (e.type === "confirm") s.answer(e.id, true);
    });
    const materials = events.filter((e) => e.type === "material") as { title: string; path: string }[];
    expect(materials.map((m) => m.title)).toEqual(["Interview Basics · Basis", "Interview Basics · Basis (Lösung)", "Interview Basics · Erweiterung", "Interview Basics · Erweiterung (Lösung)"]);
    const md = await readReihe("11a", "Business English", "Bewerbung");
    expect(md).toContain("Arbeitsblatt-Interview-Basics-Basis.pdf, ");
    expect(md).toContain("Arbeitsblatt-Interview-Basics-Erweiterung.pdf");
    expect(md).not.toContain("Loesung"); // the teacher's copy is not a student material
    const pdf = materials[1]!.path;
    expect(pdf).toContain("Loesung-Interview-Basics-Basis");
    const listing = JSON.stringify(s.history().messages);
    expect(listing).toContain("Loesung-Interview-Basics-Basis.pdf");
  });

  it("saves an editable Word version next to the PDF, lists it in the table and can read it back", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    const s = session([
      fauxAssistantMessage(
        [fauxToolCall("arbeitsblatt_erstellen", {
          titel: "Interview Basics", fach: "Business English", klasse: "11a", reihe: "Bewerbung", datum: "14.10.", stunde: "Mi 3", word: true,
          aufgaben: [{ text: "Nenne eine typische Frage im Interview.", zeilen: 2, loesung: "Tell me about yourself." }],
        })],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxToolCall("material_lesen", { klasse: "11a", fach: "Business English", reihe: "Bewerbung", datei: "2026-10-14_Mi3_Arbeitsblatt-Interview-Basics.docx" })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Fertig.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Arbeitsblatt, auch als Word", (e) => {
      events.push(e);
      if (e.type === "confirm") s.answer(e.id, true);
    });
    const cards = (events.filter((e) => e.type === "material") as { title: string; path: string }[]).map((m) => [m.title, m.path.split(".").pop()]);
    expect(cards).toEqual([["Interview Basics", "pdf"], ["Interview Basics (Lösung)", "pdf"], ["Interview Basics (Word)", "docx"], ["Interview Basics (Lösung, Word)", "docx"]]);
    expect(await readReihe("11a", "Business English", "Bewerbung")).toMatch(/Arbeitsblatt-Interview-Basics\.pdf, .*Arbeitsblatt-Interview-Basics\.docx \| Material fertig/);
    expect(JSON.stringify(s.history().messages)).toContain("Nenne eine typische Frage im Interview.");
  });

  it("plans a lesson, notes only the topic in the table and leaves the status alone", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    const plan = {
      titel: "Vorstellungsgespräch", fach: "Business English", klasse: "11a", reihe: "Bewerbung", datum: "14.10.", stunde: "Mi 3", dauer: 45,
      lernziele: ["Typische Fragen beantworten"],
      phasen: [{ minuten: 15, phase: "Einstieg", inhalt: "Video" }, { minuten: 30, phase: "Erarbeitung", inhalt: "Rollenspiel", sozialform: "Partnerarbeit" }],
    };
    const s = session([
      fauxAssistantMessage([fauxToolCall("stundenverlauf_erstellen", plan as never)], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxToolCall("stundenverlauf_erstellen", { ...plan, dauer: 90 } as never)], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Fertig.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Plane die Stunde", (e) => {
      events.push(e);
      if (e.type === "confirm") s.answer(e.id, true);
    });
    expect(events).toContainEqual(expect.objectContaining({ type: "step_start", label: "Stunde planen", material: true }));
    expect(await readReihe("11a", "Business English", "Bewerbung")).toContain("| 14.10. | Mi 3 | Vorstellungsgespräch |  | geplant |");
    // The second call has minutes that do not fit: the tool says so instead of drawing something wrong.
    expect(events.filter((e) => e.type === "step_end")).toContainEqual({ type: "step_end", id: expect.any(String), ok: false });
  });

  it("saves the teacher's rules, then builds exam and answer key with them and files the exam in the Reihe", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    const ask = (s: ReturnType<typeof session>) => (e: ChatEvent) => {
      if (e.type === "confirm") s.answer(e.id, true);
    };
    const rules = session([
      fauxAssistantMessage(
        [
          fauxToolCall("bewertung_speichern", {
            lehrplan: "Höhere Handelsschule", klassen: ["11a"],
            bereiche: [{ kurz: "I", name: "Wiedergeben" }, { kurz: "II", name: "Anwenden" }],
            notenschluessel: [{ note: "1", abProzent: 90 }, { note: "2", abProzent: 75 }, { note: "3", abProzent: 0 }],
          }),
        ],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxText("Gespeichert.")]),
    ]);
    await rules.send("Unser Notenschlüssel", ask(rules));
    expect(await readFile(join(home, "Lehrpläne", "Höhere Handelsschule", "Bewertung.md"), "utf8")).toContain("- 2: ab 75 %");

    const exam = session([
      fauxAssistantMessage(
        [
          fauxToolCall("klausur_erstellen", {
            titel: "Klausur Bewerbung", fach: "Business English", klasse: "11a", reihe: "Bewerbung", datum: "04.11.", stunde: "Mi 1", dauer: "45 Minuten",
            aufgaben: [{ teile: [
              { text: "Nenne zwei Bestandteile einer Bewerbung.", punkte: 2, bereich: "I", zeilen: 2, erwartung: "Je 1 P.: Anschreiben, Lebenslauf." },
              { text: "Begründe, warum ein Anschreiben individuell sein sollte.", punkte: 4, bereich: "II", zeilen: 4, erwartung: "2 P. Bezug zur Firma, 2 P. Begründung." },
            ] }],
          }),
        ],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxText("Fertig.")]),
    ]);
    const events: ChatEvent[] = [];
    await exam.send("Klausur zur Bewerbung", (e) => {
      events.push(e);
      ask(exam)(e);
    });
    const files = events.filter((e) => e.type === "material") as Extract<ChatEvent, { type: "material" }>[];
    expect(files.map((f) => [f.title, f.preview])).toEqual([["Klausur Bewerbung", undefined], ["Erwartungshorizont: Klausur Bewerbung", false]]);
    for (const f of files) expect((await readFile(join(home, f.path))).subarray(0, 5).toString()).toBe("%PDF-");
    expect(files[1]!.name).toContain("Erwartungshorizont-");
    // Only the exam, not the answer key, goes into the lesson table.
    const reihe = await readReihe("11a", "Business English", "Bewerbung");
    expect(reihe).toMatch(/\| 04\.11\. \| Mi 1 \| Klausur Bewerbung \| .*Klausur-Klausur-Bewerbung\.pdf \| Material fertig \|/);
    expect(reihe).not.toContain("Erwartungshorizont-");
    expect(events.some((e) => e.type === "error")).toBe(false);
  });

  it("tells the model when an area is not in the teacher's rules, so it can fix the exam", async () => {
    const rules = session([
      fauxAssistantMessage([fauxToolCall("bewertung_speichern", { lehrplan: "HH", klassen: ["11a"], bereiche: [{ kurz: "I" }] })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("ok")]),
    ]);
    await rules.send("Regeln", (e) => e.type === "confirm" && rules.answer(e.id, true));
    const exam = session([
      fauxAssistantMessage(
        [fauxToolCall("klausur_erstellen", { titel: "K", klasse: "11a", aufgaben: [{ teile: [{ text: "Nenne eins.", punkte: 1, bereich: "AFB IX", erwartung: "x" }] }] })],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxText("ok")]),
    ]);
    const events: ChatEvent[] = [];
    await exam.send("Klausur", (e) => {
      events.push(e);
      if (e.type === "confirm") exam.answer(e.id, true);
    });
    expect(events.find((e) => e.type === "step_end")).toMatchObject({ ok: false });
    expect(events.some((e) => e.type === "material")).toBe(false);
  });
});

describe("lernsituation tool", () => {
  it("creates the Reihe with all planned lessons after one question, and the plan works with the other tools", async () => {
    const yes = (s: ReturnType<typeof session>, events: ChatEvent[] = []) => (e: ChatEvent) => {
      events.push(e);
      if (e.type === "confirm") s.answer(e.id, true);
    };
    const s = session([
      fauxAssistantMessage(
        [
          fauxToolCall("lernsituation_erstellen", {
            klasse: "11a", fach: "Business English", titel: "Bewerbung", lernfeld: "LF 3",
            handlungssituation: "Die Nordlicht GmbH sucht eine Assistenz.\n\nIhr bewerbt euch.",
            auftrag: "Erstellt eine Bewerbung.",
            ziele: ["Anzeigen verstehen", "CV schreiben"],
            ablauf: [
              { thema: "Stellenanzeige", phase: "Informieren", inhalt: "Anforderungen markieren.", datum: "12.10.", stunde: "Mo 1" },
              { thema: "Lebenslauf", phase: "Planen", produkt: "Entwurf CV" },
              { thema: "Anschreiben", phase: "Durchführen" },
            ],
          }),
        ],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxToolCall("material_luecken", { klasse: "11a" })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxToolCall("stunde_eintragen", { klasse: "11a", fach: "Business English", reihe: "Bewerbung", nr: 2, datum: "14.10.", stunde: "Mi 3" })], { stopReason: "toolUse" }),
      fauxAssistantMessage([fauxText("Fertig.")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Plan mir eine Lernsituation Bewerbung", yes(s, events));

    expect(events.filter((e) => e.type === "confirm")).toHaveLength(2); // one for the whole plan, one for the date
    expect(events.find((e) => e.type === "material")).toMatchObject({ title: "Bewerbung", path: expect.stringMatching(/01 Bewerbung\/Material\/.*Lernsituation-Bewerbung\.pdf$/) });
    const md = await readReihe("11a", "Business English", "Bewerbung");
    expect(md).toContain("Lernfeld: LF 3");
    expect(md).toContain("- CV schreiben");
    expect(md).toContain("## Handlungssituation\nDie Nordlicht GmbH sucht eine Assistenz.\n\nIhr bewerbt euch.\n\nAuftrag: Erstellt eine Bewerbung.");
    expect(md).toContain("2. Lebenslauf (Planen): Ergebnis: Entwurf CV");
    expect(md).toContain("| 12.10. | Mo 1 | Stellenanzeige |  | geplant |");
    expect(md).toContain("| 14.10. | Mi 3 | Lebenslauf |  | geplant |");
    expect(md).toContain("|  |  | Anschreiben |  | geplant |");
    const gaps = events.filter((e) => e.type === "step_end");
    expect(gaps.every((e) => e.type === "step_end" && e.ok)).toBe(true);
  });

  it("refuses a second Reihe with the same name and leaves the first one alone", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    const s = session([
      fauxAssistantMessage(
        [fauxToolCall("lernsituation_erstellen", { klasse: "11a", fach: "Business English", titel: "Bewerbung", handlungssituation: "x", ablauf: [{ thema: "a" }] })],
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage([fauxText("ok")]),
    ]);
    const events: ChatEvent[] = [];
    await s.send("Lernsituation", (e) => {
      events.push(e);
      if (e.type === "confirm") s.answer(e.id, true);
    });
    expect(events.find((e) => e.type === "step_end")).toMatchObject({ ok: false });
    expect(events.some((e) => e.type === "material")).toBe(false);
    expect(await readReihe("11a", "Business English", "Bewerbung")).not.toContain("## Handlungssituation");
  });
});


describe("confirmation before changes", () => {
  it("asks only where existing things are replaced, deleted or changed, never for new material", async () => {
    const { tools } = await import("./tools.ts");
    const asking = tools.filter((t) => t.ask).map((t) => t.name).sort();
    expect(asking).toEqual(["bewertung_speichern", "lernsituation_erstellen", "reihe_anlegen", "stand_schreiben", "stunde_eintragen", "vorlage_entfernen", "vorlage_speichern"]);
    for (const name of ["arbeitsblatt_erstellen", "klausur_erstellen", "stundenverlauf_erstellen"]) expect(tools.find((t) => t.name === name)?.ask, name).toBeUndefined();
  });
});

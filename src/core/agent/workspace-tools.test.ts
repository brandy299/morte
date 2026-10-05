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
    const material = events.find((e) => e.type === "material");
    expect(material).toMatchObject({ title: "Interview Basics", path: expect.stringContaining("01 Bewerbung/Material/") });
    expect(await readFile(join(home, (material as { path: string }).path))).toBeInstanceOf(Buffer);
    expect(await readReihe("11a", "Business English", "Bewerbung")).toMatch(/\| 14\.10\. \| Mi 3 \| Interview Basics \| .*Arbeitsblatt-Interview-Basics\.pdf \| Material fertig \|/);
  });
});

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteConversation, loadConversation, saveConversation } from "./index.ts";
import { artVon, exportRueckmeldungen, MAX_SATZ, RueckmeldungFehler, setzeRueckmeldung } from "./rueckmeldung.ts";

const ID = "11111111-1111-1111-1111-111111111111";
const PFAD = "Klassen/11a/Business English/01 Bewerbung/Material/2026-10-14_Mi3_Arbeitsblatt-Interview.pdf";
const modell = [
  { role: "user", content: "Mach ein Blatt." },
  { role: "assistant", provider: "opencode-go", model: "deepseek-v4.1-flash", content: [{ type: "toolCall", name: "skill_laden", arguments: { name: "arbeitsblatt" } }, { type: "toolCall", name: "arbeitsblatt_erstellen", arguments: { titel: "Geheimer Titel mit Inhalt" } }] },
];
const ablauf = [{ kind: "tool", name: "skill_laden", ok: true, ms: 3, at: "x" }, { kind: "tool", name: "arbeitsblatt_erstellen", ok: false, ms: 5, at: "x" }, { kind: "tool", name: "arbeitsblatt_erstellen", ok: true, ms: 5, at: "x" }];

const speichern = (extra: object = {}) =>
  saveConversation({
    id: ID, titel: "Blatt", anzeige: [{ role: "user", text: "Mach ein Blatt.", steps: [] }, { role: "assistant", text: "Fertig.", steps: [], materials: [{ title: "Interview", name: "x.pdf", path: PFAD }] }],
    modell, ablauf, ...extra,
  });

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-rueck-"));
  await speichern();
});

describe("feedback on material", () => {
  it("saves a rating, changes it later, and keeps one entry per material", async () => {
    await setzeRueckmeldung(ID, { pfad: PFAD, wertung: "passt" });
    const alle = await setzeRueckmeldung(ID, { pfad: PFAD, wertung: "passt-nicht", satz: "  Zu schwer\nfür die Klasse.  " });
    expect(alle).toHaveLength(1);
    expect(alle[0]).toMatchObject({ pfad: PFAD, wertung: "passt-nicht", satz: "Zu schwer für die Klasse." });
    expect((await loadConversation(ID))!.rueckmeldungen).toEqual(alle);
  });

  it("refuses what does not fit, with a message in plain words", async () => {
    const fehler = (e: object) => setzeRueckmeldung(ID, e as never);
    await expect(fehler({ pfad: PFAD, wertung: "super" })).rejects.toThrow("„passt“ oder „passt nicht“");
    await expect(fehler({ pfad: "Klassen/andere.pdf", wertung: "passt" })).rejects.toThrow("gehört nicht zu dem Gespräch");
    await expect(fehler({ pfad: 5, wertung: "passt" })).rejects.toBeInstanceOf(RueckmeldungFehler);
    await expect(fehler({ pfad: PFAD, wertung: "passt-nicht", satz: "x".repeat(MAX_SATZ + 1) })).rejects.toThrow(/höchstens 300 Zeichen, es sind 301/);
    await expect(fehler({ pfad: PFAD, wertung: "passt-nicht", satz: 7 })).rejects.toThrow("muss Text sein");
    await expect(setzeRueckmeldung("22222222-2222-2222-2222-222222222222", { pfad: PFAD, wertung: "passt" })).rejects.toThrow("Dieses Gespräch gibt es nicht mehr.");
    expect((await loadConversation(ID))!.rueckmeldungen).toBeUndefined();
  });

  it("is kept when the conversation goes on and is saved again", async () => {
    await setzeRueckmeldung(ID, { pfad: PFAD, wertung: "passt" });
    await speichern({ titel: "Blatt, weiter" }); // the running chat saves without knowing about the feedback
    expect((await loadConversation(ID))!.rueckmeldungen).toHaveLength(1);
  });

  it("goes away with the conversation", async () => {
    await setzeRueckmeldung(ID, { pfad: PFAD, wertung: "passt" });
    await deleteConversation(ID);
    expect((await exportRueckmeldungen({ mitSatz: false })).eintraege).toEqual([]);
  });

  it("exports counts and kinds only: no conversation text, no material content, the sentence only when allowed", async () => {
    await setzeRueckmeldung(ID, { pfad: PFAD, wertung: "passt-nicht", satz: "Zu schwer." });
    const ohne = await exportRueckmeldungen({ mitSatz: false, jetzt: new Date("2026-10-14T10:00:00Z") });
    expect(ohne.eintraege).toEqual([{ datum: expect.stringMatching(/^\d{4}-\d\d-\d\d$/), material: "Arbeitsblatt", wertung: "passt-nicht", modell: "opencode-go / deepseek-v4.1-flash", anleitungen: ["arbeitsblatt"], werkzeugaufrufe: 3, abgelehnt: 1 }]);
    const text = JSON.stringify(ohne);
    for (const secret of ["Zu schwer", "Geheimer Titel", "Mach ein Blatt", "Interview", "Business English", "11a"]) expect(text).not.toContain(secret);
    const mit = await exportRueckmeldungen({ mitSatz: true });
    expect(mit.eintraege[0]!.satz).toBe("Zu schwer.");
    expect(mit.hinweis).toContain("keine Namen");
  });

  it("knows the kind of material from the file name", () => {
    expect(artVon(PFAD)).toBe("Arbeitsblatt");
    expect(artVon("Exporte/2026-10-11_Erklaerstueck-Wasser.html")).toBe("Erklaerstueck");
    expect(artVon("Exporte/Uebung-X.html")).toBe("Uebung");
    expect(artVon("seltsam.pdf")).toBe("Datei");
  });
});

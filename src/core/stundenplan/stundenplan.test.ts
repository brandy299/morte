import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createClass, createReihe, initWorkspace, readReihe, setStunde, UserError } from "../workspace/index.ts";
import { SAMPLE_ICS } from "./fixtures.ts";
import { IcsError, lessonKey, parseIcs } from "./ics.ts";
import { loadZuordnung, saveZuordnung, savePlan, suggest, titelListe } from "./store.ts";
import { addDays, legeAb, mondayOf, sameDay, weekday, woche } from "./woche.ts";

const week = { from: "2026-10-12", to: "2026-10-18" };

describe("reading an iCal timetable", () => {
  it("gives Berlin wall-clock times for UTC, zoned and floating entries", () => {
    const l = parseIcs(SAMPLE_ICS, week);
    const by = (uid: string) => l.find((x) => x.uid.startsWith(uid))!;
    expect(by("mo1")).toMatchObject({ datum: "2026-10-12", von: "08:00", bis: "08:45", titel: "Englisch 11a", ort: "R 101" });
    expect(by("mi3")).toMatchObject({ datum: "2026-10-14", von: "09:45", bis: "10:30" });
    expect(by("do1")).toMatchObject({ datum: "2026-10-15", von: "08:00" }); // floating: as written
    expect(by("fr4")).toMatchObject({ von: "10:30", bis: "11:15" }); // 08:30Z in summer time
  });

  it("expands a repeating lesson, leaves out the dates that are cancelled, skips all-day entries", () => {
    const all = parseIcs(SAMPLE_ICS, { from: "2026-10-01", to: "2026-11-30" });
    expect(all.filter((l) => l.titel === "WuV 11b").map((l) => l.datum)).toEqual(["2026-10-13", "2026-10-27"]);
    expect(all.some((l) => l.titel === "Herbstferien")).toBe(false);
  });

  it("only returns what lies in the range, sorted", () => {
    expect(parseIcs(SAMPLE_ICS, { from: "2026-10-13", to: "2026-10-13" }).map((l) => l.titel)).toEqual(["WuV 11b"]);
    const l = parseIcs(SAMPLE_ICS, week);
    expect(l.map((x) => `${x.datum} ${x.von}`)).toEqual([...l.map((x) => `${x.datum} ${x.von}`)].sort());
  });

  it("says in plain words when the file is no calendar", () => {
    expect(() => parseIcs("Das ist keine Datei", week)).toThrow(IcsError);
    expect(() => parseIcs("<html></html>", week)).toThrow(/kein Kalender/);
  });
});

describe("dates", () => {
  it("knows weekdays, weeks and table dates", () => {
    expect(weekday("2026-10-14")).toBe("Mi");
    expect(mondayOf("2026-10-18")).toBe("2026-10-12"); // Sunday belongs to the week before
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(sameDay("14.10.", "2026-10-14")).toBe(true);
    expect(sameDay("14.10", "2026-10-14")).toBe(true);
    expect(sameDay("14.10.2026", "2026-10-14")).toBe(true);
    expect(sameDay("14.10.2025", "2026-10-14")).toBe(false);
    expect(sameDay("4.10.", "2026-10-14")).toBe(false);
    expect(sameDay("Mi 3", "2026-10-14")).toBe(false);
  });
});

describe("timetable in the working folder", () => {
  beforeEach(async () => {
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "morte-sp-"));
    await initWorkspace();
    await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
    await createClass({ name: "11b", schulform: "Berufskolleg", stufe: "11", faecher: ["Wirtschaft und Verwaltung"] });
  });

  it("stores the file and tells what it covers; refuses a calendar without lessons", async () => {
    const meta = await savePlan(SAMPLE_ICS, { quelle: "datei", name: "untis.ics" });
    expect(meta).toMatchObject({ quelle: "datei", von: "2026-10-12", bis: "2026-10-27", anzahl: 6 });
    await expect(savePlan("BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR", { quelle: "datei" })).rejects.toThrow(/keine einzige Stunde/);
  });

  it("suggests class and subject only when it is clear", async () => {
    const klassen = [
      { name: "11a", faecher: [{ name: "Business English", reihen: [] }, { name: "Wirtschaft", reihen: [] }] },
      { name: "11b", faecher: [{ name: "Wirtschaft und Verwaltung", reihen: [] }] },
    ];
    expect(suggest("Englisch 11a", klassen)).toBeUndefined(); // "Englisch" is not "Business English", and 11a has two subjects
    expect(suggest("Bus. Engl. 11a", klassen)).toEqual({ klasse: "11a", fach: "Business English" });
    expect(suggest("WuV 11b", klassen)).toEqual({ klasse: "11b", fach: "Wirtschaft und Verwaltung" }); // single subject
    expect(suggest("Aufsicht", klassen)).toBeUndefined();
    expect(suggest("11a 11b Wirtschaft", klassen)).toBeUndefined(); // two classes
  });

  it("lists the different titles, most frequent first, and remembers the choices", async () => {
    await savePlan(SAMPLE_ICS, { quelle: "datei" });
    const list = await titelListe();
    expect(list.map((t) => `${t.titel}:${t.anzahl}`)).toEqual(["Englisch 11a:2", "WuV 11b:2", "Aufsicht:1", "Bus. Engl. 11a:1"]);
    expect(list.find((t) => t.titel === "WuV 11b")!.vorschlag).toEqual({ klasse: "11b", fach: "Wirtschaft und Verwaltung" });
    expect(list.find((t) => t.titel === "WuV 11b")!.beispiel).toBe("Fachraum");
    await saveZuordnung({ "aufsicht": null, "englisch 11a": { klasse: "11a", fach: "Business English" } });
    const again = await titelListe();
    expect(again.find((t) => t.titel === "Aufsicht")).toMatchObject({ zuordnung: null });
    expect(again.find((t) => t.titel === "Englisch 11a")!.zuordnung).toEqual({ klasse: "11a", fach: "Business English" });
    expect(await loadZuordnung()).toHaveProperty("aufsicht", null);
  });
});

describe("the week", () => {
  beforeEach(async () => {
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "morte-wo-"));
    await initWorkspace();
    await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
    await createClass({ name: "11b", schulform: "Berufskolleg", stufe: "11", faecher: ["Wirtschaft und Verwaltung"] });
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "12.10.", stunde: "Mo 1", thema: "Lebenslauf", material: "a.pdf", status: "gehalten" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "Mi 3", thema: "Interview" });
    await savePlan(SAMPLE_ICS, { quelle: "datei" });
    await saveZuordnung({
      "englisch 11a": { klasse: "11a", fach: "Business English" },
      "bus. engl. 11a": { klasse: "11a", fach: "Business English" },
      "wuv 11b": { klasse: "11b", fach: "Wirtschaft und Verwaltung" },
      "aufsicht": null,
    });
  });

  it("shows topic, material and state for each lesson and counts what is missing from today on", async () => {
    const w = (await woche("2026-10-14", "2026-10-13"))!;
    expect(w.montag).toBe("2026-10-12");
    expect(w.tage.map((t) => t.tag)).toEqual(["Mo", "Di", "Mi", "Do", "Fr"]);
    const lesson = (d: string, von: string) => w.tage.find((t) => t.datum === d)!.stunden.find((s) => s.von === von)!;
    expect(lesson("2026-10-12", "08:00")).toMatchObject({ zustand: "gehalten", thema: "Lebenslauf", material: "a.pdf", reihe: "01 Bewerbung" });
    expect(lesson("2026-10-14", "09:45")).toMatchObject({ zustand: "geplant", thema: "Interview", klasse: "11a" });
    expect(lesson("2026-10-15", "08:00")).toMatchObject({ zustand: "nicht-geplant", klasse: "11a" });
    expect(lesson("2026-10-13", "09:45")).toMatchObject({ zustand: "nicht-geplant", klasse: "11b" });
    expect(w.tage.find((t) => t.datum === "2026-10-16")!.stunden).toEqual([]); // "Aufsicht" is marked as not mine
    expect(w).toMatchObject({ fehlt: 1, nichtGeplant: 2, nichtZugeordnet: 0 }); // from the 13th on: Mi geplant; Di and Do not planned
  });

  it("does not count lessons in the past as missing", async () => {
    const w = (await woche("2026-10-14", "2026-10-15"))!;
    expect(w).toMatchObject({ fehlt: 0, nichtGeplant: 1 });
  });

  it("marks titles that were not assigned yet", async () => {
    await saveZuordnung({});
    const w = (await woche("2026-10-14", "2026-10-13"))!;
    expect(w.nichtZugeordnet).toBe(5);
    expect(w.tage[0]!.stunden[0]).toMatchObject({ zustand: "nicht-zugeordnet" });
  });

  it("has nothing to show without a timetable", async () => {
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "morte-none-"));
    expect(await woche("2026-10-14", "2026-10-14")).toBeUndefined();
  });
});

describe("dropping a file on a lesson", () => {
  beforeEach(async () => {
    process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "morte-drop-"));
    await initWorkspace();
    await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
  });
  const lesson = { klasse: "11a", fach: "Business English", datum: "2026-10-14", von: "09:45" };

  it("explains when there is no series yet", async () => {
    await expect(legeAb(lesson, { name: "a.pdf", data: Buffer.from("x") })).rejects.toThrow(/noch keine Reihe/);
  });

  it("files it in the series with a table row, and appends further files", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    const first = await legeAb(lesson, { name: "Arbeitsblatt Lebenslauf.docx", data: Buffer.from("x") });
    expect(first).toEqual({ reihe: "01 Bewerbung", datei: "2026-10-14_Mi0945_Arbeitsblatt-Lebenslauf.docx" });
    expect(await readFile(join(process.env.PULT_HOME!, "Klassen/11a/Business English/01 Bewerbung/Material", first.datei), "utf8")).toBe("x");
    await legeAb(lesson, { name: "Folien.pptx", data: Buffer.from("y") });
    const md = await readReihe("11a", "Business English", "Bewerbung");
    expect(md).toContain("| 14.10. | Mi 09:45 |  | 2026-10-14_Mi0945_Arbeitsblatt-Lebenslauf.docx, 2026-10-14_Mi0945_Folien.pptx | Material fertig |");
  });

  it("uses the row of that day, even in another series, and keeps its topic and status", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    await createReihe("11a", "Business English", { thema: "Meetings" });
    await setStunde("11a", "Business English", "Bewerbung", { datum: "14.10.", stunde: "Mi 3", thema: "Interview", status: "gehalten" });
    const r = await legeAb(lesson, { name: "Notizen.pdf", data: Buffer.from("z") });
    expect(r.reihe).toBe("01 Bewerbung");
    const md = await readReihe("11a", "Business English", "Bewerbung");
    expect(md).toMatch(/\| 14\.10\. \| Mi 3 \| Interview \| 2026-10-14_Mi0945_Notizen\.pdf \| gehalten \|/);
  });

  it("prefers the current series from Stand.md for a day without a row", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    await createReihe("11a", "Business English", { thema: "Meetings" });
    const { writeStand } = await import("../workspace/index.ts");
    await writeStand("11a", "Business English", { aktuelleReihe: "Bewerbung" });
    expect((await legeAb(lesson, { name: "x.pdf", data: Buffer.from("z") })).reihe).toBe("01 Bewerbung");
  });

  it("refuses types that could run, empty and oversized files", async () => {
    await createReihe("11a", "Business English", { thema: "Bewerbung" });
    for (const name of ["virus.exe", "skript.js", "seite.html", "ohne-endung"]) await expect(legeAb(lesson, { name, data: Buffer.from("x") })).rejects.toThrow(UserError);
    await expect(legeAb(lesson, { name: "a.pdf", data: Buffer.alloc(0) })).rejects.toThrow(/leer/);
    await expect(legeAb(lesson, { name: "a.pdf", data: Buffer.alloc(26 * 1024 * 1024) })).rejects.toThrow(/25 MB/);
  });
});

describe("a WebUntis export (class and teacher code in the description)", () => {
  // Invented codes in the shape of a real export: SUMMARY = subject, DESCRIPTION = "<class> <teacher>".
  const event = (n: number, summary: string | undefined, klasse: string | undefined, room = "12") =>
    [
      "BEGIN:VEVENT",
      `UID:u${n}`,
      `DTSTART;TZID=Europe/Berlin:20261012T${String(8 + (n % 8)).padStart(2, "0")}0000`,
      `DTEND;TZID=Europe/Berlin:20261012T${String(8 + (n % 8)).padStart(2, "0")}4500`,
      ...(summary ? [`SUMMARY:${summary}`] : []),
      `LOCATION:${room}`,
      `DESCRIPTION:${[klasse, "ABC"].filter(Boolean).join(" ")}`,
      "END:VEVENT",
    ].join("\r\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", ...[0, 1, 2, 3, 4, 5].map((i) => event(i, "INWI", i % 2 ? "HX1C" : "HX1D")), event(6, "VW", "HX1C"), event(7, "VW", "HX1C"), event(8, undefined, undefined, "FOYER"), event(9, "VW", "HX1D"), event(10, "VW", "HX1D"), "END:VCALENDAR"].join("\r\n");

  it("keeps the same subject in different classes apart and drops the teacher's own code", () => {
    const lessons = parseIcs(ics, { from: "2026-10-12", to: "2026-10-12" });
    expect(new Set(lessons.map((l) => l.gruppe))).toEqual(new Set(["HX1C", "HX1D", undefined]));
    expect(new Set(lessons.map((l) => lessonKey(l))).size).toBe(5);
  });
});

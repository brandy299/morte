import ICAL from "ical.js";

/** One lesson of the timetable, in the wall-clock time of Europe/Berlin. */
export interface Lesson {
  uid: string;
  /** 2026-10-14 */
  datum: string;
  /** 09:30 */
  von: string;
  bis: string;
  titel: string;
  ort?: string;
  beschreibung?: string;
  /** Class names from the description, without the teacher's own code that stands in every entry (WebUntis: "HHUC XBN"). */
  gruppe?: string;
}

export class IcsError extends Error {}

const ZONE = "Europe/Berlin";
const FORMAT = new Intl.DateTimeFormat("sv-SE", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Wall-clock date and time of an iCal time. Absolute times (with Z or a zone) are shown in Berlin time, floating times as written. */
function wall(t: ICAL.Time): { datum: string; zeit: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (t.isDate) return { datum: `${t.year}-${pad(t.month)}-${pad(t.day)}`, zeit: "" };
  if (t.zone === ICAL.Timezone.localTimezone || t.zone?.tzid === "floating") {
    return { datum: `${t.year}-${pad(t.month)}-${pad(t.day)}`, zeit: `${pad(t.hour)}:${pad(t.minute)}` };
  }
  const parts = Object.fromEntries(FORMAT.formatToParts(t.toJSDate()).map((p) => [p.type, p.value]));
  return { datum: `${parts.year}-${parts.month}-${parts.day}`, zeit: `${parts.hour}:${parts.minute}` };
}

const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

/**
 * Reads an iCal text (UNTIS, WebUntis, any calendar) and returns the lessons between two dates (inclusive, YYYY-MM-DD).
 * Repeating events are expanded, single dates of a series can be left out (EXDATE). All-day entries are skipped.
 */
/** Words that stand in (almost) every description: the owner of the timetable, not a class. */
function commonTokens(root: ICAL.Component): Set<string> {
  const counts = new Map<string, number>();
  let total = 0;
  for (const vevent of root.getAllSubcomponents("vevent")) {
    const d = clean(String(vevent.getFirstPropertyValue("description") ?? ""));
    if (!d) continue;
    total++;
    for (const t of new Set(d.split(/\s+/))) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (total < 10) return new Set();
  return new Set([...counts].filter(([, n]) => n >= total * 0.9).map(([t]) => t));
}

/** Identifies a kind of lesson for the assignment: same title in different classes counts as different. */
export const lessonKey = (l: Pick<Lesson, "titel" | "gruppe">) =>
  `${l.titel}${l.gruppe ? `|${l.gruppe}` : ""}`.replace(/\s+/g, " ").trim().toLowerCase();

export function parseIcs(text: string, range: { from: string; to: string }): Lesson[] {
  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(text));
  } catch {
    throw new IcsError("Diese Datei ist kein Kalender. Ich brauche die iCal-Datei (Endung .ics) aus deinem Stundenplan.");
  }
  if (root.name !== "vcalendar") throw new IcsError("Diese Datei ist kein Kalender. Ich brauche die iCal-Datei (Endung .ics) aus deinem Stundenplan.");
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    try {
      ICAL.TimezoneService.register(tz);
    } catch {
      /* a zone that cannot be read: its events fall back to floating times */
    }
  }
  const common = commonTokens(root);
  const lessons: Lesson[] = [];
  const add = (uid: string, ev: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null) => {
    if (start.isDate) return;
    const from = wall(start);
    if (from.datum < range.from || from.datum > range.to) return;
    const to = end ? wall(end) : from;
    lessons.push({
      uid,
      datum: from.datum,
      von: from.zeit,
      bis: to.datum === from.datum ? to.zeit : from.zeit,
      titel: clean(ev.summary),
      ort: clean(ev.location) || undefined,
      beschreibung: clean(ev.description) || undefined,
      gruppe: common.size === 0 ? undefined : clean(ev.description).split(/\s+/).filter((t) => t && !common.has(t)).join(" ") || undefined,
    });
  };
  for (const vevent of root.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(vevent);
    if (!ev.startDate) continue;
    if (ev.isRecurring()) {
      const it = ev.iterator();
      for (let n = it.next(), i = 0; n && i < 1500; n = it.next(), i++) {
        const day = wall(n).datum;
        if (day > range.to) break;
        if (day < range.from) continue;
        const d = ev.getOccurrenceDetails(n);
        add(`${ev.uid}@${day}`, ev, d.startDate, d.endDate);
      }
    } else add(ev.uid || `${clean(ev.summary)}@${wall(ev.startDate).datum}`, ev, ev.startDate, ev.endDate);
  }
  return lessons.sort((a, b) => a.datum.localeCompare(b.datum) || a.von.localeCompare(b.von) || a.titel.localeCompare(b.titel));
}

/** First and last day with a lesson, to tell the teacher what the file covers. */
export function coverage(text: string): { von: string; bis: string; anzahl: number } | undefined {
  const all = parseIcs(text, { from: "2000-01-01", to: "2100-12-31" });
  if (all.length === 0) return undefined;
  return { von: all[0]!.datum, bis: all.at(-1)!.datum, anzahl: all.length };
}

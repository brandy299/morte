import type { Hono } from "hono";
import { IcsError } from "../core/stundenplan/ics.ts";
import { loadPlan, loadZuordnung, removePlan, savePlan, saveZuordnung, titelKey, titelListe, type Zuordnung } from "../core/stundenplan/store.ts";
import { addDays, legeAb, woche } from "../core/stundenplan/woche.ts";
import { UserError, listTree } from "../core/workspace/index.ts";
import type { AppState } from "./state.ts";

const MAX_ICS = 5 * 1024 * 1024;
const MAX_DROP = 26 * 1024 * 1024;
const LINK_SECRET = "ical-url";

const berlinToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const isoDay = /^\d{4}-\d{2}-\d{2}$/;

/** webcal:// is https:// for a calendar. Only https may be fetched, and never an address inside this computer or network. */
export function checkLink(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/^webcal:/i, "https:"));
  } catch {
    throw new UserError("Der Link ist nicht gültig. Kopiere ihn vollständig aus deinem Stundenplan.");
  }
  if (url.protocol !== "https:") throw new UserError("Der Link muss mit https:// oder webcal:// beginnen.");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname) || !url.hostname.includes(".")) {
    throw new UserError("Dieser Link zeigt auf einen Rechner im eigenen Netz. Ich brauche den Link deines Stundenplan-Anbieters.");
  }
  return url;
}

async function download(url: URL): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "follow", headers: { accept: "text/calendar, */*" } });
  } catch {
    throw new UserError("Ich komme nicht an den Stundenplan heran. Prüfe die Internetverbindung und den Link.");
  }
  if (!res.ok) throw new UserError(res.status === 401 || res.status === 403 || res.status === 404 ? "Der Link wird nicht angenommen. Ist er noch gültig? Hole dir im Stundenplan einen neuen." : "Der Stundenplan-Anbieter antwortet gerade nicht richtig.");
  const text = await res.text();
  if (text.length > MAX_ICS) throw new UserError("Der Kalender ist zu groß.");
  return text;
}

/** The address without its personal part (query and path tail), for showing and for Quelle.json. */
const shown = (url: URL) => `${url.hostname}/…`;

export function stundenplanRoutes(app: Hono, state: AppState) {
  const fail = (err: unknown) => {
    if (err instanceof UserError || err instanceof IcsError) return { body: { error: err.message }, status: 400 as const };
    throw err;
  };

  app.get("/api/stundenplan", async (c) => {
    const plan = await loadPlan();
    return c.json({ vorhanden: Boolean(plan), meta: plan?.meta, hatLink: Boolean(await state.secrets.get(LINK_SECRET)) });
  });

  app.post("/api/stundenplan/datei", async (c) => {
    try {
      const file = (await c.req.parseBody()).file;
      if (!(file instanceof File)) throw new UserError("Bitte wähle eine Datei aus.");
      if (file.size > MAX_ICS) throw new UserError("Die Datei ist zu groß für einen Stundenplan.");
      const meta = await savePlan(await file.text(), { quelle: "datei", name: file.name });
      await state.secrets.delete(LINK_SECRET).catch(() => {});
      return c.json({ meta });
    } catch (err) {
      const f = fail(err);
      return c.json(f.body, f.status);
    }
  });

  app.post("/api/stundenplan/link", async (c) => {
    try {
      const { url } = await c.req.json<{ url: string }>();
      const checked = checkLink(url ?? "");
      const meta = await savePlan(await download(checked), { quelle: "link", name: shown(checked) });
      await state.secrets.set(LINK_SECRET, checked.href); // the link holds a personal key, so it lives with the secrets
      return c.json({ meta });
    } catch (err) {
      const f = fail(err);
      return c.json(f.body, f.status);
    }
  });

  app.post("/api/stundenplan/aktualisieren", async (c) => {
    try {
      const link = await state.secrets.get(LINK_SECRET);
      if (!link) throw new UserError("Es ist kein Link hinterlegt. Lade die Datei noch einmal hoch.");
      const url = checkLink(link);
      return c.json({ meta: await savePlan(await download(url), { quelle: "link", name: shown(url) }) });
    } catch (err) {
      const f = fail(err);
      return c.json(f.body, f.status);
    }
  });

  app.delete("/api/stundenplan", async (c) => {
    await removePlan();
    await state.secrets.delete(LINK_SECRET).catch(() => {});
    return c.json({ ok: true });
  });

  app.get("/api/stundenplan/titel", async (c) => {
    const klassen = (await listTree()).map((k) => ({ name: k.name, faecher: k.faecher.map((f) => f.name) }));
    return c.json({ titel: await titelListe(), klassen });
  });

  app.post("/api/stundenplan/zuordnung", async (c) => {
    const { zuordnung } = await c.req.json<{ zuordnung: Record<string, Zuordnung> }>();
    const tree = await listTree();
    const clean: Record<string, Zuordnung> = { ...(await loadZuordnung()) };
    for (const [titel, z] of Object.entries(zuordnung ?? {})) {
      if (z !== null && !tree.some((k) => k.name === z?.klasse && k.faecher.some((f) => f.name === z.fach))) {
        return c.json({ error: `„${titel}“: Diese Klasse oder dieses Fach gibt es nicht.` }, 400);
      }
      clean[titelKey(titel)] = z;
    }
    await saveZuordnung(clean);
    return c.json({ ok: true });
  });

  app.get("/api/woche", async (c) => {
    const heute = berlinToday();
    const requested = c.req.query("datum") ?? heute;
    if (!isoDay.test(requested)) return c.json({ error: "Das Datum ist nicht gültig." }, 400);
    const w = await woche(requested, heute);
    return c.json({ heute, woche: w, zurueck: addDays(requested, -7), weiter: addDays(requested, 7) });
  });

  app.post("/api/woche/ablegen", async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body.file;
      if (!(file instanceof File)) throw new UserError("Bitte ziehe eine Datei auf die Stunde.");
      if (file.size > MAX_DROP) throw new UserError("Die Datei ist größer als 25 MB.");
      const { klasse, fach, datum, von } = body as Record<string, string>;
      if (!klasse || !fach || !isoDay.test(datum ?? "") || !/^\d{2}:\d{2}$/.test(von ?? "")) throw new UserError("Diese Stunde kenne ich nicht.");
      const result = await legeAb({ klasse, fach, datum: datum!, von: von! }, { name: file.name, data: Buffer.from(await file.arrayBuffer()) });
      return c.json({ ok: true, ...result });
    } catch (err) {
      const f = fail(err);
      return c.json(f.body, f.status);
    }
  });
}

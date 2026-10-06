import { randomUUID } from "node:crypto";
import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createCompleter } from "../core/agent/index.ts";
import { assignLehrplan, convertPdf, estimate, LehrplanError, listLehrplaene, outline, readPdf, removePlan, saveLehrplan, type PdfFile } from "../core/lehrplan/index.ts";
import { addUsage } from "../core/usage/index.ts";
import { UserError, listTree } from "../core/workspace/index.ts";
import { loadSecret, type AppState } from "./state.ts";

const MAX_PDF = 60 * 1024 * 1024;
const MAX_TEXT = 3 * 1024 * 1024;

interface Pending {
  fileName: string;
  buffer: Buffer;
  kind: "pdf" | "text";
  expires: number;
}

/** Files that were checked and wait for the teacher to say "Umwandeln". They live in memory for 30 minutes. */
const pending = new Map<string, Pending>();
const MAX_PENDING_BYTES = 150 * 1024 * 1024;

/** Drops expired files, and the oldest ones while the waiting files together are too big. */
function tidyPending() {
  for (const [k, v] of pending) if (v.expires < Date.now()) pending.delete(k);
  let total = [...pending.values()].reduce((n, p) => n + p.buffer.length, 0);
  for (const [k, v] of pending) {
    if (total <= MAX_PENDING_BYTES) break;
    pending.delete(k);
    total -= v.buffer.length;
  }
}

function takePending(token: string): Pending | undefined {
  tidyPending();
  return pending.get(token);
}

async function completer(state: AppState) {
  if (!state.choice || state.choice.provider === "demo") {
    throw new UserError("Zum Umwandeln brauche ich eine echte KI. Richte sie zuerst unter „Einstellungen“ ein.");
  }
  return (state.makeCompleter ?? createCompleter)({ ...state.choice, apiKey: await loadSecret(state, state.choice.provider) }, { onUsage: (d) => void addUsage(d).catch(() => {}) });
}

const fail = (message: string, status: 400 | 404 | 409 | 413 = 400) => ({ body: { error: message }, status });

export function lehrplanRoutes(app: Hono, state: AppState) {
  let converting = false;

  app.get("/api/lehrplan", async (c) => {
    const klassen = (await listTree()).map((k) => k.name);
    return c.json({ lehrplaene: await listLehrplaene(), klassen });
  });

  app.post("/api/lehrplan/pruefen", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) return c.json({ error: "Bitte wähle eine Datei aus." }, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const isPdf = buffer.subarray(0, 5).toString() === "%PDF-";
    if (isPdf && buffer.length > MAX_PDF) return c.json({ error: "Das PDF ist größer als 60 MB. Bitte teile es in kleinere Teile." }, 413);
    if (!isPdf && !/\.(md|markdown|txt)$/i.test(file.name)) return c.json({ error: "Ich kann PDF-Dateien und Textdateien (.md, .txt) lesen." }, 400);
    if (!isPdf && buffer.length > MAX_TEXT) return c.json({ error: "Die Textdatei ist zu groß." }, 413);
    const token = randomUUID();
    tidyPending();
    pending.set(token, { fileName: file.name, buffer, kind: isPdf ? "pdf" : "text", expires: Date.now() + 30 * 60_000 });
    if (!isPdf) {
      const chars = buffer.toString("utf8").trim().length;
      if (chars < 20) {
        pending.delete(token);
        return c.json({ error: "In dieser Datei steht (fast) kein Text." }, 400);
      }
      return c.json({ token, dateiname: file.name, art: "text", zeichen: chars });
    }

    let pdf: PdfFile | undefined;
    try {
      pdf = await readPdf(buffer);
      const e = estimate(pdf);
      const model = state.choice && state.choice.provider !== "demo" ? await completer(state).catch(() => undefined) : undefined;
      if (model && e.scanned > 0 && !model.vision) {
        pending.delete(token);
        return c.json({ error: `${e.scanned} Seiten bestehen nur aus Bildern, und das gewählte Modell kann keine Bilder lesen. Wähle in den Einstellungen ein Modell mit Bildern.` }, 400);
      }
      const price = model?.price;
      const kostenUsd = price ? (e.inputTokens * price.input + e.outputTokens * price.output) / 1_000_000 : undefined;
      return c.json({ token, dateiname: file.name, art: "pdf", seiten: e.pages, bilder: e.scanned, anfragen: e.requests, kostenUsd, minuten: Math.max(1, Math.round((e.requests * 20) / 60)) });
    } catch (err) {
      pending.delete(token);
      if (err instanceof LehrplanError) return c.json({ error: err.message }, 400);
      throw err;
    } finally {
      await pdf?.close();
    }
  });

  app.post("/api/lehrplan/umwandeln", async (c) => {
    const { token, name, ersetzen } = await c.req.json<{ token: string; name: string; ersetzen?: boolean }>();
    const item = takePending(token);
    if (!item) return c.json({ error: "Die Datei ist nicht mehr da. Bitte wähle sie noch einmal aus." }, 404);
    if (converting) return c.json({ error: "Ich wandle gerade schon einen Lehrplan um." }, 409);
    converting = true; // set at once: everything below waits, and a second request must not slip in
    const refuse = (body: object, status: 400 | 409) => {
      converting = false;
      return c.json(body, status);
    };
    if (!name?.trim()) return refuse({ error: "Bitte gib dem Lehrplan einen Namen." }, 400);
    let ask;
    try {
      if (!ersetzen && (await listLehrplaene()).some((l) => l.hasPlan && l.name.toLowerCase() === name.trim().toLowerCase())) {
        return refuse({ error: `Für „${name.trim()}“ gibt es schon einen Lehrplan.`, existiert: true }, 409);
      }
      if (item.kind === "pdf") ask = (await completer(state)).complete;
    } catch (err) {
      return refuse({ error: err instanceof UserError ? err.message : "Das hat nicht geklappt. Bitte versuche es noch einmal." }, 409);
    }
    return streamSSE(c, async (stream) => {
      const controller = new AbortController();
      stream.onAbort(() => controller.abort());
      const send = (event: object) => stream.writeSSE({ data: JSON.stringify(event) });
      try {
        let markdown: string;
        let warnings: string[] = [];
        let pages: number | undefined;
        if (item.kind === "text") {
          markdown = item.buffer.toString("utf8");
        } else {
          const pdf = await readPdf(item.buffer);
          try {
            const result = await convertPdf(pdf, ask!, { signal: controller.signal, onProgress: (p) => void send({ type: "fortschritt", ...p }) });
            ({ markdown, warnings, pages } = result);
          } finally {
            await pdf.close();
          }
        }
        const saved = await saveLehrplan(name, markdown, { file: item.fileName, pages }, { replace: ersetzen });
        pending.delete(token);
        const heads = outline(markdown);
        const abschnitte = (await listLehrplaene()).find((l) => l.name === saved)?.abschnitte ?? heads.length;
        await send({ type: "fertig", name: saved, warnungen: warnings, abschnitte, gliederung: heads.filter((h) => h.level <= 3).slice(0, 60).map((h) => ({ ebene: h.level, titel: h.title })) });
      } catch (err) {
        const message = err instanceof LehrplanError || err instanceof UserError ? err.message : "Das Umwandeln hat nicht geklappt. Bitte versuche es noch einmal.";
        await send({ type: "fehler", message });
      } finally {
        converting = false;
      }
    });
  });

  app.post("/api/lehrplan/zuordnen", async (c) => {
    const { name, klassen } = await c.req.json<{ name: string; klassen: string[] }>();
    try {
      await assignLehrplan(name, klassen ?? []);
      return c.json({ ok: true });
    } catch (err) {
      if (err instanceof UserError) return c.json(fail(err.message).body, 400);
      throw err;
    }
  });

  app.delete("/api/lehrplan/:name", async (c) => {
    try {
      await removePlan(decodeURIComponent(c.req.param("name")));
      return c.json({ ok: true });
    } catch (err) {
      if (err instanceof UserError) return c.json(fail(err.message).body, 404);
      throw err;
    }
  });
}

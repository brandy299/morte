import { changeDataDir, openDataDir, ordnerInfo, OrdnerError, pickFolder, resetDataDir } from "../core/ordner/index.ts";
import { AnhangError, extractFile, MAX_FILES, MAX_TOTAL_CHARS, withFiles, type SentFile } from "../core/anhang/extract.ts";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { serve } from "@hono/node-server";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { streamSSE } from "hono/streaming";
import { checkBaseUrl, checkChoice, createChatSession, CUSTOM_ID, CustomProviderError, fetchBalance, listProviders, ModelNotAllowed, testConnection, type ChatSession, type ImageAttachment } from "../core/agent/index.ts";
import { createSecretStore, type SecretStore } from "../core/secrets/index.ts";
import { zipFiles, zipName, ZIP_MAX_FILES } from "../core/workspace/zip.ts";
import { createClass, initWorkspace, listAllMaterial, listTree, materialFile, materialInline, materialType, UserError } from "../core/workspace/index.ts";
import pkg from "../../package.json" with { type: "json" };
import { exportMarkdown } from "../core/history/export.ts";
import { exportiere as exportiereStift, liste as listeStift, loescheHinweis, speichereHinweis, StiftFehler } from "../core/stift/index.ts";
import { exportRueckmeldungen, RueckmeldungFehler, setzeRueckmeldung } from "../core/history/rueckmeldung.ts";
import { applyEvent, deleteConversation, listConversations, loadConversation, newConversationId, projektName, saveConversation, setzeProjekt, settle, titleFrom, type StoredMessage } from "../core/history/index.ts";
import { listSkills } from "../core/skills/index.ts";
import { addUsage, monthUsage } from "../core/usage/index.ts";
import { vorlagenRoutes } from "./vorlagen.ts";
import { lehrplanRoutes } from "./lehrplan.ts";
import { stundenplanRoutes } from "./stundenplan.ts";
import { keyName, type AppState } from "./state.ts";

export type { AppState };
import { loadSchule, logoBytes, MAX_LOGO_BYTES, removeLogo, saveLogo, saveSchulname } from "../core/schule/index.ts";
import { loadProviderSettings, saveProviderSettings } from "../core/settings/index.ts";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES = 8;
interface SetupBody {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  contextWindow?: number;
}

const MAX_IMAGE_BASE64 = 7_000_000; // about 5 MB of image


/** Identifies a tested choice without keeping the key itself. */
const fingerprint = (c: { provider: string; model: string; baseUrl?: string; contextWindow?: number }, key?: string) =>
  createHash("sha256").update([c.provider, c.model, c.baseUrl ?? "", c.contextWindow ?? "", key ?? ""].join("\0")).digest("hex");

async function buildSession(state: AppState, choice: NonNullable<AppState["choice"]>, key?: string) {
  const apiKey = choice.provider === "demo" ? undefined : (key ?? (await state.secrets.get(keyName(choice.provider))));
  state.choice = choice;
  state.conversation = undefined; // a new session starts a new conversation
  state.session?.abort();
  const { skills } = await listSkills();
  state.session = createChatSession({ ...choice, apiKey }, { skills, onUsage: (d) => void addUsage(d).catch(() => {}) });
}

export async function loadState(secrets: SecretStore): Promise<AppState> {
  const state: AppState = { secrets, session: undefined, configured: undefined };
  const saved = await loadProviderSettings();
  if (saved) {
    try {
      await buildSession(state, saved);
      state.configured = saved;
    } catch (err) {
      // A saved model that is not allowed, or gone (for example removed from the catalog after an update), is never used.
      // Start with the setup screen and say why.
      state.session = undefined;
      state.notice =
        err instanceof ModelNotAllowed ? err.message : "Das bisher gewählte Modell lässt sich nicht mehr verwenden. Bitte wähle ein neues.";
    }
  }
  return state;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const hostnameOf = (hostHeader: string) => hostHeader.replace(/:\d+$/, "").toLowerCase();

/**
 * The server only listens on this computer, but a web page the teacher has open could still talk to it
 * (forms and "simple" requests need no permission, and DNS tricks can point a foreign name at 127.0.0.1).
 * So the API only answers requests for a local name, and requests that come from a page on another origin are refused.
 */
export function localOnly(): MiddlewareHandler {
  return async (c, next) => {
    const host = c.req.header("host");
    if (host && !LOCAL_HOSTS.has(hostnameOf(host))) return c.json({ error: "Nicht erlaubt." }, 403);
    const origin = c.req.header("origin");
    if (origin) {
      let originHost: string;
      try {
        originHost = new URL(origin).host;
      } catch {
        return c.json({ error: "Nicht erlaubt." }, 403);
      }
      // The page must be this app: same address, or in development the Vite dev server (PULT_DEV_PORT) that forwards to us.
      const devPort = process.env.PULT_DEV_PORT;
      const fromDevServer = Boolean(devPort) && originHost.toLowerCase().endsWith(`:${devPort}`);
      const sameAddress = !host || originHost.toLowerCase() === host.toLowerCase();
      if (!LOCAL_HOSTS.has(hostnameOf(originHost)) || !(sameAddress || fromDevServer)) {
        return c.json({ error: "Nicht erlaubt." }, 403);
      }
    }
    await next();
  };
}

export function createApp(state: AppState) {
  const app = new Hono();
  app.use("/api/*", localOnly());
  let busy = false;

  app.get("/api/setup/status", (c) =>
    c.json({ configured: Boolean(state.session), ...state.configured, storage: state.secrets.kind, notice: state.notice }),
  );
  app.get("/api/setup/options", (c) => c.json({ providers: listProviders() }));

  app.post("/api/setup/test", async (c) => {
    const { provider, model, apiKey, baseUrl, contextWindow } = await c.req.json<SetupBody>();
    // A model that is not allowed is turned down before anything is sent to it.
    try {
      checkChoice({ provider, model, baseUrl, contextWindow });
    } catch (err) {
      if (err instanceof ModelNotAllowed) return c.json({ error: err.message }, 422);
    }
    const key = apiKey?.trim() || (await state.secrets.get(keyName(provider)));
    const result = await (state.runTest ?? testConnection)({ provider, model, apiKey: key, baseUrl, contextWindow });
    state.passed = result.passed ? fingerprint({ provider, model, baseUrl: baseUrl?.trim(), contextWindow }, key) : undefined;
    return c.json(result);
  });

  app.post("/api/setup/save", async (c) => {
    const { provider, model, apiKey, baseUrl, contextWindow } = await c.req.json<SetupBody>();
    const choice = { provider, model, ...(provider === CUSTOM_ID ? { baseUrl: baseUrl?.trim(), contextWindow } : {}) };
    const key = apiKey?.trim() || (await state.secrets.get(keyName(provider)));
    try {
      if (provider === CUSTOM_ID) choice.baseUrl = checkBaseUrl(baseUrl);
      // Unknown or unsuitable models are refused at once, without a network call.
      checkChoice({ provider, model, baseUrl: choice.baseUrl, contextWindow });
      // Only a model that passed the test can be saved, whatever the page did before. A direct call gets the test too.
      if (state.passed !== fingerprint(choice, key)) {
        const result = await (state.runTest ?? testConnection)({ provider, model, apiKey: key, baseUrl: choice.baseUrl, contextWindow });
        if (!result.passed) return c.json({ error: result.hint ?? "Das Modell passt noch nicht.", result }, 422);
      }
      await buildSession(state, choice, key);
      if (apiKey?.trim()) await state.secrets.set(keyName(provider), apiKey.trim());
    } catch (err) {
      if (err instanceof ModelNotAllowed) return c.json({ error: err.message }, 422);
      return c.json({ error: err instanceof CustomProviderError ? err.message : "Dieses Modell kenne ich nicht. Bitte wähle ein anderes." }, 400);
    }
    await saveProviderSettings(choice);
    state.configured = choice;
    state.notice = undefined;
    return c.json({ ok: true });
  });

  app.post("/api/setup/demo", async (c) => {
    state.configured = undefined;
    await buildSession(state, { provider: "demo" });
    return c.json({ ok: true });
  });

  app.get("/api/usage", async (c) => {
    const provider = state.configured?.provider;
    const key = provider ? await state.secrets.get(keyName(provider)) : undefined;
    return c.json({
      session: state.session?.usage(),
      month: await monthUsage(),
      balance: provider ? await fetchBalance(provider, key) : undefined,
    });
  });

  // Data folder: show, open in Finder/Explorer, pick, move.
  app.get("/api/ordner", (c) => c.json(ordnerInfo()));
  const ordnerAction = (run: (c: Context) => Promise<unknown>) => async (c: Context) => {
    try {
      return c.json({ ...ordnerInfo(), ...((await run(c)) as object | undefined) });
    } catch (e) {
      if (e instanceof OrdnerError) return c.json({ error: e.message }, 400);
      throw e;
    }
  };
  app.post("/api/ordner/oeffnen", ordnerAction(() => openDataDir()));
  app.post("/api/ordner/waehlen", async (c) => c.json({ pfad: (await pickFolder()) ?? null }));
  app.post("/api/ordner/aendern", ordnerAction(async (c) => changeDataDir(String((await c.req.json<{ pfad?: string }>()).pfad ?? ""))));
  app.post("/api/ordner/standard", ordnerAction(() => resetDataDir()));

  // Reads one attached file and returns its text. Nothing is stored; the browser sends the text along with the question.
  app.post("/api/anhang", async (c) => {
    const name = decodeURIComponent(c.req.query("name") ?? "");
    try {
      const { scanSeiten, ...rest } = await extractFile(Buffer.from(await c.req.arrayBuffer()), name);
      return c.json({ ...rest, bilder: scanSeiten?.map((png) => ({ mimeType: "image/png", data: png.toString("base64") })) });
    } catch (e) {
      if (e instanceof AnhangError) return c.json({ error: e.message }, 400);
      throw e;
    }
  });

  // School head on all material: name and logo, saved in the data folder.
  const schoolError = (e: unknown, c: Context) => {
    if (e instanceof UserError) return c.json({ error: e.message }, 400);
    throw e;
  };
  app.get("/api/schule", async (c) => c.json(await loadSchule()));
  app.put("/api/schule", async (c) => {
    try {
      const { name } = await c.req.json<{ name?: unknown }>();
      await saveSchulname(typeof name === "string" ? name : "");
      return c.json(await loadSchule());
    } catch (e) {
      return schoolError(e, c);
    }
  });
  app.get("/api/schule/logo", async (c) => {
    const png = await logoBytes();
    return png ? c.body(new Uint8Array(png), 200, { "content-type": "image/png", "cache-control": "no-store", "x-content-type-options": "nosniff" }) : c.notFound();
  });
  app.post("/api/schule/logo", async (c) => {
    if (Number(c.req.header("content-length") ?? 0) > MAX_LOGO_BYTES) return c.json({ error: "Die Datei ist zu groß. Ein Logo darf höchstens 3 MB haben." }, 413);
    try {
      await saveLogo(Buffer.from(await c.req.arrayBuffer()));
      return c.json(await loadSchule());
    } catch (e) {
      return schoolError(e, c);
    }
  });
  app.delete("/api/schule/logo", async (c) => {
    await removeLogo();
    return c.json(await loadSchule());
  });

  app.post("/api/chat", async (c) => {
    const session = state.session;
    if (!session) return c.json({ error: "Bitte richte zuerst die KI ein." }, 409);
    const { text, images = [], dateien = [] } = await c.req.json<{ text?: string; images?: ImageAttachment[]; dateien?: SentFile[] }>();
    if (!text?.trim()) return c.json({ error: "Bitte schreibe zuerst etwas." }, 400);
    const bad = images.length > MAX_IMAGES || images.some((i) => !IMAGE_TYPES.includes(i.mimeType) || i.data.length > MAX_IMAGE_BASE64);
    if (bad) return c.json({ error: "Bilder gehen nur als JPG, PNG, WebP oder GIF, höchstens acht Stück und jeweils unter 5 MB." }, 400);
    if (dateien.length > MAX_FILES || dateien.some((f) => typeof f.name !== "string" || typeof f.text !== "string") || dateien.reduce((n, f) => n + f.text.length, 0) > MAX_TOTAL_CHARS) {
      return c.json({ error: "Es passen höchstens fünf Dateien und nicht zu viel Text in eine Nachricht." }, 400);
    }
    if (busy) return c.json({ error: "Ich arbeite noch an der letzten Frage." }, 409);
    busy = true;
    const conversation = (state.conversation ??= { id: newConversationId(), titel: titleFrom(text), erstellt: new Date().toISOString(), anzeige: [] });
    let answer: StoredMessage = { role: "assistant", text: "", steps: [] };
    conversation.anzeige.push({ role: "user", text, bilder: images.length || undefined, dateien: dateien.length ? dateien.map((f) => f.name) : undefined, steps: [] });
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => session.abort());
      try {
        await session.send(
          withFiles(text, dateien),
          (event) => {
            answer = applyEvent(answer, event);
            void stream.writeSSE({ data: JSON.stringify(event) });
          },
          images,
        );
      } finally {
        conversation.anzeige.push(settle(answer));
        const { messages, usage, log } = session.history();
        await saveConversation({ ...conversation, modell: messages, verbrauch: usage, ablauf: log }).catch(() => {});
        busy = false;
      }
    });
  });

  // "Nochmal versuchen": goes on with the failed answer instead of asking the question a second time.
  // The teacher's choices for the questions the assistant asked (null: skipped).
  app.post("/api/chat/fragen", async (c) => {
    const { id, antworten } = await c.req.json<{ id?: string; antworten?: unknown }>();
    const ok = state.session?.answerQuestions(String(id), antworten === null ? undefined : antworten) ?? false;
    return ok ? c.json({ ok: true }) : c.json({ error: "Die Antworten passen nicht zu den Fragen." }, 400);
  });

  app.post("/api/chat/retry", async (c) => {
    const session = state.session;
    const conversation = state.conversation;
    if (!session) return c.json({ error: "Bitte richte zuerst die KI ein." }, 409);
    if (busy) return c.json({ error: "Ich arbeite noch an der letzten Frage." }, 409);
    const failed = conversation?.anzeige.at(-1);
    if (!conversation || failed?.role !== "assistant" || !session.canRetry()) {
      return c.json({ error: "Es gibt nichts zu wiederholen. Bitte stelle deine Frage noch einmal." }, 409);
    }
    busy = true;
    conversation.anzeige.pop();
    let answer: StoredMessage = { ...failed, error: undefined, retryable: undefined };
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => session.abort());
      try {
        await session.retry((event) => {
          answer = applyEvent(answer, event);
          void stream.writeSSE({ data: JSON.stringify(event) });
        });
      } finally {
        conversation.anzeige.push(settle(answer));
        const { messages, usage, log } = session.history();
        await saveConversation({ ...conversation, modell: messages, verbrauch: usage, ablauf: log }).catch(() => {});
        busy = false;
      }
    });
  });

  app.post("/api/chat/confirm", async (c) => {
    const { id, allow } = await c.req.json<{ id: string; allow: boolean }>();
    state.session?.answer(id, Boolean(allow));
    return c.json({ ok: true });
  });

  app.get("/api/workspace/tree", async (c) => c.json({ klassen: await listTree() }));

  app.post("/api/workspace/klasse", async (c) => {
    try {
      const name = await createClass(await c.req.json());
      return c.json({ name });
    } catch (err) {
      if (err instanceof UserError) return c.json({ error: err.message }, 400);
      throw err;
    }
  });

  app.get("/api/material/liste", async (c) => c.json({ dateien: await listAllMaterial() }));

  app.get("/api/material", async (c) => {
    const file = await materialFile(c.req.query("path") ?? "");
    if (!file) return c.notFound();
    const name = encodeURIComponent(file.split(/[\\/]/).pop()!);
    // PDFs, pictures and explainer pieces open in the preview. Everything else is a download, so nothing runs in the browser.
    const inline = materialInline(file) && !c.req.query("download");
    // An explainer piece runs its own script. The sandbox gives it no access to Pult, no network and no storage.
    const sandbox: Record<string, string> = /\.html$/i.test(file) ? { "content-security-policy": "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:" } : {};
    return c.body(await readFile(file), 200, {
      "content-type": materialType(file) ?? "application/octet-stream",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${name}`,
      "x-content-type-options": "nosniff",
      ...sandbox,
    });
  });

  // Several material files as one zip. `path` is repeated, `name` titles the zip.
  app.get("/api/material/zip", async (c) => {
    const wanted = [...new Set(c.req.queries("path") ?? [])];
    if (wanted.length === 0 || wanted.length > ZIP_MAX_FILES) return c.json({ error: "Es gibt nichts zu packen." }, 400);
    const files: { name: string; data: Uint8Array }[] = [];
    for (const rel of wanted) {
      const file = await materialFile(rel);
      if (file) files.push({ name: file.split(/[\\/]/).pop()!, data: await readFile(file) });
    }
    if (files.length === 0) return c.json({ error: "Diese Dateien gibt es nicht mehr." }, 404);
    try {
      return c.body(zipFiles(files) as unknown as ArrayBuffer, 200, {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipName(c.req.query("name")))}`,
        "x-content-type-options": "nosniff",
      });
    } catch {
      return c.json({ error: "Die Dateien sind zu groß für ein gemeinsames Paket." }, 413);
    }
  });

  app.get("/api/history", async (c) => c.json({ gespraeche: await listConversations(), aktuell: state.conversation?.id }));

  app.post("/api/history/open", async (c) => {
    const { id } = await c.req.json<{ id: string }>();
    if (busy) return c.json({ error: "Ich arbeite noch an der letzten Frage." }, 409);
    const saved = await loadConversation(id).catch(() => undefined);
    if (!saved || !state.choice) return c.json({ error: "Dieses Gespräch gibt es nicht mehr." }, 404);
    await buildSession(state, state.choice);
    state.session!.restore({ messages: saved.modell, usage: saved.verbrauch as never, log: saved.ablauf });
    state.conversation = { id: saved.id, titel: saved.titel, erstellt: saved.erstellt, anzeige: saved.anzeige };
    return c.json({ anzeige: saved.anzeige, usage: state.session!.usage(), rueckmeldungen: saved.rueckmeldungen ?? [] });
  });

  // "Passt" / "Passt nicht" on one finished material, saved with the conversation.
  // Puts a conversation into a project folder (`projekt` is the name) or takes it out (`projekt` is null).
  app.post("/api/history/:id/projekt", async (c) => {
    const { projekt } = (await c.req.json().catch(() => ({}))) as { projekt?: unknown };
    let name: string | undefined;
    try {
      name = projekt === null || projekt === undefined ? undefined : projektName(projekt);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Das Projekt konnte nicht gesetzt werden." }, 400);
    }
    const ok = await setzeProjekt(c.req.param("id"), name).catch(() => false);
    return ok ? c.json({ ok: true }) : c.json({ error: "Dieses Gespräch gibt es nicht mehr." }, 404);
  });

  app.post("/api/history/:id/rueckmeldung", async (c) => {
    try {
      return c.json({ rueckmeldungen: await setzeRueckmeldung(c.req.param("id"), await c.req.json()) });
    } catch (e) {
      if (e instanceof RueckmeldungFehler) return c.json({ error: e.message }, 400);
      return c.json({ error: "Die Rückmeldung konnte nicht gespeichert werden." }, 400);
    }
  });

  app.get("/api/history/:id/rueckmeldungen", async (c) => c.json({ rueckmeldungen: (await loadConversation(c.req.param("id")).catch(() => undefined))?.rueckmeldungen ?? [] }));

  // All feedback as a file for the developers. The sentences are in it only when asked for (?mitSatz=1).
  // Dev pencil (only while testing, switched on with PULT_STIFT=1): notes with the place on the screen.
  const stiftAn = () => process.env.PULT_STIFT === "1";
  app.get("/api/stift/status", (c) => c.json({ aktiv: stiftAn() }));
  app.get("/api/stift", async (c) => (stiftAn() ? c.json({ hinweise: await listeStift() }) : c.notFound()));
  app.post("/api/stift", async (c) => {
    if (!stiftAn()) return c.notFound();
    try {
      return c.json({ hinweis: await speichereHinweis(await c.req.json()) });
    } catch (e) {
      return c.json({ error: e instanceof StiftFehler ? e.message : "Der Hinweis konnte nicht gespeichert werden." }, 400);
    }
  });
  app.delete("/api/stift/:id", async (c) => {
    if (!stiftAn()) return c.notFound();
    try {
      await loescheHinweis(c.req.param("id"));
      return c.json({ ok: true });
    } catch (e) {
      return c.json({ error: e instanceof StiftFehler ? e.message : "Das Löschen hat nicht geklappt." }, 400);
    }
  });
  app.get("/api/stift/export", async (c) => {
    if (!stiftAn()) return c.notFound();
    const { markdown, zip } = await exportiereStift({ version: pkg.version });
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    if (c.req.query("format") === "md") {
      c.header("content-type", "text/markdown; charset=utf-8");
      c.header("content-disposition", `attachment; filename="pult-hinweise-${stamp}.md"`);
      return c.body(markdown);
    }
    return c.body(zip as unknown as ArrayBuffer, 200, { "content-type": "application/zip", "content-disposition": `attachment; filename="pult-hinweise-${stamp}.zip"`, "x-content-type-options": "nosniff" });
  });

  app.get("/api/rueckmeldungen/export", async (c) => {
    const stamp = new Date().toISOString().slice(0, 10);
    c.header("content-type", "application/json; charset=utf-8");
    c.header("content-disposition", `attachment; filename="pult-rueckmeldungen-${stamp}.json"`);
    return c.body(JSON.stringify(await exportRueckmeldungen({ mitSatz: c.req.query("mitSatz") === "1" }), null, 2));
  });

  // The whole conversation as a readable text file, to look at what went wrong or well.
  app.get("/api/history/:id/export", async (c) => {
    const conversation = await loadConversation(c.req.param("id")).catch(() => undefined);
    if (!conversation) return c.json({ error: "Dieses Gespräch gibt es nicht." }, 404);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    c.header("content-type", "text/markdown; charset=utf-8");
    c.header("content-disposition", `attachment; filename="pult-gespraech-${stamp}.md"`);
    return c.body(exportMarkdown(conversation, { version: pkg.version }));
  });

  app.delete("/api/history/:id", async (c) => {
    const id = c.req.param("id");
    // The answer that is still being written would save the conversation again, so wait until it is done.
    if (busy && state.conversation?.id === id) return c.json({ error: "Dieses Gespräch läuft gerade. Bitte warte, bis die Antwort fertig ist." }, 409);
    await deleteConversation(id).catch(() => {});
    if (state.conversation?.id === id && state.choice) await buildSession(state, state.choice);
    return c.json({ ok: true });
  });

  app.post("/api/chat/reset", async (c) => {
    if (state.choice) await buildSession(state, state.choice);
    return c.json({ ok: true });
  });

  lehrplanRoutes(app, state);
  stundenplanRoutes(app, state);
  vorlagenRoutes(app);

  return app;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

/** True when this file is the program that was started (not imported). Windows writes the path with backslashes. */
export const isServerEntry = (entry?: string) => /(^|[/\\])server[/\\]index\.(ts|js)$/.test(entry ?? "");

if (isServerEntry(process.argv[1])) {
  await initWorkspace();
  const app = createApp(await loadState(await createSecretStore()));
  const webDir = join(process.cwd(), "dist", "web");
  // Production: serve the built UI. In development Vite serves it and proxies /api here.
  app.get("*", async (c) => {
    const rel = normalize(c.req.path).replace(/^(\.\.[/\\])+/, "");
    const file = join(webDir, c.req.path === "/" ? "index.html" : rel);
    if (!file.startsWith(webDir)) return c.notFound();
    try {
      const body = await readFile(file);
      return c.body(body, 200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    } catch {
      return c.notFound();
    }
  });
  const port = Number(process.env.PORT ?? 3001);
  serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, () =>
    console.log(`Pult läuft auf http://localhost:${port}`),
  );
}

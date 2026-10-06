import { deflateSync } from "node:zlib";
import { Type, type Context } from "@earendil-works/pi-ai";
import { CUSTOM_ID, CustomProviderError, keyFor } from "./custom.ts";
import { PROVIDERS, resolveModel } from "./models.ts";
import { dateTool } from "./tools.ts";
import type { AgentSettings, ConnectionResult, ProviderOption } from "./types.ts";

/** Providers with their models. Recommended ones come first, the rest is for "Erweitert". */
export function listProviders(): ProviderOption[] {
  const catalog = Object.entries(PROVIDERS).map(([id, p]) => {
    const models = p.make().getModels().map((m) => ({
      id: m.id,
      name: m.name,
      vision: m.input.includes("image"),
      recommended: p.recommended.includes(m.id),
    }));
    const rank = (id: string) => (p.recommended.includes(id) ? p.recommended.indexOf(id) : p.recommended.length);
    models.sort((a, b) => rank(a.id) - rank(b.id));
    return { id, name: p.name, models };
  });
  return [...catalog, { id: CUSTOM_ID, name: "Anderer Anbieter (OpenAI-kompatibel)", custom: true, models: [] }];
}

/** Solid red square as PNG, built by hand so no image library is needed. */
function redSquarePng(size = 32): string {
  const crc = (buf: Buffer) => {
    let c = ~0;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [255, 0, 0]).flat())]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png.toString("base64");
}

const textOf = (content: { type: string; text?: string }[]) =>
  content.map((c) => (c.type === "text" ? c.text : "")).join(" ");

/**
 * Checks what the main model must be able to do: chat, call tools, understand images.
 * Uses the catalog (`model.input`) first and then a real test call.
 */
export async function testConnection(
  settings: AgentSettings,
  resolve: typeof resolveModel = resolveModel,
): Promise<ConnectionResult> {
  const checks: ConnectionResult["checks"] = [
    { id: "chat", label: "Antworten", state: "skipped" },
    { id: "tools", label: "Dateiaufgaben (Werkzeuge)", state: "skipped" },
    { id: "vision", label: "Bilder verstehen", state: "skipped" },
  ];
  const set = (id: string, state: "ok" | "failed") => {
    checks.find((c) => c.id === id)!.state = state;
  };
  const opts = { apiKey: keyFor(settings.provider, settings.apiKey), maxTokens: 200 };
  const now = () => Date.now();

  let resolved;
  try {
    resolved = resolve(settings);
  } catch (err) {
    return { passed: false, checks, hint: err instanceof CustomProviderError ? err.message : "Dieses Modell kenne ich nicht. Bitte wähle ein anderes." };
  }
  const { models, model } = resolved;

  try {
    const chat = await models.completeSimple(
      model,
      { messages: [{ role: "user", content: "Antworte nur mit dem Wort: Hallo", timestamp: now() }] },
      opts,
    );
    if (chat.stopReason === "error") throw new Error(chat.errorMessage);
    set("chat", "ok");
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const own = settings.provider === CUSTOM_ID;
    const hint = /api key|apikey|unauthor|401|403|authenticat/i.test(raw)
      ? "Der Zugangsschlüssel wurde nicht angenommen. Bitte prüfe, ob du ihn vollständig kopiert hast."
      : own && /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|connect|ETIMEDOUT|connection error/i.test(raw)
        ? "Ich erreiche den Server unter dieser Adresse nicht. Läuft er, und stimmt die Adresse?"
        : own && /404|not found|model|does not exist/i.test(raw)
          ? "Der Server kennt dieses Modell oder diesen Pfad nicht. Prüfe den Modellnamen und ob die Adresse auf „/v1“ endet."
          : "Ich komme nicht an die KI heran. Bitte prüfe die Internetverbindung und versuche es noch einmal.";
    return { passed: false, checks, hint };
  }

  try {
    const context: Context = {
      messages: [{ role: "user", content: "Welches Datum ist heute? Nutze dafür das Werkzeug.", timestamp: now() }],
      tools: [{ name: dateTool.name, description: dateTool.description, parameters: Type.Object({}) }],
    };
    const reply = await models.completeSimple(model, context, opts);
    set("tools", reply.content.some((c) => c.type === "toolCall") ? "ok" : "failed");
  } catch {
    set("tools", "failed");
  }

  if (!model.input.includes("image")) {
    set("vision", "failed");
  } else {
    try {
      const reply = await models.completeSimple(
        model,
        {
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Welche Farbe hat dieses Bild? Antworte mit einem Wort." },
                { type: "image", data: redSquarePng(), mimeType: "image/png" },
              ],
              timestamp: now(),
            },
          ],
        },
        opts,
      );
      set("vision", /rot|red/i.test(textOf(reply.content)) ? "ok" : "failed");
    } catch {
      set("vision", "failed");
    }
  }

  const failed = checks.filter((c) => c.state === "failed").map((c) => c.id);
  const hints: Record<string, string> = {
    tools: "Dieses Modell kann keine Dateiaufgaben übernehmen, die Materialerstellung würde nicht klappen.",
    vision: "Dieses Modell versteht keine Bilder, ein Foto als Vorlage würde nicht funktionieren.",
  };
  return {
    passed: failed.length === 0,
    checks,
    hint: failed.length ? failed.map((f) => hints[f]).filter(Boolean).join(" ") + " Bitte wähle ein anderes Modell." : undefined,
  };
}

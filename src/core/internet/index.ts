/**
 * Searching the web and reading pages for the assistant (decision 026).
 * Search runs over a service the teacher already has a key for: DeepSeek (own search API) or OpenRouter (web plugin).
 * Reading a page needs no key. Pages are only fetched from public addresses: never the teacher's own computer
 * or the school network, so a page or a model cannot use Pult to look into it.
 */
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface Treffer { titel: string; url: string; text: string }
export interface Seite { titel: string; url: string; text: string; gekuerzt: boolean }

/** A search service the assistant can use. */
export interface Dienst {
  name: "DeepSeek" | "OpenRouter";
  suchen(frage: string, signal?: AbortSignal): Promise<Treffer[]>;
  /** Reads a page on the service's side; without it Pult reads the page itself. */
  lesen?(url: string, signal?: AbortSignal): Promise<Seite>;
}

/** A problem the assistant can tell the teacher about in plain words. */
export class InternetError extends Error {}

type FetchFn = typeof fetch;
type Lookup = (host: string) => Promise<{ address: string }[]>;

export const MAX_FRAGE = 128;
/** Characters of page text the assistant gets. More would fill its memory without helping. */
export const MAX_TEXT = 12_000;
const MAX_BYTES = 2_000_000;
const MAX_UMLEITUNGEN = 5;

const kurz = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// ---------- search services ----------

/** DeepSeek's search API: same key as the model, billed per search. */
export function deepseekDienst(key: string, opts: { fetch?: FetchFn; onKosten?: (dollar: number) => void } = {}): Dienst {
  const f = opts.fetch ?? fetch;
  const post = async (pfad: string, body: unknown, signal?: AbortSignal) => {
    const res = await f(`https://api.deepseek.com/v1/tools/${pfad}`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(30_000),
    }).catch(() => undefined);
    if (!res) throw new InternetError("DeepSeek ist gerade nicht erreichbar.");
    if (res.status === 401 || res.status === 403) throw new InternetError("DeepSeek nimmt den Schlüssel für die Suche nicht an.");
    if (res.status === 402) throw new InternetError("Das Guthaben bei DeepSeek ist aufgebraucht.");
    if (!res.ok) throw new InternetError(`DeepSeek antwortet mit einem Fehler (${res.status}).`);
    opts.onKosten?.(0.00075);
    return (await res.json().catch(() => ({}))) as Record<string, unknown>;
  };
  return {
    name: "DeepSeek",
    async suchen(frage, signal) {
      const data = await post("search", { query: kurz(frage, MAX_FRAGE), count: 6 }, signal);
      const results = Array.isArray(data.results) ? (data.results as Record<string, unknown>[]) : [];
      return results
        .map((r) => ({ titel: String(r.title ?? ""), url: String(r.url ?? ""), text: kurz(String(r.summary || r.snippet || ""), 1200) }))
        .filter((t) => /^https?:\/\//.test(t.url));
    },
    async lesen(url, signal) {
      pruefeAdresse(url);
      const data = await post("fetch", { url }, signal);
      const text = String(data.content ?? "");
      if (!text.trim()) throw new InternetError("Auf der Seite steht kein lesbarer Text.");
      return { titel: String(data.title ?? ""), url, text: kurz(text, MAX_TEXT), gekuerzt: text.length > MAX_TEXT };
    },
  };
}

/**
 * OpenRouter's web plugin with the teacher's chosen model. Search runs at Exa (fixed price per search),
 * the found pages come back as citations with title, link and an excerpt.
 */
export function openrouterDienst(key: string, model: string, opts: { fetch?: FetchFn; onKosten?: (dollar: number) => void } = {}): Dienst {
  const f = opts.fetch ?? fetch;
  return {
    name: "OpenRouter",
    async suchen(frage, signal) {
      const res = await f("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: `Suche im Internet nach: ${kurz(frage, MAX_FRAGE)}\nNenne nur die passendsten Quellen, ohne eigene Erklärung.` }],
          plugins: [{ id: "web", engine: "exa", max_results: 5 }],
          max_tokens: 300,
          usage: { include: true },
        }),
        signal: signal ?? AbortSignal.timeout(60_000),
      }).catch(() => undefined);
      if (!res) throw new InternetError("OpenRouter ist gerade nicht erreichbar.");
      if (res.status === 401 || res.status === 403) throw new InternetError("OpenRouter nimmt den Schlüssel für die Suche nicht an.");
      if (res.status === 402) throw new InternetError("Das Guthaben bei OpenRouter ist aufgebraucht.");
      if (!res.ok) throw new InternetError(`OpenRouter antwortet mit einem Fehler (${res.status}).`);
      const data = (await res.json().catch(() => ({}))) as {
        choices?: { message?: { annotations?: { type?: string; url_citation?: { url?: string; title?: string; content?: string } }[] } }[];
        usage?: { cost?: number };
      };
      if (typeof data.usage?.cost === "number") opts.onKosten?.(data.usage.cost);
      const gesehen = new Set<string>();
      return (data.choices?.[0]?.message?.annotations ?? [])
        .filter((a) => a.type === "url_citation" && a.url_citation?.url)
        .map((a) => ({ titel: a.url_citation!.title ?? "", url: a.url_citation!.url!, text: kurz(a.url_citation!.content ?? "", 1200) }))
        .filter((t) => /^https?:\/\//.test(t.url) && !gesehen.has(t.url) && gesehen.add(t.url));
    },
  };
}

// ---------- reading a page ----------

/** Checks a link before anything is fetched: web addresses only, no login data in it. */
export function pruefeAdresse(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new InternetError(`„${kurz(raw, 80)}“ ist kein gültiger Link.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new InternetError("Ich lese nur Webseiten (Links mit http oder https).");
  if (url.username || url.password) throw new InternetError("Links mit Zugangsdaten lese ich nicht.");
  return url;
}

/** True for addresses that are not on the public internet: this computer, the school or home network, link-local. */
export function istPrivat(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const v6 = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return istPrivat(mapped[1]!);
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff");
}

async function pruefeZiel(url: URL, lookup: Lookup) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new InternetError("Seiten auf diesem Computer oder im eigenen Netz lese ich nicht.");
  const adressen = isIP(host) ? [{ address: host }] : await lookup(host).catch(() => []);
  if (adressen.length === 0) throw new InternetError(`Die Seite ${host} gibt es nicht oder sie ist gerade nicht erreichbar.`);
  if (adressen.some((a) => istPrivat(a.address))) throw new InternetError("Seiten auf diesem Computer oder im eigenen Netz lese ich nicht.");
}

/** Reads a public web page and returns its text. Follows a few redirects and checks every hop again. */
export async function seiteLesen(raw: string, opts: { fetch?: FetchFn; lookup?: Lookup; signal?: AbortSignal } = {}): Promise<Seite> {
  const f = opts.fetch ?? fetch;
  const lookup: Lookup = opts.lookup ?? ((host) => dnsLookup(host, { all: true }));
  let url = pruefeAdresse(raw);
  for (let hop = 0; ; hop++) {
    await pruefeZiel(url, lookup);
    const res = await f(url, {
      redirect: "manual",
      headers: { accept: "text/html, text/plain;q=0.9, */*;q=0.1", "user-agent": "Pult (Arbeitsassistent fuer Lehrkraefte)" },
      signal: opts.signal ?? AbortSignal.timeout(20_000),
    }).catch(() => undefined);
    if (!res) throw new InternetError("Die Seite antwortet nicht.");
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      if (hop >= MAX_UMLEITUNGEN) throw new InternetError("Die Seite leitet zu oft weiter.");
      url = pruefeAdresse(new URL(res.headers.get("location")!, url).href);
      continue;
    }
    if (res.status === 404) throw new InternetError("Die Seite gibt es nicht (mehr).");
    if (res.status === 401 || res.status === 403) throw new InternetError("Die Seite ist geschützt oder lässt Programme nicht lesen.");
    if (!res.ok) throw new InternetError(`Die Seite antwortet mit einem Fehler (${res.status}).`);
    const typ = (res.headers.get("content-type") ?? "").toLowerCase();
    if (typ.includes("pdf")) throw new InternetError("Das ist eine PDF-Datei. Die kann ich aus dem Internet noch nicht lesen. Die Lehrkraft kann sie herunterladen und im Chat anhängen.");
    if (typ && !/text\/(html|plain)|application\/xhtml/.test(typ)) throw new InternetError("Das ist keine Textseite, sondern eine Datei. Die Lehrkraft kann sie herunterladen und im Chat anhängen.");
    const roh = await leseBegrenzt(res);
    const html = /html/.test(typ) || /<html|<body|<p[\s>]/i.test(roh.slice(0, 2000));
    const { titel, text } = html ? htmlZuText(roh) : { titel: "", text: roh.trim() };
    if (!text) throw new InternetError("Auf der Seite steht kein lesbarer Text. Vielleicht braucht sie JavaScript.");
    return { titel, url: url.href, text: kurz(text, MAX_TEXT), gekuerzt: text.length > MAX_TEXT };
  }
}

async function leseBegrenzt(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const teile: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
    teile.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(teile));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", euro: "€", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", bdquo: "„", ldquo: "“", rdquo: "”", sbquo: "‚", lsquo: "‘", rsquo: "’", copy: "©", deg: "°", middot: "·", times: "×" };
const entities = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : "";
    }
    return ENTITIES[e] ?? m;
  });

/** Turns a web page into plain text with headings and list points. Menus, scripts and forms are left out. */
export function htmlZuText(html: string): { titel: string; text: string } {
  const titel = entities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
  let s = html.replace(/<!--[\s\S]*?-->/g, " ");
  // Prefer the main part when the page marks it.
  const haupt = /<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(s);
  if (haupt && haupt[2]!.replace(/<[^>]+>/g, "").trim().length > 200) s = haupt[2]!;
  s = s.replace(/<(script|style|noscript|svg|template|iframe|head|nav|footer|form|button|select|aside)\b[\s\S]*?<\/\1>/gi, " ");
  // Long lists that are nothing but links (menus, language lists) say nothing; from the inside out.
  for (let runde = 0; runde < 3; runde++) {
    const vorher = s;
    s = s.replace(/<(ul|ol)\b[^>]*>((?:(?!<(?:ul|ol)\b)[\s\S])*?)<\/\1>/gi, (liste, _tag: string, innen: string) => {
      const punkte = (innen.match(/<li\b/gi) ?? []).length;
      const ohneLinks = innen.replace(/<a\b[\s\S]*?<\/a>/gi, "").replace(/<[^>]+>/g, "").replace(/\s+/g, "");
      return punkte >= 8 && ohneLinks.length <= punkte * 3 ? " " : liste.replace(/<(\/?)(ul|ol)\b/gi, "<$1x-$2");
    });
    if (s === vorher) break;
  }
  s = s
    .replace(/<(\/?)x-(ul|ol)\b/gi, "<$1$2")
    .replace(/<h([1-6])\b[^>]*>/gi, (_m, n: string) => `\n\n${"#".repeat(Number(n))} `)
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|section|article|ul|ol|table|tr|blockquote|pre|dd|dt|figure|figcaption)>/gi, "\n")
    .replace(/<(td|th)\b[^>]*>/gi, " | ")
    // Tags inside a sentence (links, emphasis) vanish without a gap, so no space lands before a comma.
    .replace(/<\/?(a|span|b|i|em|strong|sup|sub|code|abbr|small|u|mark|q|cite|time)\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ");
  const text = entities(s)
    .split("\n")
    .map((z) => z.replace(/[ \t ]+/g, " ").trim())
    .filter((z, i, a) => z !== "" || (i > 0 && a[i - 1] !== ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { titel, text };
}

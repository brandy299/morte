/**
 * Pictures from Wikimedia Commons for teaching material (issue #22, docs/entscheidungen/024-bilder-von-commons.md).
 * The model gets two fixed tools (search, insert), never a free network access. Everything is checked here:
 * only two addresses, only free licenses, the source line is made from the data of the interface and never by the model,
 * the file is checked and re-encoded (gray, no metadata). Every failure becomes a message in plain German.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { dataDir } from "../paths.ts";
import { codeOf, explain } from "../agent/netcheck.ts";
import { UserError } from "../workspace/index.ts";

/** The only hosts the program talks to. Redirects to anything else are refused. */
export const ERLAUBTE_HOSTS: readonly string[] = ["commons.wikimedia.org", "upload.wikimedia.org"];

export type Lizenzart = "gemeinfrei" | "cc0" | "cc-by" | "cc-by-sa";
/**
 * Licenses that are offered. Everything else (NC, ND, unknown, missing) is not. One place, so it is easy to change:
 * remove "cc-by-sa" if the school wants to be safe about "share alike" (see the open question in the decision file).
 */
export const ERLAUBTE_LIZENZEN: readonly Lizenzart[] = ["gemeinfrei", "cc0", "cc-by", "cc-by-sa"];

/** What the interface says, reduced to what the program uses. */
export interface Treffer {
  /** `commons-<pageid>`. The only thing the model passes around. */
  id: string;
  titel: string;
  beschreibung?: string;
  urheber?: string;
  /** Short license name as Commons writes it, e.g. "CC BY-SA 3.0 de". */
  lizenz: string;
  lizenzart: Lizenzart;
  lizenzUrl?: string;
  namensnennung: boolean;
  /** The Commons field `Restrictions`, e.g. "nazi", "personality". */
  einschraenkungen: string[];
  seite: string;
  url: string;
  mime: string;
  breite: number;
  hoehe: number;
  bytes: number;
}

/** A picture ready for the layout: JPEG in gray, with the source line made by the program. */
export interface Quellbild {
  id: string;
  jpg: Buffer;
  breite: number;
  hoehe: number;
  titel: string;
  /** Plain text of the source line under the picture. */
  quelle: string;
}

export interface Deps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Folder for the cache. Default: inside the data folder. */
  cacheDir?: string;
}

const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "Pult/0.1 (https://github.com/brandy299/morte; Arbeitsplatz fuer Lehrkraefte; Bilder fuer Unterrichtsmaterial)";
const MIMES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const MAX_DOWNLOAD = 12 * 1024 * 1024;
const MAX_SEITE = 960;
const VORSCHAU = 330;
const MAX_RETRIES = 2;
const MAX_WARTEN_MS = 60_000;
const TIMEOUT_MS = 20_000;
export const MAX_TREFFER = 8;
const SUCHE_TTL_MS = 7 * 24 * 3600 * 1000;

export const cacheDir = () => join(dataDir(), "Commons-Zwischenspeicher");
const dir = (d?: Deps) => d?.cacheDir ?? cacheDir();

// ---------- small helpers ----------

const NETZ = "Ich komme gerade nicht an Wikimedia Commons heran.";

/** Fetches one address. Only the two allowed hosts over https, redirects are followed by hand and checked at every step. */
export async function holen(url: string, deps: Deps = {}, accept?: string): Promise<Response> {
  const f = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let current = url;
  let retries = 0;
  for (let hops = 0; hops < 12; ) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      throw new UserError("Diese Adresse ist ungültig, Pult ruft sie nicht auf.");
    }
    if (u.protocol !== "https:" || !ERLAUBTE_HOSTS.includes(u.hostname) || u.port || u.username || u.password) {
      throw new UserError(`Pult ruft nur Wikimedia Commons auf (commons.wikimedia.org und upload.wikimedia.org). Die Adresse ${u.hostname || current} ist nicht erlaubt.`);
    }
    let res: Response;
    try {
      res = await f(u, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "User-Agent": USER_AGENT, ...(accept ? { Accept: accept } : {}) } });
    } catch (err) {
      const code = codeOf(err);
      if (code === "TIMEOUT") throw new UserError(`${NETZ} Die Antwort kam zu langsam. Versuche es gleich noch einmal.`);
      throw new UserError(`${NETZ} ${explain(code)}`);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, u).toString();
      hops++;
      continue;
    }
    if (res.status === 429) {
      const wait = Math.min(MAX_WARTEN_MS, Math.max(1, Number(res.headers.get("retry-after")) || 5) * 1000);
      if (retries >= MAX_RETRIES) throw new UserError("Wikimedia Commons nimmt gerade keine weiteren Anfragen an (zu viele in kurzer Zeit). Versuche es in ein bis zwei Minuten noch einmal. Das Material kann bis dahin ohne Bild fertig werden.");
      retries++;
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new UserError(`${NETZ} Wikimedia antwortet mit einem Fehler (${res.status}).`);
    return res;
  }
  throw new UserError("Zu viele Weiterleitungen. Pult bricht ab.");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
/** Plain text from the HTML snippets of the interface. */
export function klartext(html: unknown, max = 300): string {
  if (typeof html !== "string") return "";
  const t = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const cp = e[1]!.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(cp) && cp > 31 && cp < 0x110000 ? String.fromCodePoint(cp) : " ";
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** The kind of license from `LicenseShortName`, or undefined when it is not one of the known free kinds (NC, ND, unknown ...). */
export function lizenzart(kurz: unknown): Lizenzart | undefined {
  if (typeof kurz !== "string") return undefined;
  const s = kurz.trim();
  if (/^(public domain|pd([- ].*)?)$/i.test(s)) return "gemeinfrei";
  if (/^cc0\b/i.test(s) || /^cc[- ]zero\b/i.test(s)) return "cc0";
  if (/^cc[- ]by[- ]sa\b/i.test(s)) return /\b(nc|nd)\b/i.test(s) ? undefined : "cc-by-sa";
  if (/^cc[- ]by\b(?![- ](nc|nd))/i.test(s)) return /\b(nc|nd)\b/i.test(s) ? undefined : "cc-by";
  return undefined;
}

/** "Unknown author Unknown author" (a link and its text, both read) becomes "Unknown author". */
export function ohneDoppelt(t: string): string {
  const w = t.split(" ");
  const half = w.length / 2;
  return Number.isInteger(half) && half > 0 && w.slice(0, half).join(" ") === w.slice(half).join(" ") ? w.slice(0, half).join(" ") : t;
}

export const lizenzErlaubt = (art: Lizenzart | undefined): boolean => art !== undefined && ERLAUBTE_LIZENZEN.includes(art);

const field = (m: Record<string, { value?: unknown }> | undefined, key: string) => m?.[key]?.value;

/**
 * Turns one page of the interface into a hit, or says why it is not offered.
 * Not offered: no known free license, missing author where the license demands naming, wrong file type, no address.
 */
export function pruefeTreffer(page: any): { treffer: Treffer } | { grund: string } {
  const ii = page?.imageinfo?.[0];
  if (!page || typeof page.pageid !== "number" || typeof page.title !== "string" || !ii) return { grund: "unvollständige Angaben" };
  const titel = page.title.replace(/^File:/, "").replace(/\.[A-Za-z0-9]{2,5}$/, "");
  const m = ii.extmetadata as Record<string, { value?: unknown }> | undefined;
  const lizenz = klartext(field(m, "LicenseShortName"), 60);
  if (!lizenz) return { grund: "keine Lizenzangabe" };
  const art = lizenzart(lizenz);
  if (!art) return { grund: `Lizenz ${lizenz} ist nicht erlaubt` };
  if (!lizenzErlaubt(art)) return { grund: `Lizenz ${lizenz} ist abgeschaltet` };
  if (!MIMES.includes(ii.mime)) return { grund: `Dateityp ${ii.mime} wird nicht unterstützt` };
  const url = typeof ii.url === "string" ? ii.url : "";
  const seite = typeof ii.descriptionurl === "string" ? ii.descriptionurl : "";
  try {
    if (!ERLAUBTE_HOSTS.includes(new URL(url).hostname) || !ERLAUBTE_HOSTS.includes(new URL(seite).hostname)) return { grund: "Adresse nicht erlaubt" };
  } catch {
    return { grund: "keine gültige Adresse" };
  }
  const urheber = ohneDoppelt(klartext(field(m, "Artist"), 200)) || undefined;
  const namensnennung = String(field(m, "AttributionRequired")).toLowerCase() === "true" || art === "cc-by" || art === "cc-by-sa";
  if (namensnennung && !urheber) return { grund: "Urheber fehlt, die Lizenz verlangt aber die Nennung" };
  const einschraenkungen = klartext(field(m, "Restrictions"), 200).split(/[|,;]+/).map((r) => r.trim()).filter(Boolean);
  return {
    treffer: {
      id: `commons-${page.pageid}`,
      titel: klartext(field(m, "ObjectName"), 120) || titel,
      beschreibung: klartext(field(m, "ImageDescription"), 240) || undefined,
      urheber,
      lizenz,
      lizenzart: art,
      lizenzUrl: typeof field(m, "LicenseUrl") === "string" ? (field(m, "LicenseUrl") as string) : undefined,
      namensnennung,
      einschraenkungen,
      seite,
      url,
      mime: ii.mime,
      breite: Number(ii.width) || 0,
      hoehe: Number(ii.height) || 0,
      bytes: Number(ii.size) || 0,
    },
  };
}

const ID = /^commons-\d{1,12}$/;

// ---------- rights hints ----------

const HINWEISE: Record<string, string> = {
  nazi: "Das Bild zeigt Kennzeichen aus der Zeit des Nationalsozialismus. Im Unterricht zur politischen Bildung und Geschichte ist das erlaubt, die Verantwortung liegt bei dir. Gib es nicht ohne Einordnung weiter.",
  personality: "Auf dem Bild können Personen zu sehen sein, die Persönlichkeitsrechte haben.",
  trademark: "Auf dem Bild ist eine geschützte Marke oder ein Logo zu sehen.",
  insignia: "Auf dem Bild sind Abzeichen oder Wappen zu sehen, für die besondere Regeln gelten können.",
  copyright: "Auf dem Bild können weitere Rechte liegen, zum Beispiel an einem Kunstwerk, das darauf zu sehen ist.",
  "freedom of panorama": "Auf dem Bild sind Bauwerke oder Kunstwerke zu sehen, für die in manchen Ländern besondere Regeln gelten.",
  "cultural heritage": "Das Motiv steht unter Denkmalschutz.",
};

/** Plain-German notes for the `Restrictions` of a hit. Empty when there are none. */
export function rechteHinweise(t: Pick<Treffer, "einschraenkungen">): string[] {
  const notes = t.einschraenkungen.map((r) => HINWEISE[r.toLowerCase()] ?? `Commons nennt eine Einschränkung („${r}“). Lies die Seite des Bildes, bevor du es verwendest.`);
  return [...new Set(notes)];
}

// ---------- search ----------

const treffer_pfad = (d: Deps | undefined, id: string) => join(dir(d), `${id}.json`);
const bekannt = new Map<string, Treffer>();

async function schreibe(path: string, data: string | Buffer) {
  await mkdir(join(path, ".."), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path);
}

/** The hit by its id: from this run, or from the cache of an earlier search. */
export async function trefferVon(id: unknown, deps?: Deps): Promise<Treffer> {
  if (typeof id !== "string" || !ID.test(id)) throw new UserError(`Die Bild-Kennung „${String(id)}“ ist ungültig. Nimm eine aus commons_bilder_suchen.`);
  const hit = bekannt.get(id);
  if (hit) return hit;
  try {
    const t = JSON.parse(await readFile(treffer_pfad(deps, id), "utf8")) as Treffer;
    bekannt.set(id, t);
    return t;
  } catch {
    throw new UserError(`Das Bild „${id}“ kenne ich nicht. Suche zuerst mit commons_bilder_suchen und nimm eine Kennung aus den Treffern.`);
  }
}

/** From memory only, for the question before a tool runs. */
export const trefferImSpeicher = (id: unknown): Treffer | undefined => (typeof id === "string" ? bekannt.get(id) : undefined);

export function suchUrl(suche: string): string {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: suche,
    gsrnamespace: "6",
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired|Restrictions|ObjectName|ImageDescription",
  });
  return `${API}?${q}`;
}

export interface SuchErgebnis {
  treffer: Treffer[];
  /** How many hits were left out because of the license or missing data. */
  ausgelassen: number;
}

/** Searches Commons. Only the search text leaves the computer. */
export async function suchen(suche: unknown, deps: Deps = {}): Promise<SuchErgebnis> {
  if (typeof suche !== "string" || !suche.trim()) throw new UserError("Es fehlt ein Suchtext.");
  const text = suche.replace(/\s+/g, " ").trim();
  if (text.length > 120) throw new UserError("Der Suchtext ist zu lang (höchstens 120 Zeichen).");
  const cacheFile = join(dir(deps), `suche-${createHash("sha256").update(text.toLowerCase()).digest("hex").slice(0, 24)}.json`);
  let cachedPages: any[] | undefined;
  try {
    const cached = JSON.parse(await readFile(cacheFile, "utf8")) as { at: number; pages: any[] };
    if (Date.now() - cached.at < SUCHE_TTL_MS && Array.isArray(cached.pages)) cachedPages = cached.pages;
  } catch {
    // No cache.
  }
  const pages: any[] = cachedPages ?? [];
  if (!cachedPages) {
    const res = await holen(suchUrl(text), deps, "application/json");
    let body: any;
    try {
      body = await res.json();
    } catch {
      throw new UserError(`${NETZ} Die Antwort war nicht lesbar.`);
    }
    if (Array.isArray(body?.query?.pages)) pages.push(...body.query.pages);
    pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    await schreibe(cacheFile, JSON.stringify({ at: Date.now(), pages })).catch(() => undefined);
  }
  const treffer: Treffer[] = [];
  let ausgelassen = 0;
  for (const p of pages) {
    const r = pruefeTreffer(p);
    if ("grund" in r) ausgelassen++;
    else if (treffer.length < MAX_TREFFER) treffer.push(r.treffer);
  }
  for (const t of treffer) {
    bekannt.set(t.id, t);
    await schreibe(treffer_pfad(deps, t.id), JSON.stringify(t)).catch(() => undefined);
  }
  return { treffer, ausgelassen };
}

// ---------- pictures ----------

/** Address of a scaled copy on upload.wikimedia.org (the interface hands out another host for these). */
export function skaliertUrl(original: string, breite: number): string | undefined {
  const u = new URL(original);
  const m = /^\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/.exec(u.pathname);
  if (u.hostname !== "upload.wikimedia.org" || !m) return undefined;
  const name = m[2]!;
  const png = /\.(svg|tiff?|pdf)$/i.test(name) ? ".png" : "";
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${name}/${breite}px-${name}${png}`;
}

/** Type of a file from its first bytes, not from what the server claims. */
export function dateityp(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | undefined {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return undefined;
}

async function bytes(url: string, deps: Deps): Promise<Buffer> {
  const res = await holen(url, deps, "image/*");
  const len = Number(res.headers.get("content-length"));
  if (len > MAX_DOWNLOAD) throw new UserError("Die Bilddatei ist zu groß (höchstens 12 MB).");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_DOWNLOAD) throw new UserError("Die Bilddatei ist zu groß (höchstens 12 MB).");
  return buf;
}

/** Small preview (330 px) for the model, from the cache when possible. Undefined when it cannot be loaded: the hit is still listed. */
export async function vorschau(t: Treffer, deps: Deps = {}): Promise<Buffer | undefined> {
  const file = join(dir(deps), `${t.id}-vorschau.jpg`);
  try {
    return await readFile(file);
  } catch {
    // Not cached yet.
  }
  const url = t.breite && t.breite <= VORSCHAU && t.mime !== "image/svg+xml" ? t.url : skaliertUrl(t.url, VORSCHAU);
  if (!url) return undefined;
  try {
    const buf = await bytes(url, deps);
    if (!dateityp(buf)) return undefined;
    await schreibe(file, buf).catch(() => undefined);
    return buf;
  } catch {
    return undefined;
  }
}

/** Gray JPEG without metadata from any accepted picture. Transparent parts become white. */
export async function umkodieren(buf: Buffer): Promise<{ jpg: Buffer; breite: number; hoehe: number }> {
  if (!dateityp(buf)) throw new UserError("Die Datei ist kein Bild in einem unterstützten Format (JPG, PNG, WebP).");
  let img;
  try {
    img = await loadImage(buf);
  } catch {
    throw new UserError("Die Bilddatei ist beschädigt und lässt sich nicht öffnen.");
  }
  const w = img.width;
  const h = img.height;
  if (!w || !h || w > 6000 || h > 6000) throw new UserError("Das Bild hat eine ungeeignete Größe.");
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const g = Math.round(0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!);
    px[i] = px[i + 1] = px[i + 2] = g;
    px[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return { jpg: canvas.toBuffer("image/jpeg", 85), breite: w, hoehe: h };
}

/** The address with umlauts and commas instead of %C3%BC, so it can be read and typed. Falls back to the original. */
const lesbar = (url: string) => {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
};

/** The line under the picture. Made from the data of the interface, the model never writes it. */
export function quellenzeile(t: Pick<Treffer, "titel" | "urheber" | "lizenz" | "seite">): string {
  const lizenz = t.lizenz;
  return `Bild: ${t.titel}. Urheber: ${t.urheber ?? "nicht angegeben"}. Lizenz: ${lizenz}. Quelle: ${lesbar(t.seite)}`;
}

/** Checks a hit again (so a direct call cannot get around the search), loads, checks and re-encodes the picture, and caches the result. */
export async function bildHolen(t: Treffer, deps: Deps = {}): Promise<Quellbild> {
  if (!ID.test(t.id)) throw new UserError("Die Bild-Kennung ist ungültig.");
  const erneut = pruefeTreffer({
    pageid: Number(t.id.slice(8)),
    title: `File:${t.titel}`,
    imageinfo: [{ url: t.url, descriptionurl: t.seite, mime: t.mime, width: t.breite, height: t.hoehe, size: t.bytes, extmetadata: { LicenseShortName: { value: t.lizenz }, Artist: { value: t.urheber ?? "" }, AttributionRequired: { value: String(t.namensnennung) } } }],
  });
  if ("grund" in erneut) throw new UserError(`Dieses Bild darf Pult nicht einfügen: ${erneut.grund}.`);
  if (t.namensnennung && !t.urheber) throw new UserError("Dieses Bild darf Pult nicht einfügen: Der Urheber fehlt.");

  const file = join(dir(deps), `${t.id}.jpg`);
  const meta = join(dir(deps), `${t.id}-bild.json`);
  const fertig = (jpg: Buffer, breite: number, hoehe: number): Quellbild => ({ id: t.id, jpg, breite, hoehe, titel: t.titel, quelle: quellenzeile(t) });
  try {
    const m = JSON.parse(await readFile(meta, "utf8")) as { breite: number; hoehe: number };
    return fertig(await readFile(file), m.breite, m.hoehe);
  } catch {
    // Not cached yet.
  }
  const direkt = t.mime !== "image/svg+xml" && t.breite > 0 && t.breite <= MAX_SEITE && t.bytes <= MAX_DOWNLOAD;
  const url = direkt ? t.url : skaliertUrl(t.url, MAX_SEITE);
  if (!url) throw new UserError("Von diesem Bild kann Pult keine passende Größe laden.");
  const roh = await bytes(url, deps);
  const typ = dateityp(roh);
  if (!typ) throw new UserError("Die geladene Datei ist kein JPG, PNG oder WebP. Pult nimmt sie nicht.");
  const { jpg, breite, hoehe } = await umkodieren(roh);
  await schreibe(file, jpg);
  await schreibe(meta, JSON.stringify({ breite, hoehe }));
  return fertig(jpg, breite, hoehe);
}

/** A picture that was loaded before, from the cache only (no network). Undefined when it is not there. */
export async function gespeichertesBild(id: unknown, deps: Deps = {}): Promise<Quellbild | undefined> {
  if (typeof id !== "string" || !ID.test(id)) return undefined;
  try {
    const t = await trefferVon(id, deps);
    const m = JSON.parse(await readFile(join(dir(deps), `${id}-bild.json`), "utf8")) as { breite: number; hoehe: number };
    if (!lizenzErlaubt(lizenzart(t.lizenz))) return undefined;
    return { id, jpg: await readFile(join(dir(deps), `${id}.jpg`)), breite: m.breite, hoehe: m.hoehe, titel: t.titel, quelle: quellenzeile(t) };
  } catch {
    return undefined;
  }
}

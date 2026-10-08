import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { dataDir } from "../paths.ts";
import { UserError } from "../workspace/index.ts";

/**
 * The school head on all material: name of the school and a logo. The teacher enters it once in the settings.
 * Both are stored in the data folder (Einstellungen/). The logo is checked and saved again as a small gray PNG,
 * the original file is never kept or passed on.
 */

export const MAX_LOGO_BYTES = 3 * 1024 * 1024;
export const MAX_NAME_CHARS = 120;
/** Longest edge in pixels that a picture may have, and the size the saved logo is limited to. Enough for print at 300 dpi in a 45 x 14 mm box. */
const MAX_SOURCE_PIXELS = 8000;
export const LOGO_BOX = { width: 800, height: 260 };

const dir = () => join(dataDir(), "Einstellungen");
const nameFile = () => join(dir(), "Schule.md");
const logoFile = () => join(dir(), "Schullogo.png");

export interface Schulkopf {
  name?: string;
  logo?: { png: Buffer; width: number; height: number };
}

/** The saved name and logo, read synchronously because the PDF and Word code that needs it is not async at that point. `undefined` when there is none. */
export function schulkopf(): Schulkopf | undefined {
  let name: string | undefined;
  let logo: Schulkopf["logo"];
  try {
    name = /^Name:[ \t]*(\S.*)$/m.exec(readFileSync(nameFile(), "utf8"))?.[1]?.trim();
  } catch {
    // Not set.
  }
  try {
    const png = readFileSync(logoFile());
    // Width and height stand in the first chunk of every PNG.
    if (png.length > 24 && png.subarray(1, 4).toString("latin1") === "PNG") logo = { png, width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  } catch {
    // Not set.
  }
  return name || logo ? { name, logo } : undefined;
}

export async function loadSchule(): Promise<{ name: string; hasLogo: boolean }> {
  const s = schulkopf();
  return { name: s?.name ?? "", hasLogo: Boolean(s?.logo) };
}

export async function logoBytes(): Promise<Buffer | undefined> {
  return readFile(logoFile()).catch(() => undefined);
}

/** Saves the name. An empty name removes it. */
export async function saveSchulname(raw: string): Promise<void> {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (name.length > MAX_NAME_CHARS) throw new UserError(`Der Name ist zu lang. Es passen höchstens ${MAX_NAME_CHARS} Zeichen.`);
  if (!name) return void (await rm(nameFile(), { force: true }));
  await mkdir(dir(), { recursive: true });
  await writeFile(nameFile(), `# Schule\n\nName: ${name}\n`);
}

const kind = (b: Buffer): "png" | "jpg" | "svg" | undefined => {
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (/<svg[\s>]/i.test(b.subarray(0, 4096).toString("utf8"))) return "svg";
  return undefined;
};

/** A logo in SVG may draw, nothing else: no declarations of entities, no scripts, no links to other files or addresses (only inside the file or as data). */
const plainSvg = (text: string): boolean => !/<!ENTITY|<!DOCTYPE|<script|<foreignObject|<iframe/i.test(text) && !/href\s*=\s*["'](?!#|data:)/i.test(text);

/**
 * Checks a logo and saves it as a gray PNG in a fixed box. Transparent parts become white.
 * Throws a UserError in plain German for everything that is no usable picture.
 */
export async function saveLogo(bytes: Buffer): Promise<void> {
  if (bytes.length === 0) throw new UserError("Die Datei ist leer.");
  if (bytes.length > MAX_LOGO_BYTES) throw new UserError("Die Datei ist zu groß. Ein Logo darf höchstens 3 MB haben.");
  const type = kind(bytes);
  if (!type) throw new UserError("Das ist kein Bild, das ich als Logo nehmen kann. Bitte nimm eine Datei als PNG, JPG oder SVG.");
  if (type === "svg" && !plainSvg(bytes.toString("utf8"))) {
    throw new UserError("Diese SVG-Datei enthält Teile, die ich nicht verwende (Verweise auf andere Dateien oder Skripte). Bitte speichere das Logo als PNG oder als einfache SVG-Datei.");
  }
  let image;
  try {
    image = await loadImage(bytes);
  } catch {
    throw new UserError("Das Bild lässt sich nicht öffnen. Vielleicht ist die Datei beschädigt. Bitte probiere eine andere Datei.");
  }
  const { width, height } = image;
  if (!width || !height || width > MAX_SOURCE_PIXELS || height > MAX_SOURCE_PIXELS) {
    throw new UserError("Das Bild hat eine ungewöhnliche Größe. Bitte nimm ein Logo mit höchstens 8000 Pixeln Kantenlänge.");
  }
  const scale = Math.min(1, LOGO_BOX.width / width, LOGO_BOX.height / height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  // Gray values only: many schools do not print in color.
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    const gray = Math.round(0.299 * data.data[i]! + 0.587 * data.data[i + 1]! + 0.114 * data.data[i + 2]!);
    data.data[i] = data.data[i + 1] = data.data[i + 2] = gray;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  await mkdir(dir(), { recursive: true });
  await writeFile(logoFile(), canvas.toBuffer("image/png"));
}

export const removeLogo = () => rm(logoFile(), { force: true });

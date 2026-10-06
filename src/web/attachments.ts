import { readFileOnServer, type ImageAttachment } from "./api.ts";

/** A picture or a file (PDF, Word, Excel, …) waiting in the message field. */
export interface Attachment {
  id: string;
  name: string;
  /** Pictures sent to the model: the picture itself, or the pages of a scanned PDF. */
  images: ImageAttachment[];
  /** data: URL for the small preview of a picture. */
  preview?: string;
  /** Text read out of a file. */
  text?: string;
  /** Short kind and size, like "Word" or "3 Seiten". */
  art?: string;
  info?: string;
  gekuerzt?: boolean;
}

export const MAX_IMAGES = 8;
export const MAX_FILES = 5;
export const FILE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.pdf,.docx,.odt,.rtf,.txt,.md,.html,.htm,.csv,.tsv,.xlsx,.xlsm,.xlsb,.xls,.ods,.pptx,.odp";
const MAX_BYTES = 5 * 1024 * 1024;
/** Phone photos are 3 to 10 MB and far sharper than a model needs. They are scaled down before they are sent. */
const MAX_SIDE = 1800;
const SHRINK_ABOVE = 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Scales a large photo down to JPEG with at most 1800 pixels on the long side, turned the right way up. The original stays when that fails. */
async function shrink(file: File): Promise<File> {
  if (file.type === "image/gif" || (file.size <= SHRINK_ABOVE && file.type === "image/jpeg")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_BYTES) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff"; // transparent PNG parts would turn black as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** Reads a picture or a file. Returns a plain-German problem text when it cannot be used. */
export async function readAttachment(file: File): Promise<Attachment | string> {
  if (TYPES.includes(file.type)) return readImage(file);
  if (file.type.startsWith("image/")) return `„${file.name}“ ist ein Bild-Format, das ich nicht lesen kann. Ich nehme JPG, PNG, WebP und GIF.`;
  const read = await readFileOnServer(file);
  if (typeof read === "string") return read;
  return { id: crypto.randomUUID(), name: file.name, images: read.bilder ?? [], text: read.text, art: read.art, info: read.info, gekuerzt: read.gekuerzt };
}

async function readImage(original: File): Promise<Attachment | string> {
  const file = await shrink(original);
  if (file.size > MAX_BYTES) return `„${file.name}“ ist auch verkleinert noch größer als 5 MB.`;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(`„${file.name}“ konnte ich nicht öffnen.`);
    reader.onload = () => {
      const url = String(reader.result);
      resolve({ id: crypto.randomUUID(), name: file.name || "Bild", images: [{ mimeType: file.type, data: url.slice(url.indexOf(",") + 1) }], preview: url, art: "Bild" });
    };
    reader.readAsDataURL(file);
  });
}

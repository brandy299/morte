import type { ImageAttachment } from "./api.ts";

export interface Attachment extends ImageAttachment {
  id: string;
  name: string;
  /** data: URL for the small preview. */
  preview: string;
}

export const MAX_IMAGES = 4;
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

/** Reads an image file. Returns a plain-German problem text when it cannot be used. */
export async function readImage(original: File): Promise<Attachment | string> {
  if (!TYPES.includes(original.type)) return `„${original.name}“ ist kein Bild, das ich lesen kann. Ich nehme JPG, PNG, WebP und GIF.`;
  const file = await shrink(original);
  if (file.size > MAX_BYTES) return `„${file.name}“ ist auch verkleinert noch größer als 5 MB.`;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(`„${file.name}“ konnte ich nicht öffnen.`);
    reader.onload = () => {
      const url = String(reader.result);
      resolve({ id: crypto.randomUUID(), name: file.name || "Bild", mimeType: file.type, data: url.slice(url.indexOf(",") + 1), preview: url });
    };
    reader.readAsDataURL(file);
  });
}

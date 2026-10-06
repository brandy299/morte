import type { ImageAttachment } from "./api.ts";

export interface Attachment extends ImageAttachment {
  id: string;
  name: string;
  /** data: URL for the small preview. */
  preview: string;
}

export const MAX_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Reads an image file. Returns a plain-German problem text when it cannot be used. */
export function readImage(file: File): Promise<Attachment | string> {
  if (!TYPES.includes(file.type)) return Promise.resolve(`„${file.name}“ ist kein Bild, das ich lesen kann. Ich nehme JPG, PNG, WebP und GIF.`);
  if (file.size > MAX_BYTES) return Promise.resolve(`„${file.name}“ ist größer als 5 MB.`);
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

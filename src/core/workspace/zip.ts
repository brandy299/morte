import { zipSync } from "fflate";

export const ZIP_MAX_FILES = 60;
export const ZIP_MAX_BYTES = 200 * 1024 * 1024;

/** A zip file from several files. Equal names get a number, so nothing is lost. PDFs and Word files hardly shrink, so little time goes into packing. */
export function zipFiles(files: { name: string; data: Uint8Array }[]): Uint8Array {
  if (files.length > ZIP_MAX_FILES) throw new Error("zu viele Dateien");
  if (files.reduce((n, f) => n + f.data.length, 0) > ZIP_MAX_BYTES) throw new Error("zu groß");
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    const clean = f.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_") || "Datei";
    let name = clean;
    for (let i = 2; name in entries; i++) name = clean.replace(/(\.[^.]*)?$/, `-${i}$1`);
    entries[name] = f.data;
  }
  return zipSync(entries, { level: 1 });
}

/** Name of the zip file from a title: letters, digits, dashes. */
export const zipName = (title: string | undefined, date = new Date()) => {
  const base = (title ?? "").normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${base || "pult-material"}-${date.toISOString().slice(0, 10)}.zip`;
};

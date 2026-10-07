export interface MaterialDatei { klasse: string; fach: string; reihe: string; name: string; path: string; size: number; modified: string }

export type Art = "alle" | "pdf" | "word" | "bild" | "sonst";
export const ARTEN: { id: Art; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "pdf", label: "PDF" },
  { id: "word", label: "Word" },
  { id: "bild", label: "Bilder" },
  { id: "sonst", label: "Anderes" },
];

const ending = (name: string) => /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";

/** Kind of a file by its ending. */
export function artOf(name: string): Exclude<Art, "alle"> {
  const e = ending(name);
  if (e === "pdf") return "pdf";
  if (e === "docx" || e === "doc" || e === "odt") return "word";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(e)) return "bild";
  return "sonst";
}

/** Short label for the badge in a row: PDF, Word, Bild, or the ending in capitals. */
export const artLabel = (name: string): string => ({ pdf: "PDF", word: "Word", bild: "Bild", sonst: ending(name).toUpperCase() || "Datei" })[artOf(name)];

/** The name without the date and lesson prefix that is added when a file is saved (2026-10-14_Mi0945_). */
export const showName = (name: string): string => name.replace(/^\d{4}-\d\d-\d\d_[A-Za-z]{2}\d{0,4}_/, "");

/** The name of a series without its sort number ("01 Bewerbung" → "Bewerbung"). */
export const showReihe = (reihe: string): string => reihe.replace(/^\d+\s+/, "");

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Byte`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** Files that match the class, the kind and every word of the search (in the name, series, subject or class). */
export function filterFiles(files: MaterialDatei[], opts: { klasse?: string; art?: Art; suche?: string }): MaterialDatei[] {
  const words = fold(opts.suche ?? "").split(/\s+/).filter(Boolean);
  return files.filter((f) => {
    if (opts.klasse && f.klasse !== opts.klasse) return false;
    if (opts.art && opts.art !== "alle" && artOf(f.name) !== opts.art) return false;
    const hay = fold(`${showName(f.name)} ${showReihe(f.reihe)} ${f.fach} ${f.klasse}`);
    return words.every((w) => hay.includes(w));
  });
}

const stem = (name: string) => showName(name).replace(/\.[A-Za-z0-9]+$/, "");

export interface ReiheGruppe { reihe: string; files: MaterialDatei[] }
export interface KlassenGruppe { klasse: string; fach: string; reihen: ReiheGruppe[] }

/** Groups files as class and subject, then series. Groups keep the order of first appearance (newest first). */
export function groupFiles(files: MaterialDatei[]): KlassenGruppe[] {
  const groups: KlassenGruppe[] = [];
  for (const f of files) {
    let g = groups.find((x) => x.klasse === f.klasse && x.fach === f.fach);
    if (!g) groups.push((g = { klasse: f.klasse, fach: f.fach, reihen: [] }));
    let r = g.reihen.find((x) => x.reihe === f.reihe);
    if (!r) g.reihen.push((r = { reihe: f.reihe, files: [] }));
    r.files.push(f);
  }
  // Inside a series the files are in name order, so a sheet comes right before its solution.
  for (const g of groups) for (const r of g.reihen) r.files.sort((a, b) => stem(a.name).localeCompare(stem(b.name), "de", { numeric: true }) || showName(a.name).localeCompare(showName(b.name)));
  return groups;
}

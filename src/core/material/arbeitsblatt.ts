/**
 * Worksheet: the model delivers structured content, this file turns it into a fixed layout.
 * The look lives here (and only here), so it does not depend on how good the chosen model is.
 * Everything is black, white and gray on purpose: many schools do not print in color.
 */

export class MaterialError extends Error {}

export interface Aufgabe {
  text: string;
  /** A short hint for students, printed below the task. */
  hilfe?: string;
  punkte?: number;
  /** Writing lines below the task. 0 = no lines. */
  zeilen?: number;
}

export interface Arbeitsblatt {
  titel: string;
  fach?: string;
  klasse?: string;
  einleitung?: string;
  merkkasten?: { titel?: string; text: string };
  aufgaben: Aufgabe[];
  /** Small print in the footer, e.g. "Ohne hinterlegten Lehrplan erstellt". */
  fuss?: string;
}

const str = (v: unknown, what: string, max: number, required = false): string | undefined => {
  if (v === undefined || v === null || v === "") {
    if (required) throw new MaterialError(`Es fehlt: ${what}.`);
    return undefined;
  }
  if (typeof v !== "string") throw new MaterialError(`${what} muss Text sein.`);
  const t = v.trim();
  if (t.length > max) throw new MaterialError(`${what} ist zu lang (höchstens ${max} Zeichen).`);
  return t || undefined;
};

/** Checks content from the model before anything is drawn. */
export function parseArbeitsblatt(raw: unknown): Arbeitsblatt {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.aufgaben) || o.aufgaben.length === 0) throw new MaterialError("Es fehlt: mindestens eine Aufgabe.");
  if (o.aufgaben.length > 20) throw new MaterialError("Mehr als 20 Aufgaben passen nicht auf ein Arbeitsblatt.");
  const aufgaben = o.aufgaben.map((a, i): Aufgabe => {
    const t = (a ?? {}) as Record<string, unknown>;
    const zeilen = t.zeilen === undefined ? 0 : Number(t.zeilen);
    const punkte = t.punkte === undefined ? undefined : Number(t.punkte);
    if (!Number.isInteger(zeilen) || zeilen < 0 || zeilen > 15) throw new MaterialError(`Aufgabe ${i + 1}: Die Zahl der Schreibzeilen muss zwischen 0 und 15 liegen.`);
    if (punkte !== undefined && (!Number.isFinite(punkte) || punkte < 0 || punkte > 100)) throw new MaterialError(`Aufgabe ${i + 1}: Die Punkte sind nicht gültig.`);
    return { text: str(t.text, `Text von Aufgabe ${i + 1}`, 2000, true)!, hilfe: str(t.hilfe, `Hilfe zu Aufgabe ${i + 1}`, 500), punkte, zeilen };
  });
  const mk = o.merkkasten as Record<string, unknown> | undefined;
  return {
    titel: str(o.titel, "der Titel", 120, true)!,
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    einleitung: str(o.einleitung, "die Einleitung", 1500),
    merkkasten: mk ? { titel: str(mk.titel, "der Titel des Merkkastens", 60), text: str(mk.text, "der Text des Merkkastens", 1500, true)! } : undefined,
    aufgaben,
    fuss: str(o.fuss, "der Fußtext", 200),
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const para = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

export function arbeitsblattHtml(a: Arbeitsblatt): string {
  const kopf = [a.fach, a.klasse].filter(Boolean).map((s) => esc(s!)).join(" · ");
  const aufgaben = a.aufgaben
    .map(
      (t, i) => `
    <section class="aufgabe">
      <div class="nr">${i + 1}</div>
      <div class="inhalt">
        <p class="text">${para(t.text)}${t.punkte ? `<span class="punkte">${t.punkte} P.</span>` : ""}</p>
        ${t.hilfe ? `<p class="hilfe"><b>Tipp:</b> ${para(t.hilfe)}</p>` : ""}
        ${t.zeilen ? `<div class="zeilen" style="height:${t.zeilen * 8.5}mm"></div>` : ""}
      </div>
    </section>`,
    )
    .join("");
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>${esc(a.titel)}</title>
<style>
  @page { size: A4; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; color: #111; font: 10.5pt/1.5 "Avenir Next", "Segoe UI", "Liberation Sans", "DejaVu Sans", sans-serif; }
  .serif, h1, .merk h2 { font-family: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", "DejaVu Serif", serif; }
  header { border-top: 3px solid #111; border-bottom: 1px solid #111; padding: 7mm 0 5mm; margin-bottom: 7mm; display: grid; grid-template-columns: 1fr auto; gap: 8mm; align-items: end; }
  .kopf { font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase; color: #555; margin: 0 0 2mm; }
  h1 { margin: 0; font-size: 22pt; line-height: 1.12; font-weight: 600; }
  .felder { font-size: 9pt; color: #444; display: grid; gap: 4mm; width: 62mm; }
  .felder span { display: block; border-bottom: 1px solid #777; padding-bottom: 0.5mm; }
  .einleitung { margin: 0 0 6mm; font-size: 11pt; }
  .merk { margin: 0 0 7mm; padding: 4mm 5mm; background: #ececec; border-left: 4px solid #111; break-inside: avoid; }
  .merk h2 { margin: 0 0 1.5mm; font-size: 11pt; }
  .merk p { margin: 0; }
  .aufgabe { display: grid; grid-template-columns: 9mm 1fr; gap: 4mm; margin-bottom: 6mm; break-inside: avoid; }
  .nr { width: 9mm; height: 9mm; border-radius: 2.2mm; background: #111; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 11pt; }
  .text { margin: 0.6mm 0 0; }
  .punkte { float: right; margin-left: 4mm; font-size: 9pt; color: #555; border: 1px solid #999; border-radius: 4mm; padding: 0 2.4mm; }
  .hilfe { margin: 1.5mm 0 0; font-size: 9.5pt; font-style: italic; color: #444; }
  .zeilen { margin-top: 2mm; background: repeating-linear-gradient(to bottom, transparent 0, transparent 7.9mm, #999 7.9mm, #999 8.5mm); }
</style></head>
<body>
<header>
  <div>${kopf ? `<p class="kopf">${kopf}</p>` : ""}<h1>${esc(a.titel)}</h1></div>
  <div class="felder"><span>Name:</span><span>Datum:</span></div>
</header>
${a.einleitung ? `<p class="einleitung">${para(a.einleitung)}</p>` : ""}
${a.merkkasten ? `<aside class="merk">${a.merkkasten.titel ? `<h2>${esc(a.merkkasten.titel)}</h2>` : ""}<p>${para(a.merkkasten.text)}</p></aside>` : ""}
${aufgaben}
</body></html>`;
}

/** Page margins in mm. The footer sits inside the bottom margin. */
export const MARGIN = { top: "15mm", bottom: "18mm", left: "16mm", right: "16mm" };

/** Footer for every page (Chromium footer template): small note on the left, page number on the right. */
export function arbeitsblattFooter(a: Arbeitsblatt): string {
  return `<div style="width:100%;padding:0 16mm;font:8px sans-serif;color:#666;display:flex;justify-content:space-between">
<span>${a.fuss ? esc(a.fuss) : ""}</span><span>morte · Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>`;
}

/**
 * A picture from Wikimedia Commons with its source line (issue #22). One block for PDF and Word:
 * the same size rules, and the source line always stays with the picture.
 * The picture arrives as gray JPEG (see src/core/commons), the source line is made by the program from the data of the interface.
 */
import type { Quellbild } from "../commons/index.ts";
import { MaterialError, SANS_ITALIC, SOFT, mm, printable, type Sheet } from "./layout.ts";

export type { Quellbild };

/** Largest size on the page. Wider or taller pictures are scaled down, small ones are never scaled up (96 dpi at most). */
export const BILD_MAX = { w: mm(120), h: mm(85) };
const QUELLE = 8;
const ABSTAND = mm(1.5);

/** Checks the picture that the tool put into the content. The model cannot send one itself. */
export function parseQuellbild(raw: unknown, stelle: string): Quellbild | undefined {
  if (raw === undefined || raw === null) return undefined;
  const q = raw as Partial<Quellbild>;
  if (!q || !Buffer.isBuffer(q.jpg) || !q.breite || !q.hoehe || typeof q.quelle !== "string" || !q.quelle || typeof q.titel !== "string") {
    throw new MaterialError(`${stelle}: Das Bild ist nicht vollständig. Lade es mit commons_bild_einfuegen.`);
  }
  return q as Quellbild;
}

/** Size of the picture in points inside a column of width `maxW`. */
export function bildGroesse(q: Pick<Quellbild, "breite" | "hoehe">, maxW: number): { w: number; h: number } {
  const scale = Math.min(Math.min(maxW, BILD_MAX.w) / q.breite, BILD_MAX.h / q.hoehe, 0.75);
  return { w: q.breite * scale, h: q.hoehe * scale };
}

/** Height of picture plus source line in a column of width `w`. */
export function bildHoehe(sheet: Sheet, q: Quellbild, w: number): number {
  return bildGroesse(q, w).h + ABSTAND + sheet.height(q.quelle, SANS_ITALIC, QUELLE, w);
}

/** Draws picture and source line at (x, y). The caller reserved `bildHoehe` before (sheet.room), so both stay on one page. */
export function zeichneBild(sheet: Sheet, q: Quellbild, x: number, y: number, w: number): void {
  const s = bildGroesse(q, w);
  const { doc } = sheet;
  doc.image(q.jpg, x, y, { width: s.w, height: s.h });
  doc.save().rect(x, y, s.w, s.h).lineWidth(0.5).strokeColor("#999999").stroke().restore();
  sheet.text(q.quelle, x, y + s.h + ABSTAND, { font: SANS_ITALIC, size: QUELLE, color: SOFT, width: w });
}

/** Alt text for Word and screen readers. */
export const bildText = (q: Quellbild) => printable(q.titel);

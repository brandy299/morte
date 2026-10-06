/** Draws a diagram scene (see schaubild.ts) into a PDF, or into a picture for Word files. Both draw the same shapes. */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { BOX, fontFile, FONT_NAMES, INK, LINE, SANS, SANS_BOLD, printable } from "./layout.ts";
import type { Form, Szene } from "./schaubild.ts";

const LEAD = 11.5;
const BAR = "#c8c8c8";
type P = [number, number];
const arrowHead = (from: P, to: P): [P, P, P] => {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const l = 7;
  return [to, [to[0] - l * Math.cos(a - 0.4), to[1] - l * Math.sin(a - 0.4)], [to[0] - l * Math.cos(a + 0.4), to[1] - l * Math.sin(a + 0.4)]];
};

/** Draws the scene with its top left corner at (x, y). */
export function zeichnePdf(doc: PDFKit.PDFDocument, szene: Szene, x0: number, y0: number): void {
  for (const f of szene.formen) {
    doc.save();
    if (f.k === "kasten") {
      const x = x0 + f.x;
      const y = y0 + f.y;
      doc.roundedRect(x, y, f.w, f.h, 3).lineWidth(f.stil === "betont" ? 1.6 : 0.9);
      if (f.stil === "leer") doc.dash(3, { space: 2.5 });
      if (f.stil === "betont") doc.fillAndStroke(BOX, INK);
      else doc.fillAndStroke("#ffffff", f.stil === "leer" ? "#555555" : INK);
      doc.undash();
      const lines = f.zeilen.map(printable);
      const top = y + (f.h - lines.length * LEAD) / 2;
      doc.font(f.stil === "betont" ? SANS_BOLD : SANS).fontSize(9.5).fillColor(INK);
      lines.forEach((l, i) => doc.text(l, x + 4, top + i * LEAD + 1, { width: f.w - 8, align: "center", lineBreak: false }));
      if (f.nr !== undefined) {
        doc.circle(x + 1, y + 1, 7.5).fill(INK);
        doc.font(SANS_BOLD).fontSize(8.5).fillColor("#ffffff").text(String(f.nr), x - 6.5, y - 3.5, { width: 15, align: "center", lineBreak: false });
      }
    } else if (f.k === "pfeil") {
      doc.lineWidth(1.1).strokeColor(INK).moveTo(x0 + f.punkte[0]![0], y0 + f.punkte[0]![1]).lineTo(x0 + f.punkte[1]![0], y0 + f.punkte[1]![1]).stroke();
      const [tip, l, r] = arrowHead([x0 + f.punkte[0]![0], y0 + f.punkte[0]![1]], [x0 + f.punkte[1]![0], y0 + f.punkte[1]![1]]);
      doc.polygon(tip, l, r).fill(INK);
    } else if (f.k === "text") {
      const lines = f.zeilen.map(printable);
      if (f.weissHinter) {
        const w = Math.max(...lines.map((l) => doc.font(f.fett ? SANS_BOLD : SANS).fontSize(f.groesse).widthOfString(l))) + 4;
        const cx = x0 + f.x + f.w / 2;
        doc.rect(cx - w / 2, y0 + f.y - 1, w, lines.length * LEAD + 1).fill("#ffffff");
      }
      doc.font(f.fett ? SANS_BOLD : SANS).fontSize(f.groesse).fillColor(INK);
      lines.forEach((l, i) => doc.text(l, x0 + f.x, y0 + f.y + i * (f.groesse >= 10 ? 12.5 : LEAD), { width: f.w, align: f.ausrichtung, lineBreak: false }));
    } else if (f.k === "linie") {
      doc.lineWidth(f.breite).strokeColor(f.farbe === "ink" ? INK : LINE);
      if (f.gestrichelt) doc.dash(2, { space: 2 });
      doc.moveTo(x0 + f.x1, y0 + f.y1).lineTo(x0 + f.x2, y0 + f.y2).stroke();
    } else if (f.k === "balken") {
      doc.lineWidth(0.9).rect(x0 + f.x, y0 + f.y, f.w, f.h).fillAndStroke(BAR, INK);
    } else {
      doc.circle(x0 + f.x, y0 + f.y, f.r).fill(INK);
    }
    doc.restore();
  }
}

let fontsReady = false;
function canvasFonts() {
  if (fontsReady) return;
  for (const name of FONT_NAMES) GlobalFonts.registerFromPath(fontFile(name), name);
  fontsReady = true;
}

/** The scene as a PNG (white background), for Word files. `scale` pixels per point. */
export function szeneAlsPng(szene: Szene, scale = 3): Buffer {
  canvasFonts();
  const canvas = createCanvas(Math.ceil(szene.w * scale) + 4, Math.ceil(szene.h * scale) + 14);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(8 / scale, 6 / scale);
  ctx.textBaseline = "top";
  const font = (f: Pick<Extract<Form, { k: "text" }>, "fett" | "groesse">) => `${f.groesse}px "${f.fett ? SANS_BOLD : SANS}"`;
  for (const f of szene.formen) {
    ctx.save();
    if (f.k === "kasten") {
      ctx.beginPath();
      ctx.roundRect(f.x, f.y, f.w, f.h, 3);
      ctx.fillStyle = f.stil === "betont" ? BOX : "#ffffff";
      ctx.fill();
      ctx.lineWidth = f.stil === "betont" ? 1.6 : 0.9;
      ctx.strokeStyle = f.stil === "leer" ? "#555555" : INK;
      if (f.stil === "leer") ctx.setLineDash([3, 2.5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.font = font({ fett: f.stil === "betont", groesse: 9.5 });
      const top = f.y + (f.h - f.zeilen.length * LEAD) / 2;
      f.zeilen.forEach((l, i) => ctx.fillText(printable(l), f.x + f.w / 2, top + i * LEAD + 0.5));
      if (f.nr !== undefined) {
        ctx.beginPath();
        ctx.arc(f.x + 1, f.y + 1, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = INK;
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = font({ fett: true, groesse: 8.5 });
        ctx.fillText(String(f.nr), f.x + 1, f.y - 3);
      }
    } else if (f.k === "pfeil") {
      const [a, b] = f.punkte as [[number, number], [number, number]];
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      const [tip, l, r] = arrowHead(a, b);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.moveTo(tip[0], tip[1]);
      ctx.lineTo(l[0], l[1]);
      ctx.lineTo(r[0], r[1]);
      ctx.fill();
    } else if (f.k === "text") {
      ctx.font = font(f);
      const lines = f.zeilen.map(printable);
      const lead = f.groesse >= 10 ? 12.5 : LEAD;
      if (f.weissHinter) {
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 4;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(f.x + f.w / 2 - w / 2, f.y - 1, w, lines.length * LEAD + 1);
      }
      ctx.fillStyle = INK;
      ctx.textAlign = f.ausrichtung;
      const ax = f.ausrichtung === "left" ? f.x : f.ausrichtung === "right" ? f.x + f.w : f.x + f.w / 2;
      lines.forEach((l, i) => ctx.fillText(l, ax, f.y + i * lead + 0.5));
    } else if (f.k === "linie") {
      ctx.strokeStyle = f.farbe === "ink" ? INK : LINE;
      ctx.lineWidth = f.breite;
      if (f.gestrichelt) ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();
    } else if (f.k === "balken") {
      ctx.fillStyle = BAR;
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = INK;
      ctx.strokeRect(f.x, f.y, f.w, f.h);
    } else {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  return canvas.toBuffer("image/png");
}

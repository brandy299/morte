/**
 * Draws a diagram scene (see schaubild.ts) into a PowerPoint slide as real objects: boxes, lines and text boxes
 * that the teacher can click, move and edit. The same shapes the preview (PDF) draws, so both agree.
 * Every object is named "Schaubild" (the checks of the evals use that to find a diagram).
 */
import type PptxGenJS from "pptxgenjs";
import { BOX, INK, LINE, SANS, textWidth } from "./layout.ts";
import type { Form, Szene } from "./schaubild.ts";

const BAR = "#c8c8c8";
const LEAD = 11.5;
const PPTX_SANS = "Calibri";
const inch = (pt: number) => pt / 72;
const hex = (c: string) => c.replace("#", "").toUpperCase();
export const OBJEKTNAME = "Schaubild";

type Slide = ReturnType<PptxGenJS["addSlide"]>;

/** `scale` points on the slide per point of the scene, (x0, y0) the top left corner on the slide. */
export function zeichnePptx(pres: PptxGenJS, slide: Slide, szene: Szene, x0: number, y0: number, scale: number): void {
  const px = (v: number) => inch(x0 + v * scale);
  const py = (v: number) => inch(y0 + v * scale);
  const pl = (v: number) => inch(v * scale);
  const lines = (zeilen: string[], size: number, bold = false, color = INK) =>
    zeilen.map((z, i) => ({ text: z, options: { breakLine: i < zeilen.length - 1, fontFace: PPTX_SANS, fontSize: size * scale, bold, color: hex(color) } }));
  const common = { objectName: OBJEKTNAME };

  /** Arrow head as its own triangle, the same size as in the PDF: the head of a PowerPoint line is too small on a projector. */
  const head = (from: [number, number], tip: [number, number]) => {
    const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
    const l = 7;
    const w = 2 * l * Math.sin(0.4);
    const h = l * Math.cos(0.4);
    const cx = tip[0] - (h / 2) * Math.cos(a);
    const cy = tip[1] - (h / 2) * Math.sin(a);
    slide.addShape(pres.ShapeType.triangle, { ...common, x: px(cx - w / 2), y: py(cy - h / 2), w: pl(w), h: pl(h), rotate: ((a * 180) / Math.PI + 90 + 360) % 360, fill: { color: hex(INK) }, line: { color: hex(INK), width: 0 } });
  };
  const line = (p: [number, number], q: [number, number], opts: { color: string; width: number; dash?: boolean }) => {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    slide.addShape(pres.ShapeType.line, {
      ...common,
      x: px(Math.min(p[0], q[0])), y: py(Math.min(p[1], q[1])), w: pl(Math.abs(dx)), h: pl(Math.abs(dy)),
      flipH: dx < 0, flipV: dy < 0,
      line: { color: hex(opts.color), width: opts.width * scale, ...(opts.dash ? { dashType: "dash" as const } : {}) },
    });
  };
  const badge = (x: number, y: number, r: number, nr: number) =>
    slide.addText(String(nr), {
      ...common, shape: pres.ShapeType.ellipse, x: px(x - r), y: py(y - r), w: pl(2 * r), h: pl(2 * r),
      fill: { color: hex(INK) }, line: { color: hex(INK), width: 0 }, fontFace: PPTX_SANS, fontSize: (r + 1) * scale, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, wrap: false,
    });

  for (const f of szene.formen as Form[]) {
    if (f.k === "kasten" || f.k === "etikett") {
      const kasten = f.k === "kasten";
      const betont = kasten && f.stil === "betont";
      const leer = kasten ? f.stil === "leer" : f.leer;
      slide.addText(lines(f.zeilen, kasten ? 9.5 : 8.5, betont), {
        ...common, shape: pres.ShapeType.roundRect, rectRadius: inch(3 * scale),
        x: px(f.x), y: py(f.y), w: pl(f.w), h: pl(f.h),
        fill: { color: hex(betont ? BOX : "#ffffff") },
        line: { color: hex(leer ? "#555555" : kasten ? INK : LINE), width: (betont ? 1.6 : kasten ? 0.9 : 0.8) * scale, ...(leer ? { dashType: "dash" as const } : {}) },
        align: "center", valign: "middle", margin: 0, wrap: false, lineSpacingMultiple: 0.95,
      });
      if (f.nr !== undefined) badge(f.x + 1, f.y + 1, kasten ? 7.5 : 7, f.nr);
    } else if (f.k === "pfeil") {
      const pts = f.punkte;
      for (let i = 1; i < pts.length; i++) line(pts[i - 1]!, pts[i]!, { color: INK, width: 1.1, dash: f.gestrichelt });
      head(pts[pts.length - 2]!, pts[pts.length - 1]!);
    } else if (f.k === "text") {
      const lead = f.groesse >= 10 ? 12.5 : LEAD;
      const w = f.weissHinter ? Math.min(f.w, Math.max(...f.zeilen.map((z) => textWidth(z, SANS, f.groesse))) + 6) : f.w;
      const x = f.weissHinter ? f.x + (f.w - w) / 2 : f.x;
      slide.addText(lines(f.zeilen, f.groesse, !!f.fett), {
        ...common, x: px(x), y: py(f.y), w: pl(w), h: pl(f.zeilen.length * lead + 2),
        align: f.weissHinter ? "center" : f.ausrichtung, valign: "top", margin: 0, wrap: false, lineSpacingMultiple: lead / (f.groesse * 1.2),
        ...(f.weissHinter ? { fill: { color: "FFFFFF" } } : {}),
      });
    } else if (f.k === "linie") {
      line([f.x1, f.y1], [f.x2, f.y2], { color: f.farbe === "ink" ? INK : LINE, width: f.breite, dash: f.gestrichelt });
    } else if (f.k === "balken") {
      slide.addShape(pres.ShapeType.rect, { ...common, x: px(f.x), y: py(f.y), w: pl(f.w), h: pl(f.h), fill: { color: hex(BAR) }, line: { color: hex(INK), width: 0.9 * scale } });
    } else {
      slide.addShape(pres.ShapeType.ellipse, { ...common, x: px(f.x - f.r), y: py(f.y - f.r), w: pl(2 * f.r), h: pl(2 * f.r), fill: { color: hex(INK) }, line: { color: hex(INK), width: 0 } });
    }
  }
}

import { useEffect, useRef } from "react";
import { MUSTER, musterZurZeit, naechsterStart, type Farben } from "./warteMuster.ts";

/** Calm mode in Pult's look settings, or "reduce motion" on the computer: then the pattern stands still. */
const ruhig = () => document.documentElement.hasAttribute("data-calm") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A small moving pattern next to the status line. Decoration only: the text beside it says what happens. */
export function WarteMuster({ groesse = 40 }: { groesse?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    const d = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(groesse * d);
    cv.width = px;
    cv.height = px;
    // Each pattern draws on its own sheet; during a change the two sheets are laid over each other.
    const blaetter = [0, 1].map(() => {
      const b = document.createElement("canvas");
      b.width = px;
      b.height = px;
      return b;
    });
    const start = naechsterStart();

    let t = 0, last = 0, frame = 0;
    const draw = () => {
      const s = getComputedStyle(cv);
      const f: Farben = { ink: s.getPropertyValue("--ink-soft").trim() || "#5f594e", accent: s.getPropertyValue("--accent").trim() || "#b4532a" };
      const { jetzt, naechstes, blend } = musterZurZeit(start, t);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, px, px);
      ([[jetzt, 1 - blend], [naechstes, blend]] as const).forEach(([i, a], k) => {
        if (a <= 0) return;
        const b = blaetter[k]!.getContext("2d")!;
        b.setTransform(d, 0, 0, d, 0, 0);
        b.clearRect(0, 0, groesse, groesse);
        b.globalAlpha = 1;
        MUSTER[i]!.draw(b, groesse, groesse, t, f);
        c.globalAlpha = a;
        c.drawImage(blaetter[k]!, 0, 0);
      });
      c.globalAlpha = 1;
    };
    const loop = (ts: number) => {
      const now = ts / 1000;
      if (document.visibilityState !== "visible" || ruhig()) last = 0;
      else if (now - last >= 1 / 30) {
        t += last ? Math.min(0.1, now - last) : 1 / 30;
        last = now;
        draw();
      }
      frame = requestAnimationFrame(loop);
    };
    draw();
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [groesse]);

  return <canvas ref={ref} className="warte-muster" style={{ width: groesse, height: groesse }} aria-hidden />;
}

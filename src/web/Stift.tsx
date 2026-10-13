import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { beschreibe, ueberschriften } from "./stiftZiel.ts";

/**
 * Dev pencil. Only for the development phase: it is mounted when the server was started with PULT_STIFT=1.
 * Mark an element (click) or an area (drag), write what is wrong, save. The note goes to the data folder, nothing is sent.
 */
interface Ziel { art: "element" | "bereich"; rechteck: { x: number; y: number; w: number; h: number }; selektor?: string; tag?: string; text?: string; beschriftung?: string; rolle?: string }

const rect = (r: DOMRect) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
const inStift = (el: Element | null) => !!el?.closest("[data-stift]");

/** A picture of this browser tab, if the person allows it (the browser asks each time). */
async function foto(): Promise<string | undefined> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, preferCurrentTab: true } as DisplayMediaStreamOptions);
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 300));
    const canvas = document.createElement("canvas");
    for (const scale of [1, 0.6, 0.4]) {
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/png");
      if (url.length * 0.75 < 2.8 * 1024 * 1024) return url;
    }
    return undefined;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

function Stift() {
  const [modus, setModus] = useState<"aus" | "waehlen" | "notiz">("aus");
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [ziel, setZiel] = useState<Ziel | null>(null);
  const [notiz, setNotiz] = useState("");
  const [mitFoto, setMitFoto] = useState(false);
  const [meldung, setMeldung] = useState<{ text: string; fehler?: boolean } | null>(null);
  const [anzahl, setAnzahl] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [aufgezogen, setAufgezogen] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const zaehle = useCallback(() => fetch("/api/stift").then((r) => r.json()).then((d: { hinweise: unknown[] }) => setAnzahl(d.hinweise.length)).catch(() => {}), []);
  useEffect(() => void zaehle(), [zaehle]);

  useEffect(() => {
    if (modus !== "waehlen") return;
    const unter = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      return el && !inStift(el) ? el : null;
    };
    const move = (e: MouseEvent) => {
      if (drag.current) {
        const { x, y } = drag.current;
        setAufgezogen({ x: Math.min(x, e.clientX), y: Math.min(y, e.clientY), w: Math.abs(e.clientX - x), h: Math.abs(e.clientY - y) });
        return;
      }
      const el = unter(e.clientX, e.clientY);
      setHover(el ? el.getBoundingClientRect() : null);
    };
    const down = (e: MouseEvent) => {
      if (inStift(e.target as Element)) return;
      e.preventDefault();
      e.stopPropagation();
      drag.current = { x: e.clientX, y: e.clientY };
    };
    const up = (e: MouseEvent) => {
      if (!drag.current) return;
      const start = drag.current;
      drag.current = null;
      setAufgezogen(null);
      e.preventDefault();
      e.stopPropagation();
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        setZiel({ art: "bereich", rechteck: { x: Math.round(Math.min(start.x, e.clientX)), y: Math.round(Math.min(start.y, e.clientY)), w: Math.round(Math.abs(e.clientX - start.x)), h: Math.round(Math.abs(e.clientY - start.y)) } });
      } else {
        const el = unter(e.clientX, e.clientY);
        if (!el) return;
        setZiel({ art: "element", rechteck: rect(el.getBoundingClientRect()), ...beschreibe(el) });
      }
      setModus("notiz");
    };
    const block = (e: Event) => {
      if (!inStift(e.target as Element)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModus("aus");
        setHover(null);
      }
    };
    document.addEventListener("mousemove", move, true);
    document.addEventListener("mousedown", down, true);
    document.addEventListener("mouseup", up, true);
    document.addEventListener("click", block, true);
    document.addEventListener("keydown", key, true);
    return () => {
      for (const [t, f] of [["mousemove", move], ["mousedown", down], ["mouseup", up], ["click", block], ["keydown", key]] as const) document.removeEventListener(t, f as EventListener, true);
    };
  }, [modus]);

  const schliessen = () => {
    setModus("aus");
    setZiel(null);
    setNotiz("");
    setHover(null);
  };

  const speichern = async () => {
    if (!ziel) return;
    setBusy(true);
    setMeldung(null);
    let bild: string | undefined;
    let ohneFoto = false;
    if (mitFoto) {
      try {
        bild = await foto();
        ohneFoto = !bild;
      } catch {
        ohneFoto = true;
      }
    }
    const res = await fetch("/api/stift", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notiz, ziel, bild, ansicht: { url: location.href, titel: document.title, ueberschriften: ueberschriften(), fenster: { w: innerWidth, h: innerHeight } } }),
    }).catch(() => undefined);
    setBusy(false);
    if (res?.ok) {
      schliessen();
      void zaehle();
      setToast(ohneFoto ? "Gespeichert, aber ohne Bildschirmfoto (nicht erlaubt oder nicht möglich)." : "Gespeichert.");
      window.setTimeout(() => setToast(null), 5000);
    } else setMeldung({ text: ((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? "Das Speichern hat nicht geklappt.", fehler: true });
  };

  const box = (r: { x?: number; y?: number; left?: number; top?: number; w?: number; h?: number; width?: number; height?: number }) => ({ left: r.x ?? r.left, top: r.y ?? r.top, width: r.w ?? r.width, height: r.h ?? r.height });
  return (
    <div data-stift>
      <style>{`
        [data-stift] { font-family: system-ui, sans-serif; font-size: 14px; }
        .stift-knopf { position: fixed; left: 14px; bottom: 14px; z-index: 2147483000; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 999px; border: 2px solid #1d2a4a; background: #fff7d6; color: #1d2a4a; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
        .stift-knopf[aria-pressed="true"] { background: #ffd400; }
        .stift-rahmen { position: fixed; z-index: 2147482990; pointer-events: none; outline: 2px solid #e0562a; background: rgba(224,86,42,.12); }
        .stift-banner { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 2147483000; background: #1d2a4a; color: #fff; padding: 8px 16px; border-radius: 10px; }
        .stift-karte { position: fixed; right: 16px; bottom: 16px; width: 360px; max-width: calc(100vw - 32px); z-index: 2147483000; background: #fff; color: #1d2a4a; border: 2px solid #1d2a4a; border-radius: 14px; padding: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.3); display: flex; flex-direction: column; gap: 8px; }
        .stift-karte textarea { width: 100%; min-height: 90px; font: inherit; padding: 8px; border: 1px solid #888; border-radius: 8px; box-sizing: border-box; }
        .stift-karte button, .stift-karte a { font: inherit; padding: 6px 12px; border-radius: 8px; border: 1px solid #1d2a4a; background: #fff; color: #1d2a4a; cursor: pointer; text-decoration: none; }
        .stift-karte button.prim { background: #1d2a4a; color: #fff; }
        .stift-zeile { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .stift-fehler { color: #8a2c10; margin: 0; }
        .stift-ziel { color: #555; font-size: 12px; margin: 0; word-break: break-all; }
      `}</style>
      <button type="button" className="stift-knopf" aria-pressed={modus !== "aus"} aria-label="Hinweis geben: eine Stelle markieren" onClick={() => (modus === "aus" ? setModus("waehlen") : schliessen())}>
        <span aria-hidden>✎</span> Hinweis{anzahl ? ` (${anzahl})` : ""}
      </button>
      {toast && <p className="stift-banner" role="status">{toast}</p>}
      {modus === "waehlen" && <p className="stift-banner" role="status">Klicke auf eine Stelle oder ziehe einen Bereich auf. Esc bricht ab.</p>}
      {modus === "waehlen" && hover && !aufgezogen && <div className="stift-rahmen" style={box(hover)} />}
      {aufgezogen && <div className="stift-rahmen" style={box(aufgezogen)} />}
      {modus === "notiz" && ziel && <div className="stift-rahmen" style={box(ziel.rechteck)} />}
      {modus === "notiz" && ziel && (
        <form className="stift-karte" onSubmit={(e) => { e.preventDefault(); void speichern(); }}>
          <label htmlFor="stift-notiz"><strong>Was soll hier anders sein?</strong></label>
          <p className="stift-ziel">{ziel.art === "element" ? `${ziel.selektor ?? ""}${ziel.text ? ` · „${ziel.text.slice(0, 50)}“` : ""}` : `Bereich ${ziel.rechteck.w} x ${ziel.rechteck.h}`}</p>
          <textarea id="stift-notiz" value={notiz} maxLength={1500} autoFocus onChange={(e) => setNotiz(e.target.value)} />
          <label><input type="checkbox" checked={mitFoto} onChange={(e) => setMitFoto(e.target.checked)} /> Bildschirmfoto mitschicken (der Browser fragt nach)</label>
          {meldung && <p className={meldung.fehler ? "stift-fehler" : undefined} role="status">{meldung.text}</p>}
          <div className="stift-zeile">
            <button type="submit" className="prim" disabled={busy || !notiz.trim()}>Speichern</button>
            <button type="button" onClick={schliessen}>Abbrechen</button>
          </div>
          <div className="stift-zeile">
            <a href="/api/stift/export" download>Alle als ZIP</a>
            <a href="/api/stift/export?format=md" download>Alle als Text</a>
          </div>
        </form>
      )}
    </div>
  );
}

/** Mounts the pencil when the server says it is on. */
export async function startStift(): Promise<void> {
  const aktiv = await fetch("/api/stift/status").then((r) => r.json()).then((d: { aktiv?: boolean }) => d.aktiv === true).catch(() => false);
  if (!aktiv) return;
  const host = document.createElement("div");
  host.id = "stift-root";
  document.body.appendChild(host);
  createRoot(host).render(<Stift />);
}

/**
 * Turns an explainer piece (Erklärstück) into a video, in the browser, without any extra program (decision 017).
 * The piece runs in a hidden sandboxed frame and draws one picture per request (see src/core/animation/html.ts);
 * the browser's own encoder makes the video and Mediabunny (MPL-2.0, unchanged) puts it into a file.
 * MP4 (H.264) where the browser can encode it, else WebM (VP9).
 */
import { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat } from "mediabunny";

export const BREITE = 1280;
export const HOEHE = 720;
export const BILDER_JE_SEKUNDE = 30;

/** Moments (ms) of all pictures, the last one exactly at the end. */
export function zeitpunkte(dauer: number, fps = BILDER_JE_SEKUNDE): number[] {
  const n = Math.max(1, Math.ceil((dauer / 1000) * fps));
  return Array.from({ length: n + 1 }, (_, i) => Math.min(dauer, (i * 1000) / fps));
}

export interface Video { blob: Blob; endung: "mp4" | "webm" }

export class VideoAbgebrochen extends Error {}

/** Opens the piece in a hidden frame and waits until it says how long it runs. */
function rahmenOeffnen(url: string): Promise<{ rahmen: HTMLIFrameElement; dauer: number }> {
  const rahmen = document.createElement("iframe");
  rahmen.setAttribute("sandbox", "allow-scripts");
  rahmen.setAttribute("aria-hidden", "true");
  rahmen.tabIndex = -1;
  rahmen.style.cssText = `position:fixed;left:-10000px;top:0;width:${BREITE}px;height:${HOEHE + 80}px;border:0`;
  return new Promise((resolve, reject) => {
    const zeit = setTimeout(() => (removeEventListener("message", an), rahmen.remove(), reject(new Error("Das Erklärstück hat nicht geantwortet."))), 20000);
    const an = (e: MessageEvent) => {
      if (e.source !== rahmen.contentWindow || e.data?.pult !== "erklaerstueck") return;
      clearTimeout(zeit);
      removeEventListener("message", an);
      resolve({ rahmen, dauer: Number(e.data.dauer) });
    };
    addEventListener("message", an);
    rahmen.src = `${url}${url.includes("?") ? "&" : "?"}export=1`;
    document.body.append(rahmen);
  });
}

/** Asks the frame for the picture at `ms`. */
function bildHolen(rahmen: HTMLIFrameElement, nr: number, ms: number): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const zeit = setTimeout(() => (removeEventListener("message", an), reject(new Error("Ein Bild kam nicht an."))), 20000);
    const an = (e: MessageEvent) => {
      if (e.source !== rahmen.contentWindow || e.data?.pult !== "bild-fertig" || e.data.nr !== nr) return;
      clearTimeout(zeit);
      removeEventListener("message", an);
      resolve(e.data.bild as ImageBitmap);
    };
    addEventListener("message", an);
    rahmen.contentWindow!.postMessage({ pult: "bild", nr, ms }, "*");
  });
}

/** Makes the video. `fortschritt` gets 0..1. Stops with VideoAbgebrochen when `signal` fires. */
export async function erklaerstueckAlsVideo(url: string, fortschritt: (anteil: number) => void, signal?: AbortSignal): Promise<Video> {
  const codec = await getFirstEncodableVideoCodec(["avc", "vp9"], { width: BREITE, height: HOEHE, quality: QUALITY_HIGH });
  if (!codec) throw new Error("Dieser Browser kann keine Videos erstellen. Versuche es in Chrome, Edge oder Safari.");
  const endung = codec === "avc" ? "mp4" : "webm";
  const { rahmen, dauer } = await rahmenOeffnen(url);
  try {
    const leinwand = new OffscreenCanvas(BREITE, HOEHE);
    const ctx = leinwand.getContext("2d")!;
    const ziel = new BufferTarget();
    const output = new Output({ format: endung === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(), target: ziel });
    const quelle = new CanvasSource(leinwand, { codec, quality: QUALITY_HIGH, keyFrameInterval: 2 });
    output.addVideoTrack(quelle, { frameRate: BILDER_JE_SEKUNDE });
    await output.start();
    const momente = zeitpunkte(dauer);
    for (const [nr, ms] of momente.entries()) {
      if (signal?.aborted) {
        await output.cancel();
        throw new VideoAbgebrochen();
      }
      const bild = await bildHolen(rahmen, nr, ms);
      ctx.drawImage(bild, 0, 0);
      bild.close();
      await quelle.add(nr / BILDER_JE_SEKUNDE, 1 / BILDER_JE_SEKUNDE);
      fortschritt((nr + 1) / momente.length);
    }
    await output.finalize();
    return { blob: new Blob([ziel.buffer!], { type: endung === "mp4" ? "video/mp4" : "video/webm" }), endung };
  } finally {
    rahmen.remove();
  }
}

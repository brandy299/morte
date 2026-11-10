// Video export of an explainer (Erklärstück): the page in the preview frame hands over one picture per moment,
// the browser's own encoder (WebCodecs, through Mediabunny) turns them into an MP4. Nothing leaves the computer.
import { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } from "mediabunny";

export const BREITE = 1280;
export const HOEHE = 720;
export const BILDER_PRO_SEKUNDE = 30;

/** The moments (in ms) to draw: first picture at 0, last one at the very end. */
export function bildZeiten(dauerMs: number, fps = BILDER_PRO_SEKUNDE): number[] {
  if (!(dauerMs > 0)) return [];
  const n = Math.ceil((dauerMs / 1000) * fps);
  return Array.from({ length: n + 1 }, (_, i) => Math.min(dauerMs, Math.round((i * 1000) / fps)));
}

type Antwort = { pult: string; ms?: number; svg?: string };

/** Asks the page in the frame one question and waits for its answer. */
function frage(rahmen: HTMLIFrameElement, anfrage: Record<string, unknown>, antwort: string, ms?: number): Promise<Antwort> {
  return new Promise((ok, fehl) => {
    const zeit = setTimeout(() => {
      removeEventListener("message", hoer);
      fehl(new Error("Das Erklärstück antwortet nicht."));
    }, 20000);
    const hoer = (e: MessageEvent) => {
      const d = e.data as Antwort | null;
      if (e.source !== rahmen.contentWindow || !d || d.pult !== antwort || (ms !== undefined && d.ms !== ms)) return;
      clearTimeout(zeit);
      removeEventListener("message", hoer);
      ok(d);
    };
    addEventListener("message", hoer);
    rahmen.contentWindow?.postMessage(anfrage, "*");
  });
}

const bildLaden = (svg: string) =>
  new Promise<HTMLImageElement>((ok, fehl) => {
    const bild = new Image();
    bild.onload = () => ok(bild);
    bild.onerror = () => fehl(new Error("Ein Bild konnte nicht gezeichnet werden."));
    // A data: address keeps the canvas clean; a blob: address would make it unreadable for the encoder.
    bild.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });

/** Renders the whole explainer to an MP4 (without sound) and returns the file. */
export async function videoErzeugen(rahmen: HTMLIFrameElement, fortschritt: (anteil: number) => void, abbruch: AbortSignal): Promise<Blob> {
  const { ms: dauer } = await frage(rahmen, { pult: "video?" }, "video");
  const zeiten = bildZeiten(dauer ?? 0);
  if (zeiten.length === 0) throw new Error("Dieses Erklärstück bewegt sich nicht (Bewegung ist am Gerät ausgeschaltet). Ein Video geht so nicht.");

  const format = new Mp4OutputFormat();
  // H.264 plays everywhere (PowerPoint, Moodle, phones); where the computer cannot make it, VP9 inside the same MP4.
  const codec = await getFirstEncodableVideoCodec(format.getSupportedVideoCodecs(), { width: BREITE, height: HOEHE });
  if (!codec) throw new Error("Dieser Rechner kann kein Video erzeugen.");

  const leinwand = document.createElement("canvas");
  leinwand.width = BREITE;
  leinwand.height = HOEHE;
  const g = leinwand.getContext("2d");
  if (!g) throw new Error("Dieser Rechner kann kein Video erzeugen.");

  const output = new Output({ format, target: new BufferTarget() });
  const quelle = new CanvasSource(leinwand, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(quelle, { frameRate: BILDER_PRO_SEKUNDE });
  await output.start();
  try {
    let vorher = "";
    for (const [i, ms] of zeiten.entries()) {
      if (abbruch.aborted) throw new Error("abgebrochen");
      const { svg } = await frage(rahmen, { pult: "bild?", ms }, "bild", ms);
      // Static stretches are the same picture again and again: draw it once, encode it each time.
      if (svg && svg !== vorher) {
        g.clearRect(0, 0, BREITE, HOEHE);
        g.drawImage(await bildLaden(svg), 0, 0, BREITE, HOEHE);
        vorher = svg;
      }
      await quelle.add(i / BILDER_PRO_SEKUNDE, 1 / BILDER_PRO_SEKUNDE);
      fortschritt((i + 1) / zeiten.length);
    }
    quelle.close();
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => {});
    throw e;
  }
  return new Blob([(output.target as BufferTarget).buffer!], { type: "video/mp4" });
}

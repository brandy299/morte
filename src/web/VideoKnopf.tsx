import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * "Als Video speichern" in the preview head. Shows only when the piece in the preview says it can make pictures
 * (an Erklärstück made with this version of Pult), so interactive exercises and older pieces get no button.
 */
export function VideoKnopf({ url, name, rahmen }: { url: string; name: string; rahmen: RefObject<HTMLIFrameElement | null> }) {
  const [kann, setKann] = useState(false);
  const [anteil, setAnteil] = useState<number | null>(null);
  const [meldung, setMeldung] = useState("");
  const abbruch = useRef<AbortController | null>(null);

  useEffect(() => {
    setKann(false);
    setMeldung("");
    const an = (e: MessageEvent) => {
      if (e.source === rahmen.current?.contentWindow && e.data?.pult === "erklaerstueck") setKann(true);
    };
    addEventListener("message", an);
    return () => {
      removeEventListener("message", an);
      abbruch.current?.abort();
    };
  }, [url, rahmen]);

  if (!kann) return null;

  const starten = async () => {
    const ab = new AbortController();
    abbruch.current = ab;
    setMeldung("");
    setAnteil(0);
    try {
      const { erklaerstueckAlsVideo, VideoAbgebrochen } = await import("./video.ts");
      try {
        const { blob, endung } = await erklaerstueckAlsVideo(url, setAnteil, ab.signal);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${name.replace(/\.html$/i, "")}.${endung}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        setMeldung(endung === "mp4" ? "Video gespeichert." : "Als WebM gespeichert, weil dieser Browser kein MP4 erstellen kann. PowerPoint spielt WebM nicht immer ab.");
      } catch (e) {
        if (!(e instanceof VideoAbgebrochen)) setMeldung(e instanceof Error ? e.message : "Das Video ließ sich nicht erstellen.");
      }
    } finally {
      setAnteil(null);
      abbruch.current = null;
    }
  };

  return (
    <>
      <span className="video-status" role="status" aria-live="polite">
        {anteil !== null ? `Video wird erstellt … ${Math.floor(anteil * 100)} %` : meldung}
      </span>
      {anteil !== null ? (
        <button type="button" className="ghost" onClick={() => abbruch.current?.abort()}>
          Abbrechen
        </button>
      ) : (
        <button type="button" className="ghost" onClick={starten} title="Speichert das Erklärstück als Videodatei, zum Beispiel für Moodle oder PowerPoint. Das kann ein paar Minuten dauern.">
          Als Video speichern
        </button>
      )}
    </>
  );
}

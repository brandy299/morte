import { useCallback, useEffect, useRef, useState } from "react";
import { STILL_UNTER, audioAnfrage, eingaenge, gewaehltesMikrofon, merkeMikrofon, mikrofonFehler, type Eingang } from "./diktat.ts";

/** Settings for dictation: which microphone Pult listens to, and a test that shows whether it hears anything. */
export function Mikrofon() {
  const [liste, setListe] = useState<Eingang[]>([]);
  const [auswahl, setAuswahl] = useState(gewaehltesMikrofon);
  const [problem, setProblem] = useState<string | null>(null);
  const [testet, setTestet] = useState(false);
  const [pegel, setPegel] = useState(0);
  const [gehoert, setGehoert] = useState(false);
  const stopTest = useRef<(() => void) | null>(null);
  const windows = /Windows/i.test(navigator.userAgent);

  const laden = useCallback(async () => {
    try {
      setListe(eingaenge(await navigator.mediaDevices.enumerateDevices()));
    } catch {
      setListe([]);
    }
  }, []);

  useEffect(() => {
    void laden();
    navigator.mediaDevices?.addEventListener?.("devicechange", laden);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", laden);
      stopTest.current?.();
    };
  }, [laden]);

  const waehle = (id: string) => {
    setAuswahl(id);
    merkeMikrofon(id);
    stopTest.current?.();
  };

  const stop = () => {
    stopTest.current?.();
  };

  // Names of the microphones are only shown by the browser after the first permission, so the test also fills the list.
  const test = async () => {
    setProblem(null);
    setGehoert(false);
    if (!navigator.mediaDevices?.getUserMedia) return setProblem("Dein Browser kann nicht aufnehmen. Probier Chrome, Edge oder Safari.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioAnfrage(auswahl) });
    } catch (err) {
      if (auswahl && err instanceof DOMException && (err.name === "OverconstrainedError" || err.name === "NotFoundError")) {
        waehle("");
        return setProblem("Das gewählte Mikrofon ist nicht mehr da. Ich nehme wieder das, was der Computer vorgibt. Tippe noch einmal auf Testen.");
      }
      return setProblem(mikrofonFehler(err, { app: !!window.pultApp, windows }));
    }
    void laden();
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const daten = new Float32Array(analyser.fftSize);
    let raf = 0;
    let max = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(daten);
      let p = 0;
      for (const v of daten) p = Math.max(p, Math.abs(v));
      max = Math.max(max, p);
      setPegel(p);
      if (max >= STILL_UNTER * 3) setGehoert(true);
      raf = requestAnimationFrame(tick);
    };
    tick();
    setTestet(true);
    stopTest.current = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      stopTest.current = null;
      setTestet(false);
      setPegel(0);
    };
  };

  const optionen = liste.some((e) => e.id === "") ? liste : [{ id: "", label: "Das Mikrofon, das der Computer vorgibt" }, ...liste];
  const gewaehltDa = optionen.some((e) => e.id === auswahl);

  return (
    <div className="settings-panel">
      <h2>Mikrofon zum Diktieren</h2>
      <p className="lead">Wähle das Mikrofon, in das du sprichst, und teste, ob Pult dich hört. Gesprochen wird auf deinem Computer in Text verwandelt, die Sprache geht nirgends hin.</p>
      <label className="field">
        Mikrofon
        <select value={gewaehltDa ? auswahl : ""} onChange={(e) => waehle(e.target.value)}>
          {optionen.map((e) => (
            <option key={e.id || "standard"} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </label>
      {liste.length > 0 && liste.every((e) => /^Mikrofon \d+$/.test(e.label) || e.id === "") && <p className="muted">Die Namen der Mikrofone zeigt der Browser erst nach dem ersten Test.</p>}
      <div className="mic-test">
        <button type="button" className="ghost" onClick={() => (testet ? stop() : void test())}>
          {testet ? "Test beenden" : "Mikrofon testen"}
        </button>
        <div className="pegel" role="meter" aria-label="Lautstärke des Mikrofons" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(pegel * 200))}>
          <span style={{ width: `${Math.min(100, pegel * 200)}%` }} />
        </div>
      </div>
      <p className="muted" role="status">
        {testet ? (gehoert ? "Ich höre dich. Dieses Mikrofon passt." : "Sprich jetzt etwas. Der Balken muss sich bewegen.") : "Tippe auf Testen und sprich einen Satz."}
      </p>
      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}
      {window.pultApp && windows && (
        <div className="mic-test">
          <button type="button" className="ghost" onClick={() => void window.pultApp?.mikrofonEinstellungen()}>
            Windows-Einstellungen öffnen
          </button>
          <span className="muted">Dort muss bei „Mikrofon“ der Zugriff für Desktop-Apps erlaubt sein.</span>
        </div>
      )}
    </div>
  );
}

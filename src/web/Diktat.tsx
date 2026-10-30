import { useEffect, useRef, useState } from "react";
import { MAX_SECONDS, MIN_SECONDS, SAMPLE_RATE, istGeraeusch, mikrofonFehler } from "./diktat.ts";
import type { FromWorker, ToWorker } from "./diktat.worker.ts";

type Phase = "bereit" | "hoert" | "schreibt";

/** Microphone button for the message field. The recognition runs in this browser, the voice never leaves the computer. */
export function Diktat({ onText, onProblem, disabled }: { onText: (text: string) => void; onProblem: (text: string | null) => void; disabled?: boolean }) {
  const [phase, setPhase] = useState<Phase>("bereit");
  const [prozent, setProzent] = useState<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const recorder = useRef<{ stream: MediaStream; rec: MediaRecorder; chunks: Blob[]; start: number; timer: number } | null>(null);
  const callbacks = useRef({ onText, onProblem });
  callbacks.current = { onText, onProblem };

  useEffect(
    () => () => {
      worker.current?.terminate();
      const r = recorder.current;
      if (r) {
        window.clearTimeout(r.timer);
        r.rec.onstop = null;
        if (r.rec.state !== "inactive") r.rec.stop();
        r.stream.getTracks().forEach((t) => t.stop());
      }
    },
    [],
  );

  const ensureWorker = () => {
    if (worker.current) return worker.current;
    const w = new Worker(new URL("./diktat.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.type === "progress") setProzent(m.percent);
      else if (m.type === "ready") setProzent(null);
      else if (m.type === "text") {
        setPhase("bereit");
        if (!istGeraeusch(m.text)) callbacks.current.onText(m.text);
        else callbacks.current.onProblem("Ich habe nichts verstanden. Sprich etwas lauter oder näher am Mikrofon und versuch es noch einmal.");
      } else if (m.type === "error") {
        // A failed load while the teacher is still speaking must not end the recording.
        setPhase((p) => (p === "hoert" ? p : "bereit"));
        setProzent(null);
        callbacks.current.onProblem("Die Spracherkennung hat nicht geklappt. Prüf die Internetverbindung (beim ersten Mal wird sie einmal geladen) und versuch es noch einmal.");
      }
    };
    worker.current = w;
    return w;
  };

  const start = async () => {
    onProblem(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return onProblem("Dein Browser kann nicht aufnehmen. Probier Chrome, Edge oder Safari.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      return onProblem(mikrofonFehler(err));
    }
    // Start loading the model while the teacher speaks, so the wait after the last word is short.
    const w = ensureWorker();
    w.postMessage({ type: "load" } satisfies ToWorker);
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => void finish();
    const timer = window.setTimeout(() => stop(), MAX_SECONDS * 1000);
    recorder.current = { stream, rec, chunks, start: Date.now(), timer };
    rec.start();
    setPhase("hoert");
  };

  const stop = () => {
    const r = recorder.current;
    if (r && r.rec.state !== "inactive") r.rec.stop();
  };

  const finish = async () => {
    const r = recorder.current;
    recorder.current = null;
    if (!r) return;
    window.clearTimeout(r.timer);
    r.stream.getTracks().forEach((t) => t.stop());
    setPhase("schreibt");
    try {
      const audio = await decode(new Blob(r.chunks, { type: r.rec.mimeType }));
      if (audio.length < MIN_SECONDS * SAMPLE_RATE) {
        setPhase("bereit");
        return onProblem("Das war zu kurz. Halte den Knopf, bis du fertig gesprochen hast.");
      }
      worker.current?.postMessage({ type: "transcribe", audio } satisfies ToWorker, [audio.buffer]);
    } catch {
      setPhase("bereit");
      onProblem("Die Aufnahme konnte ich nicht lesen. Versuch es noch einmal.");
    }
  };

  const label = phase === "hoert" ? "Aufnahme beenden" : phase === "schreibt" ? "Ich schreibe mit …" : "Diktieren";
  return (
    <>
      <button
        type="button"
        className={`icon-btn mic${phase === "hoert" ? " on" : ""}`}
        title={label}
        aria-label={label}
        aria-pressed={phase === "hoert"}
        disabled={disabled || phase === "schreibt"}
        onClick={() => (phase === "hoert" ? stop() : void start())}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0014 0M12 18v3" />
        </svg>
      </button>
      <span className="mic-status" role="status">
        {phase === "hoert" && "Ich höre zu. Tippe noch einmal aufs Mikrofon, wenn du fertig bist."}
        {phase === "schreibt" && (prozent !== null && prozent < 100 ? `Spracherkennung wird einmalig geladen: ${prozent} %` : "Ich schreibe mit …")}
      </span>
    </>
  );
}

/** Turns a recording into mono 16 kHz samples, which is what Whisper wants. */
async function decode(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const mono = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < ch.length; i++) mono[i]! += ch[i]! / buf.numberOfChannels;
    }
    return mono;
  } finally {
    void ctx.close();
  }
}

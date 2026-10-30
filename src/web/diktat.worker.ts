/// <reference lib="webworker" />
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import wasmMjs from "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url";
import wasmBinary from "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url";

/** Runs Whisper on the teacher's computer. Nothing is sent to a server: the model is fetched once, then kept in the browser cache. */
const MODEL = "onnx-community/whisper-base";

// The engine files ship with Pult instead of coming from a CDN.
env.backends.onnx.wasm!.wasmPaths = { mjs: wasmMjs, wasm: wasmBinary };

export type ToWorker = { type: "load" } | { type: "transcribe"; audio: Float32Array };
export type FromWorker = { type: "progress"; percent: number } | { type: "ready" } | { type: "text"; text: string } | { type: "error"; message: string };

const send = (m: FromWorker) => postMessage(m);
let asr: Promise<AutomaticSpeechRecognitionPipeline> | undefined;

function load(): Promise<AutomaticSpeechRecognitionPipeline> {
  asr ??= (async () => {
    // Progress per file; report the file that is furthest from done so the bar never jumps back.
    const files = new Map<string, number>();
    const model = await pipeline("automatic-speech-recognition", MODEL, {
      dtype: "q8",
      device: "wasm",
      progress_callback: (p: { status: string; file?: string; progress?: number }) => {
        if (p.status !== "progress" || !p.file || p.progress === undefined) return;
        files.set(p.file, p.progress);
        send({ type: "progress", percent: Math.round(Math.min(...files.values())) });
      },
    });
    return model as AutomaticSpeechRecognitionPipeline;
  })().catch((e) => {
    asr = undefined; // allow another try
    throw e;
  });
  return asr;
}

onmessage = async (e: MessageEvent<ToWorker>) => {
  try {
    const model = await load();
    if (e.data.type === "load") return send({ type: "ready" });
    const out = await model(e.data.audio, { language: "german", task: "transcribe", chunk_length_s: 30, stride_length_s: 5 });
    const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text;
    send({ type: "text", text });
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};

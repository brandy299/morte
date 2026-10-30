/** Dictation: pure helpers. Recording and the recognition itself live in `Diktat.tsx` and `diktat.worker.ts`. */

/** Whisper expects mono audio at 16 kHz. */
export const SAMPLE_RATE = 16000;
/** A longer recording is cut off; the text so far is still recognised. */
export const MAX_SECONDS = 300;
/** Below this the recording is a mis-click, not speech. */
export const MIN_SECONDS = 0.6;

/** Puts dictated text after what is already typed, with one space between, and drops the stray spaces Whisper adds. */
export function fuegeDiktatEin(vorhanden: string, diktat: string): string {
  const neu = diktat.replace(/\s+/g, " ").trim();
  if (!neu) return vorhanden;
  if (!vorhanden.trim()) return neu;
  return /\s$/.test(vorhanden) ? vorhanden + neu : `${vorhanden} ${neu}`;
}

/** Whisper writes these when it hears only silence or noise. They are not speech and must not land in the message. */
const NOISE = /^\s*(♪+|[\[(*♪].*[\])*♪])\s*$/;
export function istGeraeusch(text: string): boolean {
  const t = text.trim();
  return !t || NOISE.test(t) || /^(untertitel|vielen dank fürs zuschauen)/i.test(t);
}

/** Friendly message for a failed microphone request, in plain language. */
export function mikrofonFehler(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Pult darf das Mikrofon nicht benutzen. Erlaube es oben in der Adresszeile des Browsers und versuch es noch einmal.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Ich finde kein Mikrofon. Schließ eines an und versuch es noch einmal.";
  if (name === "NotReadableError") return "Das Mikrofon wird gerade von einem anderen Programm benutzt.";
  return "Das Mikrofon geht gerade nicht. Schreib stattdessen oder versuch es später noch einmal.";
}

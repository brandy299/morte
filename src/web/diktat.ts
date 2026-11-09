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

/** Where Pult runs, for the hint on what to open when the system blocks the microphone. */
export interface Umgebung {
  app: boolean;
  windows: boolean;
}

/** Friendly message for a failed microphone request, in plain language. */
export function mikrofonFehler(err: unknown, umgebung: Umgebung = { app: false, windows: false }): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    if (umgebung.app && umgebung.windows) return "Windows lässt Pult nicht ans Mikrofon. Öffne in Pult Einstellungen, Reiter Mikrofon, und tippe auf „Windows-Einstellungen öffnen“. Dort muss „Desktop-Apps den Zugriff auf das Mikrofon erlauben“ an sein.";
    return "Pult darf das Mikrofon nicht benutzen. Erlaube es oben in der Adresszeile des Browsers und versuch es noch einmal.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Ich finde kein Mikrofon. Schließ eines an oder wähle in den Einstellungen unter Mikrofon ein anderes.";
  if (name === "NotReadableError") return "Das Mikrofon wird gerade von einem anderen Programm benutzt (zum Beispiel Teams oder Zoom). Schließ das Programm und versuch es noch einmal.";
  return "Das Mikrofon geht gerade nicht. Wähle in den Einstellungen unter Mikrofon ein anderes oder schreib stattdessen.";
}

const MIKROFON_KEY = "pult.mikrofon";

/** The microphone the teacher picked in the settings. Empty means the one the system uses. Kept per computer and browser. */
export function gewaehltesMikrofon(): string {
  try {
    return localStorage.getItem(MIKROFON_KEY) ?? "";
  } catch {
    return "";
  }
}

export function merkeMikrofon(id: string): void {
  try {
    if (id) localStorage.setItem(MIKROFON_KEY, id);
    else localStorage.removeItem(MIKROFON_KEY);
  } catch {
    // Not saved; the system's microphone is used next time.
  }
}

/** Audio request for the chosen microphone. Without a choice the system decides. */
export function audioAnfrage(id: string): MediaTrackConstraints {
  return { echoCancellation: true, noiseSuppression: true, ...(id ? { deviceId: { exact: id } } : {}) };
}

/** Browsers list the same microphone as "default" and "communications" next to the real ones. Only the real ones and the system's choice are offered. */
export interface Eingang {
  id: string;
  label: string;
}
export function eingaenge(geraete: { kind: string; deviceId: string; label: string }[]): Eingang[] {
  const liste = geraete.filter((g) => g.kind === "audioinput" && g.deviceId !== "communications");
  return liste.map((g, i) => ({
    id: g.deviceId === "default" ? "" : g.deviceId,
    label: g.deviceId === "default" ? "Das Mikrofon, das der Computer vorgibt" : g.label.replace(/^(default|communications) - /i, "") || `Mikrofon ${i + 1}`,
  }));
}

/** Loudest sample of a recording, 0 to 1. */
export function spitze(samples: ArrayLike<number>): number {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]!));
  return max;
}

/** Below this nothing was said into the microphone: wrong device, muted, or switched off. Normal speech reaches 0.05 and more. */
export const STILL_UNTER = 0.01;

/** What went wrong when the model could not be reached or stopped answering. Decided from the provider's error text. */
export type FailureKind = "auth" | "credit" | "model" | "rate" | "overloaded" | "offline" | "cut" | "stalled" | "filtered" | "blocked" | "unknown";

export interface Failure {
  kind: FailureKind;
  /** Plain German text for the teacher, with what to do next. */
  message: string;
  /** Trying again can help (a short wait, a flaky line). False for problems the teacher must fix first. */
  retryable: boolean;
  /** Seconds the provider asked us to wait, if it said so. */
  waitSeconds?: number;
}

const MESSAGES: Record<FailureKind, { text: string; retryable: boolean }> = {
  auth: { text: "Der Zugang zur KI fehlt oder ist nicht gültig. Bitte prüfe den Zugangsschlüssel in den Einstellungen.", retryable: false },
  credit: { text: "Das Guthaben bei deinem KI-Anbieter ist aufgebraucht oder die Ausgabengrenze erreicht. Lade Guthaben auf oder erhöhe die Grenze, dann kannst du es noch einmal versuchen.", retryable: true },
  model: { text: "Dieses Modell gibt es beim Anbieter nicht oder nicht mehr. Wähle in den Einstellungen ein anderes.", retryable: false },
  rate: { text: "Dein KI-Anbieter bremst gerade, weil zu viele Anfragen kamen. Warte einen Moment und versuche es dann noch einmal.", retryable: true },
  overloaded: { text: "Der KI-Anbieter ist gerade überlastet. Versuche es gleich noch einmal oder wähle in den Einstellungen ein anderes Modell.", retryable: true },
  offline: { text: "Ich erreiche den KI-Anbieter nicht. Bitte prüfe die Internetverbindung. Im Schulnetz kann der Anbieter gesperrt sein, dann hilft ein anderer Anbieter, zum Beispiel OpenRouter.", retryable: true },
  cut: { text: "Die Verbindung ist mitten in der Antwort abgebrochen.", retryable: true },
  stalled: { text: "Der KI-Anbieter antwortet nicht mehr.", retryable: true },
  filtered: { text: "Der Anbieter hat die Antwort aus Sicherheitsgründen gestoppt. Formuliere deine Bitte etwas anders und versuche es noch einmal.", retryable: true },
  blocked: { text: "Eine Sperre hat die Anfrage abgewiesen, vermutlich der Filter im Schulnetz oder eine Firewall. Probiere ein anderes Netz oder einen anderen Anbieter.", retryable: false },
  unknown: { text: "Das hat gerade nicht geklappt.", retryable: true },
};

/** Looks at the error text of a failed request (for example `429: {"message":"…"}`, `terminated`, `Connection error.`). */
export function classifyFailure(raw?: string, opts: { stalled?: boolean } = {}): Failure {
  const text = raw ?? "";
  const status = /^\s*(\d{3})\b/.exec(text)?.[1];
  let kind: FailureKind = "unknown";
  if (opts.stalled) kind = "stalled";
  else if (status === "401" || /api key|apikey|unauthori[sz]ed|authenticat/i.test(text)) kind = "auth";
  else if (status === "402" || /insufficient (credit|fund|balance|quota)|out of credit|billing|payment required|quota (exceeded|exhausted)|exceeded your current quota/i.test(text)) kind = "credit";
  else if (status === "429" || /rate.?limit|too many requests/i.test(text)) kind = "rate";
  else if (/^5\d\d$/.test(status ?? "")) kind = "overloaded";
  else if (status === "404" || (!status && /model.{0,40}(not found|does not exist|not available)|no such model/i.test(text))) kind = "model";
  else if (status === "403" && /<html|blocked|firewall|proxy|filter/i.test(text)) kind = "blocked";
  else if (status === "403") kind = /region|country|location/i.test(text) ? "blocked" : "auth";
  else if (/overload|unavailable|capacity|temporarily|bad gateway/i.test(text)) kind = "overloaded";
  else if (/content.?filter|safety|blocked by|policy/i.test(text)) kind = "filtered";
  else if (/^terminated$|socket hang up|stream.{0,20}(closed|ended|abort)|aborted|ECONNRESET|other side closed/i.test(text.trim())) kind = "cut";
  else if (/connection error|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|fetch failed|network|timed? ?out|getaddrinfo/i.test(text)) kind = "offline";
  const wait = /retry.?after[^0-9]{0,6}(\d{1,4})/i.exec(text)?.[1];
  const entry = MESSAGES[kind];
  return { kind, message: entry.text, retryable: entry.retryable, ...(wait ? { waitSeconds: Number(wait) } : {}) };
}

/** Kinds worth trying again on their own, without asking the teacher: short hiccups, not things that need a fix. */
export const AUTO_RETRY: ReadonlySet<FailureKind> = new Set(["rate", "overloaded", "offline", "cut", "stalled"]);

export const MAX_AUTO_RETRIES = 3;

/** Seconds to wait before automatic try number `attempt` (1-based): 2, 5, 12, with a little spread. The provider's wish wins up to 30 s. */
export function retryDelay(attempt: number, failure: Failure, random = Math.random): number {
  if (failure.waitSeconds !== undefined) return Math.min(30, Math.max(1, failure.waitSeconds));
  const base = [2, 5, 12][Math.min(attempt, 3) - 1]!;
  return Math.round(base * (0.8 + random() * 0.4));
}

/**
 * Record of how long a conversation took and where the time went: each model request, each tool, the time spent
 * waiting for the teacher, repeated tries. Only times and counts, never content, so it can be shared to find out
 * why something was slow.
 */
export type LogEntry =
  /** One request to the model. `firstOutputMs`: time until anything came back (text, thinking or a tool call). */
  | { kind: "request"; at: string; ms: number; firstOutputMs?: number; input: number; output: number; reasoning?: number; end: string; error?: string }
  /** One tool run. `problem`: the fields the model got wrong, when the call did not fit the tool. */
  | { kind: "tool"; at: string; ms: number; name: string; ok: boolean; problem?: string }
  /** Time the assistant waited for the teacher (questions or a yes/no). It is part of the tool time around it. */
  | { kind: "teacher"; at: string; ms: number }
  /** Summary of an older conversation part, so it fits into the model's memory. */
  | { kind: "summary"; at: string; ms: number; ok: boolean }
  /** An automatic new try after a short-lived failure. */
  | { kind: "retry"; at: string; reason: string }
  /** One message of the teacher, from sending to the finished answer. */
  | { kind: "turn"; at: string; ms: number };

const ERROR_CHARS = 200;

/**
 * The field list of a failed tool call ("aufgaben.0: must be object"), without the arguments that follow it.
 * Other tool errors may quote the teacher's content, so they are not kept.
 */
export function validationProblem(text: string): string | undefined {
  if (!text.startsWith("Validation failed")) return undefined;
  const fields = text
    .split("\n")
    .filter((l) => /^\s+- /.test(l))
    .map((l) => l.trim().slice(2));
  return fields.length ? fields.join("; ").slice(0, ERROR_CHARS) : undefined;
}

export const shortError = (message?: string) => (message ? message.replace(/\s+/g, " ").slice(0, ERROR_CHARS) : undefined);

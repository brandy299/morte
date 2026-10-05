export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "step_start"; id: string; label: string }
  | { type: "step_end"; id: string; ok: boolean }
  | { type: "thinking"; active: boolean }
  | { type: "error"; message: string }
  | { type: "done" };

/** Sends a message and reads the server-sent events from the response stream. */
export async function sendMessage(text: string, onEvent: (e: ChatEvent) => void, signal: AbortSignal) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Keine Verbindung zum Assistenten.");
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
      if (data) onEvent(JSON.parse(data) as ChatEvent);
    }
  }
}

export async function resetChat() {
  await fetch("/api/chat/reset", { method: "POST" });
}

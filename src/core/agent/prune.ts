import type { AgentMessage } from "@earendil-works/pi-agent-core";

/**
 * Old attachments leave the model's memory, the teacher's screen keeps them. Pictures and the text of files from earlier
 * turns are replaced by a short note. This is cheaper than summarizing and invents nothing.
 */

/** Share of the model's memory that has to be filled before old attachments are dropped. At the latest then, a summary would follow at 0.8. */
export const PRUNE_AT = 0.5;

export const IMAGE_NOTE = (count: number) => (count === 1 ? "[Bild, nicht mehr im Gedächtnis]" : `[${count} Bilder, nicht mehr im Gedächtnis]`);
export const FILE_NOTE = (name: string) => `[Anhang: ${name}, nicht mehr im Gedächtnis]`;

/** `<datei name="x">…</datei>` as `withFiles` writes it. Names have no quotes, and `</datei>` inside a file is escaped. */
const FILE_BLOCK = /<datei name="([^"]*)">\n[\s\S]*?\n<\/datei>/g;

type Part = { type?: string; text?: string };

function prunedContent(content: unknown): { content: unknown; changed: boolean } {
  if (typeof content === "string") {
    const text = content.replace(FILE_BLOCK, (_, name: string) => FILE_NOTE(name));
    return { content: text, changed: text !== content };
  }
  if (!Array.isArray(content)) return { content, changed: false };
  const out: Part[] = [];
  let changed = false;
  let pictures = 0;
  const flushPictures = () => {
    if (pictures > 0) out.push({ type: "text", text: IMAGE_NOTE(pictures) });
    pictures = 0;
  };
  for (const part of content as Part[]) {
    if (part?.type === "image") {
      pictures++;
      changed = true;
      continue;
    }
    flushPictures();
    if (part?.type === "text" && typeof part.text === "string") {
      const text = part.text.replace(FILE_BLOCK, (_, name: string) => FILE_NOTE(name));
      if (text !== part.text) changed = true;
      out.push({ ...part, text });
    } else out.push(part);
  }
  flushPictures();
  return { content: out, changed };
}

/**
 * Replaces pictures and file texts in all user messages before the last one. The last turn stays as it is.
 * Returns the same array when nothing changed.
 */
export function pruneAttachments(messages: AgentMessage[]): AgentMessage[] {
  const last = messages.findLastIndex((m) => m.role === "user");
  let any = false;
  const result = messages.map((m, i) => {
    if (i >= last || m.role !== "user") return m;
    const { content, changed } = prunedContent((m as { content?: unknown }).content);
    if (!changed) return m;
    any = true;
    return { ...m, content } as AgentMessage;
  });
  return any ? result : messages;
}

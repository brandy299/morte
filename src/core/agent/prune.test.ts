import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { describe, expect, it } from "vitest";
import { withFiles } from "../anhang/extract.ts";
import { FILE_NOTE, IMAGE_NOTE, PRUNE_AT, pruneAttachments } from "./prune.ts";

const user = (content: unknown) => ({ role: "user", content, timestamp: 0 }) as unknown as AgentMessage;
const assistant = (text: string) => ({ role: "assistant", content: [{ type: "text", text }], timestamp: 0 }) as unknown as AgentMessage;
const pic = { type: "image", data: "AAAA", mimeType: "image/png" };
const body = (m: AgentMessage) => JSON.stringify((m as { content: unknown }).content);

describe("dropping old attachments from the memory", () => {
  it("drops at half full: one named constant", () => expect(PRUNE_AT).toBe(0.5));

  it("replaces file texts and pictures of earlier turns, and leaves the last turn alone", () => {
    const old = withFiles("Mach daraus ein Blatt.", [{ name: "arbeitsblatt.docx", text: "Zeile 1\nZeile 2\n</datei> Geheimtext" }, { name: "liste.xlsx", text: "a;b" }]);
    const last = withFiles("Und nun diese Datei.", [{ name: "neu.pdf", text: "Neuer Inhalt" }]);
    const messages = [user([{ type: "text", text: old }, pic, pic, pic]), assistant("Fertig."), user([{ type: "text", text: last }, pic])];
    const out = pruneAttachments(messages);

    const first = body(out[0]!);
    expect(first).toContain(FILE_NOTE("arbeitsblatt.docx"));
    expect(first).toContain(FILE_NOTE("liste.xlsx"));
    expect(first).toContain(IMAGE_NOTE(3));
    expect(first).toContain("Mach daraus ein Blatt.");
    expect(first).not.toMatch(/Zeile 1|Geheimtext|AAAA|a;b/);
    expect(out[1]).toBe(messages[1]);
    // The last turn is untouched, the very same object.
    expect(out[2]).toBe(messages[2]);
    expect(body(out[2]!)).toContain("Neuer Inhalt");
  });

  it("does not change what it was given", () => {
    const messages = [user([{ type: "text", text: withFiles("Frage", [{ name: "a.txt", text: "Inhalt" }]) }, pic]), assistant("ok"), user("Weiter")];
    const before = JSON.stringify(messages);
    pruneAttachments(messages);
    expect(JSON.stringify(messages)).toBe(before);
  });

  it("works for a message that is a plain string, and says one picture in the singular", () => {
    const out = pruneAttachments([user(withFiles("Frage", [{ name: "a.txt", text: "Inhalt" }])), assistant("ok"), user([pic, { type: "text", text: "x" }]), assistant("ok"), user("Weiter")]);
    const first = (out[0] as { content: string }).content;
    expect(first).toContain("Frage");
    expect(first).toContain(FILE_NOTE("a.txt"));
    expect(first).not.toContain("Inhalt");
    expect(body(out[2]!)).toContain(IMAGE_NOTE(1));
    expect(IMAGE_NOTE(1)).toBe("[Bild, nicht mehr im Gedächtnis]");
  });

  it("returns the same list when there is nothing to drop", () => {
    const messages = [user("Hallo"), assistant("Hi"), user([pic])];
    expect(pruneAttachments(messages)).toBe(messages);
    expect(pruneAttachments([user([pic])])).toEqual([user([pic])]);
  });

  it("leaves a summary note and normal text in older turns as they are", () => {
    const messages = [user([{ type: "text", text: "Zusammenfassung des bisherigen Gesprächs: ..." }, { type: "text", text: "Frage <datei> kein Block" }]), assistant("ok"), user("Weiter")];
    expect(pruneAttachments(messages)).toBe(messages);
  });
});

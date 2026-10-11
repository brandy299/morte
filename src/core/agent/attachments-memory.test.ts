import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { withFiles } from "../anhang/extract.ts";
import { createChatSession, type ChatEvent } from "./index.ts";
import { SYSTEM_PROMPT } from "./session.ts";
import { FILE_NOTE, IMAGE_NOTE } from "./prune.ts";

type Seen = { messages: unknown[] };

/** A session on a model with a given memory size. `seen` holds what the model got with every request. */
function make(contextWindow: number, summarize?: () => Promise<string>) {
  const faux = fauxProvider({ models: [{ id: "m", input: ["text", "image"], contextWindow }], tokensPerSecond: 0 });
  const seen: Seen[] = [];
  const reply = (context: { messages: unknown[] }) => {
    seen.push({ messages: JSON.parse(JSON.stringify(context.messages)) });
    return fauxAssistantMessage([fauxText("Antwort.")]);
  };
  faux.setResponses(Array.from({ length: 12 }, () => reply as never));
  const models = createModels();
  models.setProvider(faux.provider);
  const session = createChatSession({ provider: "x" }, { resolve: () => ({ models, model: faux.getModel() }), summarize: summarize ?? (async () => "- Stichpunkt") });
  return { session, seen, faux };
}

const file = (name: string, chars: number) => ({ name, text: `Inhalt von ${name}. `.repeat(Math.ceil(chars / 20)).slice(0, chars) });
const text = (m: unknown) => JSON.stringify((m as { content: unknown }).content);
const firstUser = (s: Seen) => s.messages.find((m) => (m as { role: string }).role === "user");
const events = async (run: (on: (e: ChatEvent) => void) => Promise<void>) => {
  const list: ChatEvent[] = [];
  await run((e) => list.push(e));
  return list;
};

describe("old attachments leave the model's memory", () => {
  it("replaces pictures and file text with notes one round later, once the memory is half full, and keeps the last rounds", async () => {
    // A memory of 24,000 tokens. The instructions and tool descriptions take about 8,000 (more tools, more tokens: raise the memory here when this grows), one file of 30,000 characters (7,500 tokens) the rest to more than half.
    const { session, seen } = make(24_000);
    await session.send(withFiles("Mach daraus ein Blatt.", [file("arbeitsblatt.docx", 30_000)]), () => {}, [{ data: "AAAA", mimeType: "image/png" }]);
    expect(text(firstUser(seen[0]!))).toContain("Inhalt von arbeitsblatt.docx");

    // The next round still sees the file: it is the last round that was finished, and the teacher may ask about it.
    await session.send("Mach Aufgabe 3 leichter.", () => {});
    expect(text(firstUser(seen[1]!))).toContain("Inhalt von arbeitsblatt.docx");
    expect(text(firstUser(seen[1]!))).not.toContain("nicht mehr im Gedächtnis");

    // One round later it is gone, a note stays.
    await session.send(withFiles("Und nun diese Datei.", [file("neu.pdf", 400)]), () => {});
    const third = seen[2]!;
    const old = text(firstUser(third));
    expect(old).toContain(FILE_NOTE("arbeitsblatt.docx"));
    expect(old).toContain(IMAGE_NOTE(1));
    expect(old).toContain("Mach daraus ein Blatt.");
    expect(old).not.toMatch(/Inhalt von arbeitsblatt|AAAA/);
    const users = third.messages.filter((m) => (m as { role: string }).role === "user");
    expect(text(users[1])).toContain("Mach Aufgabe 3 leichter."); // last finished round: untouched
    expect(text(users.at(-1))).toContain("Inhalt von neu.pdf"); // the new message: untouched
    expect(text(users.at(-1))).not.toContain("nicht mehr im Gedächtnis");
  });

  it("leaves everything alone while the memory is less than half full", async () => {
    const { session, seen } = make(200_000);
    await session.send(withFiles("Erste Frage", [file("a.docx", 30_000)]), () => {});
    await session.send("Zweite Frage", () => {});
    expect(text(firstUser(seen[1]!))).toContain("Inhalt von a.docx");
    expect(text(firstUser(seen[1]!))).not.toContain("nicht mehr im Gedächtnis");
  });

  it("tells the model what a note means, in the instructions", () => {
    expect(SYSTEM_PROMPT).toContain("[Anhang: name, nicht mehr im Gedächtnis]");
    expect(SYSTEM_PROMPT).toContain("[Bild, nicht mehr im Gedächtnis]");
    expect(SYSTEM_PROMPT).toMatch(/Rate dann nicht.*noch einmal anzuhängen/);
  });

  it("goes on after reopening: the notes are saved with the conversation", async () => {
    const first = make(24_000);
    await first.session.send(withFiles("Mach daraus ein Blatt.", [file("arbeitsblatt.docx", 30_000)]), () => {});
    await first.session.send("Danke, noch eine Frage dazu.", () => {});
    await first.session.send("Und noch eine.", () => {});
    const saved = JSON.parse(JSON.stringify(first.session.history()));
    expect(JSON.stringify(saved.messages)).toContain(FILE_NOTE("arbeitsblatt.docx"));
    expect(JSON.stringify(saved.messages)).not.toContain("Inhalt von arbeitsblatt");

    const second = make(24_000);
    second.session.restore(saved);
    await second.session.send("Und weiter.", () => {});
    const again = text(firstUser(second.seen[0]!));
    expect(again).toContain(FILE_NOTE("arbeitsblatt.docx"));
    expect(again).not.toContain("Inhalt von arbeitsblatt");
  });
});

describe("a message that is too big for the model", () => {
  // The 32,000 tokens that a server of your own gets by default.
  it("is turned down in plain German, and the model is never asked", async () => {
    const { session, faux } = make(32_000);
    const list = await events((on) => session.send(withFiles("Fass das zusammen.", [file("buch.txt", 40_000), file("zwei.txt", 40_000), file("drei.txt", 40_000)]), on));
    const error = list.find((e) => e.type === "error");
    expect(error).toMatchObject({ type: "error", message: expect.stringMatching(/zu viel auf einmal.*weniger oder kürzere Dateien/) });
    expect((error as { retryable?: boolean }).retryable).toBeUndefined();
    expect(list.at(-1)?.type).toBe("done");
    expect(faux.state.callCount).toBe(0);
  });

  it("lets through what fits, and a very large amount of pictures counts too", async () => {
    const ok = make(32_000);
    const fine = await events((on) => ok.session.send(withFiles("Fass das zusammen.", [file("a.txt", 40_000)]), on));
    expect(fine.some((e) => e.type === "error")).toBe(false);
    expect(ok.faux.state.callCount).toBe(1);

    const pics = make(16_000);
    const many = Array.from({ length: 8 }, () => ({ data: "AAAA", mimeType: "image/png" }));
    const list = await events((on) => pics.session.send("Was siehst du?", on, many)); // 8 pictures, about 9,600 tokens
    expect(list.find((e) => e.type === "error")).toMatchObject({ message: expect.stringContaining("zu viel auf einmal") });
    expect(pics.faux.state.callCount).toBe(0);
  });

  it("makes room by summarizing when the old turns and the new message do not fit together", async () => {
    let summaries = 0;
    const { session, seen } = make(24_000, async () => (summaries++, "- Stichpunkt"));
    await session.send("Erste lange Nachricht. ".repeat(700), () => {}); // about 4,000 tokens
    await session.send("Zweite lange Nachricht. ".repeat(700), () => {});
    const list = await events((on) => session.send(`Dritte, größere Nachricht. ${"Text ".repeat(4800)}`, on)); // about 6,000 tokens: fits alone, not with the rest
    expect(list.some((e) => e.type === "error")).toBe(false);
    expect(summaries).toBe(1);
    expect(text(seen.at(-1)!.messages.filter((m) => (m as { role: string }).role === "user").at(-1))).toContain("Dritte, größere Nachricht");
  });
});

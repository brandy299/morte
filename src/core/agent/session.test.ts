import { describe, expect, it } from "vitest";
import { createChatSession } from "./index.ts";
import type { ChatEvent } from "./index.ts";

describe("chat session (demo model)", () => {
  it("streams text, reports the tool step, and finishes", async () => {
    const session = createChatSession({ provider: "demo" });
    const events: ChatEvent[] = [];
    await session.send("Hallo", (e) => events.push(e));

    const types = events.map((e) => e.type);
    expect(types).toContain("step_start");
    expect(types).toContain("step_end");
    expect(types.at(-1)).toBe("done");
    const start = events.find((e) => e.type === "step_start");
    expect(start).toMatchObject({ label: "Datum nachsehen" });
    const text = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
    expect(text).toContain("Demo-Modus");
  });

  it("can answer a second message", async () => {
    const session = createChatSession({ provider: "demo" });
    await session.send("Eins", () => {});
    const events: ChatEvent[] = [];
    await session.send("Zwei", (e) => events.push(e));
    expect(events.some((e) => e.type === "text")).toBe(true);
    expect(events.some((e) => e.type === "error")).toBe(false);
  });
});

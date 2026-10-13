import { describe, expect, it } from "vitest";
import type { ConversationInfo } from "./api.ts";
import { gruppiere } from "./projekte.ts";

const c = (id: string, projekt?: string): ConversationInfo => ({ id, titel: id, aktualisiert: "2026-10-14", ...(projekt ? { projekt } : {}) });

describe("gruppiere", () => {
  it("puts conversations into their folders and keeps the newest-first order inside", () => {
    const g = gruppiere([c("1", "Mathe"), c("2"), c("3", "Mathe"), c("4", "Englisch")]);
    expect(g.projekte.map((p) => p.name)).toEqual(["Englisch", "Mathe"]);
    expect(g.projekte[1]!.gespraeche.map((x) => x.id)).toEqual(["1", "3"]);
    expect(g.ohne.map((x) => x.id)).toEqual(["2"]);
  });
  it("sorts folder names the German way and gives empty lists for no conversations", () => {
    expect(gruppiere([c("1", "Zeugnisse"), c("2", "Ärzte")]).projekte.map((p) => p.name)).toEqual(["Ärzte", "Zeugnisse"]);
    expect(gruppiere([])).toEqual({ projekte: [], ohne: [] });
  });
});

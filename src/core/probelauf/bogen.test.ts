import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { DATENSCHUTZ_SATZ, FRAGEN, rueckmeldebogenWord } from "./bogen.ts";

describe("feedback sheet for the trial run", () => {
  it("has the seven questions of the issue and the privacy sentence", async () => {
    const { value } = await mammoth.extractRawText({ buffer: await rueckmeldebogenWord() });
    for (const q of ["Was wolltest du erstellen?", "Hast du das Ergebnis so verwendet?", "Was musstest du ändern?", "Hat Pult unnötig nachgefragt?", "Gab es etwas, das du nicht verstanden hast?", "Würdest du Pult nächste Woche wieder benutzen?", "Was hast du vermisst?"]) {
      expect(value, q).toContain(q);
    }
    for (const a of ["Arbeitsblatt", "ja, mit großen Änderungen", "nie", "vielleicht", "Windows"]) expect(value).toContain(a);
    expect(value).toContain("Keine Schülernamen, keine Noten");
    expect(value.split(DATENSCHUTZ_SATZ).length - 1).toBeGreaterThanOrEqual(2); // on top and at the end, next to what is to be sent
    expect(FRAGEN).toHaveLength(8); // seven questions of the issue plus "what did you work with"
  });

  it("has a ticking box for every answer, and fields to write in", async () => {
    const zip = unzipSync(new Uint8Array(await rueckmeldebogenWord()));
    const xml = new TextDecoder().decode(zip["word/document.xml"]);
    const answers = FRAGEN.reduce((n, f) => n + (f.auswahl?.length ?? 0), 0);
    expect(xml.match(/<w14:checkbox>/g)!.length).toBe(answers);
    expect(xml.match(/<w:tbl>/g)!.length).toBe(FRAGEN.filter((f) => f.frei).length);
  });

  it("is the same as the file in docs/ (run `npm run bogen` after a change)", async () => {
    const text = async (buffer: Buffer) => (await mammoth.extractRawText({ buffer })).value;
    expect(await text(await readFile(new URL("../../../docs/probelauf-rueckmeldebogen.docx", import.meta.url)))).toBe(await text(await rueckmeldebogenWord()));
  });
});

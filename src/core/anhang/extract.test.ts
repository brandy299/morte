import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph } from "docx";
import { strToU8, zipSync } from "fflate";
import * as XLSX from "xlsx";
import { AnhangError, extractFile } from "./extract.ts";

const buf = (s: string) => Buffer.from(s, "utf8");

function sheet(type: XLSX.BookType) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["Aufgabe", "Punkte"], ["Brief schreiben", 12], ["Hörverstehen", 8]]), "Test");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["zweites"]]), "Zweit");
  return Buffer.from(XLSX.write(book, { type: "buffer", bookType: type }));
}

describe("extractFile", () => {
  it("reads plain text, markdown and csv (also Windows-1252)", async () => {
    expect((await extractFile(buf("Hallo Welt"), "a.txt")).text).toBe("Hallo Welt");
    expect((await extractFile(buf("# Titel"), "a.md")).text).toBe("# Titel");
    const latin = Buffer.from([0x4e, 0x61, 0x6d, 0x65, 0x3b, 0xe4, 0x0a, 0x31, 0x3b, 0x32]); // "Name;ä\n1;2"
    expect((await extractFile(latin, "t.csv")).text).toContain("Name;ä");
  });

  it("reads docx", async () => {
    const doc = new Document({ sections: [{ children: [new Paragraph("Bewerbung schreiben")] }] });
    const r = await extractFile(await Packer.toBuffer(doc), "x.docx");
    expect(r.art).toBe("Word");
    expect(r.text).toContain("Bewerbung schreiben");
  });

  it.each(["xlsx", "xls", "ods"] as const)("reads %s sheets", async (type) => {
    const r = await extractFile(sheet(type), `t.${type}`);
    expect(r.art).toBe("Tabelle");
    expect(r.info).toBe("2 Blätter");
    expect(r.text).toContain("Blatt: Test");
    expect(r.text).toContain("Brief schreiben | 12");
    expect(r.text).toContain("Blatt: Zweit");
  });

  it("cuts long spreadsheets", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => [`Zeile ${i}`]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "Lang");
    const r = await extractFile(Buffer.from(XLSX.write(book, { type: "buffer", bookType: "xlsx" })), "l.xlsx");
    expect(r.text).toContain("weitere Zeilen nicht gezeigt");
    expect(r.text).not.toContain("Zeile 300");
  });

  it("reads odt with entities and line breaks", async () => {
    const xml = `<office:document-content><office:automatic-styles><style:style>Stil</style:style></office:automatic-styles><office:body><text:h>Titel &amp; Co</text:h><text:p>Eins<text:line-break/>Zwei<text:s/>drei</text:p></office:body></office:document-content>`;
    const r = await extractFile(Buffer.from(zipSync({ "content.xml": strToU8(xml) })), "a.odt");
    expect(r.text).toBe("Titel & Co\nEins\nZwei drei");
  });

  it("reads odp and pptx slide by slide", async () => {
    const odp = Buffer.from(zipSync({ "content.xml": strToU8(`<draw:page draw:name="a"><text:p>Erste</text:p></draw:page><draw:page draw:name="b"><text:p>Zweite</text:p></draw:page>`) }));
    const a = await extractFile(odp, "p.odp");
    expect(a.info).toBe("2 Folien");
    expect(a.text).toContain("Folie 2\nZweite");
    const pptx = Buffer.from(zipSync({
      "ppt/slides/slide10.xml": strToU8("<p:sld><a:p><a:r><a:t>Zehn</a:t></a:r></a:p></p:sld>"),
      "ppt/slides/slide2.xml": strToU8("<p:sld><a:p><a:r><a:t>Zwei</a:t></a:r></a:p></p:sld>"),
    }));
    const b = await extractFile(pptx, "p.pptx");
    expect(b.text.indexOf("Zwei")).toBeLessThan(b.text.indexOf("Zehn"));
  });

  it("reads html and rtf", async () => {
    const h = await extractFile(buf("<html><head><title>x</title></head><body><script>bad()</script><p>Eins &amp; zwei</p><p>Drei</p></body></html>"), "a.html");
    expect(h.text).toBe("Eins & zwei\nDrei");
    const r = await extractFile(buf("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0 Gr\\'fc\\'dfe\\par Zweite Zeile}"), "a.rtf");
    expect(r.text).toContain("Grüße");
    expect(r.text).toContain("Zweite Zeile");
  });

  it("refuses with a plain message", async () => {
    await expect(extractFile(buf("x"), "alt.doc")).rejects.toThrow(/\.docx/);
    await expect(extractFile(buf("x"), "a.exe")).rejects.toThrow(AnhangError);
    await expect(extractFile(Buffer.alloc(0), "a.txt")).rejects.toThrow(/leer/);
    await expect(extractFile(buf("kaputt"), "a.odt")).rejects.toThrow(/nicht öffnen/);
    await expect(extractFile(buf("   "), "a.txt")).rejects.toThrow(/kein lesbarer Text/);
  });

  it("shortens very long text", async () => {
    const r = await extractFile(buf("wort ".repeat(10000)), "l.txt");
    expect(r.gekuerzt).toBe(true);
    expect(r.text).toContain("gekürzt");
  });
});

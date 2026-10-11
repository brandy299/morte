import { unzipSync } from "fflate";

/** What the program can read from a produced .pptx, so checks can decide without looking at the layout. */
export interface PptxInfo {
  /** The page is 16:9. */
  breit: boolean;
  folien: PptxFolie[];
}

export interface PptxFolie {
  /** All text on the slide, one entry per paragraph. */
  absaetze: string[];
  /** Paragraphs with a bullet sign (the points). */
  punkte: number;
  bilder: number;
  /** Speaker notes, empty when there are none. */
  notizen: string;
  /** A divider slide: its accent bar sits in the middle of the page, not at the top. */
  abschnitt: boolean;
}

const utf8 = (b: Uint8Array) => new TextDecoder().decode(b);
const num = (name: string) => parseInt(name.replace(/\D/g, ""), 10);

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** Paragraph texts of one XML part. Only `<a:t>` runs count, so shape names and layout data stay out. */
function paragraphs(xml: string): { text: string; bullet: boolean }[] {
  return [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)]
    .map((m) => ({ text: decode([...m[1]!.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => t[1]).join("")).trim(), bullet: /<a:buChar\b/.test(m[1]!) }))
    .filter((p) => p.text);
}

/** Speaker notes sit in the body placeholder of the notes page, not in the slide number next to it. */
function notes(xml: string): string {
  const body = [...xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)].find((m) => /<p:ph type="body"/.test(m[1]!));
  return body ? paragraphs(body[1]!).map((p) => p.text).join("\n") : "";
}

export function lesePptx(buf: Buffer): PptxInfo {
  const files = unzipSync(buf, { filter: (f) => /^ppt\/(slides\/slide\d+\.xml|notesSlides\/notesSlide\d+\.xml|presentation\.xml|slides\/_rels\/slide\d+\.xml\.rels)$/.test(f.name) });
  const size = /<p:sldSz cx="(\d+)" cy="(\d+)"/.exec(utf8(files["ppt/presentation.xml"] ?? new Uint8Array()));
  const breit = !!size && Math.abs(Number(size[1]) / Number(size[2]) - 16 / 9) < 0.01;
  const slides = Object.keys(files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => num(a) - num(b));
  const folien = slides.map((name): PptxFolie => {
    const xml = utf8(files[name]!);
    const rels = utf8(files[`ppt/slides/_rels/slide${num(name)}.xml.rels`] ?? new Uint8Array());
    const noteFile = /Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/.exec(rels)?.[1];
    const ps = paragraphs(xml);
    return {
      absaetze: ps.map((p) => p.text),
      punkte: ps.filter((p) => p.bullet).length,
      // A diagram is made of many shapes that Pult names "Schaubild": together they count as one picture.
      bilder: (xml.match(/<p:pic>/g) ?? []).length + (/<p:cNvPr id="\d+" name="Schaubild"/.test(xml) ? 1 : 0),
      notizen: noteFile ? notes(utf8(files[`ppt/notesSlides/${noteFile}`] ?? new Uint8Array())) : "",
      // Pult draws the accent bar of a divider slide at 200 pt (2540000 EMU) from the top, content slides at 40 pt.
      abschnitt: /<a:off x="\d+" y="2540000"\/>/.test(xml),
    };
  });
  return { breit, folien };
}

/** Text for the judge: slide by slide, with the notes and the number of pictures, which the plain text of a .pptx leaves out. */
export function pptxText(info: PptxInfo): string {
  return info.folien
    .map((f, i) => `Folie ${i + 1}${f.abschnitt ? " (Abschnitt)" : ""}${f.bilder ? ` [${f.bilder} Bild${f.bilder > 1 ? "er" : ""}/Schaubild]` : ""}\n${f.absaetze.join("\n")}\nNotizen: ${f.notizen || "(keine)"}`)
    .join("\n\n");
}

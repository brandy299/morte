import { existsSync, readFileSync } from "node:fs";
import { markdownZuHtml } from "./anleitung.tsx";

/** The guides for testers: the Markdown in docs/ and the single HTML file each one becomes. */
export const ANLEITUNGEN = [
  { quelle: "docs/anleitung-tester.md", ziel: "Anleitung.html", titel: "Pult: Anleitung" },
  { quelle: "docs/openrouter-anleitung.md", ziel: "OpenRouter einrichten.html", titel: "Pult: OpenRouter einrichten" },
];

const zielVon = (href: string) => ANLEITUNGEN.find((a) => a.quelle.endsWith(`/${href}`))?.ziel;

/** The guides as HTML, pictures inside, links between them pointing to the HTML files. Run in the project folder. */
export function anleitungenBauen(): { ziel: string; data: Uint8Array }[] {
  return ANLEITUNGEN.map((a) => {
    const html = markdownZuHtml(readFileSync(a.quelle, "utf8"), {
      titel: a.titel,
      bild: (src) => {
        const file = `docs/${src}`;
        return existsSync(file) ? `data:image/png;base64,${readFileSync(file).toString("base64")}` : undefined;
      },
      link: zielVon,
    });
    return { ziel: a.ziel, data: Buffer.from(html, "utf8") };
  });
}

import { describe, expect, it } from "vitest";
import { markdownZuHtml } from "./anleitung.tsx";

const md = "# Titel\n\nText mit `code` und [OpenRouter](openrouter-anleitung.md) und [extern](https://openrouter.ai).\n\n![Startseite](bilder/a.png)\n\n```\nnpm start\n```\n";
const html = markdownZuHtml(md, {
  titel: "Anleitung <Pult>",
  bild: (src) => (src === "bilder/a.png" ? "data:image/png;base64,AAAA" : undefined),
  link: (href) => (href === "openrouter-anleitung.md" ? "OpenRouter einrichten.html" : undefined),
});

describe("markdownZuHtml", () => {
  it("makes a complete page with a safe title", () => {
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain("<title>Anleitung &lt;Pult&gt;</title>");
    expect(html).toContain("<h1>Titel</h1>");
    expect(html).toContain("<code>code</code>");
  });
  it("embeds the picture so the file works alone", () => {
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).not.toContain("bilder/a.png");
  });
  it("points links to the other guide and leaves outside links alone", () => {
    expect(html).toContain('href="OpenRouter einrichten.html"');
    expect(html).toContain('href="https://openrouter.ai"');
  });
});

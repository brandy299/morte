/**
 * Turns the guides for testers (Markdown) into single HTML files that open in any browser by double click, pictures included.
 * A Markdown file shows as raw text in Notepad, and a teacher should not meet that.
 */
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";

export interface HtmlOptionen {
  titel: string;
  /** The inline data of a picture for its path in the Markdown, or undefined to keep the path. */
  bild: (src: string) => string | undefined;
  /** The new address for a link to another guide, or undefined to keep it. */
  link: (href: string) => string | undefined;
}

const CSS = `
:root { color-scheme: light; }
body { margin: 0; background: #f2eee6; color: #1f1a15; font: 17px/1.6 "Source Sans 3", "Segoe UI", system-ui, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; background: #fbf8f1; min-height: 100vh; box-sizing: border-box; }
h1, h2, h3 { font-family: Fraunces, Georgia, "Times New Roman", serif; line-height: 1.25; }
h1 { font-size: 2rem; margin: 0 0 12px; }
h2 { font-size: 1.5rem; margin: 36px 0 8px; }
h3 { font-size: 1.2rem; margin: 28px 0 6px; }
a { color: #a3441f; }
code { background: #efe8da; border-radius: 4px; padding: 1px 6px; font-size: 0.92em; }
pre { background: #efe8da; border-radius: 8px; padding: 12px 14px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { margin: 12px 0; padding: 4px 16px; border-left: 3px solid #b4532a; background: #f4ece0; }
img { max-width: 100%; height: auto; border: 1px solid #ddd3c2; border-radius: 8px; margin: 8px 0; }
hr { border: 0; border-top: 1px solid #ddd3c2; margin: 32px 0; }
li { margin: 4px 0; }
@media print { body { background: #fff; } main { background: #fff; } a { color: inherit; } }
`;

/** One finished HTML page from one Markdown text. */
export function markdownZuHtml(markdown: string, o: HtmlOptionen): string {
  const body = renderToStaticMarkup(
    <Markdown
      components={{
        img: ({ src, alt }) => <img src={(typeof src === "string" && o.bild(src)) || (typeof src === "string" ? src : undefined)} alt={alt ?? ""} />,
        a: ({ href, children }) => {
          const target = typeof href === "string" ? (o.link(href) ?? href) : undefined;
          return <a href={target}>{children}</a>;
        },
      }}
    >
      {markdown}
    </Markdown>,
  );
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(o.titel)}</title><style>${CSS}</style></head><body><main>${body}</main></body></html>\n`;
}

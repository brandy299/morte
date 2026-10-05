import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { MARGIN, MaterialError } from "./arbeitsblatt.ts";

/** Chromium comes from `npx playwright install chromium`. MORTE_CHROMIUM can point to another install. */
function chromiumPath(): string | undefined {
  const custom = process.env.MORTE_CHROMIUM;
  if (custom) return custom;
  const own = chromium.executablePath();
  return existsSync(own) ? own : undefined;
}

export const pdfAvailable = () => chromiumPath() !== undefined;

export async function renderPdf(html: string, footer = ""): Promise<{ pdf: Buffer; pages: number }> {
  const executablePath = chromiumPath();
  if (!executablePath) throw new MaterialError("Zum Erstellen von PDFs fehlt noch ein Baustein auf diesem Computer. Bitte sag der Person, die morte eingerichtet hat, Bescheid.");
  const browser = await chromium.launch({ executablePath });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = Buffer.from(await page.pdf({
        format: "A4",
        printBackground: true,
        margin: MARGIN,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: footer || "<span></span>",
      }));
    // Rough but dependable page count: every page object is tagged /Type /Page.
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
    return { pdf, pages };
  } finally {
    await browser.close();
  }
}

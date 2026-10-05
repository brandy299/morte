import PDFDocument from "pdfkit";

/** Builds small PDFs for tests: a plan with header, footer, headings, bullets and a two-column table. */
export async function samplePlan(opts: { pages?: number; scanPage?: Buffer } = {}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 72, bottom: 72, left: 71, right: 71 }, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((r) => doc.on("end", r));
  const pages = opts.pages ?? 4;
  for (let p = 1; p <= pages; p++) {
    if (p > 1) doc.addPage();
    doc.font("Helvetica").fontSize(10).text("Ministerium für Schule und Weiterbildung", 71, 50, { lineBreak: false });
    doc.text(`Seite ${p} von ${pages}`, 455, 800, { lineBreak: false });
    if (opts.scanPage && p === pages) {
      doc.image(opts.scanPage, 71, 100, { width: 450 });
      continue;
    }
    doc.font("Helvetica-Bold").fontSize(16).text(`${p}. Kurshalbjahr ${p}`, 71, 100);
    doc.font("Helvetica").fontSize(11).text("Der Unterricht fördert die kommunikative Kompetenz der Schülerinnen und Schüler. Sie erwerben Fertigkeiten zur Bewäl-", 71, 140, { width: 453 });
    doc.text("tigung beruflicher Situationen.", 71, doc.y);
    doc.font("Helvetica-Bold").fontSize(13).text("Kursthema: The experience of work", 71, 210);
    doc.font("Helvetica-Bold").fontSize(11).text("Themen", 71, 240).text("Hinweise", 296, 240);
    // Left column wraps tightly against the right column, like in the real plans.
    doc.font("Helvetica").fontSize(11);
    doc.text("- Choosing a career (motivations, holiday jobs, work placements)", 71, 262, { width: 215 });
    doc.text("Einführung in die situations- und adres-", 296, 262, { width: 215 });
    doc.text("satenbezogene Textproduktion", 296, 276, { width: 215 });
    doc.text("- Commercial Correspondence", 71, 330, { width: 215 });
    doc.text("Hörverstehen", 296, 330, { width: 215 });
  }
  doc.end();
  await done;
  return Buffer.concat(chunks);
}

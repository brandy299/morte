declare module "svg-to-pdfkit" {
  interface Options {
    width?: number;
    height?: number;
    assumePt?: boolean;
    preserveAspectRatio?: string;
    fontCallback?: (family: string, bold: boolean, italic: boolean, fontOptions: unknown) => string;
    colorCallback?: (color: [number[], number]) => [number[], number];
  }
  /** Draws an SVG document into a pdfkit document as vector graphics. */
  export default function SVGtoPDF(doc: PDFKit.PDFDocument, svg: string, x: number, y: number, options?: Options): void;
}

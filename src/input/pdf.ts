import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { canvasToPicture, fitWithin, type PagePicture } from './image';
import { hasTextLayer, pageText } from './pdfText';

/**
 * Opening a PDF in this browser.
 *
 * The PDF library and its worker are part of the files this app is served
 * with; nothing is fetched from anywhere else, and the PDF is handed over as
 * bytes already in memory. A page that contains its text is read exactly. A
 * page that is only a scan is drawn to a canvas and goes the same way as a
 * photo.
 */

export type LetterPage = { kind: 'text'; text: string } | ({ kind: 'picture' } & PagePicture);

/** A letter is a few pages. Beyond this the rest is left out, and the reader is told. */
export const MAX_PAGES = 8;

export interface OpenedPdf {
  pages: LetterPage[];
  /** How many pages the PDF has; more than `pages.length` when some were left out. */
  totalPages: number;
}

export async function readPdf(data: ArrayBuffer): Promise<OpenedPdf> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data, useWorkerFetch: false, useWasm: false });
  try {
    const pdf = await task.promise;
    const pages: LetterPage[] = [];
    for (let number = 1; number <= Math.min(pdf.numPages, MAX_PAGES); number++) {
      const page = await pdf.getPage(number);
      const text = await pageText(page);
      if (hasTextLayer(text)) {
        pages.push({ kind: 'text', text });
        continue;
      }
      const natural = page.getViewport({ scale: 1 });
      // Scans are drawn at twice their nominal size so small print survives, then held to the model's limit.
      const { width } = fitWithin(natural.width * 2, natural.height * 2);
      const viewport = page.getViewport({ scale: width / natural.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      pages.push({ kind: 'picture', ...(await canvasToPicture(canvas)) });
    }
    return { pages, totalPages: pdf.numPages };
  } finally {
    await task.destroy();
  }
}

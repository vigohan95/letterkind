import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { ACCEPTED_FILES, kindOfFile } from '../../src/input/files';
import { blobToBase64, fitWithin, MAX_SIDE } from '../../src/input/image';
import { hasTextLayer, layoutText, MIN_TEXT_CHARS, pageText, type PlacedText } from '../../src/input/pdfText';
import { PagePictures, Transcribing } from '../../src/ui/Pages';

const at = (text: string, x: number, y: number, width = text.length * 6, height = 12): PlacedText => ({ text, x, y, width, height });

/** A one-font PDF with the given content stream on each page, written by hand so the test needs no fixture file. */
function buildPdf(pages: string[]): Uint8Array {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  pages.forEach((content, i) => {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

const line = (text: string, x: number, y: number): string => `BT /F1 12 Tf ${x} ${y} Td (${text}) Tj ET`;

describe('layoutText', () => {
  it('reads top to bottom and left to right, whatever order the fragments were stored in', () => {
    const text = layoutText([at('Amount due:', 72, 120), at('$1,284.50', 150, 120), at('Notice of Balance Due', 72, 100), at('Pay by', 72, 140)]);
    expect(text).toBe('Notice of Balance Due\nAmount due: $1,284.50\nPay by');
  });

  it('keeps fragments on one line when their baselines differ by less than half a line', () => {
    expect(layoutText([at('Total', 72, 100), at('$40.00', 300, 103)])).toBe('Total $40.00');
  });

  it('does not put a space inside a word that was stored in pieces', () => {
    expect(layoutText([at('Depart', 72, 100, 36), at('ment', 108, 100, 24)])).toBe('Department');
  });

  it('does not double a space the fragments already carry', () => {
    expect(layoutText([at('Dear ', 72, 100, 30), at('Ms Ortiz', 110, 100)])).toBe('Dear Ms Ortiz');
  });

  it('marks a paragraph break where the gap is wider than a line', () => {
    expect(layoutText([at('First paragraph.', 72, 100), at('Still the first.', 72, 114), at('Second paragraph.', 72, 150)])).toBe(
      'First paragraph.\nStill the first.\n\nSecond paragraph.',
    );
  });

  it('ignores empty fragments and copes with fragments that report no height', () => {
    expect(layoutText([at('', 0, 0), at('   ', 10, 10), at('Only line', 72, 100, 54, 0)])).toBe('Only line');
    expect(layoutText([])).toBe('');
  });

  it('never changes a digit', () => {
    const text = layoutText([at('Claim 4471-0092-A', 72, 100), at('Due 03/14/2027', 72, 114), at('$1,284.50', 300, 114)]);
    expect(text).toBe('Claim 4471-0092-A\nDue 03/14/2027 $1,284.50');
  });
});

describe('hasTextLayer', () => {
  it('needs more than a stray page number', () => {
    expect(hasTextLayer('')).toBe(false);
    expect(hasTextLayer('Page 1 of 2')).toBe(false);
    expect(hasTextLayer('x'.repeat(MIN_TEXT_CHARS))).toBe(true);
    expect(hasTextLayer(' x '.repeat(MIN_TEXT_CHARS - 1))).toBe(false);
  });
});

describe('pageText', () => {
  it('turns PDF coordinates the right way up and skips what is not text', async () => {
    const page = {
      getViewport: () => ({ transform: [1, 0, 0, -1, 0, 792] }),
      getTextContent: () =>
        Promise.resolve({
          items: [
            { type: 'beginMarkedContent' },
            { str: 'lower line', transform: [12, 0, 0, 12, 72, 600], width: 60, height: 12 },
            { str: 'upper line', transform: [12, 0, 0, 12, 72, 700], width: 60, height: 12 },
            null,
          ],
        }),
    };
    expect(await pageText(page)).toBe('upper line\n\nlower line');
  });

  it('follows the rotation of the page', async () => {
    // A page turned a quarter: what PDF calls x runs down the screen.
    const page = {
      getViewport: () => ({ transform: [0, 1, 1, 0, 0, 0] }),
      getTextContent: () =>
        Promise.resolve({
          items: [
            { str: 'second', transform: [0, 12, -12, 0, 114, 72], width: 40, height: 12 },
            { str: 'first', transform: [0, 12, -12, 0, 100, 72], width: 30, height: 12 },
          ],
        }),
    };
    expect(await pageText(page)).toBe('first\nsecond');
  });

  it('reads a real PDF with the PDF library, and finds no text on an empty page', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = buildPdf([
      [line('Amount due: $1,284.50', 72, 700), line('Notice of Balance Due', 72, 720), line('Pay by March 14, 2027', 72, 640), line('Ref 4471-0092-A', 400, 720)].join('\n'),
      '',
    ]);
    const task = pdfjs.getDocument({ data, useWorkerFetch: false, useWasm: false, useSystemFonts: false, verbosity: 0 });
    try {
      const pdf = await task.promise;
      expect(pdf.numPages).toBe(2);
      const first = await pageText(await pdf.getPage(1));
      expect(first).toBe('Notice of Balance Due Ref 4471-0092-A\nAmount due: $1,284.50\n\nPay by March 14, 2027');
      expect(hasTextLayer(first)).toBe(true);
      const second = await pageText(await pdf.getPage(2));
      expect(second).toBe('');
      expect(hasTextLayer(second)).toBe(false);
    } finally {
      await task.destroy();
    }
  });
});

describe('fitWithin', () => {
  it('leaves a picture that is already small enough alone', () => {
    expect(fitWithin(1240, 1600)).toEqual({ width: 1240, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales a large picture down by its longest side, keeping its shape', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_SIDE, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: MAX_SIDE });
    expect(fitWithin(2480, 3508, 1000)).toEqual({ width: 707, height: 1000 });
  });

  it('never returns a side of zero', () => {
    expect(fitWithin(100000, 10)).toEqual({ width: MAX_SIDE, height: 1 });
  });
});

describe('blobToBase64', () => {
  it('encodes bytes exactly, including more than one chunk of them', async () => {
    expect(await blobToBase64(new Blob([new Uint8Array([0, 255, 16, 128])]))).toBe('AP8QgA==');
    const big = new Uint8Array(100_000).map((_, i) => i % 251);
    expect(await blobToBase64(new Blob([big]))).toBe(Buffer.from(big).toString('base64'));
    expect(await blobToBase64(new Blob([]))).toBe('');
  });
});

describe('kindOfFile', () => {
  it('tells PDFs, pictures and text apart by type, or by name when the type is missing', () => {
    expect(kindOfFile({ type: 'application/pdf', name: 'letter' })).toBe('pdf');
    expect(kindOfFile({ type: '', name: 'Scan 0042.PDF' })).toBe('pdf');
    expect(kindOfFile({ type: 'image/jpeg', name: 'IMG_1.jpg' })).toBe('picture');
    expect(kindOfFile({ type: 'IMAGE/PNG', name: 'shot.png' })).toBe('picture');
    expect(kindOfFile({ type: 'image/webp', name: 'a.webp' })).toBe('picture');
    expect(kindOfFile({ type: 'text/plain', name: 'letter.txt' })).toBe('text');
    expect(kindOfFile({ type: '', name: 'letter.txt' })).toBe('text');
  });

  it('refuses what the app cannot open', () => {
    expect(kindOfFile({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'letter.docx' })).toBe('unsupported');
    expect(kindOfFile({ type: 'image/heic', name: 'IMG_2.heic' })).toBe('unsupported');
    expect(kindOfFile({ type: 'image/svg+xml', name: 'a.svg' })).toBe('unsupported');
    expect(kindOfFile({ type: '', name: 'letter' })).toBe('unsupported');
  });

  it('offers in the file picker only kinds it can open', () => {
    for (const entry of ACCEPTED_FILES.split(',')) {
      const asFile = entry.startsWith('.') ? { type: '', name: `x${entry}` } : { type: entry, name: 'x' };
      expect(kindOfFile(asFile), entry).not.toBe('unsupported');
    }
  });
});

describe('the pictures of a letter on the page', () => {
  it('shows each page with a description, and nothing when there are none', () => {
    const html = renderToStaticMarkup(<PagePictures previews={['blob:a', 'blob:b']} t={en} />);
    expect(html).toContain('<img src="blob:a" alt="Page 1 of your letter"/>');
    expect(html).toContain('<img src="blob:b" alt="Page 2 of your letter"/>');
    expect(renderToStaticMarkup(<PagePictures previews={[]} t={en} />)).toBe('');
  });

  it('shows the text beside the picture while it is being copied', () => {
    const html = renderToStaticMarkup(<Transcribing previews={['blob:a', 'blob:b']} page={2} pages={2} text={'Dear Ms Ortiz,\n<b>'} t={en} />);
    expect(html).toContain('Copying out page 2 of 2, on this device…');
    expect(html).toContain('role="status"');
    expect(html).toContain('<pre class="transcript">Dear Ms Ortiz,\n&lt;b&gt;</pre>');
    expect(html).toContain('alt="Page 1 of your letter"');
  });

  it('says so plainly when there is one picture and no text yet', () => {
    const html = renderToStaticMarkup(<Transcribing previews={['blob:a']} page={1} pages={1} text="" t={en} />);
    expect(html).toContain('Copying out the text of the picture, on this device…');
    expect(html).not.toContain('<pre');
  });
});

describe('what the reader is told about a copied letter', () => {
  it('says the later checks are against the copied text, not the picture', () => {
    expect(en.input.fromPicture(43_200)).toContain('in 43 seconds');
    expect(en.input.fromPicture(43_200)).toContain('checked against this text, not against the picture');
  });

  it('says which pages were left out', () => {
    expect(en.input.leftOut(1, 8)).toBe('The last page was left out: Letterkind reads the first 8 pages.');
    expect(en.input.leftOut(3, 8)).toBe('The last 3 pages were left out: Letterkind reads the first 8 pages.');
  });

  it('says a file is opened here and not uploaded', () => {
    expect(en.input.addNote).toContain('not uploaded');
  });
});

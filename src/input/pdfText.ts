/**
 * The text of a PDF page, laid out the way it reads on paper.
 *
 * A PDF stores text as loose fragments with coordinates, in whatever order
 * the program that made it wrote them. This module puts them back into lines,
 * top to bottom and left to right, using nothing but their positions. It
 * never sees a model: a PDF that already contains its text is read exactly,
 * and only a page with no text in it is treated as a picture.
 */

/** One fragment of text, placed on the page. `y` is the baseline, measured downwards from the top. */
export interface PlacedText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

export function layoutText(fragments: readonly PlacedText[]): string {
  const usable = fragments.filter((f) => f.text.trim() !== '');
  if (usable.length === 0) return '';
  const typical = median(usable.map((f) => f.height).filter((h) => h > 0)) || 10;
  const sized = usable.map((f) => ({ ...f, height: f.height > 0 ? f.height : typical }));

  // Lines: fragments whose baselines are within half a line of each other.
  const lines: { y: number; height: number; parts: PlacedText[] }[] = [];
  for (const fragment of [...sized].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(fragment.y - line.y) <= 0.5 * Math.max(line.height, fragment.height)) {
      line.parts.push(fragment);
      line.height = Math.max(line.height, fragment.height);
    } else {
      lines.push({ y: fragment.y, height: fragment.height, parts: [fragment] });
    }
  }

  let out = '';
  let previous: { y: number; height: number } | undefined;
  for (const line of lines) {
    if (previous) out += line.y - previous.y > 1.8 * Math.max(previous.height, line.height) ? '\n\n' : '\n';
    let text = '';
    let end = 0;
    for (const part of [...line.parts].sort((a, b) => a.x - b.x)) {
      const gap = part.x - end;
      if (text !== '' && gap > 0.2 * part.height && !/\s$/.test(text) && !/^\s/.test(part.text)) text += ' ';
      text += part.text;
      end = part.x + part.width;
    }
    out += text.replace(/\s+/g, ' ').trim();
    previous = line;
  }
  return out;
}

/** A page counts as having its own text when there is more of it than a stray page number or stamp. */
export const MIN_TEXT_CHARS = 20;

export function hasTextLayer(text: string): boolean {
  return text.replace(/\s/g, '').length >= MIN_TEXT_CHARS;
}

/** The parts of a PDF library's page object this module relies on. */
export interface PdfPageLike {
  getViewport(options: { scale: number }): { transform: number[] };
  getTextContent(): Promise<{ items: unknown[] }>;
}

interface RawItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

const isRawItem = (item: unknown): item is RawItem =>
  typeof item === 'object' &&
  item !== null &&
  typeof (item as RawItem).str === 'string' &&
  Array.isArray((item as RawItem).transform) &&
  typeof (item as RawItem).width === 'number' &&
  typeof (item as RawItem).height === 'number';

/** The text of one page, or '' when the page has none. */
export async function pageText(page: PdfPageLike): Promise<string> {
  // The viewport's transform turns PDF coordinates (origin bottom-left, any
  // page rotation) into upright ones with the origin at the top-left.
  const [a = 1, b = 0, c = 0, d = -1, e = 0, f = 0] = page.getViewport({ scale: 1 }).transform;
  const { items } = await page.getTextContent();
  const placed: PlacedText[] = [];
  for (const item of items) {
    if (!isRawItem(item)) continue;
    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    placed.push({ text: item.str, x: a * x + c * y + e, y: b * x + d * y + f, width: item.width, height: item.height });
  }
  return layoutText(placed);
}

import { photoToPicture } from './image';
import { type LetterPage, MAX_PAGES, readPdf } from './pdf';

/** What the app can open. Decided from the file itself; nothing is sent anywhere to find out. */
export type FileKind = 'pdf' | 'picture' | 'text' | 'unsupported';

export function kindOfFile(file: { type: string; name: string }): FileKind {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type === 'text/plain' || name.endsWith('.txt')) return 'text';
  if (/^image\/(jpeg|png|webp|bmp|gif)$/.test(type)) return 'picture';
  return 'unsupported';
}

/** What the file picker offers. */
export const ACCEPTED_FILES = 'application/pdf,image/jpeg,image/png,image/webp,text/plain,.pdf,.txt';

export class UnsupportedFile extends Error {
  constructor(readonly fileName: string) {
    super(`Unsupported file: ${fileName}`);
  }
}

export interface OpenedLetter {
  /** The pages, in the order the files were chosen. */
  pages: LetterPage[];
  /** Pages that were left out because the letter was longer than the app reads. */
  leftOut: number;
}

export async function openFiles(files: readonly File[]): Promise<OpenedLetter> {
  const pages: LetterPage[] = [];
  let total = 0;
  for (const file of files) {
    const kind = kindOfFile(file);
    if (kind === 'unsupported') throw new UnsupportedFile(file.name);
    if (kind === 'pdf') {
      const pdf = await readPdf(await file.arrayBuffer());
      pages.push(...pdf.pages);
      total += pdf.totalPages;
    } else if (kind === 'text') {
      pages.push({ kind: 'text', text: (await file.text()).replace(/\r\n?/g, '\n').trim() });
      total += 1;
    } else {
      pages.push({ kind: 'picture', ...(await photoToPicture(file)) });
      total += 1;
    }
  }
  const kept = pages.slice(0, MAX_PAGES);
  return { pages: kept, leftOut: total - kept.length };
}

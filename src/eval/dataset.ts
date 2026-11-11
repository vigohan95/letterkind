import { LABELS, type Label } from '../../eval/labels';

/**
 * The evaluation set: each synthetic letter in `eval/letters/` joined to its
 * label. The letters are bundled as text at build time, so the evaluation
 * page runs entirely in the browser like the rest of the reading path.
 */

export interface EvalItem {
  label: Label;
  /** The letter, with line endings normalised the way the app normalises pasted text. */
  letter: string;
}

const FILES = import.meta.glob<string>('../../eval/letters/*.txt', { query: '?raw', import: 'default', eager: true });

/** Letter text by file name. */
export const LETTER_FILES: ReadonlyMap<string, string> = new Map(
  Object.entries(FILES).map(([path, text]) => [path.slice(path.lastIndexOf('/') + 1), text.replace(/\r\n?/g, '\n').trim()]),
);

export const EVAL_SET: readonly EvalItem[] = LABELS.map((label) => {
  const letter = LETTER_FILES.get(label.file);
  if (letter === undefined) throw new Error(`No letter file for label ${label.file}`);
  return { label, letter };
});

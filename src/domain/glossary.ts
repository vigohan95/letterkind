import { dropOverlaps } from './parse/span';
import { TERMS, type TermId } from './terms';

/**
 * Finding the glossary's terms in a letter.
 *
 * This is done by comparing characters, on this device, with no model. It
 * is what lets a reader ask about a word without the word being sent: what
 * they tap is matched here to an entry of the fixed list in `terms.ts`, and
 * only that entry's id can go into a request.
 */

/** A stretch of the letter that is an entry of the glossary. */
export interface TermMatch {
  id: TermId;
  start: number;
  /** Offset just past the last character. */
  end: number;
}

/** Other ways a few entries are written in letters, keyed by the entry's own words. */
const ALSO_WRITTEN: Readonly<Record<string, readonly string[]>> = {
  copayment: ['copay', 'co-pay', 'co-payment'],
  coinsurance: ['co-insurance'],
  'explanation of benefits': ['EOB'],
  'prior authorization': ['preauthorization', 'pre-authorization'],
  shutoff: ['shut-off'],
  'adjusted gross income': ['AGI'],
  'request for evidence': ['RFE'],
  'W-2': ['W2'],
};

// Between the words of a term: a hyphen, spaces, or the end of a line and the indent of the next.
const BETWEEN = String.raw`(?:\p{Pd}|[\t\p{Zs}]+|[\t\p{Zs}]*\r?\n[\t\p{Zs}]*)`;
// A term is a whole word: no letter or digit may touch it on either side.
const NOT_AFTER = String.raw`(?<![\p{L}\p{N}])`;
const NOT_BEFORE = String.raw`(?![\p{L}\p{N}])`;

const literal = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One word, or more than one of it: "fee" and "fees", "penalty" and "penalties". */
const orPlural = (word: string): string => (word.endsWith('y') ? `${literal(word.slice(0, -1))}(?:ys?|ies)` : `${literal(word)}(?:e?s)?`);

function shapeOf(words: string): RegExp {
  // A number alone could be anything; it is a term only when the letter calls it a form.
  if (/^\d+$/.test(words)) return new RegExp(`${NOT_AFTER}forms?${BETWEEN}${words}${NOT_BEFORE}`, 'giu');

  const parts = words.split(/[\s-]+/);
  // An abbreviation is itself only in capitals: "SNAP" is a benefit, "snap" is not.
  if (!/[a-z]/.test(words)) return new RegExp(`${NOT_AFTER}${parts.map(literal).join(BETWEEN)}s?${NOT_BEFORE}`, 'gu');

  const last = parts.pop() ?? '';
  return new RegExp(`${NOT_AFTER}${[...parts.map(literal), orPlural(last)].join(BETWEEN)}${NOT_BEFORE}`, 'giu');
}

const SHAPES: readonly { id: TermId; shape: RegExp }[] = TERMS.flatMap(({ id, words }) =>
  [words, ...(ALSO_WRITTEN[words] ?? [])].map((written) => ({ id, shape: shapeOf(written) })),
);

/**
 * Every place a glossary term stands in the letter, in order, none overlapping.
 * Where two could be meant, the longer one is: "default judgment", not "default".
 */
export function findTerms(letter: string): TermMatch[] {
  const found: TermMatch[] = [];
  for (const { id, shape } of SHAPES) {
    for (const match of letter.matchAll(shape)) found.push({ id, start: match.index, end: match.index + match[0].length });
  }
  return dropOverlaps(found);
}

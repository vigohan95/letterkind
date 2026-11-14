import type { DeadlineMeaning } from './letterTypes';
import { type DateMatch, findDates } from './parse/date';
import type { Verdict } from './verify';

/**
 * Which dates in a letter are not the date to act by, judged from the words
 * printed next to them.
 *
 * Verification only proves a date is in the letter. A letter has several, and
 * a model will sometimes hand back the wrong real one: the notice date at the
 * top, the last day of a billing period, the last day to ask for a
 * postponement instead of the day to appear. When the letter itself says what
 * a date is for, code can read that label as well as a model can, and does
 * not guess.
 *
 * This only ever holds a date back. It never puts a different date on the
 * screen: the reader is shown the remaining dates to choose from.
 */

export type NotTheDeadline =
  /** Labelled as the date the letter was written, mailed or received, or the dates of a billing period. */
  | 'record_date'
  /** For a summons or appointment: the last day to ask for a different date. */
  | 'postpone_by'
  /** For a rent or lease change: the last day to give notice and leave instead. */
  | 'move_out_by';

/** Labels that say a date records something that already happened. Matched against the text just before the date. */
const RECORD_LABEL = new RegExp(
  [
    String.raw`\b(?:notice|statement|letter|mail(?:ing|ed)?|print(?:ed)?|issue[d]?|receipt|received|filing|billing|service)\s+date\s*[:#]?\s*$`,
    String.raw`\bdate\s+(?:mailed|issued|printed|received|filed|of\s+(?:this\s+)?(?:notice|letter)|of\s+service)\s*[:#]?\s*$`,
    String.raw`\b(?:billing|service)\s+period\s*[:#]?\s*(?:from\s+)?$`,
    String.raw`\b(?:billing|service)\s+period\b[^.\n]*\b(?:to|through|-)\s*$`,
    String.raw`\bpayment\s+received\s*(?:on\s*)?$`,
    String.raw`\bfecha\s+(?:del?\s+)?(?:aviso|carta|emisi[oó]n|env[ií]o|estado\s+de\s+cuenta)\s*[:#]?\s*$`,
  ].join('|'),
  'i',
);

const POSTPONE = /\b(?:postpone|postponement|reschedul\w*|be excused|excusal|aplazar|aplazamiento|reprogramar)\b/i;
const MOVE_OUT = /\b(?:move out|moving out|end (?:your|the) tenancy|vacate|terminate (?:your|the) (?:tenancy|lease))\b/i;

/** The sentence around `start`, within its line: from the previous sentence end to the next. */
function sentenceAround(letter: string, start: number, end: number): { before: string; sentence: string } {
  const lineStart = letter.lastIndexOf('\n', start - 1) + 1;
  const nl = letter.indexOf('\n', end);
  const lineEnd = nl === -1 ? letter.length : nl;
  const head = letter.slice(lineStart, start);
  // A full stop followed by a space and a capital ends a sentence; "U.S." and "No. 4" do not.
  let cut = 0;
  for (const m of head.matchAll(/[.!?]\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/g)) {
    const before = head.slice(0, m.index + 1);
    if (/\b(?:[A-Z]\.){1,3}$|\b(?:No|Mr|Mrs|Ms|Dr|St|Ave)\.$/.test(before)) continue;
    cut = m.index + m[0].length;
  }
  const tail = letter.slice(end, lineEnd);
  const stop = tail.search(/[.!?](?:\s|$)/);
  return {
    before: head.slice(cut),
    sentence: head.slice(cut) + letter.slice(start, end) + (stop === -1 ? tail : tail.slice(0, stop + 1)),
  };
}

/** Why this occurrence of a date is not the deadline for this kind of letter, or null when it may be. */
export function whyNotTheDeadline(letter: string, match: DateMatch, meaning: DeadlineMeaning): NotTheDeadline | null {
  const { before, sentence } = sentenceAround(letter, match.start, match.end);
  if (RECORD_LABEL.test(before)) return 'record_date';
  if (meaning === 'appear' && POSTPONE.test(sentence)) return 'postpone_by';
  if (meaning === 'takes_effect' && MOVE_OUT.test(sentence)) return 'move_out_by';
  return null;
}

/**
 * Holds back a verified deadline when every place the letter prints that date
 * says it is something else. The remaining dates are offered instead.
 */
export function checkDeadlineContext(
  letter: string,
  verdict: Verdict<string, DateMatch>,
  meaning: DeadlineMeaning,
): Verdict<string, DateMatch> {
  if (verdict.status !== 'verified' || meaning === 'none') return verdict;
  const reasons = verdict.matches.map((m) => whyNotTheDeadline(letter, m, meaning));
  if (reasons.some((r) => r === null)) return verdict;
  return {
    status: 'unverified',
    claimed: verdict.matches[0]?.raw ?? verdict.value,
    candidates: findDates(letter).filter((d) => d.value !== verdict.value && whyNotTheDeadline(letter, d, meaning) === null),
  };
}

import type { Label } from '../../eval/labels';
import type { Classification } from '../ai/classify';
import { EXTRACT_FIELDS, type FieldName, type RawFields } from '../ai/extract';
import type { Reading } from '../ai/read';
import type { LetterTypeId } from '../domain/letterTypes';
import { parseAmount } from '../domain/parse/amount';
import { findDates, parseDate } from '../domain/parse/date';
import { parsePhone } from '../domain/parse/phone';

/**
 * Scoring. Pure functions: a label, what the model said, what the app would
 * show — in, a verdict out.
 *
 * Each field is scored twice, against the same label:
 *
 *  - `alone`: the model's answer taken at its word, as an app that trusted
 *    the model would show it.
 *  - `final`: what this app shows, after the answer has been checked against
 *    the letter and the rules for the kind of letter have been applied.
 *
 * The difference between the two columns is what the code around the model is
 * worth. The outcome that matters most is `wrong`: a value on the screen that
 * should not be there. A reader can cope with a blank; a wrong amount or date
 * presented as fact is how they get hurt.
 */

export type Outcome =
  /** The expected value is shown. */
  | 'right'
  /** Nothing is shown, and nothing should be. */
  | 'blank'
  /** Something is shown that should not be: a wrong value, or any value where none belongs. */
  | 'wrong'
  /** Nothing is shown although the letter has an answer. */
  | 'missed';

export interface FieldScore {
  alone: Outcome;
  final: Outcome;
  /** Which layer took a wrong answer off the screen; null if there was none to take, or it got through. */
  caughtBy: 'verify' | 'rules' | null;
  /** The model was right, but the app ended up not showing the value. */
  lost: boolean;
}

/** Lower-cased words and numbers, single-spaced: punctuation and line breaks do not count. */
const words = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Letters and digits only. */
const alnum = (value: string): string => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** How much more than the expected text an answer may carry ("Case No. …", "… Billing Office"). */
const NAME_SLACK = 30;
const NUMBER_SLACK = 16;

function nameMatches(answer: string, accepted: readonly string[]): boolean {
  const said = words(answer);
  return accepted.some((name) => {
    const want = words(name);
    return ` ${said} `.includes(` ${want} `) && said.length <= want.length + NAME_SLACK;
  });
}

function numberMatches(answer: string, accepted: readonly string[]): boolean {
  const said = alnum(answer);
  return accepted.some((number) => {
    const want = alnum(number);
    return said.includes(want) && said.length <= want.length + NUMBER_SLACK;
  });
}

/** The date a letter was written, the way the verifier works it out: its first fully written date. */
export function letterDateOf(letter: string): string | undefined {
  return findDates(letter).find((d) => !d.yearInferred)?.value;
}

/** Does the label expect anything on the screen for this field? */
export function expects(field: FieldName, label: Label): boolean {
  switch (field) {
    case 'sender':
      return label.sender.length > 0;
    case 'reference':
      return label.reference.length > 0;
    case 'amount':
      return label.amount !== null;
    case 'deadline':
      return label.deadline !== null;
    case 'phone':
      return label.phone !== null;
  }
}

/** Is this piece of text — a model's answer, or a value the app shows — the labelled answer? */
export function matches(field: FieldName, shown: string, label: Label, letterDate?: string): boolean {
  switch (field) {
    case 'sender':
      return nameMatches(shown, label.sender);
    case 'reference':
      return numberMatches(shown, label.reference);
    case 'amount': {
      const said = parseAmount(shown);
      const want = parseAmount(label.amount);
      return said !== null && want !== null && Math.abs(said) === Math.abs(want);
    }
    case 'deadline':
      return label.deadline !== null && parseDate(shown, { letterDate }) === label.deadline.iso;
    case 'phone': {
      const said = parsePhone(shown);
      return said !== null && said === parsePhone(label.phone);
    }
  }
}

function outcome(field: FieldName, shown: string | null, label: Label, letterDate?: string): Outcome {
  const expected = expects(field, label);
  if (shown === null || shown.trim() === '') return expected ? 'missed' : 'blank';
  if (!expected) return 'wrong';
  return matches(field, shown, label, letterDate) ? 'right' : 'wrong';
}

/** What the app puts on the screen for a field: the letter's own characters, or nothing. */
export function shownByApp(field: FieldName, reading: Reading): string | null {
  const verdict = reading[field];
  if (verdict.status !== 'verified') return null;
  return verdict.matches[0]?.raw ?? null;
}

export function scoreField(field: FieldName, raw: RawFields | null, reading: Reading, label: Label, letter: string): FieldScore {
  const letterDate = letterDateOf(letter);
  const alone = outcome(field, raw?.[field] ?? null, label, letterDate);
  const final = outcome(field, shownByApp(field, reading), label, letterDate);

  let caughtBy: FieldScore['caughtBy'] = null;
  if (alone === 'wrong' && final !== 'wrong') {
    const verdict = reading[field];
    // "Withheld" means the value was in the letter and only the rules for this kind of letter
    // kept it off the screen. Anything else was already stopped by the check against the letter.
    caughtBy = verdict.status === 'not_applicable' && verdict.withheld ? 'rules' : 'verify';
  }
  return { alone, final, caughtBy, lost: alone === 'right' && final !== 'right' };
}

export type FieldScores = Record<FieldName, FieldScore>;

export function scoreReading(reading: Reading, label: Label, letter: string): FieldScores {
  const scores = {} as FieldScores;
  for (const field of EXTRACT_FIELDS) scores[field] = scoreField(field, reading.raw, reading, label, letter);
  return scores;
}

export interface ClassificationScore {
  /** The on-device model on its own. */
  model: 'right' | 'wrong';
  /** The keyword rules on their own; `none` when they had no opinion. */
  keywords: 'right' | 'wrong' | 'none';
  /** The two together: `asked` when they disagreed and the reader is shown both. */
  combined: 'right' | 'wrong' | 'asked';
  /** When the reader was asked: was the right kind one of the two on offer? */
  askedWithAnswer: boolean;
}

export function scoreClassification(classification: Classification, truth: LetterTypeId): ClassificationScore {
  const asked = classification.type === null;
  return {
    model: classification.model === truth ? 'right' : 'wrong',
    keywords: classification.keywords === null ? 'none' : classification.keywords === truth ? 'right' : 'wrong',
    combined: asked ? 'asked' : classification.type === truth ? 'right' : 'wrong',
    askedWithAnswer: asked && classification.candidates.includes(truth),
  };
}

/**
 * The kind of letter the rest of the pipeline goes on with. When the reader
 * is asked, they are assumed to pick the right kind if it is offered, and the
 * model's choice if it is not.
 */
export function typeToUse(classification: Classification, truth: LetterTypeId): LetterTypeId {
  if (classification.type !== null) return classification.type;
  return classification.candidates.includes(truth) ? truth : (classification.candidates[0] ?? 'other');
}

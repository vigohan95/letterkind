import { EXTRACT_FIELDS, type FieldName } from '../ai/extract';
import { type LetterResult, type Variant, VARIANTS } from './run';
import type { FieldScore, Outcome } from './score';

/**
 * Adds up a run. Pure, and deterministic: the same letter results always give
 * the same summary, which is what lets a test recompute the summary stored in
 * a results file and fail if the two differ.
 */

export type Tally = Record<Outcome, number>;

export interface FieldSummary {
  /** The model's answers taken at their word. */
  alone: Tally;
  /** What the app shows. */
  final: Tally;
  /** Wrong answers the check against the letter kept off the screen. */
  caughtByVerify: number;
  /** Wrong answers that were in the letter and the rules for the kind of letter kept off the screen. */
  caughtByRules: number;
  /** Right answers the app ended up not showing. */
  lost: number;
}

export interface Timing {
  median: number;
  max: number;
}

export interface VariantSummary {
  fields: Record<FieldName, FieldSummary>;
  /** All five fields together. */
  total: FieldSummary;
  ms: Timing;
}

export interface Summary {
  letters: number;
  classification: {
    model: { right: number; wrong: number };
    keywords: { right: number; wrong: number; none: number };
    combined: { right: number; wrong: number; asked: number };
    /** Of the times the reader was asked, how often the right kind was one of the two offered. */
    askedWithAnswer: number;
    ms: Timing;
  };
  variants: Record<Variant, VariantSummary>;
}

const emptyTally = (): Tally => ({ right: 0, blank: 0, wrong: 0, missed: 0 });
const emptyField = (): FieldSummary => ({ alone: emptyTally(), final: emptyTally(), caughtByVerify: 0, caughtByRules: 0, lost: 0 });

function add(into: FieldSummary, score: FieldScore): void {
  into.alone[score.alone] += 1;
  into.final[score.final] += 1;
  if (score.caughtBy === 'verify') into.caughtByVerify += 1;
  if (score.caughtBy === 'rules') into.caughtByRules += 1;
  if (score.lost) into.lost += 1;
}

export function timing(values: readonly number[]): Timing {
  if (values.length === 0) return { median: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  return { median, max: sorted[sorted.length - 1] ?? 0 };
}

function summariseVariant(letters: readonly LetterResult[], variant: Variant): VariantSummary {
  const fields = {} as Record<FieldName, FieldSummary>;
  for (const field of EXTRACT_FIELDS) fields[field] = emptyField();
  const total = emptyField();
  for (const letter of letters) {
    for (const field of EXTRACT_FIELDS) {
      const score = letter.variants[variant].scores[field];
      add(fields[field], score);
      add(total, score);
    }
  }
  return { fields, total, ms: timing(letters.map((l) => l.variants[variant].ms)) };
}

export function summarise(letters: readonly LetterResult[]): Summary {
  const classification: Summary['classification'] = {
    model: { right: 0, wrong: 0 },
    keywords: { right: 0, wrong: 0, none: 0 },
    combined: { right: 0, wrong: 0, asked: 0 },
    askedWithAnswer: 0,
    ms: timing(letters.map((l) => l.classification.ms)),
  };
  for (const { classificationScore: score } of letters) {
    classification.model[score.model] += 1;
    classification.keywords[score.keywords] += 1;
    classification.combined[score.combined] += 1;
    if (score.askedWithAnswer) classification.askedWithAnswer += 1;
  }

  const variants = {} as Summary['variants'];
  for (const variant of VARIANTS) variants[variant] = summariseVariant(letters, variant);
  return { letters: letters.length, classification, variants };
}

/** Values on the screen that should not be there, out of all fields read. */
export const wrongShown = (summary: FieldSummary): number => summary.final.wrong;
export const wrongAlone = (summary: FieldSummary): number => summary.alone.wrong;
export const fieldsRead = (summary: FieldSummary): number =>
  summary.final.right + summary.final.blank + summary.final.wrong + summary.final.missed;

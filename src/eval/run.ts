import { classify, typeIsCertain } from '../ai/classify';
import { EXTRACT_FIELDS, type FieldName, type RawFields } from '../ai/extract';
import { type Reading, readLetter } from '../ai/read';
import type { Generate } from '../ai/types';
import type { LetterTypeId } from '../domain/letterTypes';
import type { EvalItem } from './dataset';
import { type ClassificationScore, type FieldScores, scoreClassification, scoreReading, shownByApp, typeToUse } from './score';

/**
 * Runs letters through the same functions the app uses — `classify` and
 * `readLetter` — and scores what comes out. The models are parameters, so
 * the whole run can be replayed in a unit test with recorded answers.
 *
 * Each letter is read three ways:
 *
 *  - `full`:    as the app does it: the kind of letter decides what is asked
 *               for, a reading hint for that kind is added, and the rules for
 *               that kind are applied afterwards.
 *  - `no_hint`: the same, without the reading hint.
 *  - `untyped`: as a generic letter: the same five questions for every
 *               letter, no hint, no rules for the kind. This is the baseline
 *               a one-prompt app would get.
 */

export const VARIANTS = ['full', 'no_hint', 'untyped'] as const;
export type Variant = (typeof VARIANTS)[number];

export interface VariantResult {
  /** The kind of letter this reading was done as. */
  type: LetterTypeId;
  /** The model's answers, unchecked; null if its output could not be parsed. */
  raw: RawFields | null;
  /** What the check against the letter, and then the rules, made of each answer. */
  status: Record<FieldName, Reading[FieldName]['status']>;
  /** What the app would put on the screen: the letter's own characters, or null. */
  shown: Record<FieldName, string | null>;
  scores: FieldScores;
  ms: number;
}

export interface LetterResult {
  file: string;
  truth: LetterTypeId;
  classification: {
    model: LetterTypeId | null;
    keywords: LetterTypeId | null;
    /** Null when the two disagreed and the reader would be asked. */
    type: LetterTypeId | null;
    candidates: LetterTypeId[];
    ms: number;
  };
  classificationScore: ClassificationScore;
  /** The kind the `full` and `no_hint` readings went on with. */
  typeUsed: LetterTypeId;
  variants: Record<Variant, VariantResult>;
}

export interface Models {
  classify: Generate;
  extract: Generate;
}

function variantResult(reading: Reading, item: EvalItem): VariantResult {
  const status = {} as VariantResult['status'];
  const shown = {} as VariantResult['shown'];
  for (const field of EXTRACT_FIELDS) {
    status[field] = reading[field].status;
    shown[field] = shownByApp(field, reading);
  }
  return { type: reading.type, raw: reading.raw, status, shown, scores: scoreReading(reading, item.label, item.letter), ms: reading.ms };
}

export async function evaluateLetter(item: EvalItem, models: Models, todayIso: string): Promise<LetterResult> {
  const { label, letter } = item;
  const classification = await classify(letter, models.classify);
  const typeUsed = typeToUse(classification, label.type);

  // When the two readers disagree, the run stands in for a person choosing the right kind.
  const typeCertain = typeIsCertain(classification, classification.type === null);
  const full = await readLetter(letter, typeUsed, models.extract, todayIso, { typeCertain });
  const noHint = await readLetter(letter, typeUsed, models.extract, todayIso, { hint: false, typeCertain });
  const untyped = await readLetter(letter, 'other', models.extract, todayIso, { hint: false });

  return {
    file: label.file,
    truth: label.type,
    classification: {
      model: classification.model,
      keywords: classification.keywords,
      type: classification.type,
      candidates: classification.candidates,
      ms: classification.ms,
    },
    classificationScore: scoreClassification(classification, label.type),
    typeUsed,
    variants: {
      full: variantResult(full, item),
      no_hint: variantResult(noHint, item),
      untyped: variantResult(untyped, item),
    },
  };
}

export interface Progress {
  /** Called after each letter with everything finished so far. */
  onLetter?: (done: readonly LetterResult[]) => void;
  /** Checked before each letter; return true to stop early. */
  stopped?: () => boolean;
}

export async function evaluate(items: readonly EvalItem[], models: Models, todayIso: string, progress: Progress = {}): Promise<LetterResult[]> {
  const done: LetterResult[] = [];
  for (const item of items) {
    if (progress.stopped?.()) break;
    done.push(await evaluateLetter(item, models, todayIso));
    progress.onLetter?.([...done]);
  }
  return done;
}

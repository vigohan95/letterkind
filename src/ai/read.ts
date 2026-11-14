import { daysLeft } from '../domain/deadline';
import { letterType, type LetterTypeId } from '../domain/letterTypes';
import type { PhoneMatch } from '../domain/parse/phone';
import { applyTypeRules, type RuledFields } from '../domain/rules';
import { verifyAmount, verifyDate, verifyPhone, verifyQuote, verifyReference, type Verdict } from '../domain/verify';
import { extract, type ExtractOptions, type RawFields } from './extract';
import type { Generate } from './types';

/**
 * Everything the app is prepared to say about one letter.
 *
 * Built in three moves: the model copies values out (extract), code checks
 * each one against the letter (verify), and the rules for this kind of letter
 * decide which fields mean anything (rules). Nothing reaches the screen
 * without passing the second and third.
 */
export interface Reading extends RuledFields {
  type: LetterTypeId;
  sender: Verdict<string>;
  reference: Verdict<string>;
  phone: Verdict<string, PhoneMatch>;
  /** Whole days until a verified deadline, counted by code; null when there is none. */
  daysLeft: number | null;
  /** The model's unchecked answers, kept for the evaluation page; null if unparseable. */
  raw: RawFields | null;
  ms: number;
}

export async function readLetter(
  letter: string,
  type: LetterTypeId,
  generate: Generate,
  todayIso: string,
  options: ExtractOptions = {},
): Promise<Reading> {
  const { fields, ms } = await extract(letter, letterType(type), generate, options);
  const ruled = applyTypeRules(type, {
    amount: verifyAmount(letter, fields?.amount),
    deadline: verifyDate(letter, fields?.deadline),
  });
  return {
    type,
    ...ruled,
    sender: verifyQuote(letter, fields?.sender),
    reference: verifyReference(letter, fields?.reference),
    phone: verifyPhone(letter, fields?.phone),
    daysLeft: ruled.deadline.status === 'verified' ? daysLeft(ruled.deadline.value, todayIso) : null,
    raw: fields,
    ms,
  };
}

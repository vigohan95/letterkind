import { type AmountMeaning, type DeadlineMeaning, letterType, type LetterTypeId } from './letterTypes';
import type { DateMatch } from './parse/date';
import type { Verdict } from './verify';

/**
 * Per-type rules applied after verification.
 *
 * Verification answers "is this value in the letter?". It cannot answer "should
 * this letter have an amount due at all?". An Explanation of Benefits is full
 * of real dollar figures and none of them is a bill; a jury summons mentions a
 * fine and asks for no payment. For those kinds of letter the field is not
 * applicable, whatever the model extracted.
 *
 * Two limits on that:
 *
 *  - A rule is only as good as the kind it is keyed on. When the kind was
 *    settled by one reader alone (the model, with the keyword rules silent),
 *    a wrong kind would hide a real amount or date without anyone noticing.
 *    So an uncertain kind never hides a checked value; it is shown under the
 *    plain label instead.
 *  - Where the figure means money to pay, a figure the letter itself marks as
 *    a credit ($18.40 CR, ($45.00)) is not one. It is held back, and the
 *    reader is told why.
 */

export interface NotApplicable {
  status: 'not_applicable';
  /** True when the model did produce a value that was in the letter and the rule held it back. */
  withheld: boolean;
  /** Why: this kind of letter has no such field, or the figure is a credit to the reader. */
  reason: 'kind' | 'credit';
  /** For a credit: the letter's own text of it, such as "$18.40 CR". */
  raw?: string;
}

export interface RuleOptions {
  /**
   * False when the kind of letter rests on one reader alone. Then no checked
   * value is hidden on the strength of the kind. Defaults to true.
   */
  typeCertain?: boolean;
}

/** Meanings under which the figure is money the reader is asked to pay. */
const TO_PAY: ReadonlySet<AmountMeaning> = new Set(['amount_due', 'claimed', 'fine', 'fee']);

export interface RuledFields {
  amount: Verdict<number> | NotApplicable;
  amountMeaning: AmountMeaning;
  deadline: Verdict<string, DateMatch> | NotApplicable;
  deadlineMeaning: DeadlineMeaning;
}

export function applyTypeRules(
  type: LetterTypeId,
  fields: { amount: Verdict<number>; deadline: Verdict<string, DateMatch> },
  { typeCertain = true }: RuleOptions = {},
): RuledFields {
  const { amount: amountMeaning, deadline: deadlineMeaning } = letterType(type);
  // An uncertain kind may not hide what was checked; it may still decline to show nothing.
  const hides = (verdict: { status: string }): boolean => typeCertain || verdict.status !== 'verified';
  const amount = fields.amount;
  const credit = amount.status === 'verified' && amount.matches.every((m) => m.value < 0) ? amount.matches[0] : undefined;
  return {
    amount:
      amountMeaning === 'none' && hides(amount)
        ? { status: 'not_applicable', withheld: amount.status === 'verified', reason: 'kind' }
        : credit && TO_PAY.has(amountMeaning)
          ? { status: 'not_applicable', withheld: true, reason: 'credit', raw: credit.raw }
          : amount,
    amountMeaning,
    deadline:
      deadlineMeaning === 'none' && hides(fields.deadline)
        ? { status: 'not_applicable', withheld: fields.deadline.status === 'verified', reason: 'kind' }
        : fields.deadline,
    deadlineMeaning,
  };
}

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
 */

export interface NotApplicable {
  status: 'not_applicable';
  /** True when the model did produce a value that was in the letter and the rule held it back. */
  withheld: boolean;
}

export interface RuledFields {
  amount: Verdict<number> | NotApplicable;
  amountMeaning: AmountMeaning;
  deadline: Verdict<string, DateMatch> | NotApplicable;
  deadlineMeaning: DeadlineMeaning;
}

export function applyTypeRules(
  type: LetterTypeId,
  fields: { amount: Verdict<number>; deadline: Verdict<string, DateMatch> },
): RuledFields {
  const { amount: amountMeaning, deadline: deadlineMeaning } = letterType(type);
  return {
    amount:
      amountMeaning === 'none'
        ? { status: 'not_applicable', withheld: fields.amount.status === 'verified' }
        : fields.amount,
    amountMeaning,
    deadline:
      deadlineMeaning === 'none'
        ? { status: 'not_applicable', withheld: fields.deadline.status === 'verified' }
        : fields.deadline,
    deadlineMeaning,
  };
}

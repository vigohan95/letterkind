import { letterType, type LetterTypeId } from './letterTypes';

/**
 * Guidance comes from the cloud as a template: text written without ever
 * seeing a letter, with marked gaps where a detail belongs. The gaps are
 * filled on the device, from values that were checked against the letter.
 *
 * These are the only gaps a template may have.
 */
export const PLACEHOLDERS = ['SENDER', 'REFERENCE', 'AMOUNT', 'DEADLINE', 'DAYS_LEFT', 'PHONE'] as const;

export type Placeholder = (typeof PLACEHOLDERS)[number];

/** How a gap is written inside a template. */
export const mark = (placeholder: Placeholder): string => `{{${placeholder}}}`;

/**
 * The gaps a template for this kind of letter may use.
 *
 * A kind whose dollar figures are not a bill gets no amount gap, and a kind
 * that sets no deadline gets no date gap — so guidance for an Explanation of
 * Benefits has nowhere to put "pay this much by then", whatever a model
 * writes.
 */
export function placeholdersFor(type: LetterTypeId): readonly Placeholder[] {
  const kind = letterType(type);
  return PLACEHOLDERS.filter((p) => {
    if (p === 'AMOUNT') return kind.amount !== 'none';
    if (p === 'DEADLINE' || p === 'DAYS_LEFT') return kind.deadline !== 'none';
    return true;
  });
}

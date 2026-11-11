/**
 * A value found in the letter, together with where it was found.
 *
 * Everything the app shows as a fact (an amount, a date, a phone number) is one
 * of these: parsed by code from the letter's own characters, never taken from a
 * model's output.
 */
export interface Found<T> {
  /** Normalised value: integer cents, an ISO date, or a 10-digit phone number. */
  value: T;
  /** The exact characters as they appear in the letter. */
  raw: string;
  /** Offset of the first character in the letter text. */
  start: number;
  /** Offset just past the last character. */
  end: number;
  /** 1-based line number of `start`. */
  line: number;
}

/** Offsets at which each line of `text` begins. */
export function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

/** 1-based line number containing `offset`. */
export function lineAt(starts: readonly number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] ?? Infinity) <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/**
 * Removes matches that overlap a longer match, then orders by position.
 * "December 15, 2026" beats the "December 15" inside it.
 */
export function dropOverlaps<T extends { start: number; end: number }>(items: readonly T[]): T[] {
  const byLength = [...items].sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const kept: T[] = [];
  for (const item of byLength) {
    if (!kept.some((k) => item.start < k.end && k.start < item.end)) kept.push(item);
  }
  return kept.sort((a, b) => a.start - b.start);
}

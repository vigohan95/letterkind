import { daysBetween } from './parse/date';

/** Today's date where the reader is, as YYYY-MM-DD. */
export function localIsoDate(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Whole days from today to the deadline: 0 on the day, negative once it has
 * passed. Counted by code. A model is never asked to do date arithmetic.
 */
export function daysLeft(deadlineIso: string, todayIso: string): number {
  return daysBetween(todayIso, deadlineIso);
}

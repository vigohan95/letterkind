import { findAmounts, parseAmount } from './parse/amount';
import { type DateOptions, findDates, parseDate } from './parse/date';
import { findPhones, parsePhone } from './parse/phone';
import { type Found, lineAt, lineStarts } from './parse/span';

/**
 * The on-device model proposes; this module decides.
 *
 * A model can misread a letter in ways that look entirely plausible: pick the
 * wrong one of three amounts, or "tidy up" a deadline into a date the letter
 * never states. So nothing a model says about an amount, a date or a phone
 * number is shown as-is. Its answer is parsed to a value, and that value has
 * to be found among the values parsed from the letter itself.
 *
 *  - verified:   the value is in the letter. `matches` are all the places it
 *                appears, and the value shown is the letter's, not the model's.
 *  - unverified: the model named something the letter does not contain. The
 *                app shows nothing for this field and lists `candidates` so
 *                the reader can pick.
 *  - absent:     the model gave no answer.
 */
export type Verdict<T, M extends Found<T> = Found<T>> =
  | { status: 'verified'; value: T; matches: M[] }
  | { status: 'unverified'; claimed: string; candidates: M[] }
  | { status: 'absent'; candidates: M[] };

type Claim = string | number | null | undefined;

const isBlank = (claim: Claim): boolean =>
  claim === null || claim === undefined || (typeof claim === 'string' && claim.trim() === '');

function decide<T, M extends Found<T>>(claim: Claim, parsed: T | null, all: M[], same: (a: T, b: T) => boolean): Verdict<T, M> {
  if (isBlank(claim)) return { status: 'absent', candidates: all };
  if (parsed !== null) {
    const matches = all.filter((found) => same(found.value, parsed));
    const first = matches[0];
    if (first) return { status: 'verified', value: first.value, matches };
  }
  return { status: 'unverified', claimed: String(claim), candidates: all };
}

/**
 * Amounts match on integer cents. A model that reports a credit of ($45.00)
 * as "45.00" still matches; the sign shown is the letter's.
 */
export function verifyAmount(letter: string, claim: Claim): Verdict<number> {
  return decide(claim, parseAmount(claim), findAmounts(letter), (a, b) => Math.abs(a) === Math.abs(b));
}

/**
 * Dates match on the calendar day, whatever the format: the letter may say
 * "December 15, 2026" and the model "12/15/2026" or "2026-12-15".
 */
export function verifyDate(letter: string, claim: string | null | undefined, options: DateOptions = {}): Verdict<string, ReturnType<typeof findDates>[number]> {
  const all = findDates(letter, options);
  const letterDate = options.letterDate ?? all.find((d) => !d.yearInferred)?.value;
  const parsed = parseDate(claim, { ...options, ...(letterDate ? { letterDate } : {}) });
  return decide(claim, parsed, all, (a, b) => a === b);
}

/** Phone numbers match on the ten digits, ignoring punctuation and a leading 1. */
export function verifyPhone(letter: string, claim: string | null | undefined): Verdict<string, ReturnType<typeof findPhones>[number]> {
  return decide(claim, parsePhone(claim), findPhones(letter), (a, b) => a === b);
}

/** Lower-cases and collapses whitespace, remembering where each character came from. */
function normalise(text: string): { norm: string; origin: number[] } {
  let norm = '';
  const origin: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (/\s/.test(ch)) {
      pendingSpace = norm.length > 0;
      continue;
    }
    if (pendingSpace) {
      norm += ' ';
      origin.push(i - 1);
      pendingSpace = false;
    }
    const lower = ch.toLowerCase();
    norm += lower.length === 1 ? lower : ch;
    origin.push(i);
  }
  return { norm, origin };
}

/**
 * Verifies a short piece of text the model says it copied from the letter —
 * the sender's name, a notice or account number. It has to appear in the
 * letter word for word (case and line breaks aside).
 */
export function verifyQuote(letter: string, claim: string | null | undefined): Verdict<string> {
  if (isBlank(claim)) return { status: 'absent', candidates: [] };
  const needle = normalise(String(claim)).norm.replace(/^[\s"'.,:;]+|[\s"'.,:;]+$/g, '');
  if (needle.length < 2 || needle.length > 160) {
    return { status: 'unverified', claimed: String(claim), candidates: [] };
  }

  const { norm, origin } = normalise(letter);
  const starts = lineStarts(letter);
  const matches: Found<string>[] = [];
  for (let at = norm.indexOf(needle); at !== -1; at = norm.indexOf(needle, at + 1)) {
    const start = origin[at];
    const last = origin[at + needle.length - 1];
    if (start === undefined || last === undefined) continue;
    const raw = letter.slice(start, last + 1);
    matches.push({ value: raw, raw, start, end: last + 1, line: lineAt(starts, start) });
  }

  const first = matches[0];
  return first
    ? { status: 'verified', value: first.value, matches }
    : { status: 'unverified', claimed: String(claim), candidates: [] };
}

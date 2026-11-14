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

/**
 * A number the letter itself labels as one: "Receipt number: MSC2790144718",
 * "Account No. 4471-208-336", "Case #: CV-26-004417". Found by code, so the
 * reader can be offered these when the model's answer for the reference is
 * not one.
 */
const NUMBER_LABEL =
  /\b(?:receipt|account|case|notice|reference|citation|claim|member|policy|ticket|confirmation|invoice|file|docket|loan|application|customer|violation)\s*(?:number|no\.?|#|id)\s*[:#]?[ \t]*([A-Z0-9][A-Z0-9-]*(?:[ \t][0-9][A-Z0-9-]*)*)/gi;

export function findLabelledNumbers(letter: string): Found<string>[] {
  const starts = lineStarts(letter);
  const found: Found<string>[] = [];
  for (const match of letter.matchAll(NUMBER_LABEL)) {
    const raw = match[1]?.replace(/[-\s]+$/, '');
    if (!raw || !/\d/.test(raw) || match.index === undefined) continue;
    const start = match.index + match[0].length - (match[1]?.length ?? 0);
    found.push({ value: raw, raw, start, end: start + raw.length, line: lineAt(starts, start) });
  }
  return found;
}

/** "Form I-797C, Notice of Action", "W-2": the name of a form, which is not a number anyone quotes. */
const FORM_NAME = /^(?:form\s+\S+|[A-Z]-\d{1,4}[A-Z]?)(?=$|[\s,.;:])/i;

/** Why a piece of the letter is not a reference, or null when it may be one. */
function notAReference(raw: string): string | null {
  if (!/\d/.test(raw)) return 'no_digits';
  const text = raw.trim();
  const dates = findDates(text);
  if (dates.length > 0 && text.replace(/[\s,.]/g, '').length === dates.reduce((n, d) => n + d.raw.replace(/[\s,.]/g, '').length, 0)) return 'a_date';
  const form = FORM_NAME.exec(text);
  if (form && !/\d/.test(text.slice(form[0].length))) return 'a_form_name';
  return null;
}

/**
 * The reference has to be in the letter (as any quote) and also look like a
 * number to quote. A model under a short prompt will offer the heading
 * ("PERMISSION"), the date to reply by, or the name of the form ("I-797C")
 * instead of the receipt number printed two lines below it. Those are held
 * back, and the numbers the letter labels are offered instead.
 *
 * When the model copies a block of several lines that includes exactly one
 * labelled number, that number is what is shown: still the letter's own
 * characters, narrowed by code.
 */
export function verifyReference(letter: string, claim: string | null | undefined): Verdict<string> {
  const labelled = findLabelledNumbers(letter);
  const quote = verifyQuote(letter, claim);
  if (quote.status === 'absent') return { status: 'absent', candidates: labelled };
  if (quote.status === 'unverified') return { ...quote, candidates: labelled };

  const first = quote.matches[0];
  if (first && first.raw.includes('\n')) {
    const inside = labelled.filter((n) => n.start >= first.start && n.end <= first.end);
    const only = inside[0];
    if (inside.length === 1 && only) {
      return { status: 'verified', value: only.value, matches: labelled.filter((n) => n.value === only.value) };
    }
    return { status: 'unverified', claimed: String(claim), candidates: labelled };
  }
  if (first && notAReference(first.raw) !== null) {
    return { status: 'unverified', claimed: String(claim), candidates: labelled.filter((n) => notAReference(n.raw) === null) };
  }
  return quote;
}

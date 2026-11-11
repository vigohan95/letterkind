import { letterType, type LetterTypeId } from './letterTypes';
import { findAmounts } from './parse/amount';
import { findDates } from './parse/date';
import { findPhones } from './parse/phone';

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

/** What a kind of letter is and what to do about it, as written by a model that never saw the letter. */
export interface ExplainTemplate {
  what: string;
  steps: string[];
  ifIgnored: string;
  whoCanHelp: string[];
  /** For the on-device extractor, in English. Never shown as guidance. */
  readingHint: string;
}

export type RejectReason =
  | 'not_json'
  | 'wrong_shape'
  | 'too_long'
  | 'unknown_marker'
  | 'marker_not_allowed_here'
  | 'amount'
  | 'date'
  | 'phone'
  | 'web_address';

/**
 * A template that broke a rule. It is thrown away whole: a model that has
 * not seen the letter has no business supplying a figure, a date or a
 * number to call, and a template that tries is not trusted for the rest.
 */
export class TemplateRejected extends Error {
  readonly reason: RejectReason;
  /** The field the problem is in, as named in the answer. */
  readonly field: string;
  /** The offending piece of text, shortened. Empty when there is none to show. */
  readonly found: string;

  constructor(reason: RejectReason, field: string, found = '') {
    super(`Template rejected (${reason}) in ${field}${found ? `: ${found}` : ''}`);
    this.name = 'TemplateRejected';
    this.reason = reason;
    this.field = field;
    this.found = found.length > 60 ? `${found.slice(0, 57)}…` : found;
  }
}

/** Longest text accepted per field, in characters. Generous; the point is to stop a runaway answer. */
const LIMITS = { what: 1200, steps: 700, if_ignored: 900, who_can_help: 400, reading_hint: 600 } as const;
const MAX_ITEMS = { steps: 6, who_can_help: 4 } as const;

type FieldName = keyof typeof LIMITS;
const FIELD_NAMES = Object.keys(LIMITS) as FieldName[];

const MARKER = /\{\{([^{}]*)\}\}/g;

// Digits a model may write in a script other than the letter's: Arabic-Indic, Persian, full-width.
const OTHER_DIGITS = /[٠-٩۰-۹０-９]/g;
const asciiDigits = (text: string): string => text.replace(OTHER_DIGITS, (d) => String((d.codePointAt(0) ?? 0) & 0xf));

const CURRENCY = /[$€£¥₱₩₫₽]\s?\d[\d.,]*|\d[\d.,]*\s?[$€£¥₱₩₫₽]/;
// Seven or more digits in a row, allowing the punctuation phone numbers are written with.
const LONG_NUMBER = /\d(?:[\s().+-]{0,2}\d){6,}/;
const WEB =
  /https?:\/\/\S+|\bwww\.\S+|[\w.+-]+@[\w-]+\.[\w.-]+|\b[\w-]+\.(?:gov|com|org|net|edu|us|info|io|co)\b(?:\/\S*)?/i;

/** The first thing in a piece of template text that only the letter is allowed to supply. */
function specificValue(text: string): { reason: RejectReason; found: string } | null {
  const plain = asciiDigits(text.normalize('NFKC'));
  const web = WEB.exec(plain);
  if (web) return { reason: 'web_address', found: web[0] };
  const amount = findAmounts(plain)[0]?.raw ?? CURRENCY.exec(plain)?.[0];
  if (amount) return { reason: 'amount', found: amount };
  // A date without a year ("April 15") still counts; any year will do to find it.
  const date = findDates(plain, { defaultYear: 2000 })[0];
  if (date) return { reason: 'date', found: date.raw };
  const phone = findPhones(plain)[0]?.raw ?? LONG_NUMBER.exec(plain)?.[0];
  if (phone) return { reason: 'phone', found: phone };
  return null;
}

function checkText(value: unknown, field: FieldName, allowed: readonly Placeholder[]): string {
  if (typeof value !== 'string') throw new TemplateRejected('wrong_shape', field);
  const text = value.trim();
  if (text === '') throw new TemplateRejected('wrong_shape', field);
  if (text.length > LIMITS[field]) throw new TemplateRejected('too_long', field);

  for (const m of text.matchAll(MARKER)) {
    const name = m[1] ?? '';
    if (!(PLACEHOLDERS as readonly string[]).includes(name)) throw new TemplateRejected('unknown_marker', field, m[0]);
    if (!allowed.includes(name as Placeholder)) throw new TemplateRejected('marker_not_allowed_here', field, m[0]);
  }
  const withoutMarkers = text.replace(MARKER, ' ');
  // Any brace left over is a marker written wrongly; it would be shown to the reader as-is.
  const stray = /[{}]+/.exec(withoutMarkers);
  if (stray) throw new TemplateRejected('unknown_marker', field, stray[0]);

  const specific = specificValue(withoutMarkers);
  if (specific) throw new TemplateRejected(specific.reason, field, specific.found);
  return text;
}

function checkList(value: unknown, field: 'steps' | 'who_can_help', allowed: readonly Placeholder[]): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS[field]) throw new TemplateRejected('wrong_shape', field);
  return value.map((item) => checkText(item, field, allowed));
}

/**
 * Turn a model's answer into a template, or throw `TemplateRejected`.
 *
 * Accepted only if it is exactly the five expected fields, every marker is
 * one this kind of letter may use, and the text itself contains no dollar
 * amount, calendar date, phone number or web address.
 */
export function parseExplain(answer: string, type: LetterTypeId): ExplainTemplate {
  let data: unknown;
  try {
    data = JSON.parse(answer);
  } catch {
    throw new TemplateRejected('not_json', 'answer');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new TemplateRejected('wrong_shape', 'answer');
  const record = data as Record<string, unknown>;
  const extra = Object.keys(record).find((key) => !(FIELD_NAMES as string[]).includes(key));
  if (extra !== undefined) throw new TemplateRejected('wrong_shape', extra.slice(0, 40));

  const allowed = placeholdersFor(type);
  return {
    what: checkText(record.what, 'what', allowed),
    steps: checkList(record.steps, 'steps', allowed),
    ifIgnored: checkText(record.if_ignored, 'if_ignored', allowed),
    whoCanHelp: checkList(record.who_can_help, 'who_can_help', allowed),
    readingHint: checkText(record.reading_hint, 'reading_hint', []),
  };
}

/** The checked details of one letter, already written out for the reader. Absent means not known. */
export type Values = Partial<Record<Placeholder, string>>;

/** A gap that can be described in general words when its detail is missing. A count of days cannot. */
export type StandIn = Exclude<Placeholder, 'DAYS_LEFT'>;

export type Piece =
  | { kind: 'text'; text: string }
  /** A detail from the letter. */
  | { kind: 'value'; placeholder: Placeholder; text: string }
  /** General words standing in for a detail the letter did not yield. */
  | { kind: 'stand_in'; placeholder: StandIn; text: string };

// A count of days with nothing to count is dropped together with the brackets it was written in.
const EMPTY_DAYS = /\s*[(（[]\s*\{\{DAYS_LEFT\}\}\s*[)）\]]|\s*\{\{DAYS_LEFT\}\}/g;

/**
 * Fill a template's gaps on the device.
 *
 * Returns pieces rather than one string so the page can show which words
 * came from the letter and which are stand-ins. Text is never interpreted:
 * whatever a template contains is shown as plain characters.
 */
export function fill(text: string, values: Values, standIns: Readonly<Record<StandIn, string>>): Piece[] {
  const source = values.DAYS_LEFT === undefined ? text.replace(EMPTY_DAYS, '') : text;
  const pieces: Piece[] = [];
  let at = 0;
  for (const m of source.matchAll(MARKER)) {
    const name = m[1] as Placeholder;
    if (!(PLACEHOLDERS as readonly string[]).includes(name)) continue;
    if (m.index > at) pieces.push({ kind: 'text', text: source.slice(at, m.index) });
    const value = values[name];
    if (value !== undefined) pieces.push({ kind: 'value', placeholder: name, text: value });
    else if (name !== 'DAYS_LEFT') pieces.push({ kind: 'stand_in', placeholder: name, text: standIns[name] });
    at = m.index + m[0].length;
  }
  if (at < source.length) pieces.push({ kind: 'text', text: source.slice(at) });
  return pieces;
}

/** The filled text as one string. */
export const filledText = (pieces: readonly Piece[]): string => pieces.map((p) => p.text).join('');

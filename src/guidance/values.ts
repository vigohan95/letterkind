import type { Reading } from '../ai/read';
import type { LanguageId } from '../domain/languages';
import { formatPhone } from '../domain/parse/phone';
import type { Values } from '../domain/template';

/**
 * The details of one letter, written out for a template's gaps.
 *
 * Only values that were found in the letter and passed this kind of letter's
 * rules are given. Anything else is left out, and the template falls back to
 * general words. Dates and day counts are written by the browser's own
 * formatter in the language of the guidance — no model is involved.
 */

// Languages the browser's formatters may not carry, and the closest they do.
const CLOSEST: Partial<Record<LanguageId, readonly string[]>> = {
  tl: ['fil'],
  ht: ['fr-HT', 'fr'],
};

function localeFor(language: LanguageId): string {
  const wanted = [language, ...(CLOSEST[language] ?? []), 'en'];
  // Without this an unknown language silently becomes whatever the computer is set to.
  return Intl.DateTimeFormat.supportedLocalesOf(wanted)[0] ?? 'en';
}

const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** A calendar date in words, e.g. "December 15, 2026" or "2026年12月15日". */
export function dateInWords(iso: string, language: LanguageId): string {
  return new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

/** How far off a day is, e.g. "in 34 days", "tomorrow", "3 days ago". */
export function daysInWords(days: number, language: LanguageId): string {
  return new Intl.RelativeTimeFormat(localeFor(language), { numeric: 'auto' }).format(days, 'day');
}

export function valuesOf(reading: Reading, language: LanguageId): Values {
  const values: Values = {};
  if (reading.sender.status === 'verified') values.SENDER = oneLine(reading.sender.matches[0]?.raw ?? reading.sender.value);
  if (reading.reference.status === 'verified') values.REFERENCE = oneLine(reading.reference.matches[0]?.raw ?? reading.reference.value);
  if (reading.amount.status === 'verified') {
    // As printed on the letter, so the reader can find the same figure there.
    const printed = reading.amount.matches[0]?.raw;
    if (printed) values.AMOUNT = oneLine(printed);
  }
  if (reading.deadline.status === 'verified') {
    values.DEADLINE = dateInWords(reading.deadline.value, language);
    if (reading.daysLeft !== null) values.DAYS_LEFT = daysInWords(reading.daysLeft, language);
  }
  if (reading.phone.status === 'verified') {
    values.PHONE = formatPhone(reading.phone.value, reading.phone.matches[0]?.extension);
  }
  return values;
}

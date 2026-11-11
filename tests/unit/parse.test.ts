import { describe, expect, it } from 'vitest';
import { findAmounts, formatCents, parseAmount } from '../../src/domain/parse/amount';
import { daysBetween, findDates, parseDate } from '../../src/domain/parse/date';
import { findPhones, formatPhone, parsePhone } from '../../src/domain/parse/phone';

const cents = (text: string) => findAmounts(text).map((a) => a.value);
const days = (text: string, options = {}) => findDates(text, options).map((d) => d.value);
const phones = (text: string) => findPhones(text).map((p) => p.value);

describe('amounts', () => {
  it.each([
    ['Amount due: $1,234.56', [123456]],
    ['Pay 1234.56 USD today', [123456]],
    ['The balance is $1,234.56.', [123456]],
    ['You owe $25.', [2500]],
    ['Copay $ 25 at visit', [2500]],
    ['Adjustment ($45.00)', [-4500]],
    ['Adjustment -$45.00', [-4500]],
    ['Payment received $45.00 CR', [-4500]],
    ['Patient responsibility: $0.00', [0]],
    ['Total US$40 or USD 40.00', [4000, 4000]],
    ['A fee of 35 dollars applies', [3500]],
    ['$3,000,000.00 judgment', [300000000]],
    ['$1,234, due now', [123400]],
  ])('reads %j', (text, expected) => {
    expect(cents(text)).toEqual(expected);
  });

  it.each([
    'Call 800-555-0199',
    'Form 1040 for tax year 2025',
    'Reference 2026-12-15',
    'Account 12345678',
    '$1,2345 is malformed',
    '$12.345 is malformed',
  ])('finds no amount in %j', (text) => {
    expect(cents(text)).toEqual([]);
  });

  it('reports where each amount is', () => {
    const text = 'Charges\nTotal billed: $900.00\nYou pay: ($12.50)\n';
    const found = findAmounts(text);
    expect(found.map((a) => [a.raw, a.line])).toEqual([
      ['$900.00', 2],
      ['($12.50)', 3],
    ]);
    for (const a of found) expect(text.slice(a.start, a.end)).toBe(a.raw);
  });

  it('parses a single claimed amount in any common form', () => {
    expect(parseAmount('$1,234.56')).toBe(123456);
    expect(parseAmount('1234.56')).toBe(123456);
    expect(parseAmount('1,234.5')).toBe(123450);
    expect(parseAmount(1234.56)).toBe(123456);
    expect(parseAmount(19.99)).toBe(1999);
    expect(parseAmount('  25 ')).toBe(2500);
    expect(parseAmount('$25.00 (twenty-five dollars)')).toBe(2500);
  });

  it('refuses a claim that is not exactly one amount', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount('none')).toBeNull();
    expect(parseAmount('$25.00 or $40.00')).toBeNull();
    expect(parseAmount(Number.NaN)).toBeNull();
  });

  it('formats cents', () => {
    expect(formatCents(123456)).toBe('$1,234.56');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(-4500)).toBe('-$45.00');
    expect(formatCents(300000005)).toBe('$3,000,000.05');
  });
});

describe('dates', () => {
  it.each([
    ['Respond by December 15, 2026.', ['2026-12-15']],
    ['Respond by Dec. 15, 2026', ['2026-12-15']],
    ['Respond by Dec 15 2026', ['2026-12-15']],
    ['Respond by December 15th, 2026', ['2026-12-15']],
    ['Due 12/15/2026', ['2026-12-15']],
    ['Due 12/15/26', ['2026-12-15']],
    ['Due 1/5/2027', ['2027-01-05']],
    ['Due 12-15-2026', ['2026-12-15']],
    ['Hearing on 15 December 2026', ['2026-12-15']],
    ['Hearing on the 15th of December, 2026', ['2026-12-15']],
    ['Notice date: 2026-11-20', ['2026-11-20']],
    ['Responda antes del 15 de diciembre de 2026', ['2026-12-15']],
    ['Fecha: 3 de enero del 2027', ['2027-01-03']],
    ['SEPTEMBER 3, 2026', ['2026-09-03']],
    ['Sept. 3, 2026', ['2026-09-03']],
  ])('reads %j', (text, expected) => {
    expect(days(text)).toEqual(expected);
  });

  it.each([
    'Due 13/15/2026',
    'Due 02/30/2026',
    'February 29, 2027',
    'SSN ending 123-45-6789',
    'Call 800-555-0199',
    'Version 1.2.3',
    'You may 15 times request a copy',
  ])('finds no date in %j', (text) => {
    expect(days(text)).toEqual([]);
  });

  it('accepts a leap day only in a leap year', () => {
    expect(days('February 29, 2028')).toEqual(['2028-02-29']);
  });

  it('takes the year of the letter when a date has none', () => {
    const text = 'Notice date: November 20, 2026\nPlease return the form by December 15.';
    const found = findDates(text);
    expect(found.map((d) => [d.value, d.yearInferred, d.line])).toEqual([
      ['2026-11-20', false, 1],
      ['2026-12-15', true, 2],
    ]);
  });

  it('rolls a year-less date into next year when it would otherwise be long past', () => {
    expect(days('December 20, 2026\nReply by January 15.')).toEqual(['2026-12-20', '2027-01-15']);
  });

  it('keeps a recent past date in the same year', () => {
    expect(days('November 20, 2026\nWe received your payment on November 3.')).toEqual(['2026-11-20', '2026-11-03']);
  });

  it('reads a year-less Spanish date', () => {
    expect(days('20 de noviembre de 2026\nResponda antes del 15 de diciembre.')).toEqual(['2026-11-20', '2026-12-15']);
  });

  it('drops a year-less date when nothing says which year', () => {
    expect(days('Reply by December 15.')).toEqual([]);
    expect(days('Reply by December 15.', { defaultYear: 2026 })).toEqual(['2026-12-15']);
    expect(days('Reply by December 15.', { letterDate: '2026-11-20' })).toEqual(['2026-12-15']);
  });

  it('does not read "December 15, 2026" twice', () => {
    expect(findDates('Due December 15, 2026')).toHaveLength(1);
  });

  it('reports where each date is', () => {
    const text = 'Line one\nAppear on 12/15/2026 at 9:00 AM';
    const [d] = findDates(text);
    expect(d?.raw).toBe('12/15/2026');
    expect(d?.line).toBe(2);
    expect(text.slice(d?.start, d?.end)).toBe('12/15/2026');
  });

  it('parses a single claimed date in any common form', () => {
    expect(parseDate('2026-12-15')).toBe('2026-12-15');
    expect(parseDate('2026-12-15T00:00:00')).toBe('2026-12-15');
    expect(parseDate('December 15, 2026')).toBe('2026-12-15');
    expect(parseDate('12/15/2026')).toBe('2026-12-15');
    expect(parseDate('December 15', { letterDate: '2026-11-20' })).toBe('2026-12-15');
  });

  it('refuses a claim that is not exactly one date', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('within 30 days')).toBeNull();
    expect(parseDate('December 15, 2026 or January 5, 2027')).toBeNull();
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-11-20', '2026-12-15')).toBe(25);
    expect(daysBetween('2026-12-15', '2026-11-20')).toBe(-25);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('phone numbers', () => {
  it.each([
    ['Call (800) 555-0199 today', ['8005550199']],
    ['Call (800)555-0199', ['8005550199']],
    ['Call 800-555-0199.', ['8005550199']],
    ['Call 800.555.0199', ['8005550199']],
    ['Call 1-800-555-0199', ['8005550199']],
    ['Call +1 800 555 0199', ['8005550199']],
    ['Call 1 (212) 555-0142', ['2125550142']],
    ['Order forms at 1-800-TAX-FORM', ['8008293676']],
    ['Questions? 1-800-829-HELP', ['8008294357']],
    ['Call 1-800-MEDICARE (TTY 1-877-486-2048)', ['8006334227', '8774862048']],
  ])('reads %j', (text, expected) => {
    expect(phones(text)).toEqual(expected);
  });

  it.each([
    'Account 8005550199',
    'Due 12-15-2026',
    'SSN ending 123-45-6789',
    'ZIP 90210-1234',
    'Case 2026-CV-001234',
    'Dial 711 for TTY',
  ])('finds no phone number in %j', (text) => {
    expect(phones(text)).toEqual([]);
  });

  it('reads an extension and includes it in the span', () => {
    const text = 'Call 800-555-0199 ext. 4521 before noon';
    const [p] = findPhones(text);
    expect(p?.value).toBe('8005550199');
    expect(p?.extension).toBe('4521');
    expect(p?.raw).toBe('800-555-0199 ext. 4521');
    expect(findPhones('Call (212) 555-0142 x12')[0]?.extension).toBe('12');
    expect(findPhones('Call (212) 555-0142, extension 7')[0]?.extension).toBe('7');
  });

  it('parses a single claimed number in any common form', () => {
    expect(parsePhone('(800) 555-0199')).toBe('8005550199');
    expect(parsePhone('18005550199')).toBe('8005550199');
    expect(parsePhone('8005550199')).toBe('8005550199');
    expect(parsePhone('+1-800-555-0199')).toBe('8005550199');
  });

  it('refuses a claim that is not exactly one number', () => {
    expect(parsePhone('')).toBeNull();
    expect(parsePhone('555-0199')).toBeNull();
    expect(parsePhone('800-555-0199 or 800-555-0142')).toBeNull();
  });

  it('formats a number', () => {
    expect(formatPhone('8005550199')).toBe('(800) 555-0199');
    expect(formatPhone('8005550199', '4521')).toBe('(800) 555-0199 ext. 4521');
  });
});

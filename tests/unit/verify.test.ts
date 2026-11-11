import { describe, expect, it } from 'vitest';
import { verifyAmount, verifyDate, verifyPhone, verifyQuote } from '../../src/domain/verify';

const BILL = [
  'Riverbend Medical Group',
  'Statement date: November 20, 2026',
  'Account number: RMG-0042-7719',
  '',
  'Total charges: $1,480.00',
  'Insurance paid: ($1,184.00)',
  'Patient balance: $296.00',
  'Minimum payment: $50.00',
  '',
  'Please pay $296.00 by December 15, 2026.',
  'Questions? Call (800) 555-0199 ext. 3, Monday to Friday.',
].join('\n');

describe('verifyAmount', () => {
  it('accepts a value the letter contains and returns every place it appears', () => {
    const v = verifyAmount(BILL, '296.00');
    expect(v.status).toBe('verified');
    if (v.status !== 'verified') return;
    expect(v.value).toBe(29600);
    expect(v.matches.map((m) => m.line)).toEqual([7, 10]);
  });

  it('accepts the same value written differently', () => {
    expect(verifyAmount(BILL, '$1,480').status).toBe('verified');
    expect(verifyAmount(BILL, 1480).status).toBe('verified');
    expect(verifyAmount(BILL, 'USD 50.00').status).toBe('verified');
  });

  it('shows the letter’s sign for a credit, not the model’s', () => {
    const v = verifyAmount(BILL, '1184.00');
    expect(v.status).toBe('verified');
    if (v.status === 'verified') expect(v.value).toBe(-118400);
  });

  it('rejects a value the letter does not contain and offers the real ones', () => {
    const v = verifyAmount(BILL, '$269.00');
    expect(v.status).toBe('unverified');
    if (v.status !== 'unverified') return;
    expect(v.claimed).toBe('$269.00');
    expect(v.candidates.map((c) => c.value)).toEqual([148000, -118400, 29600, 5000, 29600]);
  });

  it('rejects an answer that is not an amount', () => {
    expect(verifyAmount(BILL, 'the patient balance').status).toBe('unverified');
  });

  it('reports an empty answer as absent', () => {
    expect(verifyAmount(BILL, null).status).toBe('absent');
    expect(verifyAmount(BILL, '  ').status).toBe('absent');
  });
});

describe('verifyDate', () => {
  it('accepts a date the model rewrote in another format, with its position', () => {
    for (const claim of ['2026-12-15', '12/15/2026', 'Dec 15, 2026', '15 December 2026']) {
      const v = verifyDate(BILL, claim);
      expect(v.status, claim).toBe('verified');
      if (v.status !== 'verified') continue;
      expect(v.value).toBe('2026-12-15');
      expect(v.matches).toHaveLength(1);
      expect(v.matches[0]?.raw).toBe('December 15, 2026');
      expect(v.matches[0]?.line).toBe(10);
    }
  });

  it('rejects a date the letter never states', () => {
    const letter = 'Notice date: November 20, 2026\nReturn the renewal form within 30 days of this notice.';
    const v = verifyDate(letter, '12/15/2026');
    expect(v.status).toBe('unverified');
    if (v.status === 'unverified') expect(v.candidates.map((c) => c.value)).toEqual(['2026-11-20']);
  });

  it('matches a year-less date in the letter against a full date from the model', () => {
    const letter = 'November 20, 2026\nReturn the form by December 15.';
    const v = verifyDate(letter, '2026-12-15');
    expect(v.status).toBe('verified');
    if (v.status === 'verified') expect(v.matches[0]?.yearInferred).toBe(true);
  });

  it('resolves a year-less claim against the letter’s own date', () => {
    expect(verifyDate(BILL, 'December 15').status).toBe('verified');
  });

  it('reports an empty answer as absent', () => {
    expect(verifyDate(BILL, '').status).toBe('absent');
  });
});

describe('verifyPhone', () => {
  it('accepts the number however the model punctuates it', () => {
    for (const claim of ['800-555-0199', '1 (800) 555-0199', '8005550199']) {
      const v = verifyPhone(BILL, claim);
      expect(v.status, claim).toBe('verified');
      if (v.status === 'verified') expect(v.matches[0]?.extension).toBe('3');
    }
  });

  it('rejects a number with one digit changed', () => {
    const v = verifyPhone(BILL, '(800) 555-0189');
    expect(v.status).toBe('unverified');
    if (v.status === 'unverified') expect(v.candidates.map((c) => c.value)).toEqual(['8005550199']);
  });
});

describe('verifyQuote', () => {
  it('accepts text copied from the letter, ignoring case and line breaks', () => {
    const v = verifyQuote(BILL, 'riverbend medical group');
    expect(v.status).toBe('verified');
    if (v.status !== 'verified') return;
    expect(v.value).toBe('Riverbend Medical Group');
    expect(v.matches[0]?.line).toBe(1);

    const wrapped = verifyQuote('Office of the\n   County Clerk\nRoom 4', 'Office of the County Clerk');
    expect(wrapped.status).toBe('verified');
    if (wrapped.status === 'verified') expect(wrapped.value).toBe('Office of the\n   County Clerk');
  });

  it('accepts a reference number exactly', () => {
    expect(verifyQuote(BILL, 'RMG-0042-7719').status).toBe('verified');
    expect(verifyQuote(BILL, 'RMG-0042-7791').status).toBe('unverified');
  });

  it('rejects a sender the model made up or paraphrased', () => {
    expect(verifyQuote(BILL, 'Riverbend Hospital').status).toBe('unverified');
    expect(verifyQuote(BILL, 'x').status).toBe('unverified');
  });

  it('reports an empty answer as absent', () => {
    expect(verifyQuote(BILL, null).status).toBe('absent');
  });
});

import { describe, expect, it } from 'vitest';
import { isHeldOut, LABELS, type Label } from '../../eval/labels';
import { EXTRACT_FIELDS, type RawFields } from '../../src/ai/extract';
import type { Generate } from '../../src/ai/types';
import { LETTER_TYPE_IDS, letterType } from '../../src/domain/letterTypes';
import { findAmounts, parseAmount } from '../../src/domain/parse/amount';
import { findDates } from '../../src/domain/parse/date';
import { findPhones, parsePhone } from '../../src/domain/parse/phone';
import { verifyQuote } from '../../src/domain/verify';
import { EVAL_SET, LETTER_FILES } from '../../src/eval/dataset';
import { evaluateLetter, VARIANTS } from '../../src/eval/run';

/**
 * The answer key has to be answerable: everything a label asks for must be
 * findable in its letter by the same code the app uses, or the evaluation
 * would be marking the model against something the letter does not say.
 */

const each = EVAL_SET.map((item) => [item.label.file, item] as const);

const distinct = <T>(values: readonly T[]): number => new Set(values).size;

describe('evaluation set', () => {
  it('has one label for every letter and one letter for every label', () => {
    expect(LABELS.map((l) => l.file).sort()).toEqual([...LETTER_FILES.keys()].sort());
    expect(distinct(LABELS.map((l) => l.file))).toBe(LABELS.length);
  });

  it('holds out half the letters, and the held-out half covers every kind the development half lacks', () => {
    const held = LABELS.filter((l) => isHeldOut(l.file));
    const dev = LABELS.filter((l) => !isHeldOut(l.file));
    expect(held.length).toBe(dev.length);
    const missingFromDev = LETTER_TYPE_IDS.filter((id) => !dev.some((l) => l.type === id));
    for (const id of missingFromDev) expect(held.map((l) => l.type), id).toContain(id);
  });

  it('uses only kinds of letter the app knows', () => {
    for (const label of LABELS) expect(LETTER_TYPE_IDS).toContain(label.type);
  });

  it.each(each)('%s: the labelled amount is printed in the letter', (_file, { label, letter }) => {
    if (label.amount === null) return;
    const want = parseAmount(label.amount);
    expect(want).not.toBeNull();
    expect(findAmounts(letter).map((a) => Math.abs(a.value))).toContain(want);
  });

  it.each(each)('%s: the labelled deadline is printed in the letter', (_file, { label, letter }) => {
    if (label.deadline === null) return;
    expect(letter).toContain(label.deadline.printed);
    expect(findDates(letter).map((d) => d.value)).toContain(label.deadline.iso);
  });

  it.each(each)('%s: the labelled phone number is printed in the letter', (_file, { label, letter }) => {
    if (label.phone === null) return;
    expect(findPhones(letter).map((p) => p.value)).toContain(parsePhone(label.phone));
  });

  it.each(each)('%s: every accepted sender and reference can be quoted from the letter', (_file, { label, letter }) => {
    expect(label.sender.length).toBeGreaterThan(0);
    for (const quote of [...label.sender, ...label.reference]) {
      expect(verifyQuote(letter, quote).status, quote).toBe('verified');
    }
  });

  it.each(each)('%s: asks for no amount or date where the app shows none for that kind', (_file, { label }) => {
    const kind = letterType(label.type);
    if (kind.amount === 'none') expect(label.amount).toBeNull();
    if (kind.deadline === 'none') expect(label.deadline).toBeNull();
  });

  it.each(each)('%s: has the traps it is tagged with', (_file, { label, letter }) => {
    const has = (trap: Label['traps'][number]): boolean => label.traps.includes(trap);
    if (has('multiple_amounts')) expect(distinct(findAmounts(letter).map((a) => Math.abs(a.value)))).toBeGreaterThan(1);
    if (has('multiple_dates')) expect(distinct(findDates(letter).map((d) => d.value))).toBeGreaterThan(1);
    if (has('multiple_phones')) expect(distinct(findPhones(letter).map((p) => p.value))).toBeGreaterThan(1);
    if (has('relative_deadline')) expect(label.deadline).toBeNull();
    if (has('figure_is_not_a_charge')) expect(findAmounts(letter).length).toBeGreaterThan(0);
    if (has('numeric_dates')) expect(letter).toMatch(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    expect(has('no_reference')).toBe(label.reference.length === 0);
    expect(has('spanish')).toBe(label.language === 'es');
    expect(has('bilingual')).toBe(label.language === 'en+es');
    expect(distinct(label.traps)).toBe(label.traps.length);
  });

  it.each(each)('%s: is synthetic — reserved phone numbers and domains only', (_file, { letter }) => {
    for (const phone of findPhones(letter)) expect(phone.value.slice(3, 6), phone.raw).toBe('555');
    const hosts = letter.match(/\b(?:[a-z0-9-]+\.)+(?:com|org|net|edu|gov|us|io|co|info|example)\b/gi) ?? [];
    for (const host of hosts) expect(host).toMatch(/\.(?:example|gov)$/i);
    expect(letter).not.toMatch(/@(?![a-z0-9.-]+\.example\b)/i);
  });
});

/** A model that always gives the labelled answer. */
function perfect(label: Label): { classify: Generate; extract: Generate } {
  const fields: RawFields = {
    sender: label.sender[0] ?? '',
    reference: label.reference[0] ?? '',
    amount: label.amount ?? '',
    deadline: label.deadline?.printed ?? '',
    phone: label.phone ?? '',
  };
  return {
    classify: () => Promise.resolve({ text: JSON.stringify({ letter_type: label.type }), ms: 5 }),
    extract: () => Promise.resolve({ text: JSON.stringify(fields), ms: 9 }),
  };
}

describe('a model that gives the labelled answers', () => {
  it.each(each)('%s: scores right or correctly blank on every field, however the letter is read', async (_file, item) => {
    const result = await evaluateLetter(item, perfect(item.label), '2026-11-11');
    expect(result.classificationScore.model).toBe('right');
    expect(result.typeUsed).toBe(item.label.type);
    for (const variant of VARIANTS) {
      for (const field of EXTRACT_FIELDS) {
        const score = result.variants[variant].scores[field];
        const context = `${variant}.${field}`;
        expect(['right', 'blank'], context).toContain(score.alone);
        expect(score.final, context).toBe(score.alone);
        expect(score.lost, context).toBe(false);
        expect(score.caughtBy, context).toBeNull();
      }
    }
  });
});

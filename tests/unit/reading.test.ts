import { describe, expect, it } from 'vitest';
import { buildClassifyPrompt, classify, CLASSIFY_MAX_CHARS, CLASSIFY_SCHEMA, parseClassification } from '../../src/ai/classify';
import { buildExtractPrompt, EXTRACT_MAX_CHARS, EXTRACT_SCHEMA, parseExtraction } from '../../src/ai/extract';
import { readLetter } from '../../src/ai/read';
import type { Generate } from '../../src/ai/types';
import { daysLeft, localIsoDate } from '../../src/domain/deadline';
import { LETTER_TYPE_IDS, LETTER_TYPES, letterType } from '../../src/domain/letterTypes';

/** A model that gives a recorded answer and remembers what it was asked. */
function recorded(answer: unknown): Generate & { prompts: string[] } {
  const prompts: string[] = [];
  const generate = (prompt: string) => {
    prompts.push(prompt);
    return Promise.resolve({ text: typeof answer === 'string' ? answer : JSON.stringify(answer), ms: 7 });
  };
  return Object.assign(generate, { prompts });
}

const BILL = [
  'Riverbend Medical Group',
  'Statement date: November 20, 2026',
  'Account number: RMG-0042-7719',
  '',
  'Date of service: 10/02/2026',
  'Total charges: $1,480.00',
  'Insurance paid: ($1,184.00)',
  'Patient balance: $296.00',
  '',
  'Please pay $296.00 by December 15, 2026.',
  'Questions? Call (800) 555-0199 ext. 3, Monday to Friday.',
].join('\n');

const EOB = [
  'Northlake Health Plan',
  'EXPLANATION OF BENEFITS — THIS IS NOT A BILL',
  'Claim number: 2026-448812   Date of service: 10/02/2026',
  'Amount billed: $480.00   Plan paid: $355.00   You may owe: $25.00',
  'Member services: 1-800-555-0142',
].join('\n');

describe('classification prompt', () => {
  it('offers every kind with its description and only lets the model answer with an id', () => {
    const prompt = buildClassifyPrompt(BILL);
    for (const t of LETTER_TYPES) expect(prompt).toContain(`- ${t.id}: ${t.description}`);
    expect(prompt.endsWith(BILL)).toBe(true);
    expect(CLASSIFY_SCHEMA.properties.letter_type.enum).toEqual([...LETTER_TYPE_IDS]);
  });

  it('sends only the start of a very long letter', () => {
    const long = 'x'.repeat(CLASSIFY_MAX_CHARS) + 'TAIL';
    expect(buildClassifyPrompt(long)).not.toContain('TAIL');
  });

  it('accepts a known id and nothing else', () => {
    expect(parseClassification('{"letter_type":"medical_bill"}')).toBe('medical_bill');
    expect(parseClassification('{"letter_type":"invoice"}')).toBeNull();
    expect(parseClassification('{"letter_type":7}')).toBeNull();
    expect(parseClassification('medical_bill')).toBeNull();
    expect(parseClassification('null')).toBeNull();
  });
});

describe('classify', () => {
  it('settles when the model and the keywords agree', async () => {
    const result = await classify(BILL, recorded({ letter_type: 'medical_bill' }));
    expect(result).toMatchObject({ type: 'medical_bill', model: 'medical_bill', keywords: 'medical_bill', candidates: [], ms: 7 });
    expect(result.keywordEvidence.length).toBeGreaterThan(0);
  });

  it('refuses to settle when they disagree, and offers both', async () => {
    const result = await classify(EOB, recorded({ letter_type: 'medical_bill' }));
    expect(result.type).toBeNull();
    expect(result.candidates).toEqual(['medical_bill', 'insurance_eob']);
  });

  it('goes with the model when the keywords have no opinion', async () => {
    const result = await classify('Estimado cliente: su factura médica vence pronto.', recorded({ letter_type: 'medical_bill' }));
    expect(result).toMatchObject({ type: 'medical_bill', keywords: null, candidates: [] });
  });

  it('goes with the keywords when the model answer is unusable', async () => {
    const result = await classify(EOB, recorded('I think this is an insurance letter.'));
    expect(result).toMatchObject({ type: 'insurance_eob', model: null, keywords: 'insurance_eob' });
  });

  it('falls back to "other" when neither has an answer', async () => {
    const result = await classify('Hello.', recorded('{}'));
    expect(result).toMatchObject({ type: 'other', model: null, keywords: null });
  });
});

describe('extraction prompt', () => {
  it('asks for what the amount and the date mean in this kind of letter', () => {
    const rent = buildExtractPrompt('letter', letterType('rent_increase_or_lease_change'));
    expect(rent).toContain('- amount: the new monthly rent.');
    expect(rent).toContain('- deadline: the date the change takes effect.');
    expect(rent).toContain(letterType('rent_increase_or_lease_change').hint);

    const eob = buildExtractPrompt(EOB, letterType('insurance_eob'));
    expect(eob).toContain('- amount: leave this empty');
    expect(eob).toContain('- deadline: leave this empty');
  });

  it('has wording for every kind and caps the letter length', () => {
    for (const t of LETTER_TYPES) expect(buildExtractPrompt('x', t)).not.toContain('undefined');
    const long = 'x'.repeat(EXTRACT_MAX_CHARS) + 'TAIL';
    expect(buildExtractPrompt(long, letterType('other'))).not.toContain('TAIL');
  });

  it('constrains the answer to the five fields', () => {
    expect(Object.keys(EXTRACT_SCHEMA.properties)).toEqual([...EXTRACT_SCHEMA.required]);
    expect(EXTRACT_SCHEMA.additionalProperties).toBe(false);
  });

  it('reads the fields, tolerating missing ones and stray types', () => {
    expect(parseExtraction('{"sender":" Acme ","amount":296,"deadline":null,"extra":"x"}')).toEqual({
      sender: 'Acme',
      reference: '',
      amount: '296',
      deadline: '',
      phone: '',
    });
    expect(parseExtraction('not json')).toBeNull();
    expect(parseExtraction('[]')).toBeNull();
    expect(parseExtraction('"text"')).toBeNull();
  });
});

describe('readLetter', () => {
  const today = '2026-12-01';

  it('shows values the letter contains, in the letter’s own form, with where they are', async () => {
    const model = recorded({
      sender: 'riverbend medical group',
      reference: 'RMG-0042-7719',
      amount: '296',
      deadline: '12/15/2026',
      phone: '800-555-0199',
    });
    const reading = await readLetter(BILL, 'medical_bill', model, today);

    expect(reading.amount).toMatchObject({ status: 'verified', value: 29600 });
    expect(reading.amountMeaning).toBe('amount_due');
    expect(reading.deadline).toMatchObject({ status: 'verified', value: '2026-12-15' });
    expect(reading.daysLeft).toBe(14);
    expect(reading.phone).toMatchObject({ status: 'verified', value: '8005550199' });
    expect(reading.sender).toMatchObject({ status: 'verified', value: 'Riverbend Medical Group' });
    expect(reading.reference).toMatchObject({ status: 'verified', value: 'RMG-0042-7719' });
    if (reading.amount.status === 'verified') expect(reading.amount.matches.map((m) => m.line)).toEqual([8, 10]);
    expect(model.prompts[0]).toContain(letterType('medical_bill').hint);
  });

  it('shows nothing for a value the model made up, and offers what the letter really says', async () => {
    const model = recorded({ sender: 'Riverbend Hospital', reference: '', amount: '$269.00', deadline: 'December 5, 2026', phone: '(800) 555-0189' });
    const reading = await readLetter(BILL, 'medical_bill', model, today);

    expect(reading.amount.status).toBe('unverified');
    expect(reading.deadline.status).toBe('unverified');
    expect(reading.daysLeft).toBeNull();
    expect(reading.phone.status).toBe('unverified');
    expect(reading.sender.status).toBe('unverified');
    expect(reading.reference.status).toBe('absent');
    if (reading.deadline.status === 'unverified') {
      expect(reading.deadline.candidates.map((c) => c.value)).toEqual(['2026-11-20', '2026-10-02', '2026-12-15']);
    }
  });

  it('withholds a real amount on an Explanation of Benefits', async () => {
    const model = recorded({ sender: 'Northlake Health Plan', reference: '2026-448812', amount: '$25.00', deadline: '10/02/2026', phone: '1-800-555-0142' });
    const reading = await readLetter(EOB, 'insurance_eob', model, today);

    expect(reading.amount).toEqual({ status: 'not_applicable', withheld: true });
    expect(reading.deadline).toEqual({ status: 'not_applicable', withheld: true });
    expect(reading.daysLeft).toBeNull();
    expect(reading.phone.status).toBe('verified');
  });

  it('still lists what is in the letter when the model output cannot be parsed', async () => {
    const reading = await readLetter(BILL, 'medical_bill', recorded('Sorry, I cannot help with that.'), today);
    expect(reading.raw).toBeNull();
    expect(reading.amount.status).toBe('absent');
    if (reading.amount.status === 'absent') expect(reading.amount.candidates.length).toBe(4);
  });

  it('counts a deadline that has passed as negative days', async () => {
    const model = recorded({ sender: '', reference: '', amount: '', deadline: 'December 15, 2026', phone: '' });
    expect((await readLetter(BILL, 'medical_bill', model, '2026-12-20')).daysLeft).toBe(-5);
    expect((await readLetter(BILL, 'medical_bill', model, '2026-12-15')).daysLeft).toBe(0);
  });
});

describe('deadline arithmetic', () => {
  it('uses the reader’s local calendar day', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localIsoDate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('crosses month and year ends', () => {
    expect(daysLeft('2027-01-02', '2026-12-30')).toBe(3);
    expect(daysLeft('2028-03-01', '2028-02-28')).toBe(2);
  });
});

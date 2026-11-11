import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { classify } from '../../src/ai/classify';
import { readLetter } from '../../src/ai/read';
import type { Generate } from '../../src/ai/types';
import { keywordPrior } from '../../src/domain/keywordPrior';
import { en } from '../../src/i18n/en';
import { SAMPLE_LETTERS } from '../../src/samples/letters';
import { highlightsOf, letterLines } from '../../src/ui/highlights';
import { ReadingView } from '../../src/ui/ReadingView';

const recorded = (answer: unknown): Generate => () => Promise.resolve({ text: JSON.stringify(answer), ms: 1234 });

const sample = (id: string): string => {
  const found = SAMPLE_LETTERS.find((s) => s.id === id);
  if (!found) throw new Error(`no sample ${id}`);
  return found.text;
};

async function render(letter: string, kind: unknown, fields: unknown, today = '2026-12-01'): Promise<string> {
  const classification = await classify(letter, recorded(kind));
  const reading = await readLetter(letter, classification.type ?? 'other', recorded(fields), today);
  return renderToStaticMarkup(<ReadingView letter={letter} classification={classification} reading={reading} chosenByReader={false} t={en} />);
}

describe('letter lines', () => {
  it('reassembles to the letter exactly, whatever is highlighted', () => {
    const letter = 'Pay $5.00 by\nJanuary 3, 2027.\n\nThanks';
    const lines = letterLines(letter, [
      { start: 4, end: 9, field: 'amount' },
      { start: 13, end: 28, field: 'deadline' },
    ]);
    expect(lines.map((l) => l.number)).toEqual([1, 2, 3, 4]);
    expect(lines.map((l) => l.parts.map((p) => p.text).join('')).join('\n')).toBe(letter);
    expect(lines[0]?.parts).toEqual([{ text: 'Pay ' }, { text: '$5.00', field: 'amount' }, { text: ' by' }]);
    expect(lines[1]?.parts[0]).toEqual({ text: 'January 3, 2027', field: 'deadline' });
    expect(lines[2]?.parts).toEqual([]);
  });

  it('splits a highlight that runs across a line break', () => {
    const letter = 'Riverbend\nMedical Group';
    const lines = letterLines(letter, [{ start: 0, end: letter.length, field: 'sender' }]);
    expect(lines.map((l) => l.parts)).toEqual([[{ text: 'Riverbend', field: 'sender' }], [{ text: 'Medical Group', field: 'sender' }]]);
  });
});

describe('sample letters', () => {
  it('are recognised by the keyword check as what they are', () => {
    expect(keywordPrior(sample('medical-bill')).type).toBe('medical_bill');
    expect(keywordPrior(sample('eob')).type).toBe('insurance_eob');
    expect(keywordPrior(sample('tax-proposed')).type).toBe('tax_proposed_change');
  });
});

describe('reading view', () => {
  it('shows checked values with their lines and marks them in the letter', async () => {
    const html = await render(
      sample('medical-bill'),
      { letter_type: 'medical_bill' },
      { sender: 'Riverbend Medical Group', reference: 'RMG-0042-7719', amount: '296.00', deadline: '12/15/2026', phone: '800-555-0199' },
    );
    expect(html).toContain('Medical bill');
    expect(html).toContain('Amount to pay');
    expect(html).toContain('<p class="fact-value">$296.00</p>');
    expect(html).toContain('<mark data-field="amount">$296.00</mark>');
    expect(html).toContain('Pay by');
    expect(html).toContain('December 15, 2026');
    expect(html).toContain('14 days from today.');
    expect(html).toContain('(800) 555-0199');
    expect(html).toContain('On device · 1.2 s');
    expect(html).toContain(en.kind.agreed);
  });

  it('never prints a value the letter does not contain as a fact', async () => {
    const html = await render(
      sample('medical-bill'),
      { letter_type: 'medical_bill' },
      { sender: 'Riverbend Medical Group', reference: '', amount: '$926.00', deadline: 'December 5, 2026', phone: '' },
    );
    expect(html).not.toContain('<p class="fact-value">$926.00</p>');
    expect(html).not.toContain('<p class="fact-value">December 5, 2026</p>');
    expect(html).toContain('That is not in the letter');
    expect(html).toContain(en.field.inTheLetter);
    expect(html).not.toContain('data-field="amount">$');
  });

  it('shows no amount and no deadline on an Explanation of Benefits', async () => {
    const html = await render(
      sample('eob'),
      { letter_type: 'insurance_eob' },
      { sender: 'Northlake Health Plan', reference: '2026-448812', amount: '$296.00', deadline: '10/02/2026', phone: '1-800-555-0142' },
    );
    expect(html).toContain('Explanation of Benefits (not a bill)');
    expect(html).toContain(en.field.noAmountWithheld);
    expect(html).toContain(en.field.noDeadlineWithheld);
    expect(html).not.toContain('<mark data-field="amount">');
    expect(html).not.toContain('<mark data-field="deadline">');
    expect(html).toContain('<mark data-field="phone">1-800-555-0142</mark>');
  });

  it('labels a proposed amount as not yet owed', async () => {
    const html = await render(
      sample('tax-proposed'),
      { letter_type: 'tax_proposed_change' },
      { sender: 'Internal Revenue Service', reference: 'CP2000', amount: '$1,214', deadline: 'December 9, 2026', phone: '1-800-555-0177' },
    );
    expect(html).toContain('Amount proposed (not yet owed)');
    expect(html).toContain('<p class="fact-value">$1,214</p>');
    expect(html).toContain('Reply by');
    expect(html).toContain('8 days from today.');
  });

  it('names every line of a value that runs over a line break', async () => {
    const html = await render(
      sample('tax-proposed'),
      { letter_type: 'tax_proposed_change' },
      { sender: 'Department of the Treasury Internal Revenue Service', reference: '', amount: '', deadline: '', phone: '' },
    );
    expect(html).toContain('lines 1, 2');
  });

  it('highlights only verified facts', async () => {
    const letter = sample('medical-bill');
    const reading = await readLetter(letter, 'medical_bill', recorded({ sender: 'Nobody', reference: '', amount: '1', deadline: '', phone: '' }), '2026-12-01');
    expect(highlightsOf(reading)).toEqual([]);
  });
});

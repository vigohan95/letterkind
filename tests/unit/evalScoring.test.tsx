import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Classification } from '../../src/ai/classify';
import { buildExtractPrompt, type RawFields } from '../../src/ai/extract';
import { readLetter } from '../../src/ai/read';
import type { Generate } from '../../src/ai/types';
import { letterType } from '../../src/domain/letterTypes';
import { type EvalItem, EVAL_SET } from '../../src/eval/dataset';
import { Report } from '../../src/eval/Report';
import { type EvalRun, resultFileName, serialise } from '../../src/eval/result';
import { evaluate, evaluateLetter } from '../../src/eval/run';
import { matches, scoreClassification, scoreReading, typeToUse } from '../../src/eval/score';
import { fieldsRead, summarise, timing } from '../../src/eval/summary';

const TODAY = '2026-11-11';

const recorded = (answer: unknown): Generate => () => Promise.resolve({ text: JSON.stringify(answer), ms: 1234 });

function item(prefix: string): EvalItem {
  const found = EVAL_SET.find((i) => i.label.file.startsWith(prefix));
  if (!found) throw new Error(`no letter ${prefix}`);
  return found;
}

async function scored(prefix: string, fields: RawFields) {
  const { label, letter } = item(prefix);
  const reading = await readLetter(letter, label.type, recorded(fields), TODAY);
  return scoreReading(reading, label, letter);
}

const BILL: RawFields = { sender: 'Cedar Hollow Family Clinic', reference: 'CH-208814', amount: '$375.00', deadline: 'November 23, 2026', phone: '(503) 555-0148' };
const EOB: RawFields = { sender: 'Harborview Mutual Health', reference: '2026-1187-4402', amount: '', deadline: '', phone: '1-800-555-0172' };

describe('scoring a field', () => {
  it('marks the labelled answers right, with nothing caught and nothing lost', async () => {
    const scores = await scored('04', BILL);
    for (const score of Object.values(scores)) expect(score).toEqual({ alone: 'right', final: 'right', caughtBy: null, lost: false });
  });

  it('counts a made-up amount as wrong for the model and stopped by the check against the letter', async () => {
    const scores = await scored('04', { ...BILL, amount: '$735.00' });
    expect(scores.amount).toEqual({ alone: 'wrong', final: 'missed', caughtBy: 'verify', lost: false });
  });

  it('counts a real but wrong figure as wrong for both: the check cannot know which figure was meant', async () => {
    const scores = await scored('04', { ...BILL, amount: '$125.00' });
    expect(scores.amount).toEqual({ alone: 'wrong', final: 'wrong', caughtBy: null, lost: false });
  });

  it('counts a figure from a statement that is not a bill as stopped by the rules for that kind of letter', async () => {
    const scores = await scored('05', { ...EOB, amount: '$145.60' });
    expect(scores.amount).toEqual({ alone: 'wrong', final: 'blank', caughtBy: 'rules', lost: false });
  });

  it('counts a made-up figure on a statement that is not a bill as stopped by the check, not the rules', async () => {
    const scores = await scored('05', { ...EOB, amount: '$999.99' });
    expect(scores.amount).toEqual({ alone: 'wrong', final: 'blank', caughtBy: 'verify', lost: false });
  });

  it('scores an empty answer as blank where nothing belongs and missed where something does', async () => {
    expect((await scored('05', EOB)).amount).toEqual({ alone: 'blank', final: 'blank', caughtBy: null, lost: false });
    expect((await scored('04', { ...BILL, phone: '' })).phone).toEqual({ alone: 'missed', final: 'missed', caughtBy: null, lost: false });
  });

  it('records a right answer the app could not confirm as lost', async () => {
    const scores = await scored('04', { ...BILL, sender: 'Cedar Hollow Family Clinic Billing' });
    expect(scores.sender).toEqual({ alone: 'right', final: 'missed', caughtBy: null, lost: true });
  });

  it('accepts the same value written another way, and nothing else', () => {
    const { label } = item('04');
    expect(matches('amount', '375', label)).toBe(true);
    expect(matches('amount', '375.01', label)).toBe(false);
    expect(matches('deadline', '11/23/2026', label)).toBe(true);
    expect(matches('deadline', 'November 2, 2026', label)).toBe(false);
    expect(matches('phone', '503-555-0148', label)).toBe(true);
    expect(matches('reference', 'Account number: CH-208814', label)).toBe(true);
    expect(matches('reference', 'CH-208841', label)).toBe(false);
    expect(matches('sender', 'CEDAR HOLLOW FAMILY CLINIC', label)).toBe(true);
    expect(matches('sender', 'Cedar Hollow', label)).toBe(false);
    expect(matches('sender', 'Patient Billing Office', label)).toBe(false);
  });
});

const classification = (over: Partial<Classification>): Classification => ({
  type: 'medical_bill',
  model: 'medical_bill',
  keywords: 'medical_bill',
  keywordEvidence: [],
  candidates: [],
  ms: 1,
  ...over,
});

describe('scoring the kind of letter', () => {
  it('scores agreement on the right kind', () => {
    expect(scoreClassification(classification({}), 'medical_bill')).toEqual({ model: 'right', keywords: 'right', combined: 'right', askedWithAnswer: false });
  });

  it('scores a disagreement as asked, and says whether the right kind was on offer', () => {
    const asked = classification({ type: null, model: 'insurance_eob', keywords: 'medical_bill', candidates: ['insurance_eob', 'medical_bill'] });
    expect(scoreClassification(asked, 'medical_bill')).toEqual({ model: 'wrong', keywords: 'right', combined: 'asked', askedWithAnswer: true });
    expect(typeToUse(asked, 'medical_bill')).toBe('medical_bill');
    expect(scoreClassification(asked, 'utility_bill')).toEqual({ model: 'wrong', keywords: 'wrong', combined: 'asked', askedWithAnswer: false });
    expect(typeToUse(asked, 'utility_bill')).toBe('insurance_eob');
  });

  it('scores silence from the keyword rules as no opinion, and a shared mistake as wrong', () => {
    expect(scoreClassification(classification({ keywords: null }), 'medical_bill').keywords).toBe('none');
    const both = classification({});
    expect(scoreClassification(both, 'utility_bill')).toEqual({ model: 'wrong', keywords: 'wrong', combined: 'wrong', askedWithAnswer: false });
    expect(typeToUse(both, 'utility_bill')).toBe('medical_bill');
  });
});

describe('reading without the hint', () => {
  it('leaves the hint for the kind of letter out of the prompt and keeps everything else', () => {
    const kind = letterType('medical_bill');
    const withHint = buildExtractPrompt('A letter.', kind);
    const without = buildExtractPrompt('A letter.', kind, { hint: false });
    expect(withHint).toContain(kind.hint);
    expect(without).not.toContain(kind.hint);
    expect(without).not.toContain('HOW TO READ THIS KIND OF LETTER');
    expect(without).toContain('A letter.');
  });
});

/** A model that calls every letter a medical bill and always reports the same $125.00, due on a date no letter has. */
const stubborn = {
  classify: recorded({ letter_type: 'medical_bill' }),
  extract: recorded({ sender: '', reference: '', amount: '$125.00', deadline: 'March 3, 2031', phone: '' }),
};

describe('summary', () => {
  it('takes the middle value as the median', () => {
    expect(timing([])).toEqual({ median: 0, max: 0 });
    expect(timing([9, 1, 5])).toEqual({ median: 5, max: 9 });
    expect(timing([4, 1, 2, 9])).toEqual({ median: 3, max: 9 });
  });

  it('adds up to five fields a letter, in every variant, and matches the letters it came from', async () => {
    const letters = await evaluate(EVAL_SET.slice(0, 6), stubborn, TODAY);
    const summary = summarise(letters);
    expect(summary.letters).toBe(6);
    for (const variant of Object.values(summary.variants)) {
      expect(fieldsRead(variant.total)).toBe(30);
      expect(variant.total.alone.right + variant.total.alone.blank + variant.total.alone.wrong + variant.total.alone.missed).toBe(30);
      expect(variant.total.caughtByVerify + variant.total.caughtByRules).toBe(variant.total.alone.wrong - variant.total.final.wrong);
      expect(variant.ms).toEqual({ median: 1234, max: 1234 });
    }
    // The date is in no letter, so it never reaches the screen.
    expect(summary.variants.full.fields.deadline.alone.wrong).toBe(6);
    expect(summary.variants.full.fields.deadline.final.wrong).toBe(0);
    expect(summary.variants.full.fields.deadline.caughtByVerify).toBe(6);
    // $125.00 is printed in letter 04 only, where it is the instalment and not the balance.
    expect(summary.variants.full.fields.amount.final.wrong).toBe(1);
    expect(summary.classification.model).toEqual({ right: 1, wrong: 5 });
    expect(summarise(letters)).toEqual(summary);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it('stops early when told to, and reports progress letter by letter', async () => {
    const seen: number[] = [];
    const letters = await evaluate(EVAL_SET, stubborn, TODAY, { onLetter: (done) => seen.push(done.length), stopped: () => seen.length >= 2 });
    expect(letters).toHaveLength(2);
    expect(seen).toEqual([1, 2]);
  });
});

describe('report', () => {
  it('shows the headline counts, every field and every letter', async () => {
    const letters = await evaluate(EVAL_SET.slice(0, 5), stubborn, TODAY);
    const summary = summarise(letters);
    const html = renderToStaticMarkup(<Report letters={letters} summary={summary} setSize={EVAL_SET.length} />);
    expect(html).toContain(`Partial run: 5 of ${EVAL_SET.length} letters.`);
    expect(html).toContain('wrong values the app shows');
    for (const name of ['Sender', 'Reference', 'Amount', 'Deadline', 'Phone', 'All fields']) expect(html).toContain(name);
    for (const letter of letters) expect(html).toContain(letter.file.replace(/\.txt$/, ''));
    expect(html).toContain('Model said: &quot;$125.00&quot;');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('splits the counts into development and held-out letters when the run has both', async () => {
    const both = await evaluate([EVAL_SET[0]!, EVAL_SET[EVAL_SET.length - 1]!], stubborn, TODAY);
    const html = renderToStaticMarkup(<Report letters={both} summary={summarise(both)} setSize={EVAL_SET.length} />);
    expect(html).toContain('Development (01–20)');
    expect(html).toContain('Held out (21 on)');
    const devOnly = await evaluate(EVAL_SET.slice(0, 2), stubborn, TODAY);
    expect(renderToStaticMarkup(<Report letters={devOnly} summary={summarise(devOnly)} setSize={EVAL_SET.length} />)).not.toContain('Held out');
  });

  it('says nothing about a partial run when the whole set was read', async () => {
    const letters = [await evaluateLetter(item('04'), stubborn, TODAY)];
    const html = renderToStaticMarkup(<Report letters={letters} summary={summarise(letters)} setSize={1} />);
    expect(html).not.toContain('Partial run');
  });
});

const RESULTS = import.meta.glob<EvalRun>('../../eval/results/*.json', { import: 'default', eager: true });

describe('result files', () => {
  it('names a file after the day and the commit', () => {
    expect(resultFileName({ startedAt: '2026-11-11T18:04:05.000Z', commit: 'abc1234' })).toBe('nano-2026-11-11-abc1234.json');
  });

  it.each(Object.entries(RESULTS))('%s: the summary is the one its letters add up to, for the set as it is now', (path, run) => {
    expect(run.schema).toBe(1);
    expect(run.commit).toMatch(/^[0-9a-f]{7,}$/);
    expect(path).toContain(resultFileName(run));
    expect(summarise(run.letters)).toEqual(run.summary);
    expect(run.setSize).toBeGreaterThanOrEqual(run.letters.length);
    for (const letter of run.letters) {
      const label = EVAL_SET.find((i) => i.label.file === letter.file)?.label;
      expect(label?.type, letter.file).toBe(letter.truth);
    }
    expect(serialise(run)).toBe(serialise(JSON.parse(serialise(run)) as EvalRun));
  });
});

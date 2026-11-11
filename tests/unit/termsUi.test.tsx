import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { classify } from '../../src/ai/classify';
import { readLetter } from '../../src/ai/read';
import type { Generate } from '../../src/ai/types';
import { findTerms } from '../../src/domain/glossary';
import type { LanguageId } from '../../src/domain/languages';
import { term, type TermId } from '../../src/domain/terms';
import type { TermSource } from '../../src/guidance/live';
import { memoryStore } from '../../src/guidance/store';
import { type MeaningOutcome, meaningOf, ownMeaning, type TermRequest } from '../../src/guidance/term';
import { en } from '../../src/i18n/en';
import { CLOUD_MODEL, createChannel, type Transport } from '../../src/outbound/channel';
import { Ledger } from '../../src/outbound/ledger';
import { highlightsOf, letterLines } from '../../src/ui/highlights';
import { LetterView } from '../../src/ui/LetterView';
import { ReadingView } from '../../src/ui/ReadingView';
import { GlossedLetter, TermPanel, type TermStatus } from '../../src/ui/Terms';

const recorded = (answer: unknown): Generate => () => Promise.resolve({ text: JSON.stringify(answer), ms: 7 });

const BILL = [
  'Riverbend Medical Group',
  'Account number: RMG-0042-7719',
  'Your deductible has not been met. Patient balance: $296.00',
  'Please pay $296.00 by December 15, 2026, or it may go to a collection agency.',
  'Questions? Call (800) 555-0199.',
].join('\n');

const deductible = 'deductible' as TermId;
/** What the glossary itself says: the English shown as it is, and beside every translation of it. */
const GLOSS = term(deductible).meaning;
const ENGLISH_BLOCK = `<div class="term-english"><h4>${en.terms.english}</h4><p lang="en">${GLOSS}</p></div>`;
const ES = 'El deducible (deductible) es lo que usted paga cada año por la atención cubierta antes de que su plan de salud empiece a pagar.';
const KO = '공제액(deductible)은 건강 보험이 비용을 내기 시작하기 전에 매년 본인이 먼저 내야 하는 금액입니다.';
const json = (explanation: string): string => JSON.stringify({ explanation });

const nothing = (): void => {};
const never: TermSource = { ask: () => new Promise<MeaningOutcome>(nothing) };

const answering =
  (text: string): Transport =>
  (prepared) =>
    Promise.resolve({ text, ran: prepared.route === 'device_first' ? 'device' : 'cloud' });

function setup(transport: Transport) {
  const ledger = new Ledger();
  let tick = 0;
  const channel = createChannel({ transport, ledger, now: () => new Date('2026-12-01T10:00:00.000Z'), clock: () => (tick += 1600) });
  return { ledger, deps: { channel, store: memoryStore() } };
}

const inSpanish: TermRequest = { purpose: 'term', term: deductible, language: 'es' };
const inKorean: TermRequest = { purpose: 'term', term: deductible, language: 'ko' };

const panel = (status: TermStatus, language: LanguageId = 'es'): string =>
  renderToStaticMarkup(<TermPanel term={deductible} status={status} language={language} onAsk={nothing} onClose={nothing} t={en} />);

describe('letter lines with glossary terms', () => {
  it('cuts the letter at terms as well as at facts, and still reassembles it exactly', () => {
    const letter = 'Pay $5.00 now.\nYour deductible applies; see the late fees.';
    const lines = letterLines(letter, [{ start: 4, end: 9, field: 'amount' }], findTerms(letter));
    expect(lines.map((l) => l.parts.map((p) => p.text).join('')).join('\n')).toBe(letter);
    expect(lines[0]?.parts).toEqual([{ text: 'Pay ' }, { text: '$5.00', field: 'amount' }, { text: ' now.' }]);
    expect(lines[1]?.parts).toEqual([
      { text: 'Your ' },
      { text: 'deductible', term: 'deductible' },
      { text: ' applies; see the ' },
      { text: 'late fees', term: 'late-fee' },
      { text: '.' },
    ]);
  });

  it('lets a fact win where a term overlaps it', () => {
    const letter = 'From: Notice of Deficiency Unit. Your claim is open.';
    const lines = letterLines(letter, [{ start: 6, end: 31, field: 'sender' }], findTerms(letter));
    expect(lines[0]?.parts).toEqual([
      { text: 'From: ' },
      { text: 'Notice of Deficiency Unit', field: 'sender' },
      { text: '. Your ' },
      { text: 'claim', term: 'claim' },
      { text: ' is open.' },
    ]);
  });

  it('does not take the indent of the next line into a term broken over two lines', () => {
    const letter = 'This is an adverse\r\n   action on your case.';
    const lines = letterLines(letter, [], findTerms(letter));
    expect(lines[0]?.parts).toEqual([{ text: 'This is an ' }, { text: 'adverse', term: 'adverse-action' }, { text: '\r' }]);
    expect(lines[1]?.parts).toEqual([{ text: '   ' }, { text: 'action', term: 'adverse-action' }, { text: ' on your case.' }]);
  });

  it('is unchanged when no terms are given', () => {
    const letter = 'Your deductible applies.';
    expect(letterLines(letter, [])[0]?.parts).toEqual([{ text: letter }]);
  });
});

describe('the letter with terms that can be tapped', () => {
  it('shows a term as a button only when something will happen on a tap', () => {
    const terms = findTerms(BILL);
    const plain = renderToStaticMarkup(<LetterView letter={BILL} highlights={[]} terms={terms} />);
    expect(plain).not.toContain('<button');
    expect(plain).toContain('Your deductible has not been met.');

    const live = renderToStaticMarkup(<LetterView letter={BILL} highlights={[]} terms={terms} chosen={deductible} onTerm={nothing} />);
    expect(live).toContain('<button type="button" class="term" data-term="deductible" aria-pressed="true">deductible</button>');
    expect(live).toContain('<button type="button" class="term" data-term="collection-agency" aria-pressed="false">collection agency</button>');
  });

  it('says, before any tap, that English meanings are the glossary’s own and a tap sends nothing', () => {
    // A source that fails the test if it is ever asked: in English there is nobody to ask.
    const untouched: TermSource = {
      ask: () => {
        throw new Error('asked for a meaning the glossary already has');
      },
    };
    const html = renderToStaticMarkup(<GlossedLetter letter={BILL} highlights={[]} language="en" source={untouched} t={en} />);
    expect(html).toContain(en.terms.inEnglish(en.guidance.heading));
    expect(en.terms.inEnglish(en.guidance.heading)).toContain('no model writes them');
    expect(html).toContain('data-term="deductible"');
  });

  it('says, before any tap, where a translation will be made: on this device for a language its model can write', () => {
    const html = renderToStaticMarkup(<GlossedLetter letter={BILL} highlights={[]} language="es" source={never} t={en} />);
    expect(html).toContain(en.terms.onDevice('Spanish', en.guidance.heading));
    expect(html).not.toContain(en.terms.inCloud('Spanish', en.guidance.heading));
    expect(html).toContain('data-term="deductible"');
    // Nothing is asked until a word is tapped.
    expect(html).not.toContain('term-panel');
  });

  it('says, before any tap, that a language the device cannot write means asking the cloud, and what is sent', () => {
    const html = renderToStaticMarkup(<GlossedLetter letter={BILL} highlights={[]} language="ko" source={never} t={en} />);
    expect(html).toContain(en.terms.inCloud('Korean', en.guidance.heading));
    expect(en.terms.inCloud('Korean', en.guidance.heading)).toContain('which word you asked about');
  });

  it('adds nothing to a letter with no glossary terms in it', () => {
    const letter = 'Dear Sam, thank you for the lovely card.';
    const html = renderToStaticMarkup(<GlossedLetter letter={letter} highlights={[]} language="en" source={never} t={en} />);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('class="hint"');
    expect(html).toContain(letter);
  });

  it('is what the reading shows when it is given a way to ask, and facts stay marked', async () => {
    const classification = await classify(BILL, recorded({ letter_type: 'medical_bill' }));
    const reading = await readLetter(
      BILL,
      'medical_bill',
      recorded({ sender: 'Riverbend Medical Group', reference: 'RMG-0042-7719', amount: '$296.00', deadline: '12/15/2026', phone: '800-555-0199' }),
      '2026-12-01',
    );
    expect(highlightsOf(reading).length).toBeGreaterThan(0);
    const without = renderToStaticMarkup(<ReadingView letter={BILL} classification={classification} reading={reading} chosenByReader={false} t={en} />);
    expect(without).not.toContain('data-term');

    const withTerms = renderToStaticMarkup(
      <ReadingView letter={BILL} classification={classification} reading={reading} chosenByReader={false} terms={{ language: 'en', source: never }} t={en} />,
    );
    expect(withTerms).toContain('data-term="deductible"');
    expect(withTerms).toContain('<mark data-field="amount">$296.00</mark>');
    expect(withTerms).toContain(en.terms.inEnglish(en.guidance.heading));
  });
});

describe('what a tapped term shows', () => {
  it('names the term as the glossary writes it', () => {
    expect(panel({ at: 'asking' })).toContain(en.terms.heading('deductible'));
    expect(panel({ at: 'asking' })).toContain(en.terms.close);
  });

  it('shows the glossary’s own meaning in English: no model, no request, nothing to ask for', () => {
    const html = panel({ at: 'answered', meaning: ownMeaning(deductible) }, 'en');
    expect(html).toContain(`<p class="term-meaning" lang="en">${GLOSS}</p>`);
    expect(html).toContain('data-from="glossary"');
    expect(html).toContain(en.terms.fromGlossary);
    expect(html).toContain(en.terms.general);
    // Said once: there is no second copy of the English, no translation caveat, nothing to press but Close.
    expect(html.split(GLOSS)).toHaveLength(2);
    expect(html).not.toContain(en.terms.translated);
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it('says where the translation is being made while it waits, with the English already there to read', () => {
    expect(panel({ at: 'asking' }, 'es')).toContain(en.terms.asking(true));
    expect(panel({ at: 'asking' }, 'ko')).toContain(en.terms.asking(false));
    expect(panel({ at: 'asking' })).toContain('role="status"');
    expect(panel({ at: 'asking' }, 'ko')).toContain(ENGLISH_BLOCK);
  });

  it('offers the translation again after the language was changed, and asks nobody until told to', () => {
    const html = panel({ at: 'ask' }, 'ko');
    expect(html).toContain(en.terms.ask('Korean'));
    expect(html).not.toContain(KO);
    expect(html).toContain(ENGLISH_BLOCK);
  });

  it('shows a translation made on this device beside the English, and says nothing was sent', async () => {
    const meaning = await meaningOf(inSpanish, setup(answering(json(ES))).deps);
    const html = panel({ at: 'answered', meaning });
    expect(html).toContain(`<p class="term-meaning" lang="es" dir="auto">${ES}</p>`);
    expect(html).toContain(ENGLISH_BLOCK);
    expect(html).toContain('data-from="device"');
    expect(html).toContain(en.terms.fromDevice(1600));
    expect(html).toContain('Nothing was sent');
    expect(html).toContain(`${en.terms.general} ${en.terms.translated}`);
  });

  it('shows a translation made in the cloud, with what it was sent', async () => {
    const meaning = await meaningOf(inKorean, setup(answering(json(KO))).deps);
    if (meaning.status !== 'ready' || !meaning.entry) throw new Error('expected a meaning with a ledger entry');
    const html = panel({ at: 'answered', meaning }, 'ko');
    expect(html).toContain(`lang="ko" dir="auto">${KO}</p>`);
    expect(html).toContain(ENGLISH_BLOCK);
    expect(html).toContain('data-from="cloud"');
    expect(html).toContain(en.terms.fromCloud(CLOUD_MODEL, 1600, meaning.entry.bytes));
    expect(html).not.toContain('Nothing was sent');
  });

  it('shows a kept translation and says nothing was sent this time', async () => {
    const { deps } = setup(answering(json(ES)));
    await meaningOf(inSpanish, deps);
    const html = panel({ at: 'answered', meaning: await meaningOf(inSpanish, deps) });
    expect(html).toContain(ES);
    expect(html).toContain('data-from="saved"');
    expect(html).toContain('Nothing was sent this time.');
  });

  it('shows nothing of a translation that broke a rule, says which rule, and still shows the English', async () => {
    const meaning = await meaningOf(inSpanish, setup(answering(json('El deducible suele ser de $500 cada año.'))).deps);
    const html = panel({ at: 'answered', meaning });
    expect(html).toContain(en.terms.rejectedHeading);
    expect(html).toContain(en.guidance.rejected.amount('$500'));
    expect(html).not.toContain('suele ser');
    expect(html).toContain(en.guidance.askAgain);
    expect(html).toContain(ENGLISH_BLOCK);
  });

  it('says so when no translation could be had, without blaming the reader, and still shows the English', async () => {
    const offline: Transport = () => Promise.reject(new Error('Failed to reach the service.'));
    const none = panel({ at: 'answered', meaning: await meaningOf(inKorean, setup(offline).deps) }, 'ko');
    expect(none).toContain(en.terms.unavailableHeading);
    expect(none).toContain(en.terms.unavailableBody);
    expect(none).toContain('Failed to reach the service.');
    expect(none).toContain(en.guidance.askAgain);
    expect(none).toContain(ENGLISH_BLOCK);

    const full: Transport = () => Promise.reject(Object.assign(new Error('[429 ] You exceeded your current quota.'), { customErrorData: { status: 429 } }));
    const limited = panel({ at: 'answered', meaning: await meaningOf(inKorean, setup(full).deps) }, 'ko');
    expect(limited).toContain(en.guidance.limitBody);
    expect(limited).not.toContain('quota');
    expect(limited).toContain(ENGLISH_BLOCK);
  });
});

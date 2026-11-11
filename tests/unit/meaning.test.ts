import { describe, expect, it } from 'vitest';
import type { LanguageId } from '../../src/domain/languages';
import { parseMeaning, roomFor } from '../../src/domain/meaning';
import { TemplateRejected } from '../../src/domain/template';
import { term, type TermId } from '../../src/domain/terms';
import { memoryStore } from '../../src/guidance/store';
import { meaningOf, ownMeaning, savedMeaning, type TermRequest } from '../../src/guidance/term';
import { createChannel, type Transport } from '../../src/outbound/channel';
import { Ledger } from '../../src/outbound/ledger';

const deductible = 'deductible' as TermId;
/** What the glossary itself says: the English a translation is made from and held against. */
const GLOSS = term(deductible).meaning;

const EN = 'A deductible is the amount you pay for care each year before your health plan starts to pay.';
const KO = '공제액(deductible)은 건강 보험이 비용을 내기 시작하기 전에 매년 본인이 먼저 내야 하는 금액입니다.';
const ES = 'El deducible (deductible) es lo que usted paga cada año por la atención cubierta antes de que su plan de salud empiece a pagar.';

const json = (explanation: unknown, more: Record<string, unknown> = {}): string => JSON.stringify({ explanation, ...more });

function rejection(answer: string, language: LanguageId = 'es', english: string = GLOSS): string {
  try {
    parseMeaning(answer, language, english);
  } catch (error) {
    if (error instanceof TemplateRejected) return `${error.reason}:${error.field}`;
    throw error;
  }
  return 'accepted';
}

describe('a glossary meaning, as a model put it into another language', () => {
  it('accepts a short plain translation in the language asked for', () => {
    expect(parseMeaning(json(` ${KO} `), 'ko', GLOSS)).toEqual({ explanation: KO });
    expect(parseMeaning(json(ES), 'es', GLOSS)).toEqual({ explanation: ES });
  });

  it('rejects anything that is not exactly one piece of text', () => {
    expect(rejection('El deducible es lo que usted paga primero.')).toBe('not_json:answer');
    expect(rejection(json(ES, { source: 'healthcare' }))).toBe('wrong_shape:source');
    expect(rejection(json(''))).toBe('wrong_shape:explanation');
    expect(rejection(json(['a', 'b']))).toBe('wrong_shape:explanation');
  });

  it('gives a translation room in proportion to the English, and no more', () => {
    expect(roomFor(GLOSS)).toBe(2 * GLOSS.length + 60);
    expect(roomFor('x'.repeat(400))).toBe(600);
    // Far longer than the meaning it translates: something was added.
    const padded = `${ES} ${'Además, cada plan de salud tiene sus propias reglas sobre esto. '.repeat(3)}`;
    expect(padded.length).toBeGreaterThan(roomFor(GLOSS));
    expect(padded.length).toBeLessThan(600);
    expect(rejection(json(padded))).toBe('too_long:explanation');
    expect(rejection(json(padded), 'es', 'x'.repeat(400))).toBe('accepted');
  });

  it('rejects a translation that states an amount, a date, a phone number or an address of its own', () => {
    expect(rejection(json('El deducible suele ser de $1,500 al año antes de que el plan pague.'))).toBe('amount:explanation');
    expect(rejection(json('The tax year ends on December 31 for most people.'))).toBe('date:explanation');
    expect(rejection(json('Llame al 1-800-555-0100 para saber cuál es su deducible.'))).toBe('phone:explanation');
    expect(rejection(json('Búsquelo en healthcare.gov para ver qué significa.'))).toBe('web_address:explanation');
  });

  it('rejects a gap left for a detail of the letter: a meaning has none', () => {
    expect(rejection(json('Es la {{AMOUNT}} que usted paga antes de que el plan pague.'))).toBe('marker_not_allowed_here:explanation');
  });

  it('rejects the English handed back, or any language other than the one asked for', () => {
    expect(rejection(json(GLOSS), 'ko')).toBe('not_in_language:explanation');
    expect(rejection(json(EN), 'es')).toBe('not_in_language:explanation');
    expect(rejection(json(KO), 'es')).toBe('not_in_language:explanation');
    // The English term kept in brackets inside a sentence of the right language is how it is asked for.
    expect(rejection(json(KO), 'ko')).toBe('accepted');
  });
});

describe('the meaning the glossary itself gives', () => {
  it('is the entry as written, from no model and with nothing sent', () => {
    expect(ownMeaning(deductible)).toEqual({ status: 'ready', template: { explanation: GLOSS }, from: 'glossary', at: null, entry: null });
  });
});

const device =
  (text: string): Transport =>
  (prepared) =>
    Promise.resolve({ text, ran: prepared.route === 'device_first' ? 'device' : 'cloud' });
const offline: Transport = () => Promise.reject(new Error('Failed to reach the service.'));

function setup(transport: Transport) {
  const ledger = new Ledger();
  let tick = 0;
  let calls = 0;
  const counting: Transport = (prepared) => {
    calls += 1;
    return transport(prepared);
  };
  const channel = createChannel({ transport: counting, ledger, now: () => new Date('2026-12-01T10:00:00.000Z'), clock: () => (tick += 1600) });
  return { ledger, deps: { channel, store: memoryStore() }, calls: () => calls };
}

describe('asking for a glossary meaning in another language', () => {
  const inSpanish: TermRequest = { purpose: 'term', term: deductible, language: 'es' };
  const inKorean: TermRequest = { purpose: 'term', term: deductible, language: 'ko' };

  it('is translated on the device where the device can write the language, and nothing leaves', async () => {
    const { ledger, deps } = setup(device(json(ES)));
    const meaning = await meaningOf(inSpanish, deps);

    expect(meaning).toMatchObject({ status: 'ready', template: { explanation: ES }, from: 'device' });
    expect(ledger.entries()).toHaveLength(1);
    expect(ledger.entries()[0]).toMatchObject({ left: 'stayed', ran: 'device', route: 'device_first' });
    expect(ledger.totals()).toMatchObject({ sent: 0, attempted: 0, stayed: 1, bytesOut: 0 });
  });

  it('goes to the cloud for a language the device cannot write, carrying the entry and the language only', async () => {
    const { ledger, deps } = setup(device(json(KO)));
    const meaning = await meaningOf(inKorean, deps);

    expect(meaning).toMatchObject({ status: 'ready', template: { explanation: KO }, from: 'cloud' });
    const entry = ledger.entries()[0];
    expect(entry).toMatchObject({ left: 'sent', ran: 'cloud', route: 'cloud_only' });
    expect(entry?.request).toEqual({ purpose: 'term', term: 'deductible', language: 'ko' });
    // The model is handed the glossary's own wording to translate; it is not asked what the word means.
    expect(entry?.prompt).toContain('Term: deductible');
    expect(entry?.prompt).toContain(`Meaning: ${GLOSS}`);
    expect(entry?.prompt).toContain('into Korean');
  });

  it('says so when the device could not write it and the cloud did', async () => {
    const { ledger, deps } = setup(() => Promise.resolve({ text: json(ES), ran: 'cloud' }));
    const meaning = await meaningOf(inSpanish, deps);

    expect(meaning).toMatchObject({ status: 'ready', from: 'cloud' });
    expect(ledger.entries()[0]).toMatchObject({ left: 'sent', route: 'device_first' });
  });

  it('keeps a translation that passed, and asks nobody the second time', async () => {
    const { ledger, deps, calls } = setup(device(json(ES)));
    expect(await savedMeaning(inSpanish, deps.store)).toBeNull();
    await meaningOf(inSpanish, deps);

    const again = await meaningOf(inSpanish, deps);
    expect(again).toMatchObject({ status: 'ready', template: { explanation: ES }, from: 'saved', entry: null });
    expect(await savedMeaning(inSpanish, deps.store)).toMatchObject({ from: 'saved' });
    expect(calls()).toBe(1);
    expect(ledger.entries()).toHaveLength(1);
    // Kept for one language is not kept for another.
    expect(await savedMeaning(inKorean, deps.store)).toBeNull();
  });

  it('shows nothing of a translation that broke a rule, and does not keep it', async () => {
    const { deps, calls } = setup(device(json('El deducible suele ser de $500.')));
    const meaning = await meaningOf(inSpanish, deps);

    expect(meaning).toMatchObject({ status: 'rejected', reason: 'amount', field: 'explanation' });
    expect(JSON.stringify(meaning)).not.toContain('suele ser');
    expect(await savedMeaning(inSpanish, deps.store)).toBeNull();
    await meaningOf(inSpanish, deps);
    expect(calls()).toBe(2);
  });

  it('reports that no answer could be had', async () => {
    const { ledger, deps } = setup(offline);
    expect(await meaningOf(inKorean, deps)).toMatchObject({ status: 'unavailable', why: 'no_answer', error: 'Failed to reach the service.' });
    expect(ledger.entries()[0]).toMatchObject({ left: 'attempted', ran: 'nowhere' });
  });
});

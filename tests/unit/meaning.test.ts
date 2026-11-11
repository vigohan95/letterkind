import { describe, expect, it } from 'vitest';
import { parseMeaning } from '../../src/domain/meaning';
import { TemplateRejected } from '../../src/domain/template';
import type { TermId } from '../../src/domain/terms';
import { memoryStore } from '../../src/guidance/store';
import { meaningOf, savedMeaning, type TermRequest } from '../../src/guidance/term';
import { createChannel, type Transport } from '../../src/outbound/channel';
import { Ledger } from '../../src/outbound/ledger';

const deductible = 'deductible' as TermId;

const EN = 'A deductible is the amount you pay for care each year before your health plan starts to pay. Until you reach it, most bills are yours to pay.';
const KO = '공제액은 건강 보험이 비용을 내기 시작하기 전에 매년 본인이 먼저 내야 하는 금액입니다. 그 금액에 이를 때까지는 대부분의 청구서를 본인이 냅니다.';
const ES = 'El deducible es lo que usted paga cada año por su atención antes de que su seguro empiece a pagar. Hasta llegar a esa cantidad, casi todas las facturas le tocan a usted.';

const json = (explanation: unknown, more: Record<string, unknown> = {}): string => JSON.stringify({ explanation, ...more });

function rejection(answer: string, language: Parameters<typeof parseMeaning>[1] = 'en'): string {
  try {
    parseMeaning(answer, language);
  } catch (error) {
    if (error instanceof TemplateRejected) return `${error.reason}:${error.field}`;
    throw error;
  }
  return 'accepted';
}

describe('the meaning of a term, as a model wrote it', () => {
  it('accepts a short plain meaning in the language asked for', () => {
    expect(parseMeaning(json(EN), 'en')).toEqual({ explanation: EN });
    expect(parseMeaning(json(` ${KO} `), 'ko')).toEqual({ explanation: KO });
    expect(parseMeaning(json(ES), 'es')).toEqual({ explanation: ES });
  });

  it('rejects anything that is not exactly one piece of text', () => {
    expect(rejection('A deductible is what you pay first.')).toBe('not_json:answer');
    expect(rejection(json(EN, { source: 'healthcare' }))).toBe('wrong_shape:source');
    expect(rejection(json(''))).toBe('wrong_shape:explanation');
    expect(rejection(json(['a', 'b']))).toBe('wrong_shape:explanation');
    expect(rejection(json('word '.repeat(200)))).toBe('too_long:explanation');
  });

  it('rejects a meaning that states an amount, a date, a phone number or an address of its own', () => {
    expect(rejection(json('A deductible is often $1,500 a year before the plan pays.'))).toBe('amount:explanation');
    expect(rejection(json('The tax year ends on December 31 for most people.'))).toBe('date:explanation');
    expect(rejection(json('Call 1-800-555-0100 to ask what your deductible is.'))).toBe('phone:explanation');
    expect(rejection(json('Look it up on healthcare.gov to see what it means.'))).toBe('web_address:explanation');
  });

  it('rejects a gap left for a detail of the letter: a meaning has none', () => {
    expect(rejection(json('It is the {{AMOUNT}} you pay before the plan pays.'))).toBe('marker_not_allowed_here:explanation');
  });

  it('rejects a meaning written in another language than the one asked for, short as it is', () => {
    expect(rejection(json(EN), 'ko')).toBe('not_in_language:explanation');
    expect(rejection(json(EN), 'es')).toBe('not_in_language:explanation');
    expect(rejection(json(KO), 'en')).toBe('not_in_language:explanation');
    // A term kept in English inside a sentence of the right language is how such a meaning is written.
    expect(rejection(json(`"Deductible"(공제액)은 ${KO}`), 'ko')).toBe('accepted');
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

describe('asking what a term means', () => {
  const inEnglish: TermRequest = { purpose: 'term', term: deductible, language: 'en' };
  const inKorean: TermRequest = { purpose: 'term', term: deductible, language: 'ko' };

  it('is answered on the device where the device can write the language, and nothing leaves', async () => {
    const { ledger, deps } = setup(device(json(EN)));
    const meaning = await meaningOf(inEnglish, deps);

    expect(meaning).toMatchObject({ status: 'ready', template: { explanation: EN }, from: 'device' });
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
    expect(entry?.prompt).toContain('"deductible"');
    expect(entry?.prompt).toContain('Korean');
  });

  it('says so when the device could not write it and the cloud did', async () => {
    const { ledger, deps } = setup(() => Promise.resolve({ text: json(EN), ran: 'cloud' }));
    const meaning = await meaningOf(inEnglish, deps);

    expect(meaning).toMatchObject({ status: 'ready', from: 'cloud' });
    expect(ledger.entries()[0]).toMatchObject({ left: 'sent', route: 'device_first' });
  });

  it('keeps a meaning that passed, and asks nobody the second time', async () => {
    const { ledger, deps, calls } = setup(device(json(EN)));
    expect(await savedMeaning(inEnglish, deps.store)).toBeNull();
    await meaningOf(inEnglish, deps);

    const again = await meaningOf(inEnglish, deps);
    expect(again).toMatchObject({ status: 'ready', template: { explanation: EN }, from: 'saved', entry: null });
    expect(await savedMeaning(inEnglish, deps.store)).toMatchObject({ from: 'saved' });
    expect(calls()).toBe(1);
    expect(ledger.entries()).toHaveLength(1);
    // Kept for one language is not kept for another.
    expect(await savedMeaning(inKorean, deps.store)).toBeNull();
  });

  it('shows nothing of a meaning that broke a rule, and does not keep it', async () => {
    const { deps, calls } = setup(device(json('A deductible is often $500.')));
    const meaning = await meaningOf(inEnglish, deps);

    expect(meaning).toMatchObject({ status: 'rejected', reason: 'amount', field: 'explanation' });
    expect(JSON.stringify(meaning)).not.toContain('is often');
    expect(await savedMeaning(inEnglish, deps.store)).toBeNull();
    await meaningOf(inEnglish, deps);
    expect(calls()).toBe(2);
  });

  it('reports that no answer could be had', async () => {
    const { ledger, deps } = setup(offline);
    expect(await meaningOf(inKorean, deps)).toMatchObject({ status: 'unavailable', why: 'no_answer', error: 'Failed to reach the service.' });
    expect(ledger.entries()[0]).toMatchObject({ left: 'attempted', ran: 'nowhere' });
  });
});

import { describe, expect, it } from 'vitest';
import { readLetter } from '../../src/ai/read';
import type { Generate } from '../../src/ai/types';
import { LANGUAGE_IDS } from '../../src/domain/languages';
import { explain, type ExplainRequest, savedGuidance, templateKey } from '../../src/guidance/explain';
import { memoryStore, type TemplateStore } from '../../src/guidance/store';
import { dateInWords, daysInWords, valuesOf } from '../../src/guidance/values';
import { createChannel, type Transport } from '../../src/outbound/channel';
import { Ledger } from '../../src/outbound/ledger';
import { promptFor } from '../../src/outbound/prompts';

const request: ExplainRequest = { purpose: 'explain', type: 'medical_bill', state: 'CA', language: 'es' };

const good = JSON.stringify({
  what: 'Esta es una factura de {{SENDER}} por atención que ya recibió.',
  steps: ['Compare la factura con el resumen de su seguro.', 'Pague {{AMOUNT}} o pida un plan de pagos antes del {{DEADLINE}} ({{DAYS_LEFT}}).'],
  if_ignored: 'Una factura sin pagar puede pasar a una agencia de cobros.',
  who_can_help: ['La oficina de facturación del hospital.'],
  reading_hint: 'The amount due is usually labelled "Patient balance".',
});

const withItsOwnPhone = JSON.stringify({ ...(JSON.parse(good) as object), if_ignored: 'Llame al 1-800-555-0100.' });

function setup(transport: Transport, store: TemplateStore = memoryStore()) {
  const ledger = new Ledger();
  let tick = 0;
  let calls = 0;
  const channel = createChannel({
    transport: (prepared) => {
      calls += 1;
      return transport(prepared);
    },
    ledger,
    now: () => new Date('2026-12-01T10:00:00.000Z'),
    clock: () => (tick += 250),
  });
  return { deps: { channel, store }, ledger, store, calls: () => calls };
}

const cloud =
  (text: string): Transport =>
  () =>
    Promise.resolve({ text, ran: 'cloud' });
const device =
  (text: string): Transport =>
  () =>
    Promise.resolve({ text, ran: 'device' });
const offline: Transport = () => Promise.reject(new Error('Failed to reach the service.'));

describe('asking for an explanation', () => {
  it('sends the one fixed request, checks the answer and keeps it on the device', async () => {
    const { deps, ledger, store } = setup(cloud(good));
    const result = await explain(request, deps);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.from).toBe('cloud');
    expect(result.template.steps).toHaveLength(2);
    expect(result.at).toBe('2026-12-01T10:00:00.000Z');
    expect(result.entry).toBe(ledger.entries()[0]);
    expect(result.entry?.prompt).toBe(promptFor(request));
    expect(await store.get(templateKey(request))).toEqual({ text: good, at: '2026-12-01T10:00:00.000Z' });
  });

  it('explains the next letter of the same kind from the saved copy, with the network gone', async () => {
    const store = memoryStore();
    await explain(request, setup(cloud(good), store).deps);

    const later = setup(offline, store);
    const result = await explain(request, later.deps);

    expect(result).toMatchObject({ status: 'ready', from: 'saved', at: '2026-12-01T10:00:00.000Z', entry: null });
    expect(later.calls()).toBe(0);
    expect(later.ledger.entries()).toHaveLength(0);
  });

  it('files a template under kind, state and language, so no other request finds it', async () => {
    const store = memoryStore();
    await explain(request, setup(cloud(good), store).deps);

    for (const other of [
      { ...request, language: 'en' },
      { ...request, state: 'NY' },
      { ...request, type: 'utility_shutoff' },
    ] satisfies ExplainRequest[]) {
      expect(templateKey(other)).not.toBe(templateKey(request));
      expect(await savedGuidance(other, store)).toBeNull();
    }
    expect(templateKey(request)).not.toMatch(/Riverbend|296|555/);
  });

  it('shows nothing from an answer that breaks a rule, and does not keep it', async () => {
    const { deps, ledger, store } = setup(cloud(withItsOwnPhone));
    const result = await explain(request, deps);

    expect(result).toMatchObject({ status: 'rejected', reason: 'phone', field: 'if_ignored', ran: 'cloud' });
    if (result.status === 'rejected') expect(result.entry).toBe(ledger.entries()[0]);
    expect(await store.get(templateKey(request))).toBeNull();
    expect(JSON.stringify(result)).not.toContain('Compare la factura');
  });

  it('uses a template the device wrote, but does not keep it in place of the cloud’s', async () => {
    const store = memoryStore();
    const first = await explain(request, setup(device(good), store).deps);
    expect(first).toMatchObject({ status: 'ready', from: 'device' });
    expect(await store.get(templateKey(request))).toBeNull();

    const second = setup(cloud(good), store);
    expect(await explain(request, second.deps)).toMatchObject({ status: 'ready', from: 'cloud' });
    expect(second.calls()).toBe(1);
  });

  it('says so when no answer can be had, and writes the attempt down', async () => {
    const { deps, ledger } = setup(offline);
    const result = await explain(request, deps);

    expect(result).toEqual({ status: 'unavailable', error: 'Failed to reach the service.' });
    expect(ledger.entries()).toHaveLength(1);
    expect(ledger.entries()[0]).toMatchObject({ ran: 'nowhere', left: 'attempted' });
  });

  it('trusts a saved copy no more than a fresh answer', async () => {
    const store = memoryStore();
    await store.put(templateKey(request), { text: withItsOwnPhone, at: '2026-11-01T00:00:00.000Z' });
    expect(await savedGuidance(request, store)).toBeNull();

    const { deps, calls } = setup(cloud(good), store);
    expect(await explain(request, deps)).toMatchObject({ status: 'ready', from: 'cloud' });
    expect(calls()).toBe(1);
    expect((await store.get(templateKey(request)))?.text).toBe(good);
  });

  it('still answers when the device refuses to keep anything', async () => {
    const broken: TemplateStore = {
      get: () => Promise.resolve(null),
      put: () => Promise.reject(new Error('quota')),
      clear: () => Promise.resolve(),
    };
    const result = await explain(request, setup(cloud(good), broken).deps);
    expect(result).toMatchObject({ status: 'ready', from: 'cloud' });
  });

  it('forgets everything when asked', async () => {
    const store = memoryStore();
    await explain(request, setup(cloud(good), store).deps);
    await store.clear();
    expect(await savedGuidance(request, store)).toBeNull();
  });
});

function recorded(answer: unknown): Generate {
  return () => Promise.resolve({ text: JSON.stringify(answer), ms: 7 });
}

const BILL = [
  'Riverbend  Medical Group',
  'Statement date: November 20, 2026',
  'Account number: RMG-0042-7719',
  '',
  'Total charges: $1,480.00',
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

describe('the details that fill a template', () => {
  const truthful = recorded({ sender: 'riverbend medical group', reference: 'RMG-0042-7719', amount: '296', deadline: '12/15/2026', phone: '800-555-0199' });

  it('gives each verified detail, the amount as printed and the date in words', async () => {
    const reading = await readLetter(BILL, 'medical_bill', truthful, '2026-12-01');
    expect(valuesOf(reading, 'en')).toEqual({
      SENDER: 'Riverbend Medical Group',
      REFERENCE: 'RMG-0042-7719',
      AMOUNT: '$296.00',
      DEADLINE: 'December 15, 2026',
      DAYS_LEFT: 'in 14 days',
      PHONE: '(800) 555-0199 ext. 3',
    });
  });

  it('writes the date and the count of days in the language of the guidance', async () => {
    const reading = await readLetter(BILL, 'medical_bill', truthful, '2026-12-01');
    expect(valuesOf(reading, 'es')).toMatchObject({ DEADLINE: '15 de diciembre de 2026', DAYS_LEFT: 'dentro de 14 días', AMOUNT: '$296.00' });
    expect(valuesOf(reading, 'zh-Hans')).toMatchObject({ DEADLINE: '2026年12月15日', DAYS_LEFT: '14天后' });
  });

  it('gives nothing for a detail the model made up', async () => {
    const invented = recorded({ sender: 'Riverbend Hospital', reference: '', amount: '$269.00', deadline: 'December 5, 2026', phone: '(800) 555-0189' });
    const reading = await readLetter(BILL, 'medical_bill', invented, '2026-12-01');
    expect(valuesOf(reading, 'en')).toEqual({});
  });

  it('gives no amount for a letter whose figures are not a bill', async () => {
    const model = recorded({ sender: 'Northlake Health Plan', reference: '2026-448812', amount: '$25.00', deadline: '', phone: '1-800-555-0142' });
    const values = valuesOf(await readLetter(EOB, 'insurance_eob', model, '2026-12-01'), 'en');
    expect(values).not.toHaveProperty('AMOUNT');
    expect(values).not.toHaveProperty('DEADLINE');
    expect(values).not.toHaveProperty('DAYS_LEFT');
    expect(values.SENDER).toBe('Northlake Health Plan');
  });

  it('says today, tomorrow and overdue in plain words', () => {
    expect(daysInWords(0, 'en')).toBe('today');
    expect(daysInWords(1, 'en')).toBe('tomorrow');
    expect(daysInWords(-5, 'en')).toBe('5 days ago');
    expect(daysInWords(1, 'es')).toBe('mañana');
  });

  it('never moves a date across midnight, whatever the clock of the computer', () => {
    expect(dateInWords('2026-01-01', 'en')).toBe('January 1, 2026');
    expect(dateInWords('2026-12-31', 'en')).toBe('December 31, 2026');
  });

  it('can write a date and a count of days in every language offered', () => {
    for (const language of LANGUAGE_IDS) {
      expect(dateInWords('2026-12-15', language).length).toBeGreaterThan(5);
      expect(daysInWords(14, language).length).toBeGreaterThan(2);
    }
    const dates = new Set(LANGUAGE_IDS.map((language) => dateInWords('2026-12-15', language)));
    expect(dates.size).toBeGreaterThanOrEqual(9);
  });
});

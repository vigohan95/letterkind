import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { type Reading, readLetter } from '../../src/ai/read';
import type { Generate } from '../../src/ai/types';
import { type Draft, draftReply, type ReadyDraft, type ReplyRequest } from '../../src/guidance/reply';
import type { ReplySource } from '../../src/guidance/live';
import { memoryStore } from '../../src/guidance/store';
import { en } from '../../src/i18n/en';
import { createChannel, type Transport } from '../../src/outbound/channel';
import { Ledger } from '../../src/outbound/ledger';
import { LedgerView } from '../../src/ui/LedgerView';
import type { Prefs } from '../../src/ui/prefs';
import { ReplyBody, ReplyPanel } from '../../src/ui/Reply';

const recorded = (answer: unknown): Generate => () => Promise.resolve({ text: JSON.stringify(answer), ms: 7 });

const BILL = [
  'Riverbend Medical Group',
  'Account number: RMG-0042-7719',
  'Patient balance: $296.00',
  'Please pay $296.00 by December 15, 2026.',
  'Questions? Call (800) 555-0199.',
].join('\n');

const truthful = recorded({ sender: 'Riverbend Medical Group', reference: 'RMG-0042-7719', amount: '$296.00', deadline: '12/15/2026', phone: '800-555-0199' });
const invented = recorded({ sender: 'Riverbend Hospital', reference: '', amount: '$269.00', deadline: 'December 5, 2026', phone: '' });
const read = (model: Generate): Promise<Reading> => readLetter(BILL, 'medical_bill', model, '2026-12-01');

const request: ReplyRequest = { purpose: 'reply', type: 'medical_bill', state: 'CA', language: 'es' };
const prefs: Prefs = { state: 'CA', language: 'es' };

const answer = JSON.stringify({
  subject: 'Request for an itemized bill, account {{REFERENCE}}',
  body_en: '[YOUR FULL NAME]\n\n{{SENDER}}\n\nI received your bill for {{AMOUNT}}, due {{DEADLINE}} ({{DAYS_LEFT}}). Please send me an itemized statement.\n\n[YOUR SIGNATURE]',
  body_translated: '[SU NOMBRE COMPLETO]\n\n{{SENDER}}\n\nRecibí su factura por {{AMOUNT}}, con vencimiento el {{DEADLINE}}. Les pido un desglose detallado.\n\n[SU FIRMA]',
  before_sending: ['Guarde una copia de esta carta.', 'Envíela antes del {{DEADLINE}} ({{DAYS_LEFT}}).'],
});

const cloud =
  (text: string): Transport =>
  () =>
    Promise.resolve({ text, ran: 'cloud' });
const offline: Transport = () => Promise.reject(new Error('Failed to reach the service.'));

function setup(transport: Transport) {
  const ledger = new Ledger();
  let tick = 0;
  const channel = createChannel({ transport, ledger, now: () => new Date('2026-12-01T10:00:00.000Z'), clock: () => (tick += 1200) });
  return { ledger, deps: { channel, store: memoryStore() } };
}

async function ready(): Promise<{ draft: ReadyDraft; ledger: Ledger }> {
  const { ledger, deps } = setup(cloud(answer));
  const draft = await draftReply(request, deps);
  if (draft.status !== 'ready') throw new Error(`expected a draft, got ${draft.status}`);
  return { draft, ledger };
}

const nothing = (): void => {};
const body = (draft: Draft, reading: Reading): string =>
  renderToStaticMarkup(<ReplyBody status={{ at: 'answered', outcome: draft }} reading={reading} language="es" onAsk={nothing} t={en} />);

describe('the reply panel', () => {
  it('names the same three things before anything is asked, and nothing from the letter', async () => {
    const source: ReplySource = { saved: () => Promise.resolve(null), ask: () => Promise.reject(new Error('not asked')) };
    const html = renderToStaticMarkup(<ReplyPanel reading={await read(truthful)} prefs={prefs} source={source} t={en} />);

    expect(html.match(/<dt>/g)).toHaveLength(3);
    expect(html).toContain('<dd>Medical bill</dd>');
    expect(html).toContain('<dd>California</dd>');
    expect(html).toContain('<dd>Spanish</dd>');
    expect(html).not.toMatch(/Riverbend|296|555-0199|RMG-0042/);
  });

  it('says whose the blanks are, next to the button that sends', async () => {
    const html = renderToStaticMarkup(<ReplyBody status={{ at: 'ask' }} reading={await read(truthful)} language="es" onAsk={nothing} t={en} />);
    expect(html).toContain(en.reply.nothingElse);
    expect(html).toContain('Draft a reply');
  });

  it('fills the letter to send in English and the one to read in the reader’s language', async () => {
    const { draft } = await ready();
    const html = body(draft, await read(truthful));

    expect(html).toContain('<div class="reply-letter" lang="en" dir="ltr">');
    expect(html).toContain('due <mark data-field="deadline"><bdi>December 15, 2026</bdi></mark>. Please send');
    expect(html).toContain('<mark data-field="sender"><bdi>Riverbend Medical Group</bdi></mark>');
    expect(html).toContain('<mark data-field="amount"><bdi>$296.00</bdi></mark>');
    expect(html).toContain('account <mark data-field="reference"><bdi>RMG-0042-7719</bdi></mark>');

    expect(html).toContain('<div class="reply-letter reply-reading" lang="es" dir="auto">');
    expect(html).toContain('vencimiento el <mark data-field="deadline"><bdi>15 de diciembre de 2026</bdi></mark>. Les pido');
    expect(html).toContain('What it says, in Spanish');
    expect(html).toContain(en.reply.translatedNote);
  });

  it('marks every blank and counts the ones in the letter to send', async () => {
    const { draft } = await ready();
    const html = body(draft, await read(truthful));

    expect(html).toContain('<span class="blank">[YOUR FULL NAME]</span>');
    expect(html).toContain('<span class="blank">[YOUR SIGNATURE]</span>');
    expect(html).toContain('<span class="blank">[SU FIRMA]</span>');
    expect(html).toContain('2 places in square brackets are left for you to fill in by hand.');
  });

  it('counts the days only in the checklist, never in the letter', async () => {
    const { draft } = await ready();
    const html = body(draft, await read(truthful));

    expect(html.match(/dentro de 14 días/g)).toHaveLength(1);
    expect(html).toContain('<li dir="auto">Envíela antes del <mark data-field="deadline"><bdi>15 de diciembre de 2026</bdi></mark> (<mark data-field="deadline"><bdi>dentro de 14 días</bdi></mark>).</li>');
    expect(html).not.toContain('in 14 days');
  });

  it('leaves a blank where the letter gave no detail that could be checked, and never the model’s guess', async () => {
    const { draft } = await ready();
    const html = body(draft, await read(invented));

    expect(html).toContain('I received your bill for <span class="blank">[AMOUNT ON THE LETTER]</span>, due <span class="blank">[DATE ON THE LETTER]</span>.');
    expect(html).toContain('<span class="blank">[la cantidad que aparece en su carta]</span>');
    expect(html).toContain('6 places in square brackets are left for you to fill in by hand.');
    expect(html).not.toMatch(/269|December 5|Riverbend Hospital/);
  });

  it('says where the draft came from, and that it is a draft', async () => {
    const { draft } = await ready();
    const html = body(draft, await read(truthful));
    expect(html).toContain('<p class="fact-source" data-from="cloud">');
    expect(html).toContain(en.reply.draftNote);
    expect(html).toContain('Copy the reply');

    const kept = body({ ...draft, from: 'saved', entry: null }, await read(truthful));
    expect(kept).toContain('<p class="fact-source" data-from="saved">Kept on this device since December 1, 2026. Nothing was sent this time.</p>');
  });

  it('shows nothing of a draft that broke a rule, and says which', async () => {
    const broken = JSON.stringify({ ...(JSON.parse(answer) as object), body_translated: 'A quien corresponda:\nRecibí su factura.\n[SU FIRMA]' });
    const { deps } = setup(cloud(broken));
    const html = body(await draftReply(request, deps), await read(truthful));

    expect(html).toContain('The draft was thrown away');
    expect(html).toContain('Its translation did not match the English');
    expect(html).toContain('data-field="body_translated"');
    expect(html).not.toContain('itemized statement');
    expect(html).toContain('Ask again');
  });

  it('says plainly when no draft could be had', async () => {
    const { deps } = setup(offline);
    const html = body(await draftReply(request, deps), await read(truthful));
    expect(html).toContain(en.reply.unavailableHeading);
    expect(html).toContain(en.reply.unavailableBody);
    expect(html).toContain('Failed to reach the service.');
  });

  it('says when the allowance for one minute is used up, without the server\'s talk of plans and billing', async () => {
    const full: Transport = () => Promise.reject(Object.assign(new Error('[429 ] You exceeded your current quota, please check your plan and billing details.'), { customErrorData: { status: 429 } }));
    const html = body(await draftReply(request, setup(full).deps), await read(truthful));
    expect(html).toContain(en.guidance.limitBody);
    expect(html).not.toContain(en.reply.unavailableBody);
    expect(html).not.toContain('billing');
    expect(html).toContain('Ask again');
  });

  it('says the model in the cloud was busy, and does not blame the connection for it', async () => {
    const busy: Transport = () => Promise.reject(Object.assign(new Error('[500 ] This model is currently experiencing high demand.'), { customErrorData: { status: 500 } }));
    const html = body(await draftReply(request, setup(busy).deps), await read(truthful));
    expect(html).toContain(en.reply.unavailableHeading);
    expect(html).toContain(en.guidance.busyBody);
    expect(html).not.toContain('experiencing high demand');
    expect(html).not.toContain(en.reply.unavailableBody);
    expect(html).toContain('Ask again');
  });

  it('is written in the ledger as a draft of a reply, with the three things it carried', async () => {
    const { ledger } = await ready();
    const html = renderToStaticMarkup(<LedgerView ledger={ledger} t={en} />);
    expect(html).toContain('Draft of a reply');
    expect(html).toContain('<dd>Medical bill</dd>');
    expect(html).not.toMatch(/Riverbend|296\.00/);
  });
});

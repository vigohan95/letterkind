import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { type Reading, readLetter } from '../../src/ai/read';
import type { Generate } from '../../src/ai/types';
import type { ExplainTemplate } from '../../src/domain/template';
import { TERM_IDS } from '../../src/domain/terms';
import { explain, type ExplainRequest, type Guidance, type Ready } from '../../src/guidance/explain';
import type { GuidanceSource } from '../../src/guidance/live';
import { memoryStore } from '../../src/guidance/store';
import { en } from '../../src/i18n/en';
import { CLOUD_MODEL, createChannel, type Transport } from '../../src/outbound/channel';
import { Ledger, type LedgerEntry } from '../../src/outbound/ledger';
import { promptFor } from '../../src/outbound/prompts';
import { GuidanceBody, GuidancePanel, GuidanceReady } from '../../src/ui/Guidance';
import { LedgerView } from '../../src/ui/LedgerView';
import { guessLanguage, loadPrefs, type Prefs, savePrefs } from '../../src/ui/prefs';

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

const request: ExplainRequest = { purpose: 'explain', type: 'medical_bill', state: 'CA', language: 'es' };
const prefs: Prefs = { state: 'CA', language: 'es' };

const answer = JSON.stringify({
  what: 'Esta es una factura de {{SENDER}} por atención que ya recibió.',
  steps: ['Compare la factura con el resumen de su seguro.', 'Pague {{AMOUNT}} o pida un plan de pagos antes del {{DEADLINE}} ({{DAYS_LEFT}}).'],
  if_ignored: 'Una factura sin pagar puede pasar a una agencia de cobros.',
  who_can_help: ['La oficina de facturación: llame al {{PHONE}}.'],
  reading_hint: 'The amount due is usually labelled "Patient balance".',
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

async function ready(text = answer): Promise<{ guidance: Ready; ledger: Ledger }> {
  const { ledger, deps } = setup(cloud(text));
  const guidance = await explain(request, deps);
  if (guidance.status !== 'ready') throw new Error(`expected a template, got ${guidance.status}`);
  return { guidance, ledger };
}

const nothing = (): void => {};
const body = (guidance: Guidance, reading: Reading, chosen: Prefs = prefs): string =>
  renderToStaticMarkup(<GuidanceBody status={{ at: 'answered', guidance }} reading={reading} prefs={chosen} onAsk={nothing} onForget={nothing} t={en} />);

describe('what the reader chooses', () => {
  it('starts from the language the browser asks for, when it is one that is offered', () => {
    expect(guessLanguage(['es-MX', 'en-US'])).toBe('es');
    expect(guessLanguage(['zh-CN'])).toBe('zh-Hans');
    expect(guessLanguage(['zh-TW'])).toBe('zh-Hant');
    expect(guessLanguage(['zh-Hant-HK'])).toBe('zh-Hant');
    expect(guessLanguage(['fil-PH'])).toBe('tl');
    expect(guessLanguage(['de-DE', 'fr-FR'])).toBe('fr');
    expect(guessLanguage(['de-DE'])).toBe('en');
    expect(guessLanguage([])).toBe('en');
  });

  it('remembers a state and a language, and nothing else', () => {
    const kept = new Map<string, string>();
    const storage = { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => void kept.set(key, value) };
    expect(loadPrefs(storage, ['en-US'])).toEqual({ state: 'US', language: 'en' });

    savePrefs(storage, { state: 'TX', language: 'vi', letter: BILL } as Prefs);
    expect(loadPrefs(storage, ['en-US'])).toEqual({ state: 'TX', language: 'vi' });
    expect([...kept.values()].join('')).not.toContain('Riverbend');
  });

  it('falls back to a fresh start when what was kept is damaged or the browser keeps nothing', () => {
    const holding = (value: string) => ({ getItem: () => value });
    expect(loadPrefs(holding('{"state":"Atlantis","language":"tlh"}'), ['es'])).toEqual({ state: 'US', language: 'es' });
    expect(loadPrefs(holding('not json'), ['es'])).toEqual({ state: 'US', language: 'es' });
    expect(loadPrefs(null, ['ko-KR'])).toEqual({ state: 'US', language: 'ko' });
    const refusing = {
      getItem: (): string => {
        throw new Error('denied');
      },
      setItem: (): void => {
        throw new Error('denied');
      },
    };
    expect(loadPrefs(refusing, [])).toEqual({ state: 'US', language: 'en' });
    expect(() => savePrefs(refusing, prefs)).not.toThrow();
  });
});

describe('the guidance panel', () => {
  it('names exactly three things before anything is asked, and they are the three the request carries', async () => {
    const source: GuidanceSource = { saved: () => Promise.resolve(null), ask: () => Promise.reject(new Error('not asked')), forget: () => Promise.resolve() };
    const html = renderToStaticMarkup(<GuidancePanel reading={await read(truthful)} prefs={prefs} onPrefs={nothing} source={source} t={en} />);

    expect(html.match(/<dt>/g)).toHaveLength(3);
    expect(html).toContain('<dd>Medical bill</dd>');
    expect(html).toContain('<option value="CA" selected="">California</option>');
    expect(html).toContain('<option value="es" selected="">Español — Spanish</option>');
    expect(html).toContain('<option value="US">Not given</option>');
    expect(html).not.toMatch(/Riverbend|296|555-0199|RMG-0042/);
  });

  it('offers the state from the letter’s address, but does not choose it', async () => {
    const source: GuidanceSource = { saved: () => Promise.resolve(null), ask: () => Promise.reject(new Error('not asked')), forget: () => Promise.resolve() };
    const reading = await read(truthful);
    const offered = renderToStaticMarkup(<GuidancePanel reading={reading} prefs={prefs} onPrefs={nothing} source={source} suggested="OH" t={en} />);
    expect(offered).toContain('Use Ohio, from the address on your letter');
    expect(offered).toContain('<option value="CA" selected="">California</option>');

    const same = renderToStaticMarkup(<GuidancePanel reading={reading} prefs={prefs} onPrefs={nothing} source={source} suggested="CA" t={en} />);
    const none = renderToStaticMarkup(<GuidancePanel reading={reading} prefs={prefs} onPrefs={nothing} source={source} t={en} />);
    expect(same).not.toContain('from the address on your letter');
    expect(none).not.toContain('from the address on your letter');
  });

  it('says what will not be sent, next to the button that sends', async () => {
    const html = renderToStaticMarkup(<GuidanceBody status={{ at: 'ask' }} reading={await read(truthful)} prefs={prefs} onAsk={nothing} onForget={nothing} t={en} />);
    expect(html).toContain(en.guidance.nothingElse);
    expect(html).toContain('Get the explanation');
  });

  it('fills the gaps on the device, each in the colour of its place in the letter', async () => {
    const { guidance } = await ready();
    const html = body(guidance, await read(truthful));

    expect(html).toContain('<div class="guidance-text" lang="es">');
    expect(html).toContain('Esta es una factura de <mark data-field="sender"><bdi>Riverbend Medical Group</bdi></mark> por');
    expect(html).toContain('<mark data-field="amount"><bdi>$296.00</bdi></mark>');
    expect(html).toContain('<mark data-field="deadline"><bdi>15 de diciembre de 2026</bdi></mark>');
    expect(html).toContain('<mark data-field="deadline"><bdi>dentro de 14 días</bdi></mark>');
    expect(html).toContain('<mark data-field="phone"><bdi>(800) 555-0199</bdi></mark>');
    expect(html).not.toContain('{{');
    expect(html).not.toContain('Patient balance');
    expect(html).toContain(en.guidance.legend);
    expect(html).not.toContain(en.guidance.standInLegend);
  });

  it('says where the words came from and what it cost to get them', async () => {
    const { guidance, ledger } = await ready();
    const html = body(guidance, await read(truthful));
    const bytes = ledger.entries()[0]?.bytes ?? 0;

    expect(bytes).toBeGreaterThan(100);
    expect(html).toContain(`Written by ${CLOUD_MODEL} in the cloud in 1.2 s.`);
    expect(html).toContain(`It was sent ${bytes.toLocaleString('en-US')} bytes, none of them from your letter.`);
    expect(html).not.toContain(en.guidance.forget);
  });

  it('puts general words, visibly not facts, where the letter gave nothing that could be checked', async () => {
    const { guidance } = await ready();
    const html = body(guidance, await read(invented));

    expect(html).not.toContain('<mark');
    expect(html).not.toMatch(/269|December 5|Riverbend Hospital/);
    expect(html).toContain('<span class="stand-in">quien le envió la carta</span>');
    expect(html).toContain('<span class="stand-in">la cantidad que aparece en su carta</span>');
    expect(html).toContain(en.guidance.standInLegend);
    expect(html).not.toContain('{{');
  });

  it('shows a kept explanation as kept, with a way to forget it', async () => {
    const { guidance } = await ready();
    const kept: Ready = { ...guidance, from: 'saved', entry: null };
    const html = renderToStaticMarkup(<GuidanceReady guidance={kept} reading={await read(truthful)} language="es" onForget={nothing} t={en} />);

    expect(html).toContain('Kept on this device since December 1, 2026. Nothing was sent this time.');
    expect(html).toContain(en.guidance.forget);
    expect(html).not.toContain('in the cloud in');
  });

  it('puts whatever a model wrote on the page as characters, never as markup', async () => {
    const template: ExplainTemplate = {
      what: 'A bill from {{SENDER}}. <img src=x onerror="alert(1)">',
      steps: ['<script>alert(1)</script>'],
      ifIgnored: 'Nothing & nothing.',
      whoCanHelp: ['<a href="javascript:alert(1)">help</a>'],
      readingHint: '',
    };
    const { guidance } = await ready();
    const html = body({ ...guidance, template }, await read(truthful));

    expect(html).not.toMatch(/<img|<script|<a /);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('shows nothing of an answer that broke a rule, only which rule', async () => {
    const withItsOwnPhone = JSON.stringify({ ...(JSON.parse(answer) as object), if_ignored: 'Llame al 1-800-555-0100.' });
    const { deps } = setup(cloud(withItsOwnPhone));
    const guidance = await explain(request, deps);
    const html = body(guidance, await read(truthful));

    expect(guidance.status).toBe('rejected');
    expect(html).toContain(en.guidance.rejectedHeading);
    expect(html).toContain('It contained a phone number of its own (“1-800-555-0100”).');
    expect(html).toContain('Ask again');
    expect(html).not.toMatch(/Compare la factura|agencia de cobros|guidance-text/);
  });

  it('says when the allowance for one minute is used up, without the server\'s talk of plans and billing', async () => {
    const full: Transport = () => Promise.reject(Object.assign(new Error('[429 ] You exceeded your current quota, please check your plan and billing details.'), { customErrorData: { status: 429 } }));
    const html = body(await explain(request, setup(full).deps), await read(truthful));
    expect(html).toContain(en.guidance.limitBody);
    expect(html).not.toContain(en.guidance.unavailableBody);
    expect(html).not.toContain('billing');
    expect(html).toContain('Ask again');
  });

  it('says the model in the cloud was busy, and does not blame the connection for it', async () => {
    const busy: Transport = () => Promise.reject(Object.assign(new Error('[500 ] This model is currently experiencing high demand.'), { customErrorData: { status: 500 } }));
    const html = body(await explain(request, setup(busy).deps), await read(truthful));
    expect(html).toContain(en.guidance.busyBody);
    expect(html).not.toContain('experiencing high demand');
    expect(html).not.toContain(en.guidance.unavailableBody);
  });

  it('says plainly when no explanation could be had, and offers nothing written on the device in its place', async () => {
    const { deps } = setup(offline);
    const html = body(await explain(request, deps), await read(truthful));
    expect(html).toContain(en.guidance.unavailableHeading);
    expect(html).toContain(en.guidance.unavailableBody);
    expect(html).toContain('Failed to reach the service.');
    expect(html).not.toContain('on-device model');
  });
});

describe('the list of what left the device', () => {
  it('says so when nothing has', () => {
    const html = renderToStaticMarkup(<LedgerView ledger={new Ledger()} t={en} />);
    expect(html).toContain('What has left this device');
    expect(html).toContain('<span class="ledger-total" data-out="0" data-underway="0">Nothing has left this device.</span>');
    expect(html).not.toContain('<li');
  });

  it('does not say that nothing has left while a request is under way', () => {
    const ledger = new Ledger();
    ledger.begin({ at: '2026-12-01T10:00:00.000Z', request, route: 'cloud_only', prompt: promptFor(request) });
    const html = renderToStaticMarkup(<LedgerView ledger={ledger} t={en} />);

    expect(html).not.toContain('Nothing has left this device.');
    expect(html).toContain('<span class="ledger-total" data-out="0" data-underway="1">1 request is under way.</span>');
    expect(html).toContain('<li data-left="underway">');
    expect(html).toContain('<strong>Under way</strong> — Explanation of a kind of letter');
    expect(html).toContain('<dd>Spanish</dd>');
    expect(html).toContain(renderToStaticMarkup(<pre className="ledger-words">{promptFor(request)}</pre>));
  });

  it('shows each request with the three things it carried and its exact words', async () => {
    const { ledger } = await ready();
    const html = renderToStaticMarkup(<LedgerView ledger={ledger} t={en} />);
    const bytes = ledger.entries()[0]?.bytes ?? 0;

    expect(html).toContain(`1 request sent, ${bytes.toLocaleString('en-US')} bytes in all. None of it from a letter.`);
    expect(html).toContain('<strong>Sent</strong> — Explanation of a kind of letter');
    expect(html).toContain('<dd>Medical bill</dd>');
    expect(html).toContain('<dd>California</dd>');
    expect(html).toContain('<dd>Spanish</dd>');
    expect(html).toContain('answered in the cloud · 1.2 s');
    expect(html).toContain(renderToStaticMarkup(<pre className="ledger-words">{promptFor(request)}</pre>));
    expect(html).not.toMatch(/Riverbend|296\.00|RMG-0042|factura/);
  });

  it('counts a request that got no answer as tried, with the reason', async () => {
    const { ledger, deps } = setup(offline);
    await explain(request, deps);
    const html = renderToStaticMarkup(<LedgerView ledger={ledger} t={en} />);

    expect(html).toContain('data-out="1"');
    expect(html).toContain('1 request was tried and brought nothing back.');
    expect(html).not.toContain('Nothing has left this device.');
    expect(html).toContain('<strong>Tried to send</strong>');
    expect(html).toContain('no answer');
    expect(html).toContain('Failed to reach the service.');
  });

  it('keeps a request the device answered apart from one that left', () => {
    // No request is routed to the device as things stand (see `routeFor`), so the entry is made by hand.
    const ledger = new Ledger();
    const term = TERM_IDS.find((id) => id === 'deductible') ?? TERM_IDS[0]!;
    const asked = { purpose: 'term', term, language: 'ko' } as const;
    const entry: LedgerEntry | undefined = ledger.record({
      at: '2026-12-01T10:00:00.000Z',
      request: asked,
      route: 'device_first',
      prompt: promptFor(asked),
      ran: 'device',
      ms: 900,
      error: null,
    });
    const html = renderToStaticMarkup(<LedgerView ledger={ledger} t={en} />);

    expect(entry?.left).toBe('stayed');
    expect(html).toContain('Nothing has left this device. 1 request was answered on this device.');
    expect(html).toContain('<strong>Stayed on this device</strong> — Meaning of a term');
    expect(html).toContain(`<dd>${term}</dd>`);
  });
});

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_IDS } from '../../src/domain/languages';
import { LETTER_TYPE_IDS, letterType } from '../../src/domain/letterTypes';
import { STATE_IDS } from '../../src/domain/states';
import { mark, PLACEHOLDERS, placeholdersFor } from '../../src/domain/template';
import { TERM_IDS, TERMS, type TermId } from '../../src/domain/terms';
import { createChannel, type Transport } from '../../src/outbound/channel';
import { byteLength, Ledger, leftDevice } from '../../src/outbound/ledger';
import { Prepared, promptFor, routeFor, schemaFor } from '../../src/outbound/prompts';
import { allRequests, OutboundRejected, parseRequest, requestCount, serialize, type OutboundRequest } from '../../src/outbound/requests';

const explain: OutboundRequest = { purpose: 'explain', type: 'medical_bill', state: 'CA', language: 'es' };
const someTerm = TERM_IDS[0] as TermId;

describe('the three lists a request is built from', () => {
  it('have no repeated ids', () => {
    for (const ids of [LETTER_TYPE_IDS, STATE_IDS, LANGUAGE_IDS, TERM_IDS]) {
      expect(new Set<string>(ids).size).toBe(ids.length);
    }
  });

  it('cover every state, the District of Columbia, the territories and "not given"', () => {
    expect(STATE_IDS).toHaveLength(57);
    expect(STATE_IDS).toContain('US');
  });

  it('give every glossary entry a usable id', () => {
    expect(TERMS.length).toBeGreaterThan(200);
    for (const t of TERMS) expect(t.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('the closed set of outbound requests', () => {
  const all = [...allRequests()];

  it('has exactly as many members as the list sizes multiply out to', () => {
    const expected =
      2 * LETTER_TYPE_IDS.length * STATE_IDS.length * LANGUAGE_IDS.length + TERM_IDS.length * LANGUAGE_IDS.length;
    expect(requestCount()).toBe(expected);
    expect(all).toHaveLength(expected);
  });

  it('has no two members that serialize alike, and every member passes the run-time check unchanged', () => {
    const seen = new Set<string>();
    for (const request of all) {
      const wire = serialize(request);
      seen.add(wire);
      expect(parseRequest(JSON.parse(wire))).toEqual(request);
    }
    expect(seen.size).toBe(all.length);
  });

  it('says something different for every member, and never much', () => {
    const digests = new Set<string>();
    let longest = 0;
    for (const request of all) {
      const prompt = promptFor(request);
      digests.add(createHash('sha256').update(prompt).digest('base64'));
      longest = Math.max(longest, byteLength(prompt));
    }
    expect(digests.size).toBe(all.length);
    expect(longest).toBeLessThan(6000);
  });

  it('contains whatever a checked request serializes to', () => {
    const wires = new Set(all.map(serialize));
    const samples: unknown[] = [
      { language: 'ko', state: 'PR', type: 'jury_summons', purpose: 'reply' }, // key order does not matter
      { purpose: 'term', term: someTerm, language: 'ht' },
      { ...explain },
    ];
    for (const sample of samples) expect(wires.has(serialize(parseRequest(sample)))).toBe(true);
  });
});

describe('the run-time check', () => {
  const rejected: [string, unknown][] = [
    ['a string', 'explain medical_bill CA es'],
    ['null', null],
    ['an array', ['explain', 'medical_bill', 'CA', 'es']],
    ['an unknown purpose', { ...explain, purpose: 'summarize' }],
    ['a purpose that is an inherited property name', { ...explain, purpose: 'constructor' }],
    ['one field too many', { ...explain, note: 'Balance due $296.00' }],
    ['a missing field', { purpose: 'explain', type: 'medical_bill', language: 'es' }],
    ['a kind outside the list', { ...explain, type: 'medical_bill for Jane Roe' }],
    ['a state outside the list', { ...explain, state: 'California' }],
    ['a language outside the list', { ...explain, language: 'ES' }],
    ['a non-string value', { ...explain, state: ['CA'] }],
    ['an overlong value', { ...explain, type: 'medical_bill'.padEnd(5000, ' Dear Jane Roe, you owe $296.00.') }],
    ['a term that is not in the glossary', { purpose: 'term', term: 'my account number is 0042', language: 'en' }],
    ['a term request with a letter kind attached', { purpose: 'term', term: someTerm, language: 'en', type: 'medical_bill' }],
    ['a symbol key', { ...explain, [Symbol('letter')]: 'Dear Jane Roe' }],
    ['an object that is not plain', Object.assign(Object.create({ note: 'Dear Jane Roe' }) as object, explain)],
    ['a class instance', new (class Request { purpose = 'explain'; type = 'medical_bill'; state = 'CA'; language = 'es'; })()],
  ];

  it.each(rejected)('refuses %s', (_name, input) => {
    expect(() => parseRequest(input)).toThrow(OutboundRejected);
    expect(() => Prepared.from(input)).toThrow(OutboundRejected);
  });

  it('returns a fresh object holding only the listed fields', () => {
    const input = { ...explain };
    const parsed = parseRequest(input);
    expect(parsed).toEqual(explain);
    expect(parsed).not.toBe(input);
    expect(Object.keys(parsed)).toEqual(['purpose', 'type', 'state', 'language']);
  });
});

describe('prompts', () => {
  it('offer only the markers this kind of letter may use', () => {
    for (const type of LETTER_TYPE_IDS) {
      const allowed = placeholdersFor(type);
      for (const purpose of ['explain', 'reply'] as const) {
        const prompt = promptFor({ purpose, type, state: 'US', language: 'en' });
        for (const p of PLACEHOLDERS) expect(prompt.includes(`  ${mark(p)}  `), `${type} ${p}`).toBe(allowed.includes(p));
      }
    }
  });

  it('give an Explanation of Benefits no amount marker and no deadline marker', () => {
    expect(placeholdersFor('insurance_eob')).toEqual(['SENDER', 'REFERENCE', 'PHONE']);
    expect(promptFor({ purpose: 'explain', type: 'insurance_eob', state: 'US', language: 'en' })).toContain('Do not use {{AMOUNT}}');
  });

  it('name the kind, the state and the language, and nothing else about the reader', () => {
    const prompt = promptFor(explain);
    expect(prompt).toContain(letterType('medical_bill').description);
    expect(prompt).toContain('The reader lives in California.');
    expect(prompt).toContain('Write in: Spanish');
    expect(promptFor({ ...explain, state: 'US' })).toContain('did not say which state');
  });

  it('ask for a translation of a reply only when the reader does not read English', () => {
    const reply = { purpose: 'reply', type: 'debt_collection', state: 'NY' } as const;
    expect(schemaFor({ ...reply, language: 'en' })).not.toHaveProperty('properties.body_translated');
    expect(schemaFor({ ...reply, language: 'vi' })).toHaveProperty('properties.body_translated');
    expect(promptFor({ ...reply, language: 'en' })).not.toContain('body_translated');
    expect(promptFor({ ...reply, language: 'vi' })).toContain('body_translated');
  });

  it('pick where a request may run from its purpose and language alone', () => {
    expect(routeFor({ ...explain, language: 'en' })).toBe('cloud_first');
    expect(routeFor({ ...explain, language: 'zh-Hans' })).toBe('cloud_only');
    expect(routeFor({ ...explain, purpose: 'reply', language: 'en' })).toBe('cloud_only');
    expect(routeFor({ purpose: 'term', term: someTerm, language: 'es' })).toBe('device_first');
    expect(routeFor({ purpose: 'term', term: someTerm, language: 'ko' })).toBe('cloud_only');
  });

  it('can only be prepared through the check', () => {
    // @ts-expect-error the constructor is private: `from` is the only way to make one
    expect(() => new Prepared(explain)).not.toThrow();
    const prepared = Prepared.from(explain);
    expect(prepared.prompt).toBe(promptFor(explain));
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.request)).toBe(true);
  });
});

describe('the ledger', () => {
  it('counts bytes, not characters', () => {
    expect(byteLength('abc')).toBe(3);
    expect(byteLength('Español 简体')).toBe(Buffer.byteLength('Español 简体', 'utf8'));
  });

  it('only counts a request as having stayed when the network was never tried', () => {
    expect(leftDevice('cloud_only', 'cloud')).toBe('sent');
    expect(leftDevice('cloud_first', 'cloud')).toBe('sent');
    expect(leftDevice('device_first', 'cloud')).toBe('sent');
    expect(leftDevice('device_first', 'device')).toBe('stayed');
    expect(leftDevice('cloud_first', 'device')).toBe('attempted');
    expect(leftDevice('cloud_only', 'nowhere')).toBe('attempted');
    expect(leftDevice('device_first', 'nowhere')).toBe('attempted');
  });

  it('tells subscribers, and keeps the same snapshot until something is added', () => {
    const ledger = new Ledger();
    let calls = 0;
    const stop = ledger.subscribe(() => calls++);
    const before = ledger.entries();
    expect(ledger.entries()).toBe(before);
    const prepared = Prepared.from(explain);
    ledger.record({ at: '2026-12-01T00:00:00.000Z', request: prepared.request, route: prepared.route, prompt: prepared.prompt, ran: 'cloud', ms: 5, error: null });
    expect(calls).toBe(1);
    expect(ledger.entries()).not.toBe(before);
    expect(ledger.entries()).toHaveLength(1);
    stop();
    ledger.record({ at: '2026-12-01T00:00:01.000Z', request: prepared.request, route: prepared.route, prompt: prepared.prompt, ran: 'cloud', ms: 5, error: null });
    expect(calls).toBe(1);
    expect(ledger.entries().map((e) => e.id)).toEqual([1, 2]);
  });
});

describe('the channel', () => {
  function setup(transport: Transport) {
    const ledger = new Ledger();
    let tick = 0;
    const seen: Prepared[] = [];
    const channel = createChannel({
      transport: (prepared) => {
        seen.push(prepared);
        return transport(prepared);
      },
      ledger,
      now: () => new Date('2026-12-01T10:00:00.000Z'),
      clock: () => (tick += 250),
    });
    return { channel, ledger, seen };
  }

  const recordedCloud: Transport = () => Promise.resolve({ text: '{"what":"A bill from {{SENDER}}."}', ran: 'cloud' });

  it('sends the fixed prompt for the request and writes down exactly what it sent', async () => {
    const { channel, ledger, seen } = setup(recordedCloud);
    const answer = await channel.send(explain);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(Prepared);
    expect(seen[0]?.prompt).toBe(promptFor(explain));

    expect(answer.text).toBe('{"what":"A bill from {{SENDER}}."}');
    expect(answer.ran).toBe('cloud');
    expect(ledger.entries()).toEqual([
      {
        id: 1,
        at: '2026-12-01T10:00:00.000Z',
        request: explain,
        route: 'cloud_first',
        prompt: promptFor(explain),
        bytes: Buffer.byteLength(promptFor(explain), 'utf8'),
        left: 'sent',
        ran: 'cloud',
        ms: 250,
        error: null,
      },
    ]);
    expect(answer.entry).toBe(ledger.entries()[0]);
    expect(ledger.totals()).toEqual({ requests: 1, sent: 1, attempted: 0, stayed: 0, bytesOut: answer.entry.bytes });
  });

  it('records a glossary word answered on the device as never having left', async () => {
    const { channel, ledger } = setup(() => Promise.resolve({ text: '{"explanation":"..."}', ran: 'device' }));
    const { entry } = await channel.send({ purpose: 'term', term: someTerm, language: 'en' });
    expect(entry.left).toBe('stayed');
    expect(ledger.totals()).toMatchObject({ stayed: 1, bytesOut: 0 });
  });

  it('records an explanation the device wrote after the cloud failed as possibly sent', async () => {
    const { channel } = setup(() => Promise.resolve({ text: '{}', ran: 'device' }));
    const { entry } = await channel.send({ ...explain, language: 'en' });
    expect(entry.route).toBe('cloud_first');
    expect(entry.left).toBe('attempted');
  });

  it('records a failed request too, then passes the failure on', async () => {
    const { channel, ledger } = setup(() => Promise.reject(new Error('offline')));
    await expect(channel.send(explain)).rejects.toThrow('offline');
    expect(ledger.entries()).toHaveLength(1);
    expect(ledger.entries()[0]).toMatchObject({ ran: 'nowhere', left: 'attempted', error: 'offline' });
  });

  it('refuses anything outside the closed set before the transport is reached', async () => {
    const { channel, ledger, seen } = setup(recordedCloud);
    const smuggled = { ...explain, letter: 'Dear Jane Roe, your balance of $296.00 is past due.' } as unknown as OutboundRequest;
    await expect(channel.send(smuggled)).rejects.toThrow(OutboundRejected);
    await expect(channel.send({ ...explain, type: 'Dear Jane Roe' } as unknown as OutboundRequest)).rejects.toThrow(OutboundRejected);
    expect(seen).toEqual([]);
    expect(ledger.entries()).toEqual([]);
  });

  it('has no way to be handed text', () => {
    const { channel } = setup(recordedCloud);
    // @ts-expect-error a request is an object from the closed set, never a string
    void channel.send('Dear Jane Roe, your balance of $296.00 is past due.').catch(() => undefined);
    // @ts-expect-error there is no field for free text
    void channel.send({ ...explain, letter: 'Dear Jane Roe' }).catch(() => undefined);
  });
});

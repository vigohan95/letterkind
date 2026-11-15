import { describe, expect, it } from 'vitest';
import { LANGUAGE_IDS, type LanguageId } from '../../src/domain/languages';
import type { LetterTypeId } from '../../src/domain/letterTypes';
import { fillLetter, parseReply } from '../../src/domain/reply';
import { blanksFor, nameBlank } from '../../src/domain/standIns';
import { filledText, type RejectReason, TemplateRejected, type Values } from '../../src/domain/template';
import { templateKey } from '../../src/guidance/kept';
import { draftReply, type ReplyRequest, savedDraft } from '../../src/guidance/reply';
import { memoryStore, type TemplateStore } from '../../src/guidance/store';
import { createChannel, type Transport } from '../../src/outbound/channel';
import { Ledger } from '../../src/outbound/ledger';
import { promptFor } from '../../src/outbound/prompts';

const letter = [
  '[YOUR FULL NAME]',
  '[YOUR ADDRESS]',
  '',
  "[TODAY'S DATE]",
  '',
  '{{SENDER}}',
  '',
  'Re: Account {{REFERENCE}}',
  '',
  'To whom it may concern:',
  '',
  'I received your bill for {{AMOUNT}}, due {{DEADLINE}}. Before I pay, please send me an itemized statement of every charge.',
  '',
  'Sincerely,',
  '[YOUR SIGNATURE]',
].join('\n');

const carta = [
  '[SU NOMBRE COMPLETO]',
  '[SU DIRECCIÓN]',
  '',
  '[LA FECHA DE HOY]',
  '',
  '{{SENDER}}',
  '',
  'Asunto: Cuenta {{REFERENCE}}',
  '',
  'A quien corresponda:',
  '',
  'Recibí su factura por {{AMOUNT}}, con vencimiento el {{DEADLINE}}. Antes de pagar, les pido que me envíen un desglose detallado de cada cargo.',
  '',
  'Atentamente,',
  '[SU FIRMA]',
].join('\n');

const english = {
  subject: 'Request for an itemized bill, account {{REFERENCE}}',
  body_en: letter,
  before_sending: ['Keep a copy of this letter.', 'Mail it before {{DEADLINE}} ({{DAYS_LEFT}}) and keep the receipt.'],
};

const spanish = {
  ...english,
  body_translated: carta,
  before_sending: ['Guarde una copia de esta carta.', 'Envíela antes del {{DEADLINE}} ({{DAYS_LEFT}}) y guarde el recibo.'],
};

const inEnglish = (change: Record<string, unknown> = {}): string => JSON.stringify({ ...english, ...change });
const inSpanish = (change: Record<string, unknown> = {}): string => JSON.stringify({ ...spanish, ...change });

function rejection(text: string, type: LetterTypeId = 'medical_bill', language: LanguageId = 'en'): TemplateRejected {
  try {
    parseReply(text, type, language);
  } catch (error) {
    if (error instanceof TemplateRejected) return error;
    throw error;
  }
  throw new Error('expected the draft to be rejected');
}

describe('a draft of a reply', () => {
  it('is thrown away when the copy to read leaves a blank in English', () => {
    const left = carta.replace('[SU NOMBRE COMPLETO]', '[YOUR FULL NAME]');
    expect(rejection(inSpanish({ body_translated: left }), 'medical_bill', 'es')).toMatchObject({
      reason: 'blank_left_in_english',
      field: 'body_translated',
      found: '[YOUR FULL NAME]',
    });
    // One word can be the same in both languages.
    const same = { body_en: `${letter}\n[EMAIL]`, body_translated: `${carta}\n[EMAIL]` };
    expect(parseReply(inSpanish(same), 'medical_bill', 'es').bodyTranslated).toContain('[EMAIL]');
  });

  it('is thrown away when it comes as one block of text and not laid out as a letter', () => {
    const block = (text: string): string => text.replace(/\n+/g, ' ');
    expect(rejection(inEnglish({ body_en: block(letter) }))).toMatchObject({ reason: 'wrong_shape', field: 'body_en' });
    expect(rejection(inSpanish({ body_translated: block(carta) }), 'medical_bill', 'es')).toMatchObject({ reason: 'wrong_shape', field: 'body_translated' });
    // A greeting, what is asked and a closing are enough; the lines between them need not be empty.
    const short = 'To whom it may concern:\nPlease send me an itemized statement of every charge on the bill you sent me, before I pay any of it.\nSincerely,\n[YOUR FULL NAME]';
    expect(parseReply(inEnglish({ body_en: short }), 'medical_bill', 'en').bodyEn).toBe(short);
  });

  it('is accepted with its markers and its blanks for the reader to fill in', () => {
    const draft = parseReply(inEnglish(), 'medical_bill', 'en');
    expect(draft.subject).toBe(english.subject);
    expect(draft.bodyEn).toBe(letter);
    expect(draft.bodyTranslated).toBeNull();
    expect(draft.beforeSending).toHaveLength(2);
  });

  it('comes with a translation exactly when the reader does not read English', () => {
    expect(parseReply(inSpanish(), 'medical_bill', 'es').bodyTranslated).toBe(carta);
    expect(rejection(inSpanish(), 'medical_bill', 'en')).toMatchObject({ reason: 'wrong_shape', field: 'body_translated' });
    expect(rejection(inEnglish(), 'medical_bill', 'es')).toMatchObject({ reason: 'wrong_shape', field: 'body_translated' });
  });

  it('keeps the subject on one line and the letter free of runs of empty lines', () => {
    const draft = parseReply(inEnglish({ subject: ' Request for\nan itemized bill ', body_en: 'Dear {{SENDER}},\r\n\r\n\r\n\r\nPlease send it.  \n\n\nSincerely,\n' }), 'medical_bill', 'en');
    expect(draft.subject).toBe('Request for an itemized bill');
    expect(draft.bodyEn).toBe('Dear {{SENDER}},\n\nPlease send it.\n\nSincerely,');
  });

  it.each<[string, Record<string, unknown>, RejectReason, string]>([
    ['an amount in the letter', { body_en: 'I dispute the $296.00 you billed.' }, 'amount', 'body_en'],
    ['a date in the letter', { body_en: 'I will pay by December 15, 2026.' }, 'date', 'body_en'],
    ['a phone number in the letter', { body_en: 'Call me at (415) 555-0134.' }, 'phone', 'body_en'],
    ['a web address in the letter', { body_en: 'See consumerfinance.gov for my rights.' }, 'web_address', 'body_en'],
    ['an account number in the subject', { subject: 'Account 4417 2290 1183' }, 'phone', 'subject'],
    ['a date in the checklist', { before_sending: ['Send it by April 15.'] }, 'date', 'before_sending'],
    ['a marker Letterkind does not have', { body_en: 'Dear {{NAME}},' }, 'unknown_marker', 'body_en'],
    ['a marker written wrongly', { body_en: 'Dear {SENDER},' }, 'unknown_marker', 'body_en'],
    ['a letter with no words', { body_en: '   ' }, 'wrong_shape', 'body_en'],
    ['a letter that runs away', { body_en: 'Please reply. '.repeat(300) }, 'too_long', 'body_en'],
    ['too many things to check', { before_sending: Array.from({ length: 7 }, () => 'Keep a copy.') }, 'wrong_shape', 'before_sending'],
    ['a field nobody asked for', { advice: 'Do not pay.' }, 'wrong_shape', 'advice'],
  ])('is thrown away for %s', (_, change, reason, field) => {
    expect(rejection(inEnglish(change))).toMatchObject({ reason, field });
  });

  it.each<[string, string, string]>([
    ['what a law requires', 'Illinois law requires hospitals to provide financial assistance to eligible patients.', 'law requires'],
    ['a law it names', 'Under the No Surprises Act, I ask for a good faith estimate.', 'Under the No Surprises Act'],
    ['what is required by law', 'Please send the itemized statement as required by law.', 'as required by law'],
    ['what the sender must do', 'You must stop all collection until you answer.', 'You must'],
    ['what the sender is required to do', 'I understand you are legally required to answer within thirty days.', 'you are legally required'],
  ])('is thrown away when the letter to sign states %s', (_, sentence, found) => {
    const claimed = letter.replace('Before I pay,', `${sentence} Before I pay,`);
    expect(rejection(inEnglish({ body_en: claimed }))).toMatchObject({ reason: 'states_the_law', field: 'body_en', found });
  });

  it('keeps a letter that asks about a rule instead of stating it', () => {
    const asked = letter.replace(
      'Before I pay,',
      'Please tell me whether I qualify for your financial assistance policy, and what I must send you to apply. The charge is listed under the billing code on the statement. Before I pay,',
    );
    expect(parseReply(inEnglish({ body_en: asked }), 'medical_bill', 'en').bodyEn).toBe(asked);
  });

  it.each([
    ['a state program it made up', 'I would also like to know if I qualify for the Ohio Tax Amnesty program.', 'Ohio Tax Amnesty'],
    ['a relief fund by name', 'Please tell me whether the Patient Hardship Relief Fund can help me.', 'Patient Hardship Relief Fund'],
    ['a law by name', 'The No Surprises Act protects patients like me.', 'The No Surprises Act'],
    ['amnesty in any case', 'Is there a tax amnesty I could use?', 'amnesty'],
  ])('is thrown away when the letter to sign names %s', (_, sentence, found) => {
    const named = letter.replace('Before I pay,', `${sentence} Before I pay,`);
    expect(rejection(inEnglish({ body_en: named }))).toMatchObject({ reason: 'names_a_program', field: 'body_en', found });
  });

  it('is thrown away when a program is named outside the letter too', () => {
    expect(rejection(inEnglish({ before_sending: ['Look up the Ohio Tax Amnesty Program before you send this.'] }))).toMatchObject({
      reason: 'names_a_program',
      field: 'before_sending',
    });
    expect(rejection(inEnglish({ subject: 'Hardship Waiver request, account {{REFERENCE}}' }))).toMatchObject({ reason: 'names_a_program', field: 'subject' });
    const translated = carta.replace('Antes de pagar,', '¿Califico para el Ohio Tax Amnesty Program? Antes de pagar,');
    expect(rejection(inSpanish({ body_translated: translated }), 'medical_bill', 'es')).toMatchObject({ reason: 'names_a_program', field: 'body_translated' });
  });

  it('keeps a letter that asks in general words whether help is available', () => {
    const asked = letter.replace(
      'Before I pay,',
      'Please tell me whether any payment plan, hardship program or other relief is available to me, and how to apply. Before I pay,',
    );
    expect(parseReply(inEnglish({ body_en: asked }), 'medical_bill', 'en').bodyEn).toBe(asked);
    // The blanks the reader fills in are not names the model gave.
    const blank = letter.replace('Before I pay,', 'I am enrolled in [NAME OF YOUR HEALTH PLAN OR PROGRAM]. Before I pay,');
    expect(parseReply(inEnglish({ body_en: blank }), 'medical_bill', 'en').bodyEn).toBe(blank);
  });

  it('tells the cloud not to name a program, in every state and with none', () => {
    for (const state of ['OH', 'US'] as const) {
      const prompt = promptFor({ purpose: 'reply', type: 'tax_proposed_change', state, language: 'en' });
      expect(prompt, state).toMatch(/do not name any program, plan, fund, waiver or law/i);
      expect(prompt, state).not.toContain('ask the sender for it there');
    }
  });

  it('is thrown away when it is not the form that was asked for', () => {
    expect(rejection('Dear Sir or Madam,')).toMatchObject({ reason: 'not_json' });
    expect(rejection('[]')).toMatchObject({ reason: 'wrong_shape' });
  });

  it('cannot ask for money or a date in reply to a letter that is not a bill', () => {
    expect(rejection(inEnglish(), 'insurance_eob')).toMatchObject({ reason: 'marker_not_allowed_here', field: 'body_en' });
    const plain = { subject: 'Question about claim {{REFERENCE}}', body_en: 'Dear {{SENDER}},\n\nPlease explain this claim.\n\n[YOUR FULL NAME]', before_sending: ['Keep a copy.'] };
    expect(parseReply(JSON.stringify(plain), 'insurance_eob', 'en').bodyEn).toContain('{{SENDER}}');
  });

  it('is thrown away when the translation leaves out a detail the English has, or adds one', () => {
    const without = carta.replace('por {{AMOUNT}}, ', '');
    expect(rejection(inSpanish({ body_translated: without }), 'medical_bill', 'es')).toMatchObject({
      reason: 'translation_differs',
      field: 'body_translated',
      found: '{{AMOUNT}}',
    });
    const extra = `${carta}\nLlame al {{PHONE}}.`;
    expect(rejection(inSpanish({ body_translated: extra }), 'medical_bill', 'es')).toMatchObject({ reason: 'translation_differs', found: '{{PHONE}}' });
  });

  it('does not mind where a count of days is, since no letter is given one', () => {
    const counted = carta.replace('{{DEADLINE}}.', '{{DEADLINE}} ({{DAYS_LEFT}}).');
    expect(parseReply(inSpanish({ body_translated: counted }), 'medical_bill', 'es').bodyTranslated).toBe(counted);
  });

  it('is thrown away when the letter to send is not in English, or the one to read is not in the reader’s language', () => {
    const chinese = '我收到了贵方寄来的账单，在付款之前，请先把每一项收费的明细寄给我，并说明保险已经支付的部分。\n'.repeat(6);
    expect(rejection(inSpanish({ body_en: chinese }), 'medical_bill', 'es')).toMatchObject({ reason: 'not_in_language', field: 'body_en' });

    const noAccents = 'Recibi su factura y antes de pagar les pido un desglose de cada cargo que aparece en ella.\n'.repeat(6);
    expect(rejection(inSpanish({ body_translated: `{{SENDER}} {{REFERENCE}} {{AMOUNT}} {{DEADLINE}} ${noAccents}`, before_sending: ['Guarde una copia.'] }), 'medical_bill', 'es')).toMatchObject({
      reason: 'not_in_language',
      field: 'body_translated',
    });
    expect(rejection(inSpanish({ body_translated: `{{SENDER}} {{REFERENCE}} {{AMOUNT}} {{DEADLINE}} ${chinese}` }), 'medical_bill', 'es')).toMatchObject({ reason: 'not_in_language' });
  });
});

describe('the blank a prompt shows as an example', () => {
  it('is written by hand for every language but English, and is never the English one', () => {
    for (const language of LANGUAGE_IDS) {
      if (language === 'en') continue;
      expect(nameBlank(language), language).toMatch(/^\[[^[\]\n]{2,40}\]$/);
      expect(nameBlank(language), language).not.toBe('[YOUR FULL NAME]');
      expect(promptFor({ purpose: 'reply', type: 'medical_bill', state: 'US', language }), language).toContain(`[YOUR FULL NAME] becomes ${nameBlank(language)}`);
    }
    expect(promptFor({ purpose: 'reply', type: 'medical_bill', state: 'US', language: 'en' })).not.toContain('becomes');
  });
});

describe('filling a reply on the device', () => {
  const values: Values = {
    SENDER: 'Riverbend Medical Group',
    REFERENCE: 'RMG-0042-7719',
    AMOUNT: '$296.00',
    DEADLINE: 'December 15, 2026',
    DAYS_LEFT: 'in 14 days',
    PHONE: '(800) 555-0199',
  };

  it('puts in what was checked against the letter and leaves the blanks as blanks', () => {
    const pieces = fillLetter(letter, values, blanksFor('en'));
    expect(pieces.filter((p) => p.kind === 'value').map((p) => p.text)).toEqual(['Riverbend Medical Group', 'RMG-0042-7719', '$296.00', 'December 15, 2026']);
    expect(pieces.filter((p) => p.kind === 'blank').map((p) => p.text)).toEqual(['[YOUR FULL NAME]', '[YOUR ADDRESS]', "[TODAY'S DATE]", '[YOUR SIGNATURE]']);
    expect(filledText(pieces)).toBe(
      letter
        .replace('{{SENDER}}', 'Riverbend Medical Group')
        .replace('{{REFERENCE}}', 'RMG-0042-7719')
        .replace('{{AMOUNT}}', '$296.00')
        .replace('{{DEADLINE}}', 'December 15, 2026'),
    );
  });

  it('turns a detail the letter did not yield into one more blank, never a guess', () => {
    const pieces = fillLetter('I received your bill for {{AMOUNT}}, due {{DEADLINE}}.', {}, blanksFor('en'));
    expect(filledText(pieces)).toBe('I received your bill for [AMOUNT ON THE LETTER], due [DATE ON THE LETTER].');
    expect(pieces.filter((p) => p.kind === 'blank')).toHaveLength(2);
    expect(pieces.some((p) => p.kind === 'value')).toBe(false);
  });

  it('never writes a count of days into a letter, which is read later than it is written', () => {
    expect(filledText(fillLetter('Please reply by {{DEADLINE}} ({{DAYS_LEFT}}).', values, blanksFor('en')))).toBe('Please reply by December 15, 2026.');
  });

  it('has a blank for every detail in every language, in square brackets', () => {
    for (const language of LANGUAGE_IDS) {
      for (const blank of Object.values(blanksFor(language))) expect(blank, language).toMatch(/^\[[^[\]]{2,60}\]$/);
    }
    expect(blanksFor('en').SENDER).toBe('[NAME OF THE SENDER]');
    expect(blanksFor('es').AMOUNT).toBe('[la cantidad que aparece en su carta]');
    // Each one is found again as a blank when the filled text is taken apart.
    expect(fillLetter('{{PHONE}}', {}, blanksFor('ko'))).toEqual([{ kind: 'blank', text: blanksFor('ko').PHONE }]);
  });
});

const request: ReplyRequest = { purpose: 'reply', type: 'medical_bill', state: 'CA', language: 'es' };

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
const offline: Transport = () => Promise.reject(new Error('Failed to reach the service.'));

describe('asking for a draft of a reply', () => {
  it('sends the one fixed request, checks the answer and keeps it on the device', async () => {
    const { deps, ledger, store } = setup(cloud(inSpanish()));
    const result = await draftReply(request, deps);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.from).toBe('cloud');
    expect(result.template.bodyTranslated).toBe(carta);
    expect(result.entry).toBe(ledger.entries()[0]);
    expect(result.entry?.prompt).toBe(promptFor(request));
    expect(result.entry?.route).toBe('cloud_only');
    expect(await store.get(templateKey(request))).toEqual({ text: inSpanish(), at: '2026-12-01T10:00:00.000Z' });
  });

  it('drafts the next reply to the same kind of letter from the kept copy, with the network gone', async () => {
    const store = memoryStore();
    await draftReply(request, setup(cloud(inSpanish()), store).deps);

    const later = setup(offline, store);
    expect(await draftReply(request, later.deps)).toMatchObject({ status: 'ready', from: 'saved', entry: null });
    expect(later.calls()).toBe(0);
    expect(later.ledger.entries()).toHaveLength(0);
  });

  it('is filed apart from the explanation of the same kind of letter', async () => {
    const store = memoryStore();
    await draftReply(request, setup(cloud(inSpanish()), store).deps);
    expect(templateKey(request)).not.toBe(templateKey({ ...request, purpose: 'explain' }));
    expect(await savedDraft({ ...request, language: 'en' }, store)).toBeNull();
    expect(await savedDraft({ ...request, state: 'NY' }, store)).toBeNull();
  });

  it('shows nothing from a draft that breaks a rule, and does not keep it', async () => {
    const { deps, ledger, store } = setup(cloud(inSpanish({ body_en: `${letter}\nCall me at (415) 555-0134.` })));
    const result = await draftReply(request, deps);

    expect(result).toMatchObject({ status: 'rejected', reason: 'phone', field: 'body_en' });
    if (result.status === 'rejected') expect(result.entry).toBe(ledger.entries()[0]);
    expect(await store.get(templateKey(request))).toBeNull();
    expect(JSON.stringify(result)).not.toContain('itemized');
  });

  it('says so when no draft can be had, and writes the attempt down', async () => {
    const { deps, ledger } = setup(offline);
    expect(await draftReply(request, deps)).toEqual({ status: 'unavailable', why: 'no_answer', error: 'Failed to reach the service.' });
    expect(ledger.entries()[0]).toMatchObject({ ran: 'nowhere', left: 'attempted' });
  });

  it('trusts a kept copy no more than a fresh answer', async () => {
    const store = memoryStore();
    await store.put(templateKey(request), { text: inEnglish(), at: '2026-11-01T00:00:00.000Z' });
    expect(await savedDraft(request, store)).toBeNull();
  });
});

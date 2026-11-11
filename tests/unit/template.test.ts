import { describe, expect, it } from 'vitest';
import { LANGUAGE_IDS, type LanguageId } from '../../src/domain/languages';
import { standInsFor } from '../../src/domain/standIns';
import {
  fill,
  filledText,
  parseExplain,
  placeholdersFor,
  TemplateRejected,
  writtenAs,
  type Piece,
  type RejectReason,
} from '../../src/domain/template';

const good = {
  what: 'This is a bill from {{SENDER}} for care you already received.',
  steps: [
    'Check the bill against any statement from your insurer before paying.',
    'Pay {{AMOUNT}} or ask for a payment plan by {{DEADLINE}} ({{DAYS_LEFT}}).',
    'Call {{PHONE}} and give them {{REFERENCE}} if something looks wrong.',
  ],
  if_ignored: 'After 90 days or so an unpaid bill can be passed to a collection agency.',
  who_can_help: ['The billing office of the hospital.', 'A local legal aid office; dial 211 to find one.'],
  reading_hint: 'The amount due is usually labelled "Amount due" or "Patient balance", not "Total charges".',
};

const answer = (change: Record<string, unknown> = {}): string => JSON.stringify({ ...good, ...change });

function rejection(
  text: string,
  type: Parameters<typeof parseExplain>[1] = 'medical_bill',
  language: LanguageId = 'en',
): TemplateRejected {
  try {
    parseExplain(text, type, language);
  } catch (error) {
    if (error instanceof TemplateRejected) return error;
    throw error;
  }
  throw new Error('expected the template to be rejected');
}

const en = standInsFor('en');

describe('accepting a template', () => {
  it('takes a well-formed answer and keeps every field', () => {
    const t = parseExplain(answer(), 'medical_bill', 'en');
    expect(t.what).toBe(good.what);
    expect(t.steps).toEqual(good.steps);
    expect(t.ifIgnored).toBe(good.if_ignored);
    expect(t.whoCanHelp).toEqual(good.who_can_help);
    expect(t.readingHint).toBe(good.reading_hint);
  });

  it('leaves ordinary numbers alone: a count of days, a form number, a short dialling code', () => {
    const t = parseExplain(
      answer({
        what: 'A CP2000 notice proposes a change to your tax return. You have 30 days to answer.',
        steps: ['Compare it with your Form 1040.', 'In an emergency call 911.', 'Keep copies for 3 years.'],
      }),
      'tax_proposed_change',
      'en',
    );
    expect(t.steps).toHaveLength(3);
  });

  it('accepts text in other scripts', () => {
    const t = parseExplain(
      answer({
        what: '这是 {{SENDER}} 寄来的医疗账单。',
        steps: ['在 {{DEADLINE}}（{{DAYS_LEFT}}）之前付 {{AMOUNT}}，或者申请分期。', 'اتصل بالرقم {{PHONE}} واذكر {{REFERENCE}}.'],
      }),
      'medical_bill',
      'zh-Hans',
    );
    expect(t.what).toContain('{{SENDER}}');
  });
});

describe('rejecting a template whole', () => {
  it('rejects anything that is not the expected JSON object', () => {
    expect(rejection('Sure! Here is the explanation…').reason).toBe('not_json');
    expect(rejection('[]').reason).toBe('wrong_shape');
    expect(rejection('"text"').reason).toBe('wrong_shape');
    expect(rejection('null').reason).toBe('wrong_shape');
  });

  it('rejects a missing, empty or wrongly typed field', () => {
    expect(rejection(answer({ what: undefined })).field).toBe('what');
    expect(rejection(answer({ what: '   ' })).reason).toBe('wrong_shape');
    expect(rejection(answer({ steps: 'Pay the bill.' })).field).toBe('steps');
    expect(rejection(answer({ steps: [] })).field).toBe('steps');
    expect(rejection(answer({ steps: ['ok', 7] })).field).toBe('steps');
    expect(rejection(answer({ who_can_help: [{ name: 'x' }] })).field).toBe('who_can_help');
  });

  it('rejects a field it did not ask for', () => {
    const r = rejection(answer({ phone_to_call: 'the billing office' }));
    expect(r.reason).toBe('wrong_shape');
    expect(r.field).toBe('phone_to_call');
  });

  it('rejects more items or more text than asked for', () => {
    expect(rejection(answer({ steps: Array.from({ length: 7 }, () => 'Do this.') })).reason).toBe('wrong_shape');
    expect(rejection(answer({ who_can_help: Array.from({ length: 5 }, () => 'Someone.') })).reason).toBe('wrong_shape');
    expect(rejection(answer({ what: 'word '.repeat(400) })).reason).toBe('too_long');
  });

  it('rejects a marker that is not on the list', () => {
    const r = rejection(answer({ what: 'Dear {{NAME}}, this is a bill.' }));
    expect(r.reason).toBe('unknown_marker');
    expect(r.found).toBe('{{NAME}}');
    expect(rejection(answer({ what: 'From {{sender}}.' })).reason).toBe('unknown_marker');
    expect(rejection(answer({ what: 'From {{ SENDER }}.' })).reason).toBe('unknown_marker');
    expect(rejection(answer({ what: 'From {{}}.' })).reason).toBe('unknown_marker');
  });

  it('rejects braces that do not close into a marker', () => {
    expect(rejection(answer({ what: 'From {{SENDER.' })).reason).toBe('unknown_marker');
    expect(rejection(answer({ what: 'From SENDER}}.' })).reason).toBe('unknown_marker');
    expect(rejection(answer({ what: 'From {{{SENDER}}}.' })).reason).toBe('unknown_marker');
    expect(rejection(answer({ what: 'From {SENDER}.' })).reason).toBe('unknown_marker');
  });

  it('rejects an amount marker for a kind of letter whose figures are not a bill', () => {
    expect(placeholdersFor('insurance_eob')).not.toContain('AMOUNT');
    const r = rejection(answer({ what: 'You owe {{AMOUNT}}.', steps: ['Keep it for your records.'] }), 'insurance_eob');
    expect(r.reason).toBe('marker_not_allowed_here');
    expect(r.found).toBe('{{AMOUNT}}');
  });

  it('rejects any marker in the hint for the on-device reader', () => {
    const r = rejection(answer({ reading_hint: 'Look for {{AMOUNT}} near the bottom.' }));
    expect(r.reason).toBe('marker_not_allowed_here');
    expect(r.field).toBe('reading_hint');
  });

  const specific: [string, RejectReason][] = [
    ['Send a check for $250.00.', 'amount'],
    ['The fee is 25 dollars.', 'amount'],
    ['The fee is USD 40.', 'amount'],
    ['La multa es de 40 €.', 'amount'],
    ['罚款是￥200。', 'amount'],
    ['Reply by April 15.', 'date'],
    ['Reply by 12/15/2026.', 'date'],
    ['Responda antes del 15 de diciembre.', 'date'],
    ['Reply before 2026-12-15.', 'date'],
    ['Call 1-800-829-1040.', 'phone'],
    ['Call (212) 555-0142 today.', 'phone'],
    ['Call 800-TAX-FORM.', 'phone'],
    ['اتصل على ٨٠٠٨٢٩١٠٤٠', 'phone'],
    ['Text 555 0142 for help.', 'phone'],
    ['See www.example.org for forms.', 'web_address'],
    ['Go to IRS.gov and search for the notice.', 'web_address'],
    ['Pay at https://pay.example/bill.', 'web_address'],
    ['Write to help@example.org.', 'web_address'],
  ];

  it.each(specific)('rejects a template that supplies its own detail: %s', (text, reason) => {
    for (const change of [{ what: text }, { steps: ['Read the letter.', text] }, { if_ignored: text }, { who_can_help: [text] }, { reading_hint: text }]) {
      expect(rejection(answer(change)).reason).toBe(reason);
    }
  });

  it('names the field and shows a short piece of what it found', () => {
    const r = rejection(answer({ if_ignored: `A late fee of $35 is added. ${'More text. '.repeat(20)}` }));
    expect(r.field).toBe('if_ignored');
    expect(r.found).toBe('$35');
    expect(r.message).toContain('if_ignored');
  });
});

describe('filling a template on the device', () => {
  const values = {
    SENDER: 'Mercy General Hospital',
    REFERENCE: 'MG-4471-2209',
    AMOUNT: '$1,284.50',
    DEADLINE: 'December 15, 2026',
    DAYS_LEFT: 'in 34 days',
    PHONE: '(916) 555-0142',
  };

  it('puts every value where its marker was', () => {
    const text = filledText(fill([good.what, ...good.steps].join(' '), values, en));
    for (const value of Object.values(values)) expect(text).toContain(value);
    expect(text).not.toContain('{{');
    expect(text).toContain('by December 15, 2026 (in 34 days).');
  });

  it('says which pieces came from the letter', () => {
    const pieces = fill('Pay {{AMOUNT}} to {{SENDER}}.', values, en);
    expect(pieces).toEqual<Piece[]>([
      { kind: 'text', text: 'Pay ' },
      { kind: 'value', placeholder: 'AMOUNT', text: '$1,284.50' },
      { kind: 'text', text: ' to ' },
      { kind: 'value', placeholder: 'SENDER', text: 'Mercy General Hospital' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('falls back to general words for a detail the letter did not yield', () => {
    const pieces = fill('Pay {{AMOUNT}} by {{DEADLINE}}.', { DEADLINE: 'December 15, 2026' }, en);
    expect(pieces[1]).toEqual({ kind: 'stand_in', placeholder: 'AMOUNT', text: 'the amount shown on your letter' });
    expect(filledText(pieces)).toBe('Pay the amount shown on your letter by December 15, 2026.');
  });

  it('drops a count of days it cannot give, brackets and all', () => {
    const none = {};
    expect(filledText(fill('Reply by {{DEADLINE}} ({{DAYS_LEFT}}).', none, en))).toBe('Reply by the date shown on your letter.');
    expect(filledText(fill('请在 {{DEADLINE}}（{{DAYS_LEFT}}）之前回复。', none, standInsFor('zh-Hans')))).toBe('请在 信上写的日期之前回复。');
    expect(filledText(fill('Reply by {{DEADLINE}}, {{DAYS_LEFT}}.', none, en))).toBe('Reply by the date shown on your letter,.');
    expect(filledText(fill('You have {{DAYS_LEFT}} left.', none, en))).toBe('You have left.');
  });

  it('never re-reads a filled value as a marker', () => {
    const text = filledText(fill('From {{SENDER}}.', { SENDER: '{{AMOUNT}}' }, en));
    expect(text).toBe('From {{AMOUNT}}.');
  });

  it('keeps markup in a template as plain characters', () => {
    const pieces = fill('<b>Pay</b> {{AMOUNT}} <img src=x onerror=alert(1)>', values, en);
    expect(pieces[0]).toEqual({ kind: 'text', text: '<b>Pay</b> ' });
    expect(filledText(pieces)).toContain('<img src=x onerror=alert(1)>');
  });

  it('has a stand-in for every gap in every language', () => {
    for (const language of LANGUAGE_IDS) {
      const standIns = standInsFor(language);
      for (const key of ['SENDER', 'REFERENCE', 'AMOUNT', 'DEADLINE', 'PHONE'] as const) {
        expect(standIns[key].trim().length).toBeGreaterThan(2);
        expect(standIns[key]).not.toMatch(/[{}<>]/);
      }
    }
    expect(new Set(LANGUAGE_IDS.map((l) => standInsFor(l).AMOUNT)).size).toBe(LANGUAGE_IDS.length);
  });
});

describe('the language a template is written in', () => {
  const spanish = {
    what: 'Esta carta de {{SENDER}} es una factura por atención médica que usted ya recibió. Llega después de que su seguro pagó su parte, o cuando no hay seguro.',
    steps: [
      'Compare la factura con la explicación de beneficios de su seguro médico antes de pagar.',
      'Llame al {{PHONE}} y pida una factura detallada, con cada servicio por separado.',
      'Pregunte si hay un plan de pagos o ayuda económica si no puede pagar {{AMOUNT}} antes del {{DEADLINE}}.',
    ],
    if_ignored: 'Si no hace nada, la deuda puede pasar a una agencia de cobranza y eso puede dañar su crédito.',
    who_can_help: ['La oficina de facturación del hospital.', 'Una organización local de asistencia legal gratuita.'],
  };
  const chinese = {
    what: '这是 {{SENDER}} 寄来的医疗账单，要求您支付已经接受的医疗服务的费用。人们收到这类信件，通常是因为保险公司已经付了它该付的部分，剩下的需要您自己承担。',
    steps: [
      '把账单和保险公司寄来的理赔说明放在一起核对，看看每一项服务是不是您实际接受过的。',
      '如果有疑问，请拨打 {{PHONE}}，要求对方提供一份逐项列出的明细账单。',
      '如果一次付不清 {{AMOUNT}}，请在 {{DEADLINE}} 之前询问能不能分期付款或者申请费用减免。',
    ],
    if_ignored: '如果一直不处理，这笔欠款可能会被转给催收公司，并且可能影响您的信用记录。',
    who_can_help: ['医院的账务部门或者患者财务援助办公室。', '当地免费的法律援助机构。'],
  };
  const unmarked = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '');
  const stripped = JSON.parse(unmarked(JSON.stringify(spanish))) as typeof spanish;

  it('accepts Spanish written as Spanish and Chinese written as Chinese', () => {
    expect(parseExplain(answer(spanish), 'medical_bill', 'es').what).toBe(spanish.what);
    expect(parseExplain(answer(chinese), 'medical_bill', 'zh-Hans').what).toBe(chinese.what);
  });

  it('rejects Spanish that came back without its accents', () => {
    expect(stripped.what).toContain('atencion medica');
    const r = rejection(answer(stripped), 'medical_bill', 'es');
    expect(r.reason).toBe('not_in_language');
    expect(r.field).toBe('answer');
  });

  it('rejects an answer in a different writing system from the one asked for', () => {
    expect(rejection(answer(), 'medical_bill', 'zh-Hans').reason).toBe('not_in_language');
    expect(rejection(answer(spanish), 'medical_bill', 'ko').reason).toBe('not_in_language');
    expect(rejection(answer(chinese), 'medical_bill', 'en').reason).toBe('not_in_language');
    expect(rejection(answer(chinese), 'medical_bill', 'ar').reason).toBe('not_in_language');
  });

  it('rejects English sent back for a language that is written with accents', () => {
    expect(rejection(answer(), 'medical_bill', 'es').reason).toBe('not_in_language');
    expect(rejection(answer(), 'medical_bill', 'vi').reason).toBe('not_in_language');
  });

  // Correct Spanish of the kind a checklist is written in. Real answers have had as few as two accents in three hundred letters.
  const plain = [
    'Revise que su nombre y la cuenta sean los mismos que aparecen en la factura del hospital.',
    'Adjunte una copia de la factura y de la tarjeta de su seguro, nunca los originales.',
    'Guarde una copia firmada de esta carta junto con el comprobante de correo certificado.',
  ].join(' ');
  const sparse = `${plain} Anote la fecha de envío y el nombre de la persona con la que hable si llama.`;
  const checklist = [
    'Check that your name and the account number are the same as on the bill.',
    'Attach a copy of the bill and of your insurance card, never the originals.',
    'Keep a signed copy of this letter with the receipt for certified mail.',
    'Write down the day you sent it and the name of anyone you speak with.',
  ].join(' ');
  const tagalog = [
    'Tiyaking ang pangalan mo at ang numero ng account ay pareho sa nakasulat sa singil.',
    'Maglakip ng kopya ng singil at ng iyong insurance card, huwag ang orihinal.',
    'Magtabi ng pirmadong kopya ng sulat na ito kasama ang resibo ng koreo.',
    'Isulat ang araw na ipinadala mo ito at ang pangalan ng sinumang nakausap mo.',
  ].join(' ');

  it('does not throw away short Spanish for having few accents, or none', () => {
    expect(plain.match(/\p{L}/gu)?.length).toBeGreaterThan(200);
    expect(plain).toBe(unmarked(plain));
    expect(writtenAs(plain, 'es')).toBe(true);
    expect(sparse.match(/[áéíóúñ]/g)).toHaveLength(1);
    expect(writtenAs(sparse, 'es')).toBe(true);
  });

  it('still rejects a long text with its accents left off', () => {
    const long = `${sparse} ${sparse}`;
    expect(writtenAs(long, 'es')).toBe(true);
    expect(writtenAs(unmarked(long), 'es')).toBe(false);
  });

  it('tells English from any other language written in Latin letters, however short the text', () => {
    expect(writtenAs(checklist, 'en')).toBe(true);
    for (const language of ['es', 'vi', 'tl', 'ht', 'pt', 'fr'] as const) expect(writtenAs(checklist, language), language).toBe(false);
    expect(writtenAs(tagalog, 'tl')).toBe(true);
    // A name in English inside a sentence in Spanish is not English.
    expect(writtenAs(`${plain} Pida la solicitud de Financial Assistance Policy del hospital.`, 'es')).toBe(true);
  });

  it('judges only what the reader is shown, not the hint kept in English for the extractor', () => {
    // `reading_hint` is English in every template; it must not count against the language.
    expect(() => parseExplain(answer(chinese), 'medical_bill', 'zh-Hant')).not.toThrow();
  });

  it('does not judge an answer too short to tell', () => {
    const short = {
      what: 'Una factura de {{SENDER}}.',
      steps: ['Llame al {{PHONE}}.'],
      if_ignored: 'Puede pasar a cobranza.',
      who_can_help: ['El hospital.'],
    };
    expect(() => parseExplain(answer(short), 'medical_bill', 'es')).not.toThrow();
  });

  it('has a rule for every language on the list', () => {
    for (const language of LANGUAGE_IDS) {
      const outcome = (() => {
        try {
          parseExplain(answer(), 'medical_bill', language);
          return 'accepted';
        } catch (error) {
          return error instanceof TemplateRejected ? error.reason : 'crashed';
        }
      })();
      // The English sample passes for English and for no other.
      expect(outcome, language).toBe(language === 'en' ? 'accepted' : 'not_in_language');
    }
  });
});

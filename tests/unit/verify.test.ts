import { describe, expect, it } from 'vitest';
import { findLabelledNumbers, verifyAmount, verifyDate, verifyPhone, verifyQuote, verifyReference, verifySender } from '../../src/domain/verify';

const BILL = [
  'Riverbend Medical Group',
  'Statement date: November 20, 2026',
  'Account number: RMG-0042-7719',
  '',
  'Total charges: $1,480.00',
  'Insurance paid: ($1,184.00)',
  'Patient balance: $296.00',
  'Minimum payment: $50.00',
  '',
  'Please pay $296.00 by December 15, 2026.',
  'Questions? Call (800) 555-0199 ext. 3, Monday to Friday.',
].join('\n');

describe('verifyAmount', () => {
  it('accepts a value the letter contains and returns every place it appears', () => {
    const v = verifyAmount(BILL, '296.00');
    expect(v.status).toBe('verified');
    if (v.status !== 'verified') return;
    expect(v.value).toBe(29600);
    expect(v.matches.map((m) => m.line)).toEqual([7, 10]);
  });

  it('accepts the same value written differently', () => {
    expect(verifyAmount(BILL, '$1,480').status).toBe('verified');
    expect(verifyAmount(BILL, 1480).status).toBe('verified');
    expect(verifyAmount(BILL, 'USD 50.00').status).toBe('verified');
  });

  it('shows the letter’s sign for a credit, not the model’s', () => {
    const v = verifyAmount(BILL, '1184.00');
    expect(v.status).toBe('verified');
    if (v.status === 'verified') expect(v.value).toBe(-118400);
  });

  it('rejects a value the letter does not contain and offers the real ones', () => {
    const v = verifyAmount(BILL, '$269.00');
    expect(v.status).toBe('unverified');
    if (v.status !== 'unverified') return;
    expect(v.claimed).toBe('$269.00');
    expect(v.candidates.map((c) => c.value)).toEqual([148000, -118400, 29600, 5000, 29600]);
  });

  it('rejects an answer that is not an amount', () => {
    expect(verifyAmount(BILL, 'the patient balance').status).toBe('unverified');
  });

  it('reports an empty answer as absent', () => {
    expect(verifyAmount(BILL, null).status).toBe('absent');
    expect(verifyAmount(BILL, '  ').status).toBe('absent');
  });
});

describe('verifyDate', () => {
  it('accepts a date the model rewrote in another format, with its position', () => {
    for (const claim of ['2026-12-15', '12/15/2026', 'Dec 15, 2026', '15 December 2026']) {
      const v = verifyDate(BILL, claim);
      expect(v.status, claim).toBe('verified');
      if (v.status !== 'verified') continue;
      expect(v.value).toBe('2026-12-15');
      expect(v.matches).toHaveLength(1);
      expect(v.matches[0]?.raw).toBe('December 15, 2026');
      expect(v.matches[0]?.line).toBe(10);
    }
  });

  it('rejects a date the letter never states', () => {
    const letter = 'Notice date: November 20, 2026\nReturn the renewal form within 30 days of this notice.';
    const v = verifyDate(letter, '12/15/2026');
    expect(v.status).toBe('unverified');
    if (v.status === 'unverified') expect(v.candidates.map((c) => c.value)).toEqual(['2026-11-20']);
  });

  it('matches a year-less date in the letter against a full date from the model', () => {
    const letter = 'November 20, 2026\nReturn the form by December 15.';
    const v = verifyDate(letter, '2026-12-15');
    expect(v.status).toBe('verified');
    if (v.status === 'verified') expect(v.matches[0]?.yearInferred).toBe(true);
  });

  it('resolves a year-less claim against the letter’s own date', () => {
    expect(verifyDate(BILL, 'December 15').status).toBe('verified');
  });

  it('reports an empty answer as absent', () => {
    expect(verifyDate(BILL, '').status).toBe('absent');
  });
});

describe('verifyPhone', () => {
  it('accepts the number however the model punctuates it', () => {
    for (const claim of ['800-555-0199', '1 (800) 555-0199', '8005550199']) {
      const v = verifyPhone(BILL, claim);
      expect(v.status, claim).toBe('verified');
      if (v.status === 'verified') expect(v.matches[0]?.extension).toBe('3');
    }
  });

  it('rejects a number with one digit changed', () => {
    const v = verifyPhone(BILL, '(800) 555-0189');
    expect(v.status).toBe('unverified');
    if (v.status === 'unverified') expect(v.candidates.map((c) => c.value)).toEqual(['8005550199']);
  });
});

describe('verifyQuote', () => {
  it('accepts text copied from the letter, ignoring case and line breaks', () => {
    const v = verifyQuote(BILL, 'riverbend medical group');
    expect(v.status).toBe('verified');
    if (v.status !== 'verified') return;
    expect(v.value).toBe('Riverbend Medical Group');
    expect(v.matches[0]?.line).toBe(1);

    const wrapped = verifyQuote('Office of the\n   County Clerk\nRoom 4', 'Office of the County Clerk');
    expect(wrapped.status).toBe('verified');
    if (wrapped.status === 'verified') expect(wrapped.value).toBe('Office of the\n   County Clerk');
  });

  it('accepts a reference number exactly', () => {
    expect(verifyQuote(BILL, 'RMG-0042-7719').status).toBe('verified');
    expect(verifyQuote(BILL, 'RMG-0042-7791').status).toBe('unverified');
  });

  it('rejects a sender the model made up or paraphrased', () => {
    expect(verifyQuote(BILL, 'Riverbend Hospital').status).toBe('unverified');
    expect(verifyQuote(BILL, 'x').status).toBe('unverified');
  });

  it('reports an empty answer as absent', () => {
    expect(verifyQuote(BILL, null).status).toBe('absent');
  });
});

const NOTICE = [
  'Department of Homeland Security',
  'U.S. Citizenship and Immigration Services',
  '',
  'Form I-797C, Notice of Action',
  'NOTICE DATE: 10/23/2026',
  'RECEIPT NUMBER: IOE0926447108',
  'ACCOUNT NUMBER: 0471 2098 3350',
  '',
  'FIELD TRIP PERMISSION',
  'Return this page by 11/17/2026.',
  'Your notice CP14 is enclosed. Case CV-26-004417.',
].join('\n');

describe('findLabelledNumbers', () => {
  it('finds the numbers the letter labels, as printed', () => {
    expect(findLabelledNumbers(NOTICE).map((n) => n.raw)).toEqual(['IOE0926447108', '0471 2098 3350', 'CP14']);
  });

  it("finds a tax agency's notice code and control number", () => {
    const cp2000 = ['Notice CP2000', 'Tax year 2025', 'Notice date: November 9, 2026', 'AUR control number: 50008-2640'].join('\n');
    expect(findLabelledNumbers(cp2000).map((n) => n.raw)).toEqual(['CP2000', '50008-2640']);
    expect(findLabelledNumbers('Letter 525, General Unagreed Report').map((n) => n.raw)).toEqual(['525']);
    // A year after the word is not a code.
    expect(findLabelledNumbers('This notice is about 2025 only.')).toEqual([]);
    // A copied heading block narrows to the code inside it; an answer not in the letter is offered both.
    const v = verifyReference(cp2000, 'Notice CP2000\nTax year 2025');
    if (v.status === 'verified') expect(v.value).toBe('CP2000');
    else expect.fail(v.status);
    const wrong = verifyReference(cp2000, 'CP2000-50008');
    if (wrong.status === 'unverified') expect(wrong.candidates.map((n) => n.value)).toEqual(['CP2000', '50008-2640']);
    else expect.fail(wrong.status);
  });

  it('ignores a label with no number after it', () => {
    expect(findLabelledNumbers('Please write your account number on the check.')).toEqual([]);
  });
});

describe('verifyReference', () => {
  it('accepts a number that is in the letter', () => {
    for (const claim of ['IOE0926447108', 'CP14', 'CV-26-004417', '0471 2098 3350']) {
      expect(verifyReference(NOTICE, claim).status, claim).toBe('verified');
    }
  });

  it('holds back a heading, a date and a form name, and offers the labelled numbers', () => {
    for (const claim of ['PERMISSION', 'Notice of Action', '11/17/2026', 'Form I-797C, Notice of Action', 'I-797C']) {
      const v = verifyReference(NOTICE, claim);
      expect(v.status, claim).toBe('unverified');
      if (v.status === 'unverified') expect(v.candidates.map((c) => c.raw)).toEqual(['IOE0926447108', '0471 2098 3350', 'CP14']);
    }
  });

  it('narrows a copied block to the one labelled number inside it', () => {
    const v = verifyReference(NOTICE, 'Form I-797C, Notice of Action\nNOTICE DATE: 10/23/2026\nRECEIPT NUMBER: IOE0926447108');
    expect(v.status).toBe('verified');
    if (v.status === 'verified') expect(v.matches[0]?.raw).toBe('IOE0926447108');
  });

  it('holds back a block with more than one labelled number: the reader picks', () => {
    expect(verifyReference(NOTICE, 'RECEIPT NUMBER: IOE0926447108\nACCOUNT NUMBER: 0471 2098 3350').status).toBe('unverified');
  });

  it('still rejects what the letter does not say, and reports no answer as absent', () => {
    expect(verifyReference(NOTICE, 'IOE0000000000').status).toBe('unverified');
    const absent = verifyReference(NOTICE, '');
    expect(absent.status).toBe('absent');
    if (absent.status === 'absent') expect(absent.candidates).toHaveLength(3);
  });
});

describe('verifySender', () => {
  const RFE = [
    'U.S. Department of Homeland Security',
    'U.S. Citizenship and Immigration Services',
    'National Benefits Center',
    '',
    'October 20, 2026',
  ].join('\n');
  const IRS = ['Department of the Treasury', 'Internal Revenue Service', 'Ogden, UT 84201-0030', '', 'Notice CP14'].join('\n');
  const GAS = ['GRANITE STATE GAS COMPANY', 'Credit and Collections', 'PO Box 4410', 'Concord, NH 03302'].join('\n');

  it('keeps one line of a copied letterhead: the agency, not its parent body or a center under it', () => {
    const v = verifySender(RFE, 'U.S. Department of Homeland Security\nU.S. Citizenship and Immigration Services\nNational Benefits Center');
    expect(v.status).toBe('verified');
    if (v.status === 'verified') expect(v.value).toBe('U.S. Citizenship and Immigration Services');
  });

  it('drops the address under the name', () => {
    const v = verifySender(IRS, 'Department of the Treasury\nInternal Revenue Service\nOgden, UT 84201-0030');
    if (v.status === 'verified') expect(v.value).toBe('Internal Revenue Service');
    else expect.fail(v.status);
  });

  it.each([
    ['a backslash', 'Department of the Treasury \\ Internal Revenue Service'],
    ['a slash', 'Department of the Treasury / Internal Revenue Service'],
    ['a bar', 'Department of the Treasury | Internal Revenue Service'],
    ['a written-out line break', 'Department of the Treasury\\nInternal Revenue Service'],
  ])('reads letterhead lines the model joined with %s', (_, claim) => {
    const v = verifySender(IRS, claim);
    if (v.status === 'verified') expect(v.value).toBe('Internal Revenue Service');
    else expect.fail(v.status);
  });

  it('still holds back joined names that are not in the letter', () => {
    expect(verifySender(IRS, 'Department of the Treasury \\ Ohio Department of Taxation').status).toBe('unverified');
  });

  it('takes the agency under a federal department when only the department line was copied', () => {
    const v = verifySender(IRS, 'Department of the Treasury');
    if (v.status === 'verified') expect(v.value).toBe('Internal Revenue Service');
    else expect.fail(v.status);
    const r = verifySender(RFE, 'U.S. Department of Homeland Security');
    if (r.status === 'verified') expect(r.value).toBe('U.S. Citizenship and Immigration Services');
    else expect.fail(r.status);
  });

  it('keeps a department that is the sender itself, or one with no agency line under it', () => {
    const dmv = 'Department of Motor Vehicles\nVehicle Registration Unit\nPO Box 942869';
    expect(verifySender(dmv, 'Department of Motor Vehicles')).toMatchObject({ status: 'verified', value: 'Department of Motor Vehicles' });
    const lone = 'Department of the Treasury\nPO Box 1214\nOgden, UT 84201';
    expect(verifySender(lone, 'Department of the Treasury')).toMatchObject({ status: 'verified', value: 'Department of the Treasury' });
    const inText = 'Dear reader,\nWe spoke to the Department of the Treasury about this.\nInternal Revenue Service';
    expect(verifySender(inText, 'Department of the Treasury')).toMatchObject({ status: 'verified', value: 'Department of the Treasury' });
  });

  it('drops a department of the company', () => {
    const v = verifySender(GAS, 'GRANITE STATE GAS COMPANY\nCredit and Collections');
    if (v.status === 'verified') expect(v.value).toBe('GRANITE STATE GAS COMPANY');
    else expect.fail(v.status);
  });

  it('keeps a name wrapped over two lines in one piece', () => {
    const v = verifySender('Office of the\n   County Clerk\nRoom 4', 'Office of the\nCounty Clerk');
    if (v.status === 'verified') expect(v.value).toBe('Office of the\n   County Clerk');
    else expect.fail(v.status);
  });

  it('keeps a sub-unit when it is all there is', () => {
    const v = verifySender('Office of the Jury Commissioner\nRoom 110', 'Office of the Jury Commissioner\nRoom 110');
    if (v.status === 'verified') expect(v.value).toBe('Office of the Jury Commissioner');
    else expect.fail(v.status);
  });

  it('leaves one-line answers and made-up names alone', () => {
    expect(verifySender(GAS, 'Granite State Gas Company').status).toBe('verified');
    expect(verifySender(GAS, 'Granite Gas\nCollections').status).toBe('unverified');
    expect(verifySender(GAS, null).status).toBe('absent');
  });
});

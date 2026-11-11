import { describe, expect, it } from 'vitest';
import { keywordPrior } from '../../src/domain/keywordPrior';
import { isLetterTypeId, LETTER_TYPE_IDS, LETTER_TYPES, letterType } from '../../src/domain/letterTypes';
import { applyTypeRules } from '../../src/domain/rules';
import { verifyAmount, verifyDate } from '../../src/domain/verify';

describe('letter types', () => {
  it('defines every id exactly once, with a description and a reading hint', () => {
    expect(LETTER_TYPES.map((t) => t.id)).toEqual([...LETTER_TYPE_IDS]);
    expect(new Set(LETTER_TYPE_IDS).size).toBe(24);
    for (const t of LETTER_TYPES) {
      expect(t.description.length, t.id).toBeGreaterThan(10);
      expect(t.hint.length, t.id).toBeGreaterThan(40);
      expect(t.description, t.id).not.toMatch(/\n/);
    }
  });

  it('recognises ids and rejects anything else', () => {
    expect(isLetterTypeId('insurance_eob')).toBe(true);
    expect(isLetterTypeId('insurance_eob ')).toBe(false);
    expect(isLetterTypeId('toString')).toBe(false);
    expect(isLetterTypeId(3)).toBe(false);
    expect(() => letterType('nope' as never)).toThrow();
  });
});

const EOB = [
  'Northlake Health Plan',
  'EXPLANATION OF BENEFITS — THIS IS NOT A BILL',
  'Claim number: 2026-448812   Date of service: 10/02/2026',
  'Amount billed: $480.00   Plan paid: $355.00   You may owe: $25.00',
].join('\n');

const JURY = [
  'Superior Court of Alder County — Office of the Jury Commissioner',
  'SUMMONS FOR JURY SERVICE',
  'You are summoned to report for jury duty on December 7, 2026 at 8:00 AM.',
  'Jurors are paid $15.00 per day. Failure to appear may result in a fine of up to $1,500.00.',
].join('\n');

describe('type rules', () => {
  it('never shows an amount due on an Explanation of Benefits, even a real one', () => {
    const amount = verifyAmount(EOB, '$25.00');
    expect(amount.status).toBe('verified');
    const ruled = applyTypeRules('insurance_eob', { amount, deadline: verifyDate(EOB, '10/02/2026') });
    expect(ruled.amount).toEqual({ status: 'not_applicable', withheld: true });
    expect(ruled.deadline).toEqual({ status: 'not_applicable', withheld: true });
  });

  it('never shows an amount on a jury summons, and reads the date as a day to appear', () => {
    const ruled = applyTypeRules('jury_summons', {
      amount: verifyAmount(JURY, '1500'),
      deadline: verifyDate(JURY, '2026-12-07'),
    });
    expect(ruled.amount).toEqual({ status: 'not_applicable', withheld: true });
    expect(ruled.deadline.status).toBe('verified');
    expect(ruled.deadlineMeaning).toBe('appear');
  });

  it('records that nothing was withheld when the model gave no value', () => {
    const ruled = applyTypeRules('data_breach_notice', {
      amount: verifyAmount('We are writing about a security incident.', null),
      deadline: verifyDate('Enroll by March 1, 2027.', 'March 1, 2027'),
    });
    expect(ruled.amount).toEqual({ status: 'not_applicable', withheld: false });
    expect(ruled.deadlineMeaning).toBe('enroll');
  });

  it('passes verdicts through unchanged where the field applies', () => {
    const letter = 'Amount due: $296.00 by December 15, 2026';
    const amount = verifyAmount(letter, '296');
    const deadline = verifyDate(letter, '12/15/2026');
    const ruled = applyTypeRules('medical_bill', { amount, deadline });
    expect(ruled.amount).toBe(amount);
    expect(ruled.deadline).toBe(deadline);
    expect(ruled.amountMeaning).toBe('amount_due');
    expect(ruled.deadlineMeaning).toBe('pay');
  });

  it('says what the amount means for the kinds where it is not simply "pay this"', () => {
    expect(letterType('tax_proposed_change').amount).toBe('proposed');
    expect(letterType('debt_collection').amount).toBe('claimed');
    expect(letterType('debt_collection').deadline).toBe('dispute');
    expect(letterType('rent_increase_or_lease_change').amount).toBe('new_rent');
    expect(letterType('benefits_renewal').deadline).toBe('renew');
  });
});

const SAMPLES: [type: string, text: string][] = [
  ['tax_balance_due', 'Internal Revenue Service. Notice CP14. You owe $1,204.18. Amount due by December 1, 2026. Penalties and interest will continue to accrue.'],
  ['tax_proposed_change', 'Internal Revenue Service Notice CP2000. We are proposing changes to your 2024 tax return because the income reported to us does not match. Tell us if you agree or disagree by December 20, 2026.'],
  ['tax_identity_verification', 'IRS Letter 5071C. We received a tax return with your name. Before we process it we need you to verify your identity. Call the number below.'],
  ['tax_refund_or_information', 'Department of Revenue. We have adjusted your return in your favor. A refund of $212.00 will be mailed within 4 weeks. No action is required.'],
  ['medical_bill', 'Riverbend Medical Group statement. Date of service 10/02/2026. Total charges $1,480.00. Insurance paid $1,184.00. Patient balance $296.00. Please pay by December 15, 2026.'],
  ['insurance_eob', EOB],
  ['insurance_denial', 'Northlake Health Plan. Notice of adverse benefit determination. Your request for prior authorization of an MRI was denied because it is not medically necessary. You have the right to file an appeal within 180 days.'],
  ['utility_bill', 'Cedar Valley Electric. Service period 10/01/2026 to 10/31/2026. Usage 612 kWh. Current charges $84.10. Amount due $84.10. Due date 11/25/2026.'],
  ['utility_shutoff', 'Cedar Valley Electric. DISCONNECTION NOTICE. Your account is past due. Your electric service will be shut off on December 3, 2026 unless we receive $212.44. A reconnection fee applies.'],
  ['debt_collection', 'Harlan & Pike Recovery is a debt collector. This is an attempt to collect a debt. Original creditor: Summit Card. You owe $940.12. You may dispute this debt in writing by December 18, 2026.'],
  ['eviction_notice', 'THREE-DAY NOTICE TO PAY RENT OR QUIT. To the tenant of 14 Alder St Apt 2: unpaid rent of $1,350.00 is due. Pay within three days or vacate the premises. The landlord may begin an unlawful detainer action.'],
  ['rent_increase_or_lease_change', 'Dear tenant, this is notice of a rent increase. Starting February 1, 2027 your new monthly rent will be $1,495.00. Your lease otherwise continues on the same terms.'],
  ['court_summons_or_lawsuit', 'SUMMONS. Summit Card, Plaintiff, v. J. Rivera, Defendant. You are being sued. You must file a written answer with the court within 30 days or a default judgment may be entered for $2,310.00.'],
  ['jury_summons', JURY],
  ['traffic_or_parking_ticket', 'City of Alder Parking Violation Notice. Citation 77120045. License plate 7ABC123. Expired meter. Fine $65.00 due by December 10, 2026. After that date the fine is $95.00.'],
  ['benefits_renewal', 'It is time to renew your Medicaid coverage. To keep your coverage, complete and return the enclosed form by December 15, 2026.'],
  ['benefits_denial_or_reduction', 'Notice of Action. Your SNAP benefits will be reduced from $291.00 to $164.00 starting January 1, 2027. You may request a fair hearing by December 30, 2026.'],
  ['immigration_appointment', 'USCIS Form I-797C, Notice of Action. ASC Appointment Notice. You are scheduled for biometrics at the Application Support Center on December 9, 2026 at 10:00 AM.'],
  ['immigration_request_for_evidence', 'USCIS Form I-797E. Request for Evidence. We need more documents to decide your Form I-485. Submit the requested evidence so that we receive it by February 2, 2027.'],
  ['school_notice', 'Alder Unified School District. Dear Parent or Guardian, your child has been absent 6 days this term. Please contact the attendance office by November 30, 2026.'],
  ['bank_or_credit_notice', 'First Alder Bank. Your checking account was overdrawn on November 3. An overdraft fee of $34.00 was charged. Your current balance is -$58.20.'],
  ['data_breach_notice', 'Notice of Data Breach. What happened: an unauthorized party gained access to files containing your personal information. We are offering 24 months of free credit monitoring. Enroll by March 1, 2027.'],
  ['vehicle_registration_or_recall', 'Department of Motor Vehicles. Vehicle registration renewal notice. Your registration expires 01/15/2027. Total fee $187.00. A smog inspection is required.'],
];

describe('keyword second opinion', () => {
  it.each(SAMPLES)('reads a %s letter', (type, text) => {
    const opinion = keywordPrior(text);
    expect(opinion.type, JSON.stringify(opinion.ranked.slice(0, 3))).toBe(type);
    expect(opinion.ranked[0]?.evidence.length).toBeGreaterThan(0);
  });

  it('covers every known type', () => {
    expect(new Set(SAMPLES.map(([type]) => type))).toEqual(new Set(LETTER_TYPE_IDS.filter((id) => id !== 'other')));
  });

  it('does not mistake a jury summons for a lawsuit, or the other way round', () => {
    expect(keywordPrior(JURY).ranked.find((c) => c.type === 'court_summons_or_lawsuit')).toBeUndefined();
    const lawsuit = 'SUMMONS. Plaintiff v. Defendant. You are being sued. The plaintiff demands a jury trial.';
    expect(keywordPrior(lawsuit).type).toBe('court_summons_or_lawsuit');
  });

  it('does not call an Explanation of Benefits a medical bill', () => {
    const eobFromClinicNetwork = `${EOB}\nProvider: Riverbend Medical Group. Insurance paid $355.00. Patient responsibility $25.00.`;
    expect(keywordPrior(eobFromClinicNetwork).type).toBe('insurance_eob');
  });

  it('tells a shut-off warning from an ordinary utility bill', () => {
    const [, bill] = SAMPLES.find(([type]) => type === 'utility_bill') ?? [];
    expect(keywordPrior(`${bill} Past due balance: $0.00.`).type).toBe('utility_bill');
  });

  it('has no opinion on text it does not recognise', () => {
    expect(keywordPrior('Thank you for your recent visit. We hope to see you again soon.').type).toBeNull();
    expect(keywordPrior('').type).toBeNull();
    expect(keywordPrior('Estimado cliente: le escribimos para informarle sobre su cuenta.').type).toBeNull();
  });

  it('has no opinion when two types are too close to call', () => {
    const mixed = 'Notice of data breach at your bank. Unauthorized access. Overdraft. Credit card APR change in terms. Adverse action. Suspicious activity.';
    const opinion = keywordPrior(mixed);
    expect(opinion.ranked.length).toBeGreaterThan(1);
    const [best, second] = opinion.ranked;
    if (best && second && best.score - second.score < 2) expect(opinion.type).toBeNull();
  });
});

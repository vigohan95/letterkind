import type { LetterTypeId } from '../src/domain/letterTypes';

/**
 * The answer key for the evaluation set.
 *
 * Every letter in `eval/letters/` is synthetic: written for this project,
 * about people and organisations that do not exist, in the layout of the real
 * notices people receive. Phone numbers use the reserved 555-01xx range.
 *
 * A label says what a careful reader would want on the screen for that letter
 * — and, just as important, what should NOT be there. A null amount means "no
 * amount should be shown as something to pay", even though the letter may be
 * full of dollar figures.
 *
 * The labels were written from the letters, before any model was run on them.
 * `tests/unit/evalSet.test.ts` checks that every label can be found in its
 * letter, so the key cannot ask for something the letter does not say.
 */

/** What makes a letter hard to read correctly. */
export type Trap =
  /** Several different dollar figures; only one is the answer. */
  | 'multiple_amounts'
  /** Several different dates; only one is the answer. */
  | 'multiple_dates'
  /** Says, or means, "this is not a bill": no amount should be shown as owed. */
  | 'not_a_bill'
  /** Offers a smaller instalment amount next to the full balance. */
  | 'installment_amount'
  /** Prints a higher amount that applies only after the deadline passes. */
  | 'late_fee'
  /** The time limit is given only as "within N days"; no date is printed. */
  | 'relative_deadline'
  /** A dollar figure that is not a charge to the reader (a refund, a benefit, a fine that may never apply). */
  | 'figure_is_not_a_charge'
  /** An old and a new amount side by side. */
  | 'old_and_new_amount'
  /** Names a second organisation that is not the sender. */
  | 'second_organisation'
  /** Prints more than one phone number. */
  | 'multiple_phones'
  /** Has no notice, account or case number at all. */
  | 'no_reference'
  /** Some dates are written as numbers only (11/18/2026). */
  | 'numeric_dates'
  /** Written in Spanish. */
  | 'spanish'
  /** Written in English and Spanish. */
  | 'bilingual';

export interface Label {
  /** File name in `eval/letters/`. */
  file: string;
  type: LetterTypeId;
  language: 'en' | 'es' | 'en+es';
  /**
   * Names that count as the sender, each copied from the letter. An answer is
   * right if it contains one of them and little else.
   */
  sender: string[];
  /** Numbers that count as the reference to quote. Empty: the letter has none. */
  reference: string[];
  /** The amount to show, as printed. Null: no amount should be shown. */
  amount: string | null;
  /** The deadline to show. Null: no date should be shown as a deadline. */
  deadline: { printed: string; iso: string } | null;
  /** The number to call about this letter, as printed. */
  phone: string | null;
  traps: Trap[];
  /** Why the labels are what they are, where that is not obvious. */
  note: string;
}

export const LABELS: readonly Label[] = [
  {
    file: '01-tax-balance-due.txt',
    type: 'tax_balance_due',
    language: 'en',
    sender: ['Internal Revenue Service', 'Department of the Treasury'],
    reference: ['CP14'],
    amount: '$1,318.42',
    deadline: { printed: 'November 9, 2026', iso: '2026-11-09' },
    phone: '1-800-555-0137',
    traps: ['multiple_amounts', 'multiple_dates'],
    note: 'The billing summary lists tax, credits, penalty and interest before the total. December 14 is when a second notice may follow, not the date to pay by.',
  },
  {
    file: '02-tax-proposed-change.txt',
    type: 'tax_proposed_change',
    language: 'en',
    sender: ['Department of Revenue'],
    reference: ['L0048812736'],
    amount: '$640.40',
    deadline: { printed: 'December 3, 2026', iso: '2026-12-03' },
    phone: '(617) 555-0164',
    traps: ['multiple_amounts', 'not_a_bill', 'second_organisation'],
    note: 'The amount is a proposal, not a balance: the app shows it as proposed. $4,850.00 is income a payer reported, and $612.00 is the tax before interest.',
  },
  {
    file: '03-tax-identity-verification.txt',
    type: 'tax_identity_verification',
    language: 'en',
    sender: ['Internal Revenue Service', 'Department of the Treasury'],
    reference: ['5071C', '4471 0926 3381 55'],
    amount: null,
    deadline: null,
    phone: '1-800-555-0119',
    traps: ['figure_is_not_a_charge', 'relative_deadline'],
    note: '$2,184.00 is a refund claimed on the return, not something to pay. The only time limit is "within 30 days of the date of this letter"; the one printed date is the letter date, which is not a deadline.',
  },
  {
    file: '04-medical-bill.txt',
    type: 'medical_bill',
    language: 'en',
    sender: ['Cedar Hollow Family Clinic'],
    reference: ['CH-208814'],
    amount: '$375.00',
    deadline: { printed: 'November 23, 2026', iso: '2026-11-23' },
    phone: '(503) 555-0148',
    traps: ['multiple_amounts', 'multiple_dates', 'installment_amount', 'numeric_dates'],
    note: 'The balance is $375.00. $125.00 is one of three optional instalments, $310.00 the previous balance.',
  },
  {
    file: '05-insurance-eob.txt',
    type: 'insurance_eob',
    language: 'en',
    sender: ['Harborview Mutual Health'],
    reference: ['2026-1187-4402'],
    amount: null,
    deadline: null,
    phone: '1-800-555-0172',
    traps: ['multiple_amounts', 'not_a_bill', 'relative_deadline', 'second_organisation'],
    note: 'An Explanation of Benefits. "What you may owe your provider" is not a bill from the sender, and nothing is to be paid on this letter. The letter asks for the claim number, so the member ID does not count as the reference.',
  },
  {
    file: '06-insurance-denial.txt',
    type: 'insurance_denial',
    language: 'en',
    sender: ['Pinecrest Health Plan'],
    reference: ['PA-7741903'],
    amount: null,
    deadline: { printed: 'April 14, 2027', iso: '2027-04-14' },
    phone: '1-888-555-0126',
    traps: ['figure_is_not_a_charge', 'multiple_dates', 'second_organisation'],
    note: '$2,300.00 is the estimated charge for a service that was not approved; the reader owes nothing. The letter asks for the case number, so the member ID does not count.',
  },
  {
    file: '07-utility-bill.txt',
    type: 'utility_bill',
    language: 'en',
    sender: ['Tri-Valley Water & Power'],
    reference: ['4471-208-336'],
    amount: '$115.77',
    deadline: { printed: 'November 25, 2026', iso: '2026-11-25' },
    phone: '(925) 555-0190',
    traps: ['multiple_amounts', 'multiple_dates', 'late_fee', 'multiple_phones'],
    note: '$121.56 applies only after the due date. The previous balance was already paid. The second phone number is the outage line.',
  },
  {
    file: '08-utility-shutoff.txt',
    type: 'utility_shutoff',
    language: 'en',
    sender: ['Granite State Gas'],
    reference: ['77-0142-9'],
    amount: '$236.48',
    deadline: { printed: 'November 19, 2026', iso: '2026-11-19' },
    phone: '1-800-555-0105',
    traps: ['multiple_amounts', 'multiple_dates'],
    note: 'Paying the past due amount by November 19 stops the shutoff. The total balance includes current charges not due until December 1; the fee and deposit apply only after a shutoff.',
  },
  {
    file: '09-debt-collection.txt',
    type: 'debt_collection',
    language: 'en',
    sender: ['Northgate Recovery Services'],
    reference: ['NRS-55-208841'],
    amount: '$1,961.30',
    deadline: { printed: 'December 1, 2026', iso: '2026-12-01' },
    phone: '(402) 555-0111',
    traps: ['multiple_amounts', 'multiple_dates', 'second_organisation'],
    note: 'The collector sent the letter; Lakeshore Bank is the creditor it names. $1,862.00 was the balance on an earlier date.',
  },
  {
    file: '10-eviction-notice.txt',
    type: 'eviction_notice',
    language: 'en',
    sender: ['Alder Street Property Management'],
    reference: ['ASP-4B-0218'],
    amount: '$1,450.00',
    deadline: null,
    phone: '(916) 555-0153',
    traps: ['multiple_amounts', 'multiple_dates', 'relative_deadline'],
    note: 'The time limit is three court days from service, which no printed date states. The dates in the letter are the notice date and the rent period. $2,900.00 is the deposit.',
  },
  {
    file: '11-rent-increase.txt',
    type: 'rent_increase_or_lease_change',
    language: 'en',
    sender: ['Maple Court Apartments'],
    reference: ['MC-1127'],
    amount: '$1,360.00',
    deadline: { printed: 'January 1, 2027', iso: '2027-01-01' },
    phone: '(971) 555-0182',
    traps: ['multiple_amounts', 'multiple_dates', 'old_and_new_amount'],
    note: 'The app shows the new rent and the date it takes effect. December 1 is the last day to give notice to move out instead.',
  },
  {
    file: '12-court-summons.txt',
    type: 'court_summons_or_lawsuit',
    language: 'en',
    sender: ['District Court of Redwater County'],
    reference: ['CV-26-004417'],
    amount: '$3,412.75',
    deadline: { printed: 'December 9, 2026', iso: '2026-12-09' },
    phone: '(775) 555-0127',
    traps: ['multiple_amounts', 'multiple_dates', 'second_organisation', 'multiple_phones'],
    note: 'The court issued the summons; the credit union is the plaintiff. The clerk is the number to call about the summons itself; the other number belongs to the lawyer for the other side.',
  },
  {
    file: '13-jury-summons.txt',
    type: 'jury_summons',
    language: 'en',
    sender: ['Superior Court, Redwater County', 'Jury Commissioner'],
    reference: ['0044718-J'],
    amount: null,
    deadline: { printed: 'December 7, 2026', iso: '2026-12-07' },
    phone: '(520) 555-0133',
    traps: ['figure_is_not_a_charge', 'multiple_dates'],
    note: 'The fine applies only to someone who ignores the summons, and $15.00 is what jurors are paid. November 23 is the last day to ask for a postponement, not the day to appear.',
  },
  {
    file: '14-parking-ticket.txt',
    type: 'traffic_or_parking_ticket',
    language: 'en',
    sender: ['City of Port Alder', 'Parking Violations Bureau'],
    reference: ['PA-90317746'],
    amount: '$65.00',
    deadline: { printed: 'November 16, 2026', iso: '2026-11-16' },
    phone: '(206) 555-0177',
    traps: ['multiple_amounts', 'multiple_dates', 'late_fee'],
    note: 'The fine is $65.00 until November 16 and doubles after. November 9 is the last day to ask for a review.',
  },
  {
    file: '15-benefits-renewal.txt',
    type: 'benefits_renewal',
    language: 'en',
    sender: ['Department of Human Services'],
    reference: ['1B-4471-2098'],
    amount: null,
    deadline: { printed: 'December 10, 2026', iso: '2026-12-10' },
    phone: '1-877-555-0158',
    traps: ['figure_is_not_a_charge', 'multiple_dates'],
    note: '$291.00 is the benefit the reader receives. The form is due December 10; December 15 is the interview and December 31 the day benefits stop.',
  },
  {
    file: '16-benefits-reduction.txt',
    type: 'benefits_denial_or_reduction',
    language: 'en',
    sender: ['Department of Social Services'],
    reference: ['77-208-4471'],
    amount: null,
    deadline: { printed: 'January 27, 2027', iso: '2027-01-27' },
    phone: '1-800-555-0114',
    traps: ['figure_is_not_a_charge', 'multiple_dates', 'old_and_new_amount', 'second_organisation'],
    note: 'The last day to ask for a hearing is January 27. December 1 is when the cut starts, and also the cut-off for keeping the old amount during an appeal. None of the dollar figures is a charge.',
  },
  {
    file: '17-immigration-appointment.txt',
    type: 'immigration_appointment',
    language: 'en',
    sender: ['U.S. Citizenship and Immigration Services', 'USCIS', 'Department of Homeland Security'],
    reference: ['IOE0926447108'],
    amount: null,
    deadline: { printed: '11/18/2026', iso: '2026-11-18' },
    phone: '1-800-555-0183',
    traps: ['figure_is_not_a_charge', 'multiple_dates', 'numeric_dates'],
    note: 'The fee was already paid. Both dates are printed as numbers; the first is the notice date.',
  },
  {
    file: '18-immigration-rfe.txt',
    type: 'immigration_request_for_evidence',
    language: 'en',
    sender: ['U.S. Citizenship and Immigration Services', 'USCIS', 'Department of Homeland Security'],
    reference: ['MSC2790144718'],
    amount: null,
    deadline: { printed: 'January 15, 2027', iso: '2027-01-15' },
    phone: '1-800-555-0183',
    traps: ['multiple_dates'],
    note: 'June 4 is the filing date of the application. The letter says not to send a fee.',
  },
  {
    file: '19-medical-bill-es.txt',
    type: 'medical_bill',
    language: 'es',
    sender: ['Clínica Familiar Las Lomas'],
    reference: ['LL-338201'],
    amount: '$120.00',
    deadline: { printed: '24 de noviembre de 2026', iso: '2026-11-24' },
    phone: '(213) 555-0161',
    traps: ['spanish', 'multiple_amounts', 'multiple_dates', 'installment_amount'],
    note: 'A medical bill written entirely in Spanish. $60.00 is an optional instalment; $420.00 the charges before insurance.',
  },
  {
    file: '20-school-notice-bilingual.txt',
    type: 'school_notice',
    language: 'en+es',
    sender: ['Lincoln Elementary School', 'Brookfield Unified School District'],
    reference: [],
    amount: '$12.00',
    deadline: { printed: 'November 20, 2026', iso: '2026-11-20' },
    phone: '(408) 555-0139',
    traps: ['bilingual', 'multiple_dates', 'no_reference'],
    note: 'The same notice in English and Spanish. The slip is due November 20; December 11 is the day of the trip. There is no reference number of any kind.',
  },
];

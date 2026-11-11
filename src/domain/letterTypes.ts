/**
 * The kinds of letter the app knows how to read.
 *
 * Each kind carries three things used at different points:
 *  - `description`: one line shown to the on-device classifier.
 *  - `amount` / `deadline`: what a dollar figure or a date *means* in this kind
 *    of letter — or that it means nothing actionable, in which case the app
 *    will not show one no matter what the model extracts.
 *  - `hint`: how to read this kind of letter, given to the on-device extractor.
 *
 * The id is also one of only three things the cloud is ever told.
 */

export const LETTER_TYPE_IDS = [
  'tax_balance_due',
  'tax_proposed_change',
  'tax_identity_verification',
  'tax_refund_or_information',
  'medical_bill',
  'insurance_eob',
  'insurance_denial',
  'utility_bill',
  'utility_shutoff',
  'debt_collection',
  'eviction_notice',
  'rent_increase_or_lease_change',
  'court_summons_or_lawsuit',
  'jury_summons',
  'traffic_or_parking_ticket',
  'benefits_renewal',
  'benefits_denial_or_reduction',
  'immigration_appointment',
  'immigration_request_for_evidence',
  'school_notice',
  'bank_or_credit_notice',
  'data_breach_notice',
  'vehicle_registration_or_recall',
  'other',
] as const;

export type LetterTypeId = (typeof LETTER_TYPE_IDS)[number];

/** What the dollar figure in this kind of letter is. `none`: do not show one. */
export type AmountMeaning =
  | 'amount_due' // money the reader is asked to pay
  | 'proposed' // a change someone proposes; not yet owed
  | 'claimed' // what the other side says is owed; can be disputed
  | 'new_rent' // a recurring amount that is changing
  | 'fine'
  | 'fee'
  | 'none';

/** What the date in this kind of letter is. `none`: do not show one. */
export type DeadlineMeaning =
  | 'pay'
  | 'respond'
  | 'appear' // be somewhere in person
  | 'dispute'
  | 'appeal'
  | 'enroll'
  | 'renew'
  | 'takes_effect'
  | 'none';

export interface LetterType {
  id: LetterTypeId;
  description: string;
  amount: AmountMeaning;
  deadline: DeadlineMeaning;
  hint: string;
}

const TYPES: readonly LetterType[] = [
  {
    id: 'tax_balance_due',
    description: 'A tax agency says tax, penalty or interest is owed and asks for payment.',
    amount: 'amount_due',
    deadline: 'pay',
    hint: 'The amount is the total the agency says is due now, including penalty and interest — not the original tax, and not a single line of the breakdown. The deadline is the date to pay by to avoid more penalty or interest.',
  },
  {
    id: 'tax_proposed_change',
    description: 'A tax agency proposes to change a return because its records differ; asks the taxpayer to agree or disagree.',
    amount: 'proposed',
    deadline: 'respond',
    hint: 'Nothing is owed yet. The amount is the proposed additional amount (or the proposed balance due). The deadline is the date to respond by, agreeing or disagreeing — it is not a payment date.',
  },
  {
    id: 'tax_identity_verification',
    description: 'A tax agency holds a return until the taxpayer confirms their identity.',
    amount: 'none',
    deadline: 'respond',
    hint: 'No payment is asked for. Any dollar figure is a refund on hold, not an amount due. The deadline, if one is stated, is the date to verify identity by. The phone number is the verification line.',
  },
  {
    id: 'tax_refund_or_information',
    description: 'A tax agency reports a refund, an adjustment in the taxpayer’s favour, or gives information; no payment is asked for.',
    amount: 'none',
    deadline: 'respond',
    hint: 'No payment is asked for. Dollar figures are refunds or adjustments, not amounts due. There is a deadline only if the letter asks for a reply or lets the reader dispute a change by a stated date.',
  },
  {
    id: 'medical_bill',
    description: 'A hospital, clinic, lab or doctor asks the patient to pay for care.',
    amount: 'amount_due',
    deadline: 'pay',
    hint: 'The amount is what the patient owes after insurance — often labelled patient balance, amount due or you owe. It is not the total charges, not what insurance paid, and not a minimum or instalment payment. The deadline is the payment due date, not a date of service or the statement date.',
  },
  {
    id: 'insurance_eob',
    description: 'A health insurer explains how a claim was processed. It says it is not a bill.',
    amount: 'none',
    deadline: 'none',
    hint: 'This is not a bill. Do not report an amount due even though the letter lists charges and a “you may owe” figure — the provider bills separately. Dates are dates of service, not deadlines.',
  },
  {
    id: 'insurance_denial',
    description: 'A health insurer refuses to pay for or approve a treatment, drug or claim and explains how to appeal.',
    amount: 'none',
    deadline: 'appeal',
    hint: 'No payment is asked for by this letter. The deadline is the last day to file an appeal. If the letter only gives a number of days (for example “within 180 days of this notice”), there is no stated date.',
  },
  {
    id: 'utility_bill',
    description: 'A regular electricity, gas, water, phone or internet bill.',
    amount: 'amount_due',
    deadline: 'pay',
    hint: 'The amount is the total amount due for this bill, including any previous balance — not the current charges alone and not the amount after the due date. The deadline is the due date.',
  },
  {
    id: 'utility_shutoff',
    description: 'A utility warns that service will be disconnected unless a past-due amount is paid.',
    amount: 'amount_due',
    deadline: 'pay',
    hint: 'The amount is the past-due amount that must be paid to keep service on, which may be less than the total account balance. The deadline is the last day to pay before disconnection — the disconnection date, not the notice date.',
  },
  {
    id: 'debt_collection',
    description: 'A collection agency or law firm says a debt is owed to a creditor and explains the right to dispute it.',
    amount: 'claimed',
    deadline: 'dispute',
    hint: 'The amount is what the collector claims is owed now. The deadline is the last day to dispute the debt or ask for validation in writing — not a payment date. A settlement offer has its own, different date.',
  },
  {
    id: 'eviction_notice',
    description: 'A landlord or court tells a tenant to pay overdue rent, fix a violation, or move out.',
    amount: 'claimed',
    deadline: 'respond',
    hint: 'The amount is the rent the landlord says is owed, if any. The deadline is the date by which the tenant must pay, fix the problem, move out, or answer the court — whichever the notice demands. If only a number of days is given, there is no stated date.',
  },
  {
    id: 'rent_increase_or_lease_change',
    description: 'A landlord announces a new rent or changed lease terms from a future date; not an eviction.',
    amount: 'new_rent',
    deadline: 'takes_effect',
    hint: 'The amount is the new monthly rent, not the old rent and not the size of the increase. The date is when the new rent or terms take effect. If the letter asks for a signed renewal by an earlier date, that earlier date is the deadline.',
  },
  {
    id: 'court_summons_or_lawsuit',
    description: 'A court paper saying the reader is being sued (a plaintiff against a defendant) and must answer.',
    amount: 'claimed',
    deadline: 'respond',
    hint: 'The amount is what the plaintiff is asking for, if stated. The deadline is the last day to file a written answer with the court, or the hearing date if one is set. If only a number of days after service is given, there is no stated date.',
  },
  {
    id: 'jury_summons',
    description: 'A court calls the reader for jury duty on a given date. The reader is not being sued.',
    amount: 'none',
    deadline: 'appear',
    hint: 'No payment is asked for; any dollar figure is juror pay, mileage or a possible fine for not appearing. The date is the day to report for jury service. An earlier date to return a questionnaire is a different thing.',
  },
  {
    id: 'traffic_or_parking_ticket',
    description: 'A citation for a parking, traffic, toll or camera violation with a fine.',
    amount: 'fine',
    deadline: 'pay',
    hint: 'The amount is the fine due now — not the higher amount that applies after the due date. The deadline is the last day to pay or to contest the citation.',
  },
  {
    id: 'benefits_renewal',
    description: 'A benefits agency (Medicaid, SNAP, CHIP and similar) asks the reader to renew or recertify to keep benefits.',
    amount: 'none',
    deadline: 'renew',
    hint: 'No payment is asked for; dollar figures are benefit amounts or income limits. The deadline is the date the renewal form or documents must be returned by — not the date coverage ends, and not the notice date.',
  },
  {
    id: 'benefits_denial_or_reduction',
    description: 'A benefits agency denies, reduces or ends benefits and explains how to ask for a hearing.',
    amount: 'none',
    deadline: 'appeal',
    hint: 'No payment is asked for unless the letter is about an overpayment. The deadline is the last day to request a fair hearing or appeal. The date benefits change is a different date.',
  },
  {
    id: 'immigration_appointment',
    description: 'An immigration agency schedules a biometrics appointment, interview or ceremony.',
    amount: 'none',
    deadline: 'appear',
    hint: 'No payment is asked for. The date is the appointment date. The notice date and the receipt date are not the appointment.',
  },
  {
    id: 'immigration_request_for_evidence',
    description: 'An immigration agency asks for more documents before it decides a case.',
    amount: 'none',
    deadline: 'respond',
    hint: 'No payment is asked for. The deadline is the date the response must be received by. The notice date is not the deadline.',
  },
  {
    id: 'school_notice',
    description: 'A school or district writes to a parent or guardian about attendance, enrolment, health forms, meetings or fees.',
    amount: 'fee',
    deadline: 'respond',
    hint: 'The amount is a fee the school asks for, if any. The deadline is the date to reply, return a form or attend a meeting.',
  },
  {
    id: 'bank_or_credit_notice',
    description: 'A bank, card issuer or lender writes about an account: overdraft, changed terms, a denied application, suspected fraud.',
    amount: 'none',
    deadline: 'respond',
    hint: 'Report no amount unless the letter plainly asks for a payment. Balances, credit limits and fees charged are not amounts due. The deadline is the date to reply or act by, if one is stated.',
  },
  {
    id: 'data_breach_notice',
    description: 'An organisation says personal information was exposed in a security incident and offers credit monitoring.',
    amount: 'none',
    deadline: 'enroll',
    hint: 'No payment is asked for. The deadline is the last day to enrol in the free credit monitoring or identity protection. The date of the incident is not a deadline.',
  },
  {
    id: 'vehicle_registration_or_recall',
    description: 'A motor vehicle agency asks to renew a registration, or a manufacturer announces a safety recall.',
    amount: 'fee',
    deadline: 'renew',
    hint: 'For a registration renewal, the amount is the total renewal fee and the deadline is the expiration date. A recall repair is free: report no amount and no deadline unless the letter states one.',
  },
  {
    id: 'other',
    description: 'None of the above.',
    amount: 'amount_due',
    deadline: 'respond',
    hint: 'Report an amount only if the letter asks the reader to pay it, and a deadline only if the letter states a date by which the reader must do something.',
  },
];

const BY_ID = new Map<LetterTypeId, LetterType>(TYPES.map((t) => [t.id, t]));

export const LETTER_TYPES: readonly LetterType[] = TYPES;

export function isLetterTypeId(value: unknown): value is LetterTypeId {
  return typeof value === 'string' && BY_ID.has(value as LetterTypeId);
}

export function letterType(id: LetterTypeId): LetterType {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown letter type: ${String(id)}`);
  return found;
}

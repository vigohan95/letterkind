/**
 * The glossary: words official letters use that most people never have to
 * know until one arrives.
 *
 * The list is fixed and ships with the app. When a reader taps a word, the
 * only thing that can be sent anywhere is the *id* of an entry in this list —
 * never a word, phrase or sentence taken from their letter.
 */

const WORDS = [
  // Money owed, bills, collections
  'balance due',
  'past due',
  'delinquent',
  'minimum payment',
  'late fee',
  'finance charge',
  'interest',
  'penalty',
  'principal',
  'statement',
  'itemized bill',
  'payment plan',
  'installment agreement',
  'hardship',
  'financial assistance',
  'charity care',
  'collection agency',
  'debt collector',
  'original creditor',
  'validation notice',
  'dispute',
  'charge-off',
  'settlement',
  'statute of limitations',
  'credit report',
  'credit bureau',
  'garnishment',
  'levy',
  'lien',
  'offset',
  'overpayment',
  'waiver',
  'write-off',

  // Health care and insurance
  'explanation of benefits',
  'claim',
  'deductible',
  'copayment',
  'coinsurance',
  'out-of-pocket maximum',
  'premium',
  'allowed amount',
  'amount billed',
  'contractual adjustment',
  'patient responsibility',
  'in-network',
  'out-of-network',
  'balance billing',
  'prior authorization',
  'medical necessity',
  'denial',
  'appeal',
  'internal appeal',
  'external review',
  'grievance',
  'coordination of benefits',
  'subscriber',
  'dependent',
  'group number',
  'member ID',
  'provider',
  'date of service',
  'coverage',
  'open enrollment',
  'special enrollment period',
  'formulary',
  'referral',
  'COBRA',

  // Taxes
  'notice',
  'tax year',
  'adjusted gross income',
  'taxable income',
  'withholding',
  'estimated tax',
  'refund',
  'tax credit',
  'deduction',
  'filing status',
  'amended return',
  'underreported income',
  'proposed assessment',
  'notice of deficiency',
  'failure-to-pay penalty',
  'failure-to-file penalty',
  'abatement',
  'offer in compromise',
  'currently not collectible',
  'identity verification',
  'taxpayer identification number',
  'power of attorney',
  'Taxpayer Advocate Service',
  'audit',
  'examination',
  'response form',
  'W-2',
  '1099',

  // Housing
  'landlord',
  'tenant',
  'lease',
  'month-to-month tenancy',
  'security deposit',
  'notice to quit',
  'pay or quit',
  'cure or quit',
  'notice to vacate',
  'eviction',
  'unlawful detainer',
  'writ of possession',
  'rent increase',
  'renewal',
  'holdover',
  'habitability',
  'foreclosure',
  'default',
  'escrow',
  'mortgage servicer',
  'reinstatement',
  'loss mitigation',
  'forbearance',
  'loan modification',

  // Courts and legal process
  'summons',
  'complaint',
  'plaintiff',
  'defendant',
  'respondent',
  'petitioner',
  'answer',
  'served',
  'default judgment',
  'judgment',
  'hearing',
  'continuance',
  'docket number',
  'case number',
  'small claims',
  'subpoena',
  'affidavit',
  'notarized',
  'jury duty',
  'juror qualification questionnaire',
  'excusal',
  'postponement',
  'failure to appear',
  'bench warrant',
  'citation',
  'arraignment',
  'plea',
  'traffic school',
  'points',
  'fee waiver',
  'legal aid',
  'pro se',
  'mediation',
  'statutory',

  // Benefits and government programs
  'recertification',
  'redetermination',
  'renewal form',
  'eligibility',
  'household',
  'gross income',
  'net income',
  'proof of income',
  'verification',
  'benefit period',
  'notice of action',
  'adverse action',
  'fair hearing',
  'aid paid pending',
  'good cause',
  'sanction',
  'termination',
  'suspension',
  'reduction',
  'overissuance',
  'Medicaid',
  'Medicare',
  'SNAP',
  'TANF',
  'SSI',
  'SSDI',
  'unemployment insurance',
  'claimant',
  'weekly certification',
  'determination',
  'reconsideration',
  'representative payee',

  // Utilities
  'disconnection notice',
  'shutoff',
  'reconnection fee',
  'budget billing',
  'meter reading',
  'estimated reading',
  'deposit',
  'medical certificate',
  'winter moratorium',
  'public utility commission',

  // Immigration, identity, records
  'receipt notice',
  'request for evidence',
  'biometrics appointment',
  'notice of intent to deny',
  'priority date',
  'alien registration number',
  'certified copy',
  'data breach',
  'credit freeze',
  'fraud alert',
  'identity theft',

  // Banking, cars, schools, everything else
  'overdraft',
  'insufficient funds',
  'account closure',
  'chargeback',
  'repossession',
  'deficiency balance',
  'registration renewal',
  'suspension of license',
  'proof of insurance',
  'student loan servicer',
  'deferment',
  'income-driven repayment',
  'wage withholding order',
  'child support order',
  'arrears',
  'certified mail',
  'postmarked',
  'business days',
  'calendar days',
  'effective date',
  'due process',
  'without prejudice',
] as const;

export type TermId = string & { readonly __term: unique symbol };

export interface Term {
  id: TermId;
  /** The word or phrase as it appears in letters. */
  words: string;
}

const slug = (words: string): string =>
  words
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const TERMS: readonly Term[] = WORDS.map((words) => ({ id: slug(words) as TermId, words }));

export const TERM_IDS: readonly TermId[] = TERMS.map((t) => t.id);

const BY_ID = new Map<string, Term>(TERMS.map((t) => [t.id, t]));

export const isTermId = (value: unknown): value is TermId => typeof value === 'string' && BY_ID.has(value);

export function term(id: TermId): Term {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown glossary term: ${id}`);
  return found;
}

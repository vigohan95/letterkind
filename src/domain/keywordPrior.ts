import type { LetterTypeId } from './letterTypes';

/**
 * A second opinion on what kind of letter this is, from plain keyword rules.
 *
 * The on-device model classifies the letter. This runs alongside it, costs
 * nothing, and is deterministic. When the two agree the app proceeds; when
 * they disagree the app shows both and lets the reader choose, instead of
 * trusting either. It knows English letter vocabulary only: for a letter in
 * another language it has no opinion and the model stands alone.
 */

type KnownType = Exclude<LetterTypeId, 'other'>;
/** A type the rules can vote for: a known one, or `other` for letters that clearly fall outside the list. */
type VotedType = KnownType | 'other';
type Cue = readonly [pattern: RegExp, weight: number];

const TAX_AGENCY: Cue = [/internal revenue service|\bIRS\b|department of (?:revenue|taxation)|franchise tax board|comptroller/i, 1.5];
const UTILITY: Cue = [/\b(?:electric|electricity|natural gas|water|sewer|utilit(?:y|ies)|power company|energy)\b/i, 1.5];
const TENANCY: Cue = [/\b(?:landlord|tenant|tenancy|lease|rental (?:unit|agreement)|premises)\b/i, 1.5];
const BENEFITS: Cue = [/\b(?:medicaid|medi-cal|SNAP|CHIP|TANF|food stamps|EBT|cash assistance|public assistance|benefits)\b/i, 2];
const IMMIGRATION: Cue = [/\bUSCIS\b|citizenship and immigration services|\bI-797|\bform [IN]-\d{3}/i, 2.5];
/** A clinic saying an account may go to collections later is still the clinic's bill, not a collector's letter. */
const COLLECTIONS_LATER = /\bmay be (?:referred|sent|turned over|assigned|placed) (?:to|with) (?:an? )?(?:outside |third[- ]party )?collection agenc/i;

const CUES: Record<KnownType, readonly Cue[]> = {
  tax_balance_due: [
    TAX_AGENCY,
    [/\b(?:amount|balance) (?:you owe|due)\b|\byou owe\b/i, 3],
    [/\bCP ?(?:14|501|503|504)\b|notice of intent to levy|final notice/i, 4],
    [/failure[- ]to[- ]pay|penalt(?:y|ies) and interest|interest (?:will|continues to) accrue/i, 2],
  ],
  tax_proposed_change: [
    TAX_AGENCY,
    [/propos(?:ed|ing) (?:changes?|adjustments?|assessment)|we(?:'re| are) proposing/i, 5],
    [/\bCP ?2000\b|notice of deficiency|underreport/i, 4],
    [/(?:doesn't|does not|don't|do not) match|agree or disagree|if you (?:agree|disagree)/i, 3],
  ],
  tax_identity_verification: [
    TAX_AGENCY,
    [/verify your identity|identity verification|confirm your identity/i, 6],
    [/\b(?:5071C|4883C|5747C|6331C)\b|idverify/i, 5],
    [/identity theft/i, 2],
  ],
  tax_refund_or_information: [
    TAX_AGENCY,
    [/\brefund\b/i, 3],
    [/we(?:'ve| have) (?:issued|approved|adjusted|corrected|applied)|in your favor/i, 3],
    [/no (?:further )?(?:action|response|reply) (?:is )?(?:required|needed|necessary)|you (?:don't|do not) need to (?:do anything|respond|reply)/i, 4],
  ],
  medical_bill: [
    [/patient (?:balance|responsibility|amount due|billing|financial services|accounts)|amount you owe/i, 3],
    [/\b(?:hospital|clinic|medical|physicians?|health system|laborator(?:y|ies)|radiology|urgent care|dental)\b/i, 1.5],
    [/dates? of service/i, 1.5],
    [/insurance (?:paid|payments?|adjustments?)/i, 1.5],
    [/\bstatement\b|please pay|payment (?:is )?due|pay this amount/i, 1.5],
    [/this is not a bill/i, -8],
  ],
  insurance_eob: [
    [/explanation of benefits/i, 6],
    [/this is not a bill/i, 5],
    [/amount billed|allowed amount|plan paid|what (?:your|the) plan paid|your (?:share|responsibility)|you may owe/i, 2],
    [/\bclaim (?:number|no\.?|#)/i, 1],
  ],
  insurance_denial: [
    [/adverse benefit determination|notice of denial|denial of (?:coverage|benefits|payment)/i, 5],
    [/(?:claim|request|prior authorization|pre-?authorization|coverage|service|treatment)\b.{0,60}\b(?:denied|not approved|not covered|cannot approve)/is, 4],
    [/not medically necessary|experimental or investigational|out[- ]of[- ]network/i, 3],
    [/(?:right to|file an?|request an?|submit an?) (?:internal |external |expedited )?appeal/i, 2.5],
  ],
  utility_bill: [
    UTILITY,
    [/\bkWh\b|\btherms?\b|gallons|meter (?:read|number)|usage/i, 3],
    [/current charges|service (?:period|address)|billing period/i, 2.5],
    [/amount due|due date/i, 1],
    [/disconnect|shut[- ]?off/i, -4],
  ],
  utility_shutoff: [
    UTILITY,
    [/disconnect|shut[- ]?off|termination of service|service will be (?:interrupted|terminated|turned off)/i, 6],
    [/past[- ]due|delinquent/i, 2],
    [/reconnect/i, 2],
  ],
  debt_collection: [
    [/debt collector|attempt to collect a debt|collection agenc/i, 6],
    [/original creditor|current creditor|creditor to whom/i, 3],
    [/dispute (?:this|the|all or part of the) debt|validation|verif(?:y|ication of) the debt/i, 3],
    [/placed (?:with|for collection)|referred to (?:our|this) (?:office|agency)/i, 3],
    [COLLECTIONS_LATER, -6],
  ],
  eviction_notice: [
    TENANCY,
    [/notice to (?:quit|vacate)|pay (?:rent )?or quit|cure or quit/i, 6],
    [/\bevict|unlawful detainer|summary possession/i, 5],
    [/vacate|terminat\w+ (?:of )?(?:your |the )?tenancy|surrender possession/i, 4],
    [/(?:unpaid|past[- ]due|overdue) rent/i, 2],
  ],
  rent_increase_or_lease_change: [
    TENANCY,
    [/rent (?:increase|will increase|will be increased|adjustment)|increase (?:in|of|to) (?:your |the )?(?:monthly )?rent|new (?:monthly )?rent/i, 6],
    [/lease renewal|renew(?:al of)? your lease|change (?:in|of|to) (?:the )?terms/i, 4],
    [/\bevict|notice to (?:quit|vacate)|pay (?:rent )?or quit/i, -6],
  ],
  court_summons_or_lawsuit: [
    [/you (?:are being|have been) sued|lawsuit has been filed/i, 6],
    [/\bplaintiff/i, 3],
    [/\bdefendant/i, 3],
    [/\bsummons\b/i, 2],
    [/file (?:a |an |your )?(?:written )?(?:answer|response)|default judgment|\bcomplaint\b/i, 3],
    [/jury (?:duty|service)|\bjurors?\b/i, -8],
  ],
  jury_summons: [
    [/jury (?:duty|service)|summons for jury|jury summons/i, 6],
    [/\bjurors?\b/i, 5],
    [/report (?:to|for|at)|failure to appear|questionnaire/i, 1.5],
    [/\bplaintiff|\bdefendant|you (?:are being|have been) sued/i, -6],
  ],
  traffic_or_parking_ticket: [
    [/parking (?:violation|ticket|citation)|traffic (?:violation|ticket|citation|infraction)|notice of (?:parking |traffic |toll )?violation/i, 6],
    [/\bcitation\b/i, 3],
    [/red[- ]light|speeding|toll (?:violation|evasion)|photo enforcement|expired meter/i, 3],
    [/license plate|plate (?:number|no\.?)|\bfine\b/i, 2],
  ],
  benefits_renewal: [
    BENEFITS,
    [/\brenew(?:al)?\b|recertif|redetermination/i, 4],
    [/to keep (?:your|getting|receiving) (?:coverage|benefits)|(?:coverage|benefits) will (?:end|stop) (?:if|unless)/i, 3],
    [/(?:return|complete|submit|send back) (?:this|the|your) (?:renewal |enclosed )?form/i, 2],
  ],
  benefits_denial_or_reduction: [
    BENEFITS,
    [/(?:has|have) been (?:denied|reduced|terminated|stopped|discontinued)|(?:was|were|will be|are being) (?:denied|reduced|terminated|stopped|discontinued)/i, 4],
    [/notice of (?:action|decision|adverse action)|fair hearing/i, 4],
    [/not eligible|ineligible|over the (?:income )?limit|overpayment/i, 2],
    // USCIS prints "Notice of Action" on every I-797; that is not a benefits agency's notice.
    [IMMIGRATION[0], -4],
  ],
  immigration_appointment: [
    IMMIGRATION,
    [/biometrics|application support center|\bASC\b/i, 6],
    [/appointment notice|interview notice|you are scheduled|oath ceremony|(?:notified|required|scheduled) to appear for (?:an? |your )?(?:initial )?interview|appear for (?:an? |your )?(?:initial )?interview/i, 4],
    [/request for (?:initial |additional )?evidence/i, -6],
  ],
  immigration_request_for_evidence: [
    IMMIGRATION,
    [/request for (?:initial |additional )?evidence|\bRFE\b/i, 7],
    [/notice of intent to deny/i, 5],
    [/submit (?:the |all )?(?:requested |following )?(?:evidence|documents)/i, 2],
  ],
  school_notice: [
    [/\bschools?\b|school district|\bprincipal\b/i, 2],
    [/parents?(?: or |\/)guardians?|dear (?:parent|guardian|famil)/i, 3],
    [/your (?:child|student|son|daughter)/i, 3],
    [/attendance|absen(?:t|ce)|truan|enrol+ment|immunization|report card|\bIEP\b|field trip|conference/i, 2],
  ],
  bank_or_credit_notice: [
    [/\bbank\b|credit union|card (?:services|member)|cardholder/i, 1.5],
    [/overdraft|insufficient funds|\bNSF\b|returned (?:item|payment)/i, 4],
    [/credit (?:card|limit|line)|annual percentage rate|\bAPR\b|change in terms/i, 3],
    [/adverse action|credit (?:score|bureau|reporting agency)|unable to approve your (?:application|request)/i, 4],
    [/suspicious|unusual activity|fraud alert|account (?:has been|will be) (?:closed|restricted|frozen)/i, 3],
    [/(?:locked|blocked|frozen|suspended|restricted) your (?:debit |credit |atm )?card|(?:activity|transactions?|charges?) that (?:does|do) not look like you|card security/i, 4],
    [/debt collector|credit monitoring/i, -4],
  ],
  data_breach_notice: [
    [/data (?:breach|security incident)|security incident|notice of data/i, 6],
    [/unauthorized (?:access|party|individual|person|actor)/i, 4],
    [/credit monitoring|identity (?:theft )?protection/i, 4],
    [/what happened|what information was involved|personal information/i, 2],
  ],
  vehicle_registration_or_recall: [
    [/registration (?:renewal|expires|expiration)|renew(?:al of)? your (?:vehicle )?registration/i, 6],
    [/safety recall|recall (?:notice|campaign)|\bNHTSA\b/i, 6],
    [/\bDMV\b|motor vehicles?|\bVIN\b|vehicle identification number/i, 3],
    [/smog|emissions (?:test|inspection)|license plate/i, 1.5],
  ],
};

/**
 * Letters that are clearly none of the known kinds. A small model squeezes
 * such a letter into the nearest kind (an HOA courtesy notice read as a lease
 * change); a clear keyword vote for `other` turns that silent squeeze into a
 * disagreement, so the reader is asked instead of the app guessing.
 */
const OTHER_CUES: readonly Cue[] = [
  [/home ?owners'? association|\bHOA\b|condominium (?:owners'? )?association|community association|property owners'? association/i, 6],
  [/\bCC&Rs?\b|covenants|community (?:guidelines|rules|standards)|architectural (?:review|committee|control)|community manager|board of directors/i, 2],
];

const ALL_CUES: ReadonlyArray<readonly [VotedType, readonly Cue[]]> = [
  ...(Object.entries(CUES) as Array<[KnownType, readonly Cue[]]>),
  ['other', OTHER_CUES],
];

/** Minimum score, and minimum lead over the runner-up, to hold an opinion. */
const MIN_SCORE = 5;
const MIN_MARGIN = 2;

export interface PriorCandidate {
  type: VotedType;
  score: number;
  /** The phrases in the letter that counted towards this type. */
  evidence: string[];
}

export interface PriorOpinion {
  /** The type the keywords point to, or null when they do not point clearly anywhere. */
  type: VotedType | null;
  /** Every type with a positive score, best first. */
  ranked: PriorCandidate[];
}

export function keywordPrior(text: string): PriorOpinion {
  const ranked: PriorCandidate[] = [];
  for (const [type, cues] of ALL_CUES) {
    let score = 0;
    const evidence: string[] = [];
    for (const [pattern, weight] of cues) {
      const hit = pattern.exec(text);
      if (!hit) continue;
      score += weight;
      if (weight > 0) evidence.push(hit[0].replace(/\s+/g, ' ').slice(0, 60));
    }
    if (score > 0) ranked.push({ type, score, evidence });
  }
  ranked.sort((a, b) => b.score - a.score);

  const [best, second] = ranked;
  const clear = best !== undefined && best.score >= MIN_SCORE && best.score - (second?.score ?? 0) >= MIN_MARGIN;
  return { type: clear ? best.type : null, ranked };
}

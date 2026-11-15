import { languageName, type LanguageId } from '../domain/languages';
import { letterType, type AmountMeaning, type DeadlineMeaning, type LetterTypeId } from '../domain/letterTypes';
import { stateName, type StateId } from '../domain/states';
import { nameBlank } from '../domain/standIns';
import { mark, placeholdersFor, type Placeholder } from '../domain/template';
import { term } from '../domain/terms';
import { parseRequest, type OutboundRequest, type TermLanguage } from './requests';

/**
 * What is said to a server-side model, word for word.
 *
 * Every prompt here is fixed text plus look-ups in the app's own tables,
 * keyed by the fields of a checked request. Nothing in this file takes a
 * piece of text from outside, so there is no parameter a letter could travel
 * in.
 */

/**
 * Bump when the wording changes, so cached answers to the old wording are dropped.
 * The glossary's meanings are part of the wording: change one and bump this too.
 */
export const PROMPT_VERSION = 8;

/**
 * Where a request may run.
 *  - `cloud_only`:   the cloud writes it or nobody does.
 *  - `device_first`: the device writes it; the cloud only if the device cannot.
 */
export type Route = 'cloud_only' | 'device_first';

export function routeFor(request: OutboundRequest): Route {
  switch (request.purpose) {
    // General knowledge about a kind of letter. The model in the browser was tried as a
    // stand-by for when the cloud fails, and dropped: on the hosted site it took 46 to 100
    // seconds, two of its three answers broke the template rules, and the one that passed
    // stated a deadline in state law that does not exist. No explanation is better than that.
    case 'explain':
      return 'cloud_only';
    // A formal letter the reader will sign and mail. A weaker draft is worse than none.
    case 'reply':
      return 'cloud_only';
    // Putting a meaning the glossary already has into another language. The model in the browser
    // was first asked to explain the word itself and got specialised terms wrong. It was then
    // asked only to translate the glossary's meaning into Spanish, the one other language it can
    // write: on the hosted site that took 5.7 seconds a meaning, and of four translations one
    // changed the meaning and two had defects. The Spanish is now written in the glossary, and
    // every other language is translated in the cloud.
    case 'term':
      return 'cloud_only';
  }
}

export type JsonSchema = Readonly<Record<string, unknown>>;

const text = { type: 'string' } as const;
const list = (maxItems: number) => ({ type: 'array', items: text, minItems: 1, maxItems }) as const;

const object = (properties: Record<string, unknown>): JsonSchema => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const EXPLAIN_SCHEMA = object({
  what: text,
  steps: list(6),
  if_ignored: text,
  who_can_help: list(4),
  reading_hint: text,
});

const REPLY_SCHEMA = object({ subject: text, body_en: text, before_sending: list(6) });
const REPLY_SCHEMA_TRANSLATED = object({ subject: text, body_en: text, body_translated: text, before_sending: list(6) });
const TERM_SCHEMA = object({ explanation: text });

/** The shape the answer must have. Fixed per purpose; it carries nothing about the reader. */
export function schemaFor(request: OutboundRequest): JsonSchema {
  switch (request.purpose) {
    case 'explain':
      return EXPLAIN_SCHEMA;
    case 'reply':
      return request.language === 'en' ? REPLY_SCHEMA : REPLY_SCHEMA_TRANSLATED;
    case 'term':
      return TERM_SCHEMA;
  }
}

const AMOUNT_IS: Record<Exclude<AmountMeaning, 'none'>, string> = {
  amount_due: 'money the reader is asked to pay',
  proposed: 'a change the sender proposes; it is not owed yet, and the reader may disagree with it',
  claimed: 'what the sender says is owed; the reader may dispute it',
  new_rent: 'a regular payment that is changing',
  fine: 'a fine',
  fee: 'a fee',
};

const DEADLINE_IS: Record<Exclude<DeadlineMeaning, 'none'>, string> = {
  pay: 'the date to pay by',
  respond: 'the date to reply by',
  appear: 'the date the reader has to be somewhere in person',
  dispute: 'the last day to dispute',
  appeal: 'the last day to appeal',
  enroll: 'the last day to enroll',
  renew: 'the last day to renew',
  takes_effect: 'the date the change takes effect',
};

function placeholderMeaning(placeholder: Placeholder, type: LetterTypeId): string {
  const { amount, deadline } = letterType(type);
  switch (placeholder) {
    case 'SENDER':
      return 'who sent the letter';
    case 'REFERENCE':
      return 'the account, case or notice number printed on the letter, as printed: it may carry its own label ("Notice CP2000", "Account No. 4471"), so do not write a word such as account, notice or number right before it';
    case 'AMOUNT':
      return amount === 'none' ? 'a dollar amount' : `the dollar amount in the letter: here, ${AMOUNT_IS[amount]}`;
    case 'DEADLINE':
      return deadline === 'none' ? 'a date' : `the date in the letter: here, ${DEADLINE_IS[deadline]}. It is never the date the letter was written; there is no marker for that date, and a reply that mentions it writes the blank [DATE AT THE TOP OF THE LETTER]`;
    case 'DAYS_LEFT':
      return `how far off that date is, filled in as a finished phrase in the reader's language (in English it would read "in 14 days" or "tomorrow"). Use it only in brackets straight after the date, exactly like this: ${mark('DEADLINE')} (${mark('DAYS_LEFT')}). Add no words around it`;
    case 'PHONE':
      return 'the phone number printed on the letter';
  }
}

/** What a draft of a reply is told about the state: a letter asks, it does not teach the law. */
function whereToReplyFrom(state: StateId): string {
  if (state === 'US') return 'The reader did not say which state they live in. Ask only for what a person can ask for anywhere in the United States, in general words: do not name any program, plan, fund, waiver or law.';
  const name = stateName(state);
  return `The reader lives in ${name}. Do not name any program, plan, fund, waiver or law, of ${name} or anyone else, anywhere in your answer: you have not seen the letter, and a name you are not sure exists is one the reader would be signing. Where help might exist, ask in general words (for example "Please tell me whether any payment plan or relief is available to me"), and say in before_sending that the reader can ask a free legal aid or tax help office what applies in ${name}.`;
}

function aboutTheLetter(type: LetterTypeId, state: StateId, purpose: 'explain' | 'reply' = 'explain'): string[] {
  const kind = letterType(type);
  if (purpose === 'reply') return [`Kind of letter: ${kind.description}`, whereToReplyFrom(state)];
  const where =
    state === 'US'
      ? 'The reader did not say which state they live in. Write only what holds across the United States, and say so where a rule varies by state.'
      : `The reader lives in ${stateName(state)}. Where ${stateName(state)} handles this kind of letter differently from most of the country, say what applies there. If you are not sure a rule is specific to ${stateName(state)}, give the general rule and say that it can vary by state.`;
  return [`Kind of letter: ${kind.description}`, where];
}

const WITHHELD: Record<'AMOUNT' | 'DEADLINE', string> = {
  AMOUNT: `Do not use ${mark('AMOUNT')}: in this kind of letter the dollar figures are not a bill. Say so plainly if it helps.`,
  DEADLINE: `Do not use ${mark('DEADLINE')} or ${mark('DAYS_LEFT')}: this kind of letter sets no deadline for the reader.`,
};

function gaps(type: LetterTypeId): string[] {
  const allowed = placeholdersFor(type);
  return [
    'You will not see the letter. The reader keeps it on their own device, and that device fills details in afterwards.',
    'Where a detail from the letter belongs, write one of these markers exactly as shown, and nothing else in double braces:',
    ...allowed.map((p) => `  ${mark(p)}  ${placeholderMeaning(p, type)}`),
    ...(['AMOUNT', 'DEADLINE'] as const).filter((p) => !allowed.includes(p)).map((p) => WITHHELD[p]),
    'Every marker is optional. Use one only where the sentence still reads well if the detail turns out to be missing.',
  ];
}

const HOUSE_RULES = [
  'Never write a specific dollar amount, calendar date, phone number, e-mail address or web address yourself. You do not know the ones in this letter, and a wrong one does harm.',
  'A time limit set by law may be mentioned as the usual rule when you are sure of it, together with the reminder that the date printed on the letter is the one that counts.',
  'Name kinds of help (for example "a free legal aid office" or "the customer service number on the letter"), not specific offices you cannot be sure exist.',
  'Short sentences. Everyday words. Explain any official term the first time you use it. Write for someone reading at a sixth-grade level who is worried.',
  'Do not tell the reader what they should decide. Tell them what the letter is, what their options are and what each one involves.',
  'Plain text only: no Markdown, no lists inside a field, no headings.',
];

function explainPrompt(type: LetterTypeId, state: StateId, language: LanguageId): string {
  return [
    'You write plain-language guidance for people in the United States who have received an official letter and are not sure what it means.',
    '',
    ...aboutTheLetter(type, state),
    `Write in: ${languageName(language)}`,
    '',
    ...gaps(type),
    '',
    'Fill these fields:',
    '  what          Two or three sentences: what this kind of letter is and why people get one.',
    '  steps         What to do, in order, one action per item. The first item is the one thing to do first.',
    '  if_ignored    What usually happens if the reader does nothing. Honest, not alarming.',
    '  who_can_help  Kinds of people or services that help with this for free or at low cost.',
    '  reading_hint  In English, whatever language the rest is in: one or two sentences telling a careful reader which amount and which date in this kind of letter are the ones that matter, and which look-alikes to skip. No markers in this field.',
    '',
    ...HOUSE_RULES,
  ].join('\n');
}

function replyPrompt(type: LetterTypeId, state: StateId, language: LanguageId): string {
  const translated = language !== 'en';
  const letterFields = translated ? 'subject, body_en or body_translated' : 'subject or body_en';
  return [
    'You draft a reply that a person in the United States can send to the sender of an official letter they received.',
    '',
    ...aboutTheLetter(type, state, 'reply'),
    translated ? `The reader's language: ${languageName(language)}` : 'The reader reads English.',
    '',
    ...gaps(type),
    'Where the reader has to add something about themselves, write a blank in square brackets and capitals, such as [YOUR FULL NAME], [YOUR ADDRESS], [TODAY\'S DATE] or [WHAT YOU ARE ASKING FOR]. The reader fills those in by hand; nothing fills them automatically.',
    ...(placeholdersFor(type).includes('DAYS_LEFT')
      ? [`Never use ${mark('DAYS_LEFT')} in ${letterFields}: a letter is read days after it is written. It may appear in before_sending only.`]
      : []),
    ...(placeholdersFor(type).includes('PHONE')
      ? [`Never use ${mark('PHONE')} in ${letterFields}: it is the sender's own number, and in the letter it would read as the reader's. It may appear in before_sending only. If the reply gives the reader's phone number, write the blank [YOUR PHONE NUMBER].`]
      : []),
    '',
    'Fill these fields:',
    '  subject         The subject line of the reply, in English.',
    '  body_en         The reply, in formal, polite English, ready to print: the most common reason a person writes back to this kind of letter (for example to ask for proof, more time, a payment plan, a review or a correction). State facts and requests only. Admit nothing and promise nothing on the reader\'s behalf. Do not repeat the subject line inside it.',
    '                  Lay it out as a letter: a greeting on its own line, then short paragraphs, then a closing and the blank for the reader\'s name each on its own line, with an empty line between the parts.',
    '                  Write it in the first person, from the reader to the sender: in the letter "I" is always the reader and "you" is always the sender. Do not explain the law in it, and never say what the sender "must" do: the reader cannot check that and would be signing it. Where a rule of the state may help the reader, ask about it instead (for example "Please tell me whether I qualify, and send me the form to apply").',
    ...(translated ? [`  body_translated The same reply in ${languageName(language)}, so the reader knows exactly what they are signing. Keep every marker exactly as it is in body_en, with the same line breaks, and write each blank in ${languageName(language)}, still in square brackets: [YOUR FULL NAME] becomes ${nameBlank(language)}. No blank stays in English.`] : []),
    translated
      ? `  before_sending  What to check, attach and keep before sending, one item each. Every item is in ${languageName(language)}, as body_translated is, and not in English.`
      : '  before_sending  In English: what to check, attach and keep before sending, one item each.',
    '',
    'If replying in writing is not the usual way to handle this kind of letter, say so in the first item of before_sending and keep the reply short.',
    '',
    ...HOUSE_RULES,
  ].join('\n');
}

function termPrompt(id: Extract<OutboundRequest, { purpose: 'term' }>['term'], language: TermLanguage): string {
  const entry = term(id);
  const into = languageName(language);
  return [
    `Translate one entry of a glossary into ${into}. The glossary explains words found in official letters in the United States to the people who receive them.`,
    '',
    `Term: ${entry.words}`,
    `Meaning: ${entry.meaning}`,
    '',
    `Write the meaning in ${into}, in everyday words, for someone reading at a sixth-grade level.`,
    'Say everything the English says and nothing more: no examples, advice or facts of your own.',
    `Where you name the term, give the usual ${into} word for it and keep the English term beside it in brackets, because the letter prints it in English. Names of programs, agencies and forms stay as they are.`,
    'Plain text only.',
  ].join('\n');
}

/** The exact text sent for a request. */
export function promptFor(request: OutboundRequest): string {
  switch (request.purpose) {
    case 'explain':
      return explainPrompt(request.type, request.state, request.language);
    case 'reply':
      return replyPrompt(request.type, request.state, request.language);
    case 'term':
      return termPrompt(request.term, request.language);
  }
}

/**
 * A request that has been checked and turned into its prompt.
 *
 * The channel sends these and nothing else. One can only be made by `from`,
 * which runs the full run-time check first; the prompt, schema and route are
 * then derived here, so no caller chooses any of them.
 */
export class Prepared {
  readonly request: OutboundRequest;
  readonly route: Route;
  readonly prompt: string;
  readonly schema: JsonSchema;

  private constructor(request: OutboundRequest) {
    this.request = Object.freeze({ ...request });
    this.route = routeFor(request);
    this.prompt = promptFor(request);
    this.schema = schemaFor(request);
    Object.freeze(this);
  }

  static from(input: unknown): Prepared {
    return new Prepared(parseRequest(input));
  }
}

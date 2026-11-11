import { isLanguageId, LANGUAGE_IDS, type LanguageId } from '../domain/languages';
import { isLetterTypeId, LETTER_TYPE_IDS, type LetterTypeId } from '../domain/letterTypes';
import { isStateId, STATE_IDS, type StateId } from '../domain/states';
import { isGlossaryLanguage, isTermId, TERM_IDS, type GlossaryLanguage, type TermId } from '../domain/terms';

/**
 * Everything this app can ask a server-side model, as a closed set.
 *
 * There are three kinds of request and every field of every kind is a value
 * from a fixed list. No field holds free text, so nothing from a letter fits
 * into one. That makes the whole set of possible requests finite, and
 * `allRequests` walks all of it — the tests use that to check every outbound
 * message against the full list rather than against a pattern.
 */

/** The glossary is written in English and Spanish, so neither is ever asked for. */
export type TermLanguage = Exclude<LanguageId, GlossaryLanguage>;

export type OutboundRequest =
  /** What this kind of letter is and what to do about it. */
  | { purpose: 'explain'; type: LetterTypeId; state: StateId; language: LanguageId }
  /** A formal reply the reader can send, with blanks for their details. */
  | { purpose: 'reply'; type: LetterTypeId; state: StateId; language: LanguageId }
  /** One entry of the glossary, put into another language. */
  | { purpose: 'term'; term: TermId; language: TermLanguage };

export type Purpose = OutboundRequest['purpose'];

export class OutboundRejected extends Error {
  constructor(reason: string) {
    super(`Outbound request rejected: ${reason}`);
    this.name = 'OutboundRejected';
  }
}

const FIELDS: Record<Purpose, readonly string[]> = {
  explain: ['purpose', 'type', 'state', 'language'],
  reply: ['purpose', 'type', 'state', 'language'],
  term: ['purpose', 'term', 'language'],
};

const isPurpose = (value: unknown): value is Purpose => typeof value === 'string' && Object.hasOwn(FIELDS, value);

/**
 * Check a value at run time and return it as a request, or throw.
 *
 * Types alone are not the guard: this runs on every send, so an object that
 * reached the channel through a cast, a bug or tampered storage is still
 * refused if it has one field too many or one value outside its list.
 */
export function parseRequest(input: unknown): OutboundRequest {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new OutboundRejected('not an object');
  }
  const proto: unknown = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) throw new OutboundRejected('not a plain object');

  const record = input as Record<string, unknown>;
  const { purpose } = record;
  if (!isPurpose(purpose)) throw new OutboundRejected('unknown purpose');

  const allowed = FIELDS[purpose];
  const keys = Reflect.ownKeys(record);
  if (keys.length !== allowed.length || keys.some((key) => typeof key !== 'string' || !allowed.includes(key))) {
    throw new OutboundRejected('unexpected fields');
  }

  const { language } = record;
  if (!isLanguageId(language)) throw new OutboundRejected('language is not on the list');

  if (purpose === 'term') {
    const { term } = record;
    if (!isTermId(term)) throw new OutboundRejected('term is not in the glossary');
    if (isGlossaryLanguage(language)) throw new OutboundRejected('the glossary already has this language');
    return { purpose, term, language };
  }

  const { type, state } = record;
  if (!isLetterTypeId(type)) throw new OutboundRejected('letter kind is not on the list');
  if (!isStateId(state)) throw new OutboundRejected('state is not on the list');
  return { purpose, type, state, language };
}

/** One request as text, always with the same field order. */
export function serialize(request: OutboundRequest): string {
  return request.purpose === 'term'
    ? JSON.stringify({ purpose: request.purpose, term: request.term, language: request.language })
    : JSON.stringify({ purpose: request.purpose, type: request.type, state: request.state, language: request.language });
}

/** Every request the app can make. */
export function* allRequests(): Generator<OutboundRequest> {
  for (const purpose of ['explain', 'reply'] as const) {
    for (const type of LETTER_TYPE_IDS) {
      for (const state of STATE_IDS) {
        for (const language of LANGUAGE_IDS) yield { purpose, type, state, language };
      }
    }
  }
  for (const term of TERM_IDS) {
    for (const language of LANGUAGE_IDS) {
      if (!isGlossaryLanguage(language)) yield { purpose: 'term', term, language };
    }
  }
}

/** How many requests `allRequests` yields, worked out from the list sizes. */
export const requestCount = (): number =>
  2 * LETTER_TYPE_IDS.length * STATE_IDS.length * LANGUAGE_IDS.length + TERM_IDS.length * (LANGUAGE_IDS.length - 2);

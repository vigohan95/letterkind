import { type Meaning, parseMeaning } from '../domain/meaning';
import { term, type TermId } from '../domain/terms';
import type { OutboundRequest } from '../outbound/requests';
import { fetched, kept, type KeepDeps, type Outcome, type ReadyOutcome } from './kept';
import type { TemplateStore } from './store';

/**
 * What a glossary term means.
 *
 * In English it is the glossary's own entry: no model, no request, nothing
 * to wait for. In another language it is that entry translated, asked for
 * once per term and language and kept. The request names the entry and the
 * language and carries nothing else. Where the model in the browser can
 * write the language, it is asked first and the request stays on the device;
 * the ledger says which.
 */

export type TermRequest = Extract<OutboundRequest, { purpose: 'term' }>;
export type ReadyMeaning = ReadyOutcome<Meaning>;

/** The glossary's own wording. It was not asked for, so there is no ledger entry and nothing was kept. */
export interface GlossaryMeaning {
  status: 'ready';
  template: Meaning;
  from: 'glossary';
  at: null;
  entry: null;
}

export type MeaningOutcome = Outcome<Meaning> | GlossaryMeaning;

/** What the glossary says a term means, in English. Sends nothing and asks no model. */
export const ownMeaning = (id: TermId): GlossaryMeaning => ({
  status: 'ready',
  template: { explanation: term(id).meaning },
  from: 'glossary',
  at: null,
  entry: null,
});

const checked = (request: TermRequest) => (answer: string) => parseMeaning(answer, request.language, term(request.term).meaning);

/** A translation already on this device for this term and language. Sends nothing. */
export const savedMeaning = (request: TermRequest, store: TemplateStore): Promise<ReadyMeaning | null> => kept(request, store, checked(request));

/** The kept translation if there is one; otherwise ask, check the answer, and keep it if it passes. */
export const meaningOf = (request: TermRequest, deps: KeepDeps): Promise<Outcome<Meaning>> => fetched(request, deps, checked(request));

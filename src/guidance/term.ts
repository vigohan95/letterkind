import { type Meaning, parseMeaning } from '../domain/meaning';
import type { OutboundRequest } from '../outbound/requests';
import { fetched, kept, type KeepDeps, type Outcome, type ReadyOutcome } from './kept';
import type { TemplateStore } from './store';

/**
 * What a glossary term means, asked once per term and language and kept.
 *
 * The request names an entry of the glossary and a language and carries
 * nothing else. Where the model in the browser can write the language, it is
 * asked first and the request stays on the device; the ledger says which.
 */

export type TermRequest = Extract<OutboundRequest, { purpose: 'term' }>;
export type MeaningOutcome = Outcome<Meaning>;
export type ReadyMeaning = ReadyOutcome<Meaning>;

/** A meaning already on this device for this term and language. Sends nothing. */
export const savedMeaning = (request: TermRequest, store: TemplateStore): Promise<ReadyMeaning | null> =>
  kept(request, store, (answer) => parseMeaning(answer, request.language));

/** The kept meaning if there is one; otherwise ask, check the answer, and keep it if it passes. */
export const meaningOf = (request: TermRequest, deps: KeepDeps): Promise<MeaningOutcome> =>
  fetched(request, deps, (answer) => parseMeaning(answer, request.language));

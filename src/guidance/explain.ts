import { type ExplainTemplate, parseExplain } from '../domain/template';
import type { OutboundRequest } from '../outbound/requests';
import { type Check, fetched, type KeepDeps, kept, type Outcome, type ReadyOutcome } from './kept';
import type { TemplateStore } from './store';

/**
 * Getting an explanation for a kind of letter.
 *
 * The request names a kind of letter, a state and a language — nothing else
 * exists to send. The answer is a template; it is checked before it is used
 * and thrown away whole if it breaks a rule. A template written in the cloud
 * is kept on the device, so the next letter of the same kind is explained
 * without sending anything at all.
 */
export type ExplainRequest = Extract<OutboundRequest, { purpose: 'explain' }>;

export type Guidance = Outcome<ExplainTemplate>;
export type Ready = ReadyOutcome<ExplainTemplate>;
export type ExplainDeps = KeepDeps;

export { templateKey } from './kept';

const check =
  (request: ExplainRequest): Check<ExplainTemplate> =>
  (answer) =>
    parseExplain(answer, request.type, request.language);

/** A template already on this device for this request, if it still passes the checks. */
export const savedGuidance = (request: ExplainRequest, store: TemplateStore): Promise<Ready | null> => kept(request, store, check(request));

export const explain = (request: ExplainRequest, deps: ExplainDeps): Promise<Guidance> => fetched(request, deps, check(request));

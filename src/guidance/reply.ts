import { parseReply, type ReplyTemplate } from '../domain/reply';
import type { OutboundRequest } from '../outbound/requests';
import { type Check, fetched, type KeepDeps, kept, type Outcome, type ReadyOutcome } from './kept';
import type { TemplateStore } from './store';

/**
 * Getting a draft of a reply to a kind of letter.
 *
 * The request carries the same three things as the one for an explanation —
 * a kind of letter, a state, a language — and the draft that comes back is
 * checked, kept and reused the same way. Who the reader is, what the letter
 * says and what they want to answer never leave the device: the draft is
 * written for the kind of letter, and finished here.
 */
export type ReplyRequest = Extract<OutboundRequest, { purpose: 'reply' }>;

export type Draft = Outcome<ReplyTemplate>;
export type ReadyDraft = ReadyOutcome<ReplyTemplate>;

const check =
  (request: ReplyRequest): Check<ReplyTemplate> =>
  (answer) =>
    parseReply(answer, request.type, request.language);

/** A draft already on this device for this request, if it still passes the checks. */
export const savedDraft = (request: ReplyRequest, store: TemplateStore): Promise<ReadyDraft | null> => kept(request, store, check(request));

export const draftReply = (request: ReplyRequest, deps: KeepDeps): Promise<Draft> => fetched(request, deps, check(request));

import { type ExplainTemplate, parseExplain, type RejectReason, TemplateRejected } from '../domain/template';
import { type Channel, CLOUD_MODEL } from '../outbound/channel';
import type { LedgerEntry } from '../outbound/ledger';
import { PROMPT_VERSION } from '../outbound/prompts';
import { type OutboundRequest, serialize } from '../outbound/requests';
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

export type Guidance =
  | {
      status: 'ready';
      template: ExplainTemplate;
      /** `saved`: read back from this device; nothing was sent this time. */
      from: 'cloud' | 'device' | 'saved';
      /** When the template was written, ISO 8601. */
      at: string;
      /** The ledger entry for the request; null when nothing was asked. */
      entry: LedgerEntry | null;
    }
  /** An answer came back and broke a rule. Nothing from it is shown. */
  | { status: 'rejected'; reason: RejectReason; field: string; found: string; ran: 'cloud' | 'device'; entry: LedgerEntry }
  /** No answer could be had: no connection, no model, or the service refused. */
  | { status: 'unavailable'; error: string };

export type Ready = Extract<Guidance, { status: 'ready' }>;

/**
 * What a saved template is filed under. A new prompt or a new model gets a
 * new key, so guidance written by an older one is not shown as current.
 */
export const templateKey = (request: ExplainRequest): string => `${serialize(request)}|prompt-${PROMPT_VERSION}|${CLOUD_MODEL}`;

/** A template already on this device for this request, if it still passes the checks. */
export async function savedGuidance(request: ExplainRequest, store: TemplateStore): Promise<Ready | null> {
  let saved;
  try {
    saved = await store.get(templateKey(request));
  } catch {
    // A device that cannot read its own storage simply has nothing saved.
    return null;
  }
  if (!saved) return null;
  try {
    return { status: 'ready', template: parseExplain(saved.text, request.type), from: 'saved', at: saved.at, entry: null };
  } catch (error) {
    if (error instanceof TemplateRejected) return null;
    throw error;
  }
}

export interface ExplainDeps {
  channel: Channel;
  store: TemplateStore;
}

export async function explain(request: ExplainRequest, { channel, store }: ExplainDeps): Promise<Guidance> {
  const saved = await savedGuidance(request, store);
  if (saved) return saved;

  let answer;
  try {
    answer = await channel.send(request);
  } catch (error) {
    return { status: 'unavailable', error: error instanceof Error ? error.message : String(error) };
  }

  let template: ExplainTemplate;
  try {
    template = parseExplain(answer.text, request.type);
  } catch (error) {
    if (!(error instanceof TemplateRejected)) throw error;
    return { status: 'rejected', reason: error.reason, field: error.field, found: error.found, ran: answer.ran, entry: answer.entry };
  }

  // Only the cloud model's work is kept. What the device wrote as a stand-by is replaced when the cloud can be reached.
  if (answer.ran === 'cloud') {
    try {
      await store.put(templateKey(request), { text: answer.text, at: answer.entry.at });
    } catch {
      // Not being able to keep a template is no reason to withhold it.
    }
  }
  return { status: 'ready', template, from: answer.ran, at: answer.entry.at, entry: answer.entry };
}

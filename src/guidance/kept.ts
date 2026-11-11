import { type RejectReason, TemplateRejected } from '../domain/template';
import { type Channel, CLOUD_MODEL, statusOf } from '../outbound/channel';
import type { LedgerEntry } from '../outbound/ledger';
import { PROMPT_VERSION } from '../outbound/prompts';
import { type OutboundRequest, serialize } from '../outbound/requests';
import type { TemplateStore } from './store';

/**
 * Asking once and keeping the answer.
 *
 * Whatever is asked of the cloud is a template for a kind of letter, so the
 * same answer serves every letter of that kind. It is checked before it is
 * used, thrown away whole if it breaks a rule, and kept on the device if it
 * passes — after which nothing is sent for that kind of letter again.
 */

export interface ReadyOutcome<T> {
  status: 'ready';
  template: T;
  /** `saved`: read back from this device; nothing was sent this time. */
  from: 'cloud' | 'saved';
  /** When the template was written, ISO 8601. */
  at: string;
  /** The ledger entry for the request; null when nothing was asked. */
  entry: LedgerEntry | null;
}

export type Outcome<T> =
  | ReadyOutcome<T>
  /** An answer came back and broke a rule. Nothing from it is shown. */
  | { status: 'rejected'; reason: RejectReason; field: string; found: string; entry: LedgerEntry }
  /**
   * No answer could be had. `busy`: the server said it was in trouble, twice.
   * `limit`: as many requests as the project may make in a minute have been
   * made, by everyone together. For both, asking again later is all there is
   * to do. `no_answer`: no connection, no model, or the service refused.
   */
  | { status: 'unavailable'; why: 'busy' | 'limit' | 'no_answer'; error: string };

/** Turns an answer into a checked template, or throws `TemplateRejected`. */
export type Check<T> = (answer: string) => T;

export interface KeepDeps {
  channel: Channel;
  store: TemplateStore;
}

/**
 * What a kept template is filed under. A new prompt or a new model gets a
 * new key, so a template written by an older one is not shown as current.
 */
export const templateKey = (request: OutboundRequest): string => `${serialize(request)}|prompt-${PROMPT_VERSION}|${CLOUD_MODEL}`;

/** A template already on this device for this request, if it still passes the checks. */
export async function kept<T>(request: OutboundRequest, store: TemplateStore, check: Check<T>): Promise<ReadyOutcome<T> | null> {
  let saved;
  try {
    saved = await store.get(templateKey(request));
  } catch {
    // A device that cannot read its own storage simply has nothing saved.
    return null;
  }
  if (!saved) return null;
  try {
    return { status: 'ready', template: check(saved.text), from: 'saved', at: saved.at, entry: null };
  } catch (error) {
    if (error instanceof TemplateRejected) return null;
    throw error;
  }
}

/** The kept template if there is one; otherwise ask, check the answer, and keep it if it passes. */
export async function fetched<T>(request: OutboundRequest, { channel, store }: KeepDeps, check: Check<T>): Promise<Outcome<T>> {
  const saved = await kept(request, store, check);
  if (saved) return saved;

  let answer;
  try {
    answer = await channel.send(request);
  } catch (error) {
    const status = statusOf(error) ?? 0;
    const why = status === 429 ? 'limit' : status >= 500 ? 'busy' : 'no_answer';
    return { status: 'unavailable', why, error: error instanceof Error ? error.message : String(error) };
  }

  let template: T;
  try {
    template = check(answer.text);
  } catch (error) {
    if (!(error instanceof TemplateRejected)) throw error;
    return { status: 'rejected', reason: error.reason, field: error.field, found: error.found, entry: answer.entry };
  }

  try {
    await store.put(templateKey(request), { text: answer.text, at: answer.entry.at });
  } catch {
    // Not being able to keep a template is no reason to withhold it.
  }
  return { status: 'ready', template, from: 'cloud', at: answer.entry.at, entry: answer.entry };
}

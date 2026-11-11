import type { Route } from './prompts';
import type { OutboundRequest } from './requests';

/**
 * A record of every request the app made to a model outside the reading
 * path — what was asked, word for word, where it ran, and whether it left
 * the device. The reader can open it at any time; it is how the app shows
 * its work instead of asking to be believed.
 */

/**
 * Did the request leave this device?
 *  - `sent`:      a server answered it.
 *  - `attempted`: it was handed to the network and may have left, but no server answer came back
 *                 (the connection failed, or the device answered after the cloud could not).
 *  - `stayed`:    the device answered it and the network was never tried.
 */
export type Left = 'sent' | 'attempted' | 'stayed';

export type Ran = 'cloud' | 'device' | 'nowhere';

export interface LedgerEntry {
  id: number;
  /** When the request was made, ISO 8601. */
  at: string;
  /** The request: the only things about the reader it carries. */
  request: OutboundRequest;
  route: Route;
  /** The full text given to the model. */
  prompt: string;
  /** Size of that text in bytes (UTF-8). */
  bytes: number;
  left: Left;
  ran: Ran;
  ms: number;
  error: string | null;
}

export interface LedgerTotals {
  requests: number;
  sent: number;
  attempted: number;
  stayed: number;
  /** Bytes of prompt text that left or may have left the device. */
  bytesOut: number;
}

/** UTF-8 size of a piece of text. */
export const byteLength = (value: string): number => new TextEncoder().encode(value).length;

/** Whether a request left the device, from where it ran and where it was allowed to. */
export function leftDevice(route: Route, ran: Ran): Left {
  if (ran === 'cloud') return 'sent';
  if (ran === 'device' && route === 'device_first') return 'stayed';
  // Answered on the device after the cloud was tried first, or not answered at all:
  // the request may have reached the network, so it is not counted as having stayed.
  return 'attempted';
}

export class Ledger {
  #entries: readonly LedgerEntry[] = [];
  #listeners = new Set<() => void>();
  #nextId = 1;

  record(entry: Omit<LedgerEntry, 'id' | 'bytes' | 'left'>): LedgerEntry {
    const full: LedgerEntry = Object.freeze({
      ...entry,
      id: this.#nextId++,
      bytes: byteLength(entry.prompt),
      left: leftDevice(entry.route, entry.ran),
    });
    this.#entries = Object.freeze([...this.#entries, full]);
    for (const listener of this.#listeners) listener();
    return full;
  }

  /** Everything recorded so far, oldest first. The same array until something is added. */
  entries = (): readonly LedgerEntry[] => this.#entries;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  totals(): LedgerTotals {
    const count = (left: Left): number => this.#entries.filter((e) => e.left === left).length;
    return {
      requests: this.#entries.length,
      sent: count('sent'),
      attempted: count('attempted'),
      stayed: count('stayed'),
      bytesOut: this.#entries.filter((e) => e.left !== 'stayed').reduce((sum, e) => sum + e.bytes, 0),
    };
  }
}

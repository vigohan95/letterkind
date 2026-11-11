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

/** A request that has been handed to a model and has not come back yet. */
export type Underway = Pick<LedgerEntry, 'id' | 'at' | 'request' | 'route' | 'prompt' | 'bytes'>;

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
  // Not answered at all: the request may have reached the network, so it is not
  // counted as having stayed.
  return 'attempted';
}

export class Ledger {
  #entries: readonly LedgerEntry[] = [];
  #underway: readonly Underway[] = [];
  #listeners = new Set<() => void>();
  #nextId = 1;

  /**
   * Notes a request at the moment it is handed over, so that the page never
   * says nothing has left while something is on its way.
   */
  begin(asked: Omit<Underway, 'id' | 'bytes'>): Underway {
    const underway: Underway = Object.freeze({ ...asked, id: this.#nextId++, bytes: byteLength(asked.prompt) });
    this.#underway = Object.freeze([...this.#underway, underway]);
    for (const listener of this.#listeners) listener();
    return underway;
  }

  /** Writes down how a request ended. Given the note made when it began, it takes that note's place. */
  record(entry: Omit<LedgerEntry, 'id' | 'bytes' | 'left'>, began?: Underway): LedgerEntry {
    if (began) this.#underway = Object.freeze(this.#underway.filter((u) => u.id !== began.id));
    const full: LedgerEntry = Object.freeze({
      ...entry,
      id: began?.id ?? this.#nextId++,
      bytes: byteLength(entry.prompt),
      left: leftDevice(entry.route, entry.ran),
    });
    this.#entries = Object.freeze([...this.#entries, full]);
    for (const listener of this.#listeners) listener();
    return full;
  }

  /** Everything recorded so far, oldest first. The same array until something is added. */
  entries = (): readonly LedgerEntry[] => this.#entries;

  /** Requests handed over and not yet answered. The same array until one begins or ends. */
  underway = (): readonly Underway[] => this.#underway;

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

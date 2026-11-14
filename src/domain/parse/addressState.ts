import { isStateId, type StateId } from '../states';

/**
 * The US state a letter's addresses are in, read from the letter's own text
 * on this device: the two-letter code before a ZIP code at the end of an
 * address line, as in "Columbus, OH 43004".
 *
 * Only a suggestion. The state is one of the three things a request to the
 * cloud carries, so it is offered to the reader to accept and never chosen
 * for them. A letter whose addresses are in more than one state suggests
 * nothing: the sender's state and the reader's need not be the same, and
 * there is no telling which is which.
 */

const ADDRESS_LINE = /(?:^|[\s,])([A-Z]{2})\.?\s+\d{5}(?:-\d{4})?\s*$/;

/** Every state named in an address line, once each, in the order they appear. */
export function statesInAddresses(letter: string): StateId[] {
  const found: StateId[] = [];
  for (const line of letter.split(/\r?\n/)) {
    const code = ADDRESS_LINE.exec(line.trim())?.[1];
    if (code && code !== 'US' && isStateId(code) && !found.includes(code)) found.push(code);
  }
  return found;
}

/** The one state the letter's addresses agree on, or null. */
export function suggestedState(letter: string): StateId | null {
  const states = statesInAddresses(letter);
  return states.length === 1 ? states[0]! : null;
}

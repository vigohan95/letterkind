import { createChannel, firebaseTransport } from '../outbound/channel';
import { Ledger } from '../outbound/ledger';
import { explain, type ExplainRequest, type Guidance, type Ready, savedGuidance } from './explain';
import { browserStore } from './store';

/**
 * The parts the running app shares: one ledger, one way out, one place
 * where templates are kept. Tests build their own instead of using these.
 */
export const ledger = new Ledger();

const channel = createChannel({ transport: firebaseTransport, ledger });
const store = browserStore();

export interface GuidanceSource {
  /** A template already on this device. Sends nothing. */
  saved(request: ExplainRequest): Promise<Ready | null>;
  /** The saved template if there is one; otherwise ask for one. */
  ask(request: ExplainRequest): Promise<Guidance>;
  /** Forget every saved template. */
  forget(): Promise<void>;
}

export const liveGuidance: GuidanceSource = {
  saved: (request) => savedGuidance(request, store),
  ask: (request) => explain(request, { channel, store }),
  forget: () => store.clear(),
};

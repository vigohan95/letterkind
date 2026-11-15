/**
 * The built-in model in Chrome now and then fails a prompt with a generic
 * error ("An unknown error occurred: kErrorUnknown") that has nothing to do
 * with the letter: the same prompt, in a new session, usually goes through.
 * Seen on a 50-letter evaluation run, which it stopped at letter 15. A person
 * reading their own letter would hit it the same way, so the app tries again
 * rather than showing them an error they can do nothing about.
 *
 * Only these generic failures are retried. An answer that did not come from
 * the device, a model that is unavailable, a cancelled request or a prompt
 * that is too long would fail again, and are passed on at once.
 */

const TRANSIENT_CODES = ['kErrorUnknown', 'kErrorGenericFailure'];

export function isTransientDeviceError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'UnknownError') return true;
  return TRANSIENT_CODES.some((code) => error.message.includes(code));
}

/** How many times a prompt is tried in all before the error is shown. */
export const DEVICE_ATTEMPTS = 3;

/**
 * Run `attempt`; after a transient failure call `reset` (so the next try gets
 * a new session) and run it again, up to `attempts` times in all.
 */
export async function retryOnTransient<T>(attempt: () => Promise<T>, reset: () => void, attempts = DEVICE_ATTEMPTS): Promise<T> {
  for (let tried = 1; ; tried += 1) {
    try {
      return await attempt();
    } catch (error) {
      if (tried >= attempts || !isTransientDeviceError(error)) throw error;
      reset();
    }
  }
}

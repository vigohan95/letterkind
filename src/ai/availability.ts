/**
 * Is the browser's built-in model usable here?
 *
 * This asks the browser directly and runs no inference. It is what lets the
 * app say plainly, before the reader pastes anything, whether their letter
 * can be read on this device.
 */

export type DeviceModelStatus =
  | 'ready'
  | 'downloadable' // supported; the browser has to fetch the model first
  | 'downloading'
  | 'unavailable' // the browser has the API but this device cannot run the model
  | 'unsupported'; // the browser has no built-in model API at all

/** Session options for reading text. Text only: no image capability is requested. */
export function textSessionOptions(): {
  expectedInputs: { type: 'text'; languages: string[] }[];
  expectedOutputs: { type: 'text'; languages: string[] }[];
} {
  return {
    expectedInputs: [{ type: 'text', languages: ['en', 'es'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  };
}

interface BuiltInModel {
  availability(options?: object): Promise<string>;
}

export async function deviceModelStatus(): Promise<DeviceModelStatus> {
  const builtIn = (globalThis as { LanguageModel?: BuiltInModel }).LanguageModel;
  if (!builtIn) return 'unsupported';
  try {
    const answer = await builtIn.availability(textSessionOptions());
    if (answer === 'available') return 'ready';
    if (answer === 'downloadable' || answer === 'downloading') return answer;
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

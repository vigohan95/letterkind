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

/**
 * Session options for copying the text out of a picture of a letter. The
 * picture is handed to the same built-in model, in the same browser.
 */
export function imageSessionOptions(): {
  expectedInputs: ({ type: 'text'; languages: string[] } | { type: 'image' })[];
  expectedOutputs: { type: 'text'; languages: string[] }[];
} {
  return {
    expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
    expectedOutputs: [{ type: 'text', languages: ['en', 'es'] }],
  };
}

interface BuiltInModel {
  availability(options?: object): Promise<string>;
}

/** `options` says what the model will be asked to do: read text (the default) or look at a picture. */
export async function deviceModelStatus(options: object = textSessionOptions()): Promise<DeviceModelStatus> {
  const builtIn = (globalThis as { LanguageModel?: BuiltInModel }).LanguageModel;
  if (!builtIn) return 'unsupported';
  try {
    const answer = await builtIn.availability(options);
    if (answer === 'available') return 'ready';
    if (answer === 'downloadable' || answer === 'downloading') return answer;
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

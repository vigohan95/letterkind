import { getAI, getGenerativeModel, type GenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from 'firebase/ai';
import { firebaseApp } from '../firebase';
import { imageSessionOptions, textSessionOptions } from './availability';
import { CLASSIFY_SCHEMA } from './classify';
import { EXTRACT_SCHEMA } from './extract';
import { retryOnTransient } from './retry';
import type { Generate, Look } from './types';

/**
 * The models that read the letter.
 *
 * Every model built in this file is pinned to ONLY_ON_DEVICE: Firebase AI
 * Logic runs it on Gemini Nano inside the browser, and if the device cannot
 * run it the call fails — it does not fall back to a server. This is the only
 * file that may hand a letter, as text or as a picture, to a model, and a test
 * fails the build if any other inference mode is ever named here.
 */

const NOT_ON_DEVICE = 'On-device inference was required, but the response did not come from the device.';

function onDeviceModel(responseConstraint: object): GenerativeModel {
  return getGenerativeModel(getAI(firebaseApp(), { backend: new GoogleAIBackend() }), {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: textSessionOptions(),
      promptOptions: { responseConstraint },
    },
  });
}

function asGenerate(model: GenerativeModel): Generate {
  return async (prompt) => {
    const started = performance.now();
    const { response } = await model.generateContent(prompt);
    // The mode already makes this impossible. Checked anyway, on every call,
    // so that the promise "your letter stayed here" rests on an observation.
    if (response.inferenceSource !== InferenceSource.ON_DEVICE) {
      throw new Error(NOT_ON_DEVICE);
    }
    return { text: response.text(), ms: Math.round(performance.now() - started) };
  };
}

let classifier: GenerativeModel | undefined;
let extractor: GenerativeModel | undefined;
let transcriber: GenerativeModel | undefined;

const classifierModel = (): GenerativeModel => (classifier ??= onDeviceModel(CLASSIFY_SCHEMA));
const extractorModel = (): GenerativeModel => (extractor ??= onDeviceModel(EXTRACT_SCHEMA));

/** No answer format is imposed on the transcriber: its answer is the text of the page. */
const transcriberModel = (): GenerativeModel =>
  (transcriber ??= getGenerativeModel(getAI(firebaseApp(), { backend: new GoogleAIBackend() }), {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { createOptions: imageSessionOptions() },
  }));

/** A generic failure of the built-in model is retried in a new session (see retry.ts). */
export const onDeviceClassifier: Generate = (prompt) =>
  retryOnTransient(
    () => asGenerate(classifierModel())(prompt),
    () => {
      classifier = undefined;
    },
  );
export const onDeviceExtractor: Generate = (prompt) =>
  retryOnTransient(
    () => asGenerate(extractorModel())(prompt),
    () => {
      extractor = undefined;
    },
  );

/** Shows the on-device model one page of a letter and passes on its answer as it is written. */
export const onDeviceLook: Look = async function* (prompt, image) {
  const { stream } = await transcriberModel().generateContentStream([
    prompt,
    { type: 'inlineData', inlineData: { mimeType: image.mimeType, data: image.data } },
  ]);
  for await (const piece of stream) {
    if (piece.inferenceSource !== InferenceSource.ON_DEVICE) throw new Error(NOT_ON_DEVICE);
    yield piece.text();
  }
};

/**
 * Make the on-device model ready, downloading it if the browser has not yet.
 * Must be called from a click or key press: browsers only start the download
 * in response to one.
 */
export async function prepareDeviceModel(onProgress?: (fraction: number) => void): Promise<void> {
  await classifierModel().initializeDeviceModel(onProgress);
}

import { getAI, getGenerativeModel, type GenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from 'firebase/ai';
import { firebaseApp } from '../firebase';
import { startAppCheck } from './appCheck';
import type { Ledger, LedgerEntry, Ran } from './ledger';
import { Prepared, type Route } from './prompts';
import type { OutboundRequest } from './requests';

/**
 * The only way out.
 *
 * This is the one file that can build a model able to run in the cloud. It
 * accepts a request from the closed set in `requests.ts` and nothing else:
 * there is no parameter here that takes text, so the words of a letter have
 * no way in. Every request is checked again at run time, turned into its
 * fixed prompt, and written to the ledger whether it succeeds or fails.
 *
 * Tests fail the build if a cloud-capable inference mode is named anywhere
 * else in the source, or if any other file opens a network connection.
 *
 * App Check, which loads Google reCAPTCHA, is started from here and from
 * nowhere else, and not before a request is about to go to the cloud.
 */

/** The server-side model that writes templates. */
export const CLOUD_MODEL = 'gemini-3.5-flash-lite';

/**
 * How each route reaches the cloud. A `device_first` request is first put to
 * the model in the browser on its own; only if that fails is it sent out.
 */
const CLOUD_MODE: Record<Route, InferenceMode> = {
  cloud_first: InferenceMode.PREFER_IN_CLOUD,
  cloud_only: InferenceMode.ONLY_IN_CLOUD,
  device_first: InferenceMode.ONLY_IN_CLOUD,
};

export interface Delivery {
  text: string;
  ran: Exclude<Ran, 'nowhere'>;
}

/** Carries one prepared request to a model. Swapped for a recording in tests. */
export type Transport = (prepared: Prepared) => Promise<Delivery>;

export interface Answer extends Delivery {
  ms: number;
  entry: LedgerEntry;
}

export interface Channel {
  send(request: OutboundRequest): Promise<Answer>;
}

export interface ChannelDeps {
  transport: Transport;
  ledger: Ledger;
  /** Wall-clock time, for the ledger. */
  now?: () => Date;
  /** Monotonic milliseconds, for timing. */
  clock?: () => number;
}

export function createChannel({ transport, ledger, now = () => new Date(), clock = () => performance.now() }: ChannelDeps): Channel {
  return {
    async send(request) {
      // Throws before anything is recorded or sent if the request is not in the closed set.
      const prepared = Prepared.from(request);
      const at = now().toISOString();
      const started = clock();
      const record = (ran: Ran, error: string | null): LedgerEntry =>
        ledger.record({
          at,
          request: prepared.request,
          route: prepared.route,
          prompt: prepared.prompt,
          ran,
          ms: Math.round(clock() - started),
          error,
        });

      let delivery: Delivery;
      try {
        delivery = await transport(prepared);
      } catch (error) {
        record('nowhere', error instanceof Error ? error.message : String(error));
        throw error;
      }
      const entry = record(delivery.ran, null);
      return { ...delivery, ms: entry.ms, entry };
    },
  };
}

const models = new Map<string, GenerativeModel>();

function modelFor({ request, route, schema }: Prepared, where: 'device' | 'cloud'): GenerativeModel {
  // The route and the schema both follow from the first two fields.
  const key = `${request.purpose}|${request.language}|${where}`;
  let model = models.get(key);
  if (!model) {
    const onDeviceParams = {
      createOptions: {
        expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
        expectedOutputs: [{ type: 'text' as const, languages: [request.language] }],
      },
      promptOptions: { responseConstraint: schema },
    };
    model = getGenerativeModel(
      getAI(firebaseApp(), { backend: new GoogleAIBackend() }),
      where === 'device'
        ? { mode: InferenceMode.ONLY_ON_DEVICE, onDeviceParams }
        : {
            mode: CLOUD_MODE[route],
            inCloudParams: {
              model: CLOUD_MODEL,
              generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema },
            },
            ...(route === 'cloud_first' ? { onDeviceParams } : {}),
          },
    );
    models.set(key, model);
  }
  return model;
}

/** The real transport: Firebase AI Logic, in the mode the request's route calls for. */
export const firebaseTransport: Transport = async (prepared) => {
  if (prepared.route === 'device_first') {
    try {
      const { response } = await modelFor(prepared, 'device').generateContent(prepared.prompt);
      if (response.inferenceSource === InferenceSource.ON_DEVICE) return { text: response.text(), ran: 'device' };
    } catch {
      // The model in the browser could not write this. The request goes out instead, and the ledger says so.
    }
  }
  // Only now, with a request about to leave, is the app's proof of identity set up.
  startAppCheck();
  const { response } = await modelFor(prepared, 'cloud').generateContent(prepared.prompt);
  // Anything not positively reported as on-device is counted as having gone to the cloud.
  return { text: response.text(), ran: response.inferenceSource === InferenceSource.ON_DEVICE ? 'device' : 'cloud' };
};

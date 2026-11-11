import { getAI, getGenerativeModel, type GenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';
import { firebaseApp, outboundApp } from '../firebase';
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
 * fixed prompt, and written to the ledger before it goes and again when it
 * ends, whether it succeeds or fails.
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
 * How long one request to the cloud may take, in milliseconds. The SDK's own
 * limit is three minutes, and a server in trouble has been seen to use nearly
 * all of it before answering 503. Answers that do come take 2 to 15 seconds.
 */
export const CLOUD_TIMEOUT_MS = 25_000;

/** How long to wait before asking the cloud a second time, in milliseconds. */
const RETRY_AFTER_MS = 1500;

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
      const asked = { at, request: prepared.request, route: prepared.route, prompt: prepared.prompt };
      // Written down before it goes, not only once it is back.
      const began = ledger.begin(asked);
      const record = (ran: Ran, error: string | null): LedgerEntry =>
        ledger.record({ ...asked, ran, ms: Math.round(clock() - started), error }, began);

      let delivery: Delivery;
      try {
        delivery = await transport(prepared);
      } catch (error) {
        record('nowhere', error instanceof Error ? error.message : String(error));
        throw error;
      }
      if (prepared.route === 'cloud_only' && delivery.ran !== 'cloud') {
        const error = new Error('An answer came from the device to a request only the cloud may answer.');
        record('nowhere', error.message);
        throw error;
      }
      const entry = record(delivery.ran, null);
      return { ...delivery, ms: entry.ms, entry };
    },
  };
}

/** The two models a request can be put to, and a way to wait. Swapped for a script in tests. */
export interface Ways {
  device(): Promise<string>;
  cloud(): Promise<string>;
  pause(ms: number): Promise<void>;
}

/** The HTTP status a failed cloud request came back with, if it got that far. */
function statusOf(error: unknown): number | undefined {
  const status = (error as { customErrorData?: { status?: unknown } } | null)?.customErrorData?.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Which model is asked, and in what order. Each model is built to run in one
 * place only, so the order is decided here, where it can be read and tested,
 * and not inside the SDK.
 *
 *  - `device_first`: the model in the browser; the cloud only if that fails.
 *  - `cloud_only`:   the cloud, and nothing else.
 *
 * A cloud request that fails with a server error is put once more after a
 * short wait. Nothing is ever handed from the cloud to the model in the
 * browser: what that model cannot be trusted to write, it is not asked for.
 */
export async function carry(route: Route, { device, cloud, pause }: Ways): Promise<Delivery> {
  if (route === 'device_first') {
    try {
      return { text: await device(), ran: 'device' };
    } catch {
      // The model in the browser could not write this. The request goes out instead, and the ledger says so.
    }
  }
  try {
    return { text: await cloud(), ran: 'cloud' };
  } catch (failure) {
    if ((statusOf(failure) ?? 0) < 500) throw failure;
    await pause(RETRY_AFTER_MS);
    try {
      return { text: await cloud(), ran: 'cloud' };
    } catch {
      // The first failure is the one reported.
      throw failure;
    }
  }
}

const models = new Map<string, GenerativeModel>();

function modelFor({ request, schema }: Prepared, where: 'device' | 'cloud'): GenerativeModel {
  // The schema follows from the first two fields.
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
      // A request that leaves goes through the app that carries App Check; one that stays does not.
      getAI(where === 'device' ? firebaseApp() : outboundApp(), { backend: new GoogleAIBackend() }),
      where === 'device'
        ? { mode: InferenceMode.ONLY_ON_DEVICE, onDeviceParams }
        : {
            mode: InferenceMode.ONLY_IN_CLOUD,
            inCloudParams: {
              model: CLOUD_MODEL,
              generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema },
            },
          },
      where === 'device' ? undefined : { timeout: CLOUD_TIMEOUT_MS },
    );
    models.set(key, model);
  }
  return model;
}

/** The real transport: Firebase AI Logic, each model in the one place it is built to run. */
export const firebaseTransport: Transport = (prepared) =>
  carry(prepared.route, {
    device: async () => {
      const { response } = await modelFor(prepared, 'device').generateContent(prepared.prompt);
      return response.text();
    },
    cloud: async () => {
      // Only now, with a request about to leave, is the app's proof of identity set up.
      startAppCheck();
      const { response } = await modelFor(prepared, 'cloud').generateContent(prepared.prompt);
      return response.text();
    },
    pause: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });

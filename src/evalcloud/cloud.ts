import { getAI, getGenerativeModel, type GenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from 'firebase/ai';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { CLASSIFY_SCHEMA } from '../ai/classify';
import { EXTRACT_SCHEMA } from '../ai/extract';
import type { Generate, Generation } from '../ai/types';
import { baselineApp } from '../firebase';
import { CLOUD_MODEL, CLOUD_TIMEOUT_MS } from '../outbound/channel';

/**
 * The evaluation's cloud baseline: the same two reading steps as the app,
 * answered by the cloud model the app uses for templates, with the whole
 * letter in the prompt.
 *
 * The app never does this. It exists to answer one question with a number:
 * how much accuracy does reading on the device give up? It is reached only
 * from eval-cloud.html, which only ever sends the evaluation set's made-up
 * letters. Tests fail the build if any file outside `src/evalcloud/` imports
 * it, or if anything here reaches the app's own Firebase instances.
 */

/** Name written into results from this page. */
export const CLOUD_BASELINE_NAME = `${CLOUD_MODEL} in the cloud, through Firebase AI Logic (baseline: the whole letter leaves the device)`;

/**
 * The free tier allows 15 requests a minute for the whole project, and the
 * hosted app shares it. One request every five seconds leaves room for both.
 */
export const MIN_GAP_MS = 5000;

/** How long to wait after the service says too many requests, and how many times to try in all. */
const BUSY_WAIT_MS = 30_000;
const ATTEMPTS = 3;

let checked = false;

function proveThisPage(): void {
  if (checked) return;
  checked = true;
  const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
  // Without a key the server refuses every request, and the page shows why.
  if (!siteKey) return;
  initializeAppCheck(baselineApp(), { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
}

function cloudModel(schema: Record<string, unknown>): GenerativeModel {
  return getGenerativeModel(
    getAI(baselineApp(), { backend: new GoogleAIBackend() }),
    {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: { model: CLOUD_MODEL, generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema } },
    },
    { timeout: CLOUD_TIMEOUT_MS },
  );
}

const statusOf = (error: unknown): number | undefined => {
  const status = (error as { customErrorData?: { status?: unknown } } | null)?.customErrorData?.status;
  return typeof status === 'number' ? status : undefined;
};

/** Waits, and how; swapped in tests so they need not sleep. */
export interface Pacing {
  now(): number;
  sleep(ms: number): Promise<void>;
}

const realPacing: Pacing = {
  now: () => performance.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * One pace for every call made through it. Calls run one at a time, in the
 * order made, at least `MIN_GAP_MS` apart; a call the service turns away as
 * busy (429) or failing (5xx) is made again after a pause. Any other error is
 * passed on. The time reported is that of the answer alone, not the waiting.
 */
export function pacer(pacing: Pacing = realPacing): (call: () => Promise<string>) => Promise<Generation> {
  let last = Number.NEGATIVE_INFINITY;
  let queue: Promise<unknown> = Promise.resolve();

  async function run(call: () => Promise<string>): Promise<Generation> {
    for (let attempt = 1; ; attempt++) {
      const wait = last + MIN_GAP_MS - pacing.now();
      if (wait > 0) await pacing.sleep(wait);
      last = pacing.now();
      try {
        const text = await call();
        return { text, ms: Math.round(pacing.now() - last) };
      } catch (error) {
        const status = statusOf(error) ?? 0;
        if (attempt >= ATTEMPTS || (status !== 429 && status < 500)) throw error;
        await pacing.sleep(BUSY_WAIT_MS);
      }
    }
  }

  return (call) => {
    const result = queue.then(() => run(call));
    queue = result.catch(() => undefined);
    return result;
  };
}

function asCall(model: () => GenerativeModel): (prompt: string) => Promise<string> {
  return async (prompt) => {
    proveThisPage();
    const { response } = await model().generateContent(prompt);
    if (response.inferenceSource !== InferenceSource.IN_CLOUD) throw new Error('The baseline answer did not come from the cloud.');
    return response.text();
  };
}

let classifier: GenerativeModel | undefined;
let extractor: GenerativeModel | undefined;

/** The two reading steps, answered in the cloud. They share one pace, since they share one quota. */
export function cloudReaders(): { classify: Generate; extract: Generate } {
  const pace = pacer();
  const classify = asCall(() => (classifier ??= cloudModel(CLASSIFY_SCHEMA)));
  const extract = asCall(() => (extractor ??= cloudModel(EXTRACT_SCHEMA)));
  return {
    classify: (prompt) => pace(() => classify(prompt)),
    extract: (prompt) => pace(() => extract(prompt)),
  };
}

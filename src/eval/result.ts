import type { DeviceModelStatus } from '../ai/availability';
import type { Environment } from './environment';
import type { LetterResult } from './run';
import type { Summary } from './summary';

/** The name written into results produced by the evaluation page. */
export const DEVICE_MODEL_NAME = 'Gemini Nano (Chrome built-in model), on-device only, through Firebase AI Logic';

/**
 * Which model read the letters: the one in the browser, or the cloud model
 * the app uses for templates, given the whole letter as a baseline. Results
 * from before the cloud baseline existed have no `reader` and are on-device.
 */
export type ReaderId = 'nano' | 'cloud';

/** One complete evaluation run, as downloaded from the evaluation page and kept in `eval/results/`. */
export interface EvalRun {
  schema: 1;
  app: 'letterkind';
  /** Short hash of the commit the page was built from. */
  commit: string;
  startedAt: string;
  finishedAt: string;
  /** How many letters the evaluation set had; more than `letters.length` if the run was cut short. */
  setSize: number;
  /** Absent in results made before there was more than one reader; those are `nano`. */
  reader?: ReaderId;
  model: {
    name: string;
    status: DeviceModelStatus;
  };
  environment: Environment;
  summary: Summary;
  letters: LetterResult[];
}

/** File name for a run: what read the letters, the day, and the commit. */
export function resultFileName(run: Pick<EvalRun, 'startedAt' | 'commit' | 'reader'>): string {
  return `${run.reader ?? 'nano'}-${run.startedAt.slice(0, 10)}-${run.commit}.json`;
}

export function serialise(run: EvalRun): string {
  return `${JSON.stringify(run, null, 2)}\n`;
}

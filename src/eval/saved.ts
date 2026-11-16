import type { EvalRun, ReaderId } from './result';
import { summarise } from './summary';

/**
 * Runs kept in the repository under `eval/results/`, so anyone can see the
 * numbers the README quotes without spending half an hour on the device, and
 * a results file someone downloaded can be opened again. Each saved file is
 * its own chunk: nothing is fetched until a run is chosen.
 */

const FILES = import.meta.glob<EvalRun>('../../eval/results/*.json', { import: 'default' });

const nameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, '');

/** The saved runs read by `reader`, newest first. Runs from before there was a cloud reader are on-device. */
export function savedRunNames(reader: ReaderId): string[] {
  return Object.keys(FILES)
    .map(nameOf)
    .filter((name) => name.startsWith(`${reader}-`))
    .sort((a, b) => b.localeCompare(a));
}

export async function loadSavedRun(name: string): Promise<EvalRun> {
  const path = Object.keys(FILES).find((p) => nameOf(p) === name);
  const load = path ? FILES[path] : undefined;
  if (!load) throw new Error(`There is no saved run called ${name}.`);
  return checkRun(await load());
}

/** Parses a results file opened from disk; throws a sentence a person can act on if it is not one. */
export function parseRunFile(text: string): EvalRun {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This file is not JSON. Open a file downloaded from this page.');
  }
  return checkRun(value);
}

function checkRun(value: unknown): EvalRun {
  const run = value as Partial<EvalRun> | null;
  if (!run || typeof run !== 'object' || run.app !== 'letterkind' || run.schema !== 1 || !Array.isArray(run.letters) || typeof run.commit !== 'string') {
    throw new Error('This is not a Letterkind results file.');
  }
  const full = run as EvalRun;
  // The page shows the tables its letters add up to under the scoring code as it is now,
  // so a hand-edited summary cannot show numbers the letters do not support.
  return { ...full, summary: summarise(full.letters) };
}

/** One line on where and when a run was made, from what the file itself records. */
export function describeRun(run: EvalRun): string {
  const minutes = Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 60_000);
  const env = run.environment;
  const where = [env.browser ?? null, env.platform ?? null, env.logicalCores ? `${env.logicalCores} cores` : null, env.gpu].filter(Boolean).join(', ');
  return `Build ${run.commit}, run on ${run.startedAt.slice(0, 10)}${Number.isFinite(minutes) && minutes > 0 ? ` (${minutes} min)` : ''}${where ? ` — ${where}` : ''}. ${run.letters.length} of ${run.setSize} letters.`;
}

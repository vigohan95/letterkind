import { describe, expect, it } from 'vitest';
import { classify } from '../../src/ai/classify';
import { EXTRACT_FIELDS, type RawFields } from '../../src/ai/extract';
import { readLetter } from '../../src/ai/read';
import { EVAL_SET } from '../../src/eval/dataset';
import type { EvalRun } from '../../src/eval/result';
import { type Outcome, scoreClassification, scoreReading } from '../../src/eval/score';

/**
 * Replays the model answers stored in `eval/results/` through the checks and
 * rules as they are now. The model's raw answers do not change; only what the
 * app makes of them does. This is how a change to a check is measured without
 * another half-hour run on the device, and it guards against a new check
 * hiding a value that used to be shown correctly.
 */

const RESULTS = import.meta.glob<EvalRun>('../../eval/results/*.json', { import: 'default', eager: true });
const TODAY = '2026-11-14';
const HINT = { full: true, no_hint: false, untyped: false } as const;

async function replay(run: EvalRun) {
  const tally = { before: 0, after: 0, lost: [] as string[], changed: [] as string[] };
  for (const result of run.letters) {
    const item = EVAL_SET.find((i) => i.label.file === result.file);
    if (!item) continue;
    for (const variant of ['full', 'no_hint', 'untyped'] as const) {
      const stored = result.variants[variant];
      const raw: RawFields | null = stored.raw;
      const reading = await readLetter(item.letter, stored.type, async () => ({ text: raw ? JSON.stringify(raw) : 'not json', ms: 0 }), TODAY, {
        hint: HINT[variant],
      });
      const scores = scoreReading(reading, item.label, item.letter);
      for (const field of EXTRACT_FIELDS) {
        const was: Outcome = stored.scores[field].final;
        const now: Outcome = scores[field].final;
        if (variant === 'full') {
          if (was === 'wrong') tally.before++;
          if (now === 'wrong') tally.after++;
        }
        if (variant === 'full' && was !== now) tally.changed.push(`${result.file} ${field} ${was}->${now}`);
        if (was === 'right' && now !== 'right') tally.lost.push(`${variant} ${result.file} ${field}`);
      }
    }
  }
  return tally;
}

describe('replaying stored model answers through the current checks', () => {
  it.each(Object.entries(RESULTS))('%s: nothing shown correctly before is lost, and no more is shown wrong', async (_path, run) => {
    const { before, after, lost, changed } = await replay(run);
    expect(lost).toEqual([]);
    expect(after).toBeLessThanOrEqual(before);
    console.info(`${run.reader}/${run.commit}: shown wrong (full) ${before} -> ${after}; ${changed.join('; ')}`);
  });
});

describe('replaying stored model answers through the current keyword rules', () => {
  it.each(Object.entries(RESULTS))('%s: no kind settled right before is lost, and no more are settled wrong', async (_path, run) => {
    const tally = { wrongBefore: 0, wrongAfter: 0, lost: [] as string[], changed: [] as string[] };
    for (const result of run.letters) {
      const item = EVAL_SET.find((i) => i.label.file === result.file);
      if (!item) continue;
      const stored = result.classification.model;
      const now = scoreClassification(
        await classify(item.letter, async () => ({ text: stored ? JSON.stringify({ letter_type: stored }) : 'not json', ms: 0 })),
        item.label.type,
      );
      const was = result.classificationScore;
      if (was.combined === 'wrong') tally.wrongBefore++;
      if (now.combined === 'wrong') tally.wrongAfter++;
      if (was.combined === 'right' && now.combined !== 'right') tally.lost.push(result.file);
      if (now.keywords === 'wrong') tally.lost.push(`${result.file} keywords wrong`);
      if (was.combined !== now.combined) tally.changed.push(`${result.file} ${was.combined}->${now.combined}`);
    }
    expect(tally.lost).toEqual([]);
    expect(tally.wrongAfter).toBeLessThanOrEqual(tally.wrongBefore);
    console.info(`${run.reader}/${run.commit}: kind settled wrong ${tally.wrongBefore} -> ${tally.wrongAfter}; ${tally.changed.join('; ')}`);
  });
});

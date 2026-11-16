import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EvalRun } from '../../src/eval/result';
import { describeRun, loadSavedRun, parseRunFile, savedRunNames } from '../../src/eval/saved';
import { summarise } from '../../src/eval/summary';

const DIR = 'eval/results';
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));

describe('saved runs', () => {
  it('lists every file in eval/results under its reader, newest first', () => {
    const nano = savedRunNames('nano');
    const cloud = savedRunNames('cloud');
    expect([...nano, ...cloud].sort()).toEqual(files.map((f) => f.replace(/\.json$/, '')).sort());
    expect(nano.every((n) => n.startsWith('nano-'))).toBe(true);
    expect(cloud.every((n) => n.startsWith('cloud-'))).toBe(true);
    expect(nano).toEqual([...nano].sort().reverse());
  });

  it.each(files)('%s opens with the tables its letters add up to', async (file) => {
    const run = await loadSavedRun(file.replace(/\.json$/, ''));
    const onDisk = JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')) as EvalRun;
    expect(run.letters).toEqual(onDisk.letters);
    expect(run.summary).toEqual(summarise(onDisk.letters));
    expect(describeRun(run)).toContain(`Build ${onDisk.commit}`);
    expect(describeRun(run)).toContain(`${onDisk.letters.length} of ${onDisk.setSize} letters`);
  });

  it('refuses a name that is not saved', async () => {
    await expect(loadSavedRun('nano-1999-01-01-0000000')).rejects.toThrow('no saved run');
  });

  it('opens a downloaded file, and recomputes a summary that was edited by hand', () => {
    const text = readFileSync(`${DIR}/${files[0]}`, 'utf8');
    const edited = JSON.parse(text) as EvalRun;
    edited.summary.variants.full.total.final.wrong = 0;
    edited.summary.variants.full.total.final.right = 9999;
    const run = parseRunFile(JSON.stringify(edited));
    expect(run.summary).toEqual(summarise(edited.letters));
  });

  it('says plainly when a file is not a results file', () => {
    expect(() => parseRunFile('not json')).toThrow('not JSON');
    expect(() => parseRunFile('{"app":"other","schema":1,"letters":[],"commit":"abc1234"}')).toThrow('not a Letterkind results file');
    expect(() => parseRunFile('null')).toThrow('not a Letterkind results file');
  });
});

import { describe, expect, it } from 'vitest';
import { resultFileName } from '../../src/eval/result';
import { MIN_GAP_MS, type Pacing, pacer } from '../../src/evalcloud/cloud';

/** A clock that only moves when something sleeps, and a record of every call's start time. */
function fakeTime(): Pacing & { slept: number[] } {
  let t = 0;
  const slept: number[] = [];
  return {
    slept,
    now: () => t,
    sleep: async (ms) => {
      slept.push(ms);
      t += ms;
    },
  };
}

const failure = (status: number) => Object.assign(new Error(`HTTP ${status}`), { customErrorData: { status } });

describe('cloud baseline pacing', () => {
  it('puts calls at least the minimum gap apart, one at a time, in order', async () => {
    const time = fakeTime();
    const pace = pacer(time);
    const started: number[] = [];
    const call = (text: string) => async () => {
      started.push(time.now());
      return text;
    };
    const answers = await Promise.all([pace(call('a')), pace(call('b')), pace(call('c'))]);
    expect(answers.map((a) => a.text)).toEqual(['a', 'b', 'c']);
    expect(started).toEqual([0, MIN_GAP_MS, 2 * MIN_GAP_MS]);
  });

  it('asks again after a pause when the service is busy or failing', async () => {
    const time = fakeTime();
    const pace = pacer(time);
    const outcomes = [failure(429), failure(503)];
    let calls = 0;
    const answer = await pace(async () => {
      calls++;
      const next = outcomes.shift();
      if (next) throw next;
      return 'ok';
    });
    expect(answer.text).toBe('ok');
    expect(calls).toBe(3);
  });

  it('gives up after three tries, and does not retry a request the server refused', async () => {
    const time = fakeTime();
    const pace = pacer(time);
    let calls = 0;
    await expect(
      pace(async () => {
        calls++;
        throw failure(429);
      }),
    ).rejects.toThrow('HTTP 429');
    expect(calls).toBe(3);

    calls = 0;
    await expect(
      pace(async () => {
        calls++;
        throw failure(403);
      }),
    ).rejects.toThrow('HTTP 403');
    expect(calls).toBe(1);
  });

  it('keeps going after a failed call', async () => {
    const pace = pacer(fakeTime());
    await expect(pace(async () => Promise.reject(failure(400)))).rejects.toThrow();
    await expect(pace(async () => 'next')).resolves.toMatchObject({ text: 'next' });
  });
});

describe('result file names', () => {
  it('name the reader, and older results without one are on-device', () => {
    expect(resultFileName({ startedAt: '2026-11-14T05:00:00.000Z', commit: 'abc1234', reader: 'cloud' })).toBe('cloud-2026-11-14-abc1234.json');
    expect(resultFileName({ startedAt: '2026-11-14T05:00:00.000Z', commit: 'abc1234' })).toBe('nano-2026-11-14-abc1234.json');
  });
});

import { describe, expect, it } from 'vitest';
import { isTransientDeviceError, retryOnTransient } from '../../src/ai/retry';

const unknown = () => Object.assign(new Error('An unknown error occurred: kErrorUnknown'), { name: 'UnknownError' });

describe('isTransientDeviceError', () => {
  it('treats the built-in model’s generic failures as worth one more try', () => {
    expect(isTransientDeviceError(unknown())).toBe(true);
    expect(isTransientDeviceError(new Error('Other generic failures occurred: kErrorGenericFailure'))).toBe(true);
    // Firebase wraps the browser's error; the code survives in the message.
    expect(isTransientDeviceError(new Error('AI: Error generating content: kErrorUnknown (AI/error)'))).toBe(true);
  });

  it('does not retry errors that another try cannot fix', () => {
    expect(isTransientDeviceError(new Error('On-device inference was required, but the response did not come from the device.'))).toBe(false);
    expect(isTransientDeviceError(Object.assign(new Error('The model is not available'), { name: 'NotSupportedError' }))).toBe(false);
    expect(isTransientDeviceError(Object.assign(new Error('aborted'), { name: 'AbortError' }))).toBe(false);
    expect(isTransientDeviceError(Object.assign(new Error('too long'), { name: 'QuotaExceededError' }))).toBe(false);
    expect(isTransientDeviceError('kErrorUnknown')).toBe(false);
  });
});

describe('retryOnTransient', () => {
  it('starts over with a fresh session after a transient failure and returns the answer', async () => {
    let calls = 0;
    let resets = 0;
    const answer = await retryOnTransient(
      async () => {
        calls += 1;
        if (calls === 1) throw unknown();
        return 'ok';
      },
      () => {
        resets += 1;
      },
    );
    expect(answer).toBe('ok');
    expect(calls).toBe(2);
    expect(resets).toBe(1);
  });

  it('gives up after the allowed number of tries and passes on the last error', async () => {
    let calls = 0;
    await expect(
      retryOnTransient(
        async () => {
          calls += 1;
          throw unknown();
        },
        () => {},
        3,
      ),
    ).rejects.toThrow('kErrorUnknown');
    expect(calls).toBe(3);
  });

  it('passes other errors on at once, without resetting', async () => {
    let calls = 0;
    let resets = 0;
    await expect(
      retryOnTransient(
        async () => {
          calls += 1;
          throw new Error('On-device inference was required, but the response did not come from the device.');
        },
        () => {
          resets += 1;
        },
      ),
    ).rejects.toThrow('On-device');
    expect(calls).toBe(1);
    expect(resets).toBe(0);
  });
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { type DeviceModelStatus, deviceModelStatus } from '../ai/availability';
import { onDeviceClassifier, onDeviceExtractor } from '../ai/onDevice';
import { localIsoDate } from '../domain/deadline';
import { EVAL_SET } from './dataset';
import { describeEnvironment } from './environment';
import { Report } from './Report';
import { DEVICE_MODEL_NAME, type EvalRun, resultFileName, serialise } from './result';
import { evaluate, type LetterResult } from './run';
import { summarise } from './summary';

/**
 * The evaluation page: runs the labelled letters through the on-device model
 * in this browser, with the same code path as the app, and shows the scores.
 * Anyone with a browser that has the built-in model can reproduce the numbers
 * in the README here. Nothing is sent anywhere; the results are offered as a
 * file to save.
 */

type RunState = 'idle' | 'running' | 'finished' | 'stopped' | 'error';

const STATUS_TEXT: Record<DeviceModelStatus | 'checking', string> = {
  checking: 'Checking for the on-device model…',
  ready: 'On-device model ready.',
  downloadable: 'This browser can run the on-device model but has not downloaded it yet. Open the app once and download it there, then come back.',
  downloading: 'The on-device model is still downloading. Try again when it has finished.',
  unavailable: 'This device cannot run the browser’s built-in model, so the evaluation cannot run here.',
  unsupported: 'This browser has no built-in model. The evaluation needs a recent desktop Chrome.',
};

/** `?limit=3` runs only the first three letters: a quick check that everything works. */
function limitFromUrl(): number {
  const asked = Number(new URLSearchParams(window.location.search).get('limit'));
  return Number.isInteger(asked) && asked > 0 ? Math.min(asked, EVAL_SET.length) : EVAL_SET.length;
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function EvalPage() {
  const [status, setStatus] = useState<DeviceModelStatus | 'checking'>('checking');
  const [state, setState] = useState<RunState>('idle');
  const [letters, setLetters] = useState<readonly LetterResult[]>([]);
  const [run, setRun] = useState<EvalRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedMs, setStartedMs] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const stop = useRef(false);
  const items = useMemo(() => EVAL_SET.slice(0, limitFromUrl()), []);

  useEffect(() => {
    let live = true;
    void deviceModelStatus().then((s) => {
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, []);

  const fileUrl = useMemo(() => (run ? URL.createObjectURL(new Blob([serialise(run)], { type: 'application/json' })) : null), [run]);
  useEffect(
    () => () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    },
    [fileUrl],
  );

  async function start(): Promise<void> {
    if (status !== 'ready') return;
    stop.current = false;
    setState('running');
    setLetters([]);
    setRun(null);
    setError(null);
    const started = new Date();
    setStartedMs(started.getTime());
    setNowMs(started.getTime());
    try {
      const results = await evaluate(items, { classify: onDeviceClassifier, extract: onDeviceExtractor }, localIsoDate(started), {
        onLetter: (done) => {
          setLetters(done);
          setNowMs(Date.now());
        },
        stopped: () => stop.current,
      });
      setRun({
        schema: 1,
        app: 'letterkind',
        commit: __BUILD_COMMIT__,
        startedAt: started.toISOString(),
        finishedAt: new Date().toISOString(),
        setSize: EVAL_SET.length,
        model: { name: DEVICE_MODEL_NAME, status },
        environment: await describeEnvironment(),
        summary: summarise(results),
        letters: results,
      });
      setState(stop.current ? 'stopped' : 'finished');
    } catch (failure) {
      setError(messageOf(failure));
      setState('error');
    }
  }

  const done = letters.length;
  const perLetter = done > 0 ? (nowMs - startedMs) / done : 0;
  const minutesLeft = Math.max(1, Math.round((perLetter * (items.length - done)) / 60000));
  const summary = useMemo(() => (letters.length > 0 ? summarise(letters) : null), [letters]);

  return (
    <main className="eval">
      <header className="masthead">
        <h1>Letterkind — evaluation</h1>
        <p>
          {EVAL_SET.length} synthetic official letters with known answers, read by the on-device model in this browser through the same code as the app. The question it answers: how
          often would a wrong amount, date, phone number or name reach the reader — from the model alone, and after the app’s checks?
        </p>
      </header>

      <div className="device" data-status={status} role="status">
        <span className="device-dot" aria-hidden="true" />
        <span>{STATUS_TEXT[status]}</span>
        <span className="build">Build {__BUILD_COMMIT__}</span>
      </div>

      <div className="eval-actions">
        {state === 'running' ? (
          <button type="button" onClick={() => (stop.current = true)}>
            Stop after this letter
          </button>
        ) : (
          <button type="button" className="primary" disabled={status !== 'ready'} onClick={() => void start()}>
            {state === 'idle' ? `Run the evaluation (${items.length} letters)` : 'Run again'}
          </button>
        )}
        {fileUrl && run && (
          <a className="download" href={fileUrl} download={resultFileName(run)}>
            Download results (JSON)
          </a>
        )}
        <span className="progress" role="status">
          {state === 'running' &&
            (done === 0
              ? `Reading letter 1 of ${items.length}. Each letter is read four times; expect under a minute per letter.`
              : `${done} of ${items.length} letters done — about ${minutesLeft} min left.`)}
          {state === 'finished' && `Finished: ${done} letters.`}
          {state === 'stopped' && `Stopped after ${done} letters.`}
        </span>
      </div>
      {error && <p className="device-error">The run failed: {error}</p>}

      {summary ? (
        <Report letters={letters} summary={summary} setSize={EVAL_SET.length} />
      ) : (
        <section className="about">
          <h2>How it is scored</h2>
          <ul>
            <li>
              Every letter has a label written before any model saw it: who sent it, the number to quote, the amount to pay (if any), the deadline (if any), the phone number to
              call.
            </li>
            <li>
              <strong>Model alone</strong> scores the model’s answer taken at its word. <strong>Shown by the app</strong> scores what is left after the answer has been checked
              against the letter’s own text and the rules for that kind of letter have been applied.
            </li>
            <li>The letters and labels are in the repository under eval/, and the scoring code is in src/eval/.</li>
          </ul>
        </section>
      )}
    </main>
  );
}

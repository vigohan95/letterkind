import { useEffect, useMemo, useRef, useState } from 'react';
import type { DeviceModelStatus } from '../ai/availability';
import { localIsoDate } from '../domain/deadline';
import { EVAL_SET } from './dataset';
import { describeEnvironment } from './environment';
import { Report } from './Report';
import { describeRun, loadSavedRun, parseRunFile, savedRunNames } from './saved';
import { type EvalRun, type ReaderId, resultFileName, serialise } from './result';
import { evaluate, type LetterResult, type Models } from './run';
import { summarise } from './summary';

/**
 * The evaluation page: runs the labelled letters through a model, with the
 * same code path as the app, and shows the scores. Which model is a
 * parameter: the one in this browser (eval.html, what the app uses), or the
 * cloud baseline (eval-cloud.html). Results are offered as a file to save.
 */

/** What reads the letters on a page, and how the page talks about it. */
export interface Reader {
  id: ReaderId;
  /** Written into the results file. */
  modelName: string;
  heading: string;
  intro: string;
  /** The row for this model in the table of who said what kind of letter it was. */
  rowLabel: string;
  status(): Promise<DeviceModelStatus>;
  statusText: Record<DeviceModelStatus | 'checking', string>;
  /** Shown while the first letter is being read. */
  firstLetterNote: string;
  models(): Models;
  /** What the about section says leaves the page, if anything. */
  network: string;
}

type RunState = 'idle' | 'running' | 'finished' | 'stopped' | 'error';

/** `?saved=nano-2026-11-15-d0d1eef` opens that saved run from eval/results/ instead of waiting for a new one. */
function savedFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('saved');
}

/** `?limit=3` runs only the first three letters: a quick check that everything works. */
function limitFromUrl(): number {
  const asked = Number(new URLSearchParams(window.location.search).get('limit'));
  return Number.isInteger(asked) && asked > 0 ? Math.min(asked, EVAL_SET.length) : EVAL_SET.length;
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function EvalPage({ reader }: { reader: Reader }) {
  const [status, setStatus] = useState<DeviceModelStatus | 'checking'>('checking');
  const [state, setState] = useState<RunState>('idle');
  const [letters, setLetters] = useState<readonly LetterResult[]>([]);
  const [run, setRun] = useState<EvalRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedMs, setStartedMs] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const stop = useRef(false);
  const items = useMemo(() => EVAL_SET.slice(0, limitFromUrl()), []);
  const savedNames = useMemo(() => savedRunNames(reader.id), [reader]);
  const [saved, setSaved] = useState<EvalRun | null>(null);
  const [savedName, setSavedName] = useState('');
  const [savedError, setSavedError] = useState<string | null>(null);

  async function openSaved(name: string): Promise<void> {
    setSavedName(name);
    setSavedError(null);
    if (!name) {
      setSaved(null);
      return;
    }
    try {
      setSaved(await loadSavedRun(name));
    } catch (failure) {
      setSaved(null);
      setSavedError(messageOf(failure));
    }
  }

  async function openFile(file: File | undefined): Promise<void> {
    if (!file) return;
    setSavedName('');
    setSavedError(null);
    try {
      setSaved(parseRunFile(await file.text()));
    } catch (failure) {
      setSaved(null);
      setSavedError(messageOf(failure));
    }
  }

  useEffect(() => {
    const asked = savedFromUrl();
    if (!asked) return;
    let live = true;
    loadSavedRun(asked).then(
      (found) => {
        if (!live) return;
        setSavedName(asked);
        setSaved(found);
      },
      (failure: unknown) => {
        if (live) setSavedError(messageOf(failure));
      },
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void reader.status().then((s) => {
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, [reader]);

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
    setSaved(null);
    setSavedName('');
    setSavedError(null);
    setState('running');
    setLetters([]);
    setRun(null);
    setError(null);
    const started = new Date();
    setStartedMs(started.getTime());
    setNowMs(started.getTime());
    try {
      const results = await evaluate(items, reader.models(), localIsoDate(started), {
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
        reader: reader.id,
        model: { name: reader.modelName, status },
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
        <h1>{reader.heading}</h1>
        <p>{reader.intro}</p>
      </header>

      <div className="device" data-status={status} role="status">
        <span className="device-dot" aria-hidden="true" />
        <span>{reader.statusText[status]}</span>
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
              ? `Reading letter 1 of ${items.length}. ${reader.firstLetterNote}`
              : `${done} of ${items.length} letters done — about ${minutesLeft} min left.`)}
          {state === 'finished' && `Finished: ${done} letters.`}
          {state === 'stopped' && `Stopped after ${done} letters.`}
        </span>
      </div>
      {error && <p className="device-error">The run failed: {error}</p>}

      {state !== 'running' && (
        <div className="eval-saved">
          <label>
            Or look at a saved run{' '}
            <select value={savedName} onChange={(e) => void openSaved(e.target.value)}>
              <option value="">Choose one from the repository…</option>
              {savedNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="eval-open">
            or open a results file <input type="file" accept="application/json,.json" onChange={(e) => void openFile(e.target.files?.[0])} />
          </label>
        </div>
      )}
      {savedError && <p className="device-error">{savedError}</p>}

      {saved ? (
        <>
          <p className="saved-note" role="status">
            Showing a saved run, not one made in this browser. {describeRun(saved)}
          </p>
          <Report letters={saved.letters} summary={saved.summary} setSize={saved.setSize} readerLabel={reader.rowLabel} />
        </>
      ) : summary ? (
        <Report letters={letters} summary={summary} setSize={EVAL_SET.length} readerLabel={reader.rowLabel} />
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
            <li>{reader.network}</li>
          </ul>
        </section>
      )}
    </main>
  );
}

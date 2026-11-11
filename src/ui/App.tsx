import { useEffect, useRef, useState } from 'react';
import { type DeviceModelStatus, deviceModelStatus } from '../ai/availability';
import { type Classification, classify } from '../ai/classify';
import { onDeviceClassifier, onDeviceExtractor, prepareDeviceModel } from '../ai/onDevice';
import { type Reading, readLetter } from '../ai/read';
import { localIsoDate } from '../domain/deadline';
import { LETTER_TYPE_IDS, type LetterTypeId } from '../domain/letterTypes';
import { en } from '../i18n/en';
import { SAMPLE_LETTERS } from '../samples/letters';
import { LetterView } from './LetterView';
import { ReadingView } from './ReadingView';

type Phase =
  | { at: 'idle' }
  | { at: 'classifying'; letter: string }
  | { at: 'choosing'; letter: string; classification: Classification }
  | { at: 'extracting'; letter: string; classification: Classification }
  | { at: 'done'; letter: string; classification: Classification; reading: Reading; chosen: boolean }
  | { at: 'error'; message: string };

const t = en;
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function App() {
  const [status, setStatus] = useState<DeviceModelStatus | 'checking'>('checking');
  const [download, setDownload] = useState<{ fraction: number | null; error: string | null }>({ fraction: null, error: null });
  const [draft, setDraft] = useState('');
  const [sample, setSample] = useState(false);
  const [phase, setPhase] = useState<Phase>({ at: 'idle' });
  const [other, setOther] = useState<LetterTypeId>('other');
  // Each reading gets a number, so an answer that arrives after the reader has moved on is dropped.
  const run = useRef(0);

  useEffect(() => {
    let live = true;
    void deviceModelStatus().then((s) => {
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, []);

  async function downloadModel(): Promise<void> {
    setStatus('downloading');
    setDownload({ fraction: 0, error: null });
    try {
      await prepareDeviceModel((fraction) => setDownload({ fraction, error: null }));
      setDownload({ fraction: null, error: null });
    } catch (error) {
      setDownload({ fraction: null, error: messageOf(error) });
    }
    setStatus(await deviceModelStatus());
  }

  async function extractAs(letter: string, classification: Classification, type: LetterTypeId, chosen: boolean, id: number): Promise<void> {
    setPhase({ at: 'extracting', letter, classification });
    const reading = await readLetter(letter, type, onDeviceExtractor, localIsoDate(new Date()));
    if (run.current === id) setPhase({ at: 'done', letter, classification, reading, chosen });
  }

  async function read(): Promise<void> {
    const letter = draft.replace(/\r\n?/g, '\n').trim();
    if (!letter) return;
    const id = ++run.current;
    setPhase({ at: 'classifying', letter });
    try {
      const classification = await classify(letter, onDeviceClassifier);
      if (run.current !== id) return;
      if (classification.type === null) setPhase({ at: 'choosing', letter, classification });
      else await extractAs(letter, classification, classification.type, false, id);
    } catch (error) {
      if (run.current === id) setPhase({ at: 'error', message: messageOf(error) });
    }
  }

  async function choose(letter: string, classification: Classification, type: LetterTypeId): Promise<void> {
    const id = ++run.current;
    try {
      await extractAs(letter, classification, type, true, id);
    } catch (error) {
      if (run.current === id) setPhase({ at: 'error', message: messageOf(error) });
    }
  }

  function reset(): void {
    run.current++;
    setPhase({ at: 'idle' });
  }

  const deviceLine =
    status === 'downloading' && download.fraction !== null
      ? `${t.device.downloading} ${Math.round(download.fraction * 100)}%`
      : t.device[status];

  return (
    <main>
      <header className="masthead">
        <h1>{t.appName}</h1>
        <p>{t.tagline}</p>
      </header>

      <div className="device" data-status={status} role="status">
        <span className="device-dot" aria-hidden="true" />
        <span>{deviceLine}</span>
        {status === 'downloadable' && (
          <button type="button" onClick={() => void downloadModel()}>
            {t.device.download}
          </button>
        )}
        {download.error && (
          <span className="device-error">
            {t.device.downloadFailed}: {download.error}
          </span>
        )}
      </div>

      {phase.at === 'idle' && (
        <form
          className="compose"
          onSubmit={(event) => {
            event.preventDefault();
            void read();
          }}
        >
          <label htmlFor="letter">{t.input.label}</label>
          <textarea
            id="letter"
            value={draft}
            placeholder={t.input.placeholder}
            spellCheck={false}
            rows={16}
            onChange={(event) => {
              setDraft(event.target.value);
              setSample(false);
            }}
          />
          {sample && <p className="hint">{t.input.sampleNote}</p>}
          <div className="compose-actions">
            <button type="submit" className="primary" disabled={status !== 'ready' || draft.trim() === ''}>
              {t.input.read}
            </button>
            <span className="samples">
              {t.input.samples}
              {SAMPLE_LETTERS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setDraft(s.text);
                    setSample(true);
                  }}
                >
                  {s.title}
                </button>
              ))}
            </span>
          </div>
        </form>
      )}

      {(phase.at === 'classifying' || phase.at === 'extracting') && (
        <div className="reading">
          <LetterView letter={phase.letter} highlights={[]} />
          <div className="facts">
            <p className="working" role="status">
              {phase.at === 'classifying' ? t.progress.classifying : t.progress.extracting}
            </p>
          </div>
        </div>
      )}

      {phase.at === 'choosing' && (
        <div className="reading">
          <LetterView letter={phase.letter} highlights={[]} />
          <div className="facts">
            <section className="fact fact-kind">
              <h3>{t.kind.choose}</h3>
              <p>{t.kind.chooseBody}</p>
              <ul className="choices">
                {phase.classification.candidates.map((type, i) => (
                  <li key={type}>
                    <button type="button" className="primary" onClick={() => void choose(phase.letter, phase.classification, type)}>
                      {t.kinds[type]}
                    </button>
                    <span className="fact-where">— {i === 0 ? t.kind.saidByModel : t.kind.saidByKeywords}</span>
                  </li>
                ))}
                <li>
                  <label htmlFor="other-kind">{t.kind.somethingElse}</label>
                  <select id="other-kind" value={other} onChange={(event) => setOther(event.target.value as LetterTypeId)}>
                    {LETTER_TYPE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {t.kinds[id]}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => void choose(phase.letter, phase.classification, other)}>
                    {t.input.read}
                  </button>
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}

      {phase.at === 'done' && (
        <ReadingView letter={phase.letter} classification={phase.classification} reading={phase.reading} chosenByReader={phase.chosen} t={t} />
      )}

      {phase.at === 'error' && (
        <div className="error" role="alert">
          <h2>{t.error.heading}</h2>
          <p>{phase.message}</p>
        </div>
      )}

      {phase.at !== 'idle' && (
        <p className="again">
          <button type="button" onClick={reset}>
            {phase.at === 'error' ? t.error.retry : t.input.again}
          </button>
        </p>
      )}

      <footer>{t.notAdvice}</footer>
    </main>
  );
}

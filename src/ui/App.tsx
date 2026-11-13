import { useEffect, useRef, useState } from 'react';
import { type DeviceModelStatus, deviceModelStatus, imageSessionOptions } from '../ai/availability';
import { type Classification, classify } from '../ai/classify';
import { onDeviceClassifier, onDeviceExtractor, onDeviceLook, prepareDeviceModel } from '../ai/onDevice';
import { type Reading, readLetter } from '../ai/read';
import { joinPages, transcribePage, unreadableCount } from '../ai/transcribe';
import { localIsoDate } from '../domain/deadline';
import { LANGUAGES, type LanguageId } from '../domain/languages';
import { LETTER_TYPE_IDS, type LetterTypeId } from '../domain/letterTypes';
import { ledger, liveGuidance, liveReply, liveTerms } from '../guidance/live';
import { stringsFor } from '../i18n';
import { ACCEPTED_FILES, openFiles, UnsupportedFile } from '../input/files';
import { SAMPLE_LETTERS } from '../samples/letters';
import { GuidancePanel } from './Guidance';
import { LedgerView } from './LedgerView';
import { LetterView } from './LetterView';
import { PagePictures, Transcribing } from './Pages';
import { browserStorage, loadPrefs, type Prefs, savePrefs } from './prefs';
import { ReadingView } from './ReadingView';
import { ReplyPanel } from './Reply';

type Phase =
  | { at: 'idle' }
  | { at: 'opening' }
  | { at: 'transcribing'; page: number; pages: number; text: string }
  | { at: 'classifying'; letter: string }
  | { at: 'choosing'; letter: string; classification: Classification }
  | { at: 'extracting'; letter: string; classification: Classification }
  | { at: 'done'; letter: string; classification: Classification; reading: Reading; chosen: boolean }
  | { at: 'error'; message: string };

/** Where the text in the box came from, when it was not typed or pasted. */
type Source = { from: 'file' } | { from: 'picture'; ms: number };

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function App() {
  const [status, setStatus] = useState<DeviceModelStatus | 'checking'>('checking');
  const [download, setDownload] = useState<{ fraction: number | null; error: string | null }>({ fraction: null, error: null });
  const [pictureStatus, setPictureStatus] = useState<DeviceModelStatus | 'checking'>('checking');
  const [draft, setDraft] = useState('');
  const [sample, setSample] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ at: 'idle' });
  const [other, setOther] = useState<LetterTypeId>('other');
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(browserStorage(), navigator.languages));
  const t = stringsFor(prefs.language);
  // Each reading gets a number, so an answer that arrives after the reader has moved on is dropped.
  const run = useRef(0);
  const stop = useRef<AbortController | null>(null);

  // The page says which language it is in, for screen readers and for the browser's own translation offer.
  useEffect(() => {
    document.documentElement.lang = t.lang;
  }, [t.lang]);

  useEffect(() => {
    let live = true;
    void deviceModelStatus().then((s) => {
      if (live) setStatus(s);
    });
    void deviceModelStatus(imageSessionOptions()).then((s) => {
      if (live) setPictureStatus(s);
    });
    return () => {
      live = false;
    };
  }, []);

  // The pictures are held as object URLs; let go of the old ones whenever they are replaced.
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

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
    setPictureStatus(await deviceModelStatus(imageSessionOptions()));
  }

  /** A photo, a scan, a PDF or a text file becomes text in the box, for the reader to check before it is read. */
  async function open(files: readonly File[]): Promise<void> {
    if (files.length === 0) return;
    const id = ++run.current;
    stop.current?.abort();
    const stopper = (stop.current = new AbortController());
    setNotice(null);
    setSource(null);
    setSample(false);
    setPreviews([]);
    setPhase({ at: 'opening' });
    try {
      const opened = await openFiles(files);
      if (run.current !== id) return;
      const pictures = opened.pages.flatMap((page) => (page.kind === 'picture' ? [page] : []));
      if (pictures.length > 0 && pictureStatus !== 'ready') {
        setNotice(t.input.noPictures);
        setPhase({ at: 'idle' });
        return;
      }
      setPreviews(pictures.map((page) => URL.createObjectURL(page.preview)));
      const texts: string[] = [];
      let ms = 0;
      for (const [i, page] of opened.pages.entries()) {
        if (page.kind === 'text') {
          texts.push(page.text);
          continue;
        }
        const before = [...texts];
        const showing = (text: string): void => {
          if (run.current === id) setPhase({ at: 'transcribing', page: i + 1, pages: opened.pages.length, text: joinPages([...before, text]) });
        };
        showing('');
        const copied = await transcribePage(page.image, onDeviceLook, showing, stopper.signal);
        if (run.current !== id) return;
        texts.push(copied.text);
        ms += copied.ms;
      }
      setDraft(joinPages(texts));
      setSource(pictures.length > 0 ? { from: 'picture', ms } : { from: 'file' });
      setNotice(opened.leftOut > 0 ? t.input.leftOut(opened.leftOut, opened.pages.length) : null);
      setPhase({ at: 'idle' });
    } catch (error) {
      if (run.current !== id) return;
      if (error instanceof UnsupportedFile) {
        setNotice(t.input.unsupportedFile(error.fileName));
        setPhase({ at: 'idle' });
      } else {
        setPhase({ at: 'error', message: messageOf(error) });
      }
    }
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

  function choosePrefs(next: Prefs): void {
    setPrefs(next);
    savePrefs(browserStorage(), next);
  }

  function reset(): void {
    run.current++;
    stop.current?.abort();
    // Stopped part-way: the pictures on show no longer belong to the text in the box.
    if (phase.at === 'opening' || phase.at === 'transcribing') setPreviews([]);
    setPhase({ at: 'idle' });
  }

  const deviceLine =
    status === 'downloading' && download.fraction !== null
      ? `${t.device.downloading} ${Math.round(download.fraction * 100)}%`
      : t.device[status];

  return (
    <main>
      <header className="masthead">
        <div className="masthead-top">
          <h1>{t.appName}</h1>
          <label className="masthead-language">
            <span>{t.interfaceLanguage}</span>
            <select value={prefs.language} onChange={(event) => choosePrefs({ ...prefs, language: event.target.value as LanguageId })}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id} lang={l.id}>
                  {l.own}
                </option>
              ))}
            </select>
          </label>
        </div>
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
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void open([...event.dataTransfer.files]);
          }}
        >
          <label htmlFor="letter">{t.input.label}</label>
          <div className={previews.length > 0 ? 'compose-check' : undefined}>
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
              onPaste={(event) => {
                // A pasted screenshot or file is opened; pasted text is left to the browser.
                if (event.clipboardData.files.length === 0) return;
                event.preventDefault();
                void open([...event.clipboardData.files]);
              }}
            />
            <PagePictures previews={previews} t={t} />
          </div>
          {sample && <p className="hint">{t.input.sampleNote}</p>}
          {source?.from === 'file' && <p className="hint">{t.input.fromFile}</p>}
          {source?.from === 'picture' && <p className="hint check">{t.input.fromPicture(source.ms)}</p>}
          {source?.from === 'picture' && unreadableCount(draft) > 0 && <p className="hint check">{t.input.unreadable(unreadableCount(draft))}</p>}
          {notice && (
            <p className="hint check" role="status">
              {notice}
            </p>
          )}
          <div className="compose-actions">
            <button type="submit" className="primary" disabled={status !== 'ready' || draft.trim() === ''}>
              {t.input.read}
            </button>
            <label className="file">
              <input
                type="file"
                accept={ACCEPTED_FILES}
                multiple
                onChange={(event) => {
                  void open([...(event.target.files ?? [])]);
                  event.target.value = '';
                }}
              />
              {t.input.add}
            </label>
            <span className="samples">
              {t.input.samples}
              {SAMPLE_LETTERS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setDraft(s.text);
                    setSample(true);
                    setSource(null);
                    setPreviews([]);
                    setNotice(null);
                  }}
                >
                  {s.title}
                </button>
              ))}
            </span>
          </div>
          <p className="hint">{t.input.addNote}</p>
        </form>
      )}

      {phase.at === 'opening' && (
        <p className="working" role="status">
          {t.progress.opening}
        </p>
      )}

      {phase.at === 'transcribing' && <Transcribing previews={previews} page={phase.page} pages={phase.pages} text={phase.text} t={t} />}

      {(phase.at === 'classifying' || phase.at === 'extracting') && (
        <div className="reading">
          <LetterView letter={phase.letter} label={t.input.label} highlights={[]} />
          <div className="facts">
            <p className="working" role="status">
              {phase.at === 'classifying' ? t.progress.classifying : t.progress.extracting}
            </p>
          </div>
        </div>
      )}

      {phase.at === 'choosing' && (
        <div className="reading">
          <LetterView letter={phase.letter} label={t.input.label} highlights={[]} />
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
        <>
          <ReadingView letter={phase.letter} classification={phase.classification} reading={phase.reading} chosenByReader={phase.chosen} terms={{ language: prefs.language, source: liveTerms }} t={t} />
          <GuidancePanel reading={phase.reading} prefs={prefs} onPrefs={choosePrefs} source={liveGuidance} t={t} />
          <ReplyPanel reading={phase.reading} prefs={prefs} source={liveReply} t={t} />
        </>
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
            {phase.at === 'error' ? t.error.retry : phase.at === 'opening' || phase.at === 'transcribing' ? t.progress.stop : t.input.again}
          </button>
        </p>
      )}

      <LedgerView ledger={ledger} t={t} />

      <footer>{t.notAdvice}</footer>
    </main>
  );
}

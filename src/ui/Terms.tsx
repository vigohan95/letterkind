import { useMemo, useRef, useState } from 'react';
import { findTerms } from '../domain/glossary';
import { type LanguageId, languageName, writableOnDevice } from '../domain/languages';
import { term as entryOf, type TermId } from '../domain/terms';
import type { TermSource } from '../guidance/live';
import { type MeaningOutcome, ownMeaning, type TermRequest } from '../guidance/term';
import type { Strings } from '../i18n/en';
import { CLOUD_MODEL } from '../outbound/channel';
import { serialize } from '../outbound/requests';
import type { Highlight } from './highlights';
import { LetterView } from './LetterView';

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

export type TermStatus = { at: 'ask' } | { at: 'asking' } | { at: 'answered'; meaning: MeaningOutcome };

export interface TermPanelProps {
  term: TermId;
  status: TermStatus;
  language: LanguageId;
  onAsk: () => void;
  onClose: () => void;
  t: Strings;
}

function TermBody({ term, status, language, onAsk, t }: Omit<TermPanelProps, 'onClose'>) {
  // Whatever happens to a translation, the glossary's own wording is on the device and is shown.
  const english = (
    <div className="term-english">
      <h4>{t.terms.english}</h4>
      <p lang="en">{entryOf(term).meaning}</p>
    </div>
  );
  if (status.at === 'asking') {
    return (
      <>
        <p className="working" role="status">
          {t.terms.asking(writableOnDevice(language))}
        </p>
        {english}
      </>
    );
  }
  if (status.at === 'ask') {
    return (
      <>
        <p className="guidance-actions">
          <button type="button" className="primary" onClick={onAsk}>
            {t.terms.ask(languageName(language))}
          </button>
        </p>
        {english}
      </>
    );
  }
  const { meaning } = status;
  if (meaning.status === 'ready' && meaning.from === 'glossary') {
    return (
      <>
        <p className="term-meaning" lang="en">
          {meaning.template.explanation}
        </p>
        <p className="hint">{t.terms.general}</p>
        <p className="fact-source" data-from="glossary">
          {t.terms.fromGlossary}
        </p>
      </>
    );
  }
  if (meaning.status === 'ready') {
    const { from, entry } = meaning;
    return (
      <>
        <p className="term-meaning" lang={language} dir="auto">
          {meaning.template.explanation}
        </p>
        {english}
        <p className="hint">
          {t.terms.general} {t.terms.translated}
        </p>
        <p className="fact-source" data-from={from}>
          {entry && from === 'device'
            ? t.terms.fromDevice(entry.ms)
            : entry && from === 'cloud'
              ? t.terms.fromCloud(CLOUD_MODEL, entry.ms, entry.bytes)
              : t.guidance.fromSaved(day.format(new Date(meaning.at)))}
        </p>
      </>
    );
  }
  return (
    <>
      <div className="error" role="alert">
        {meaning.status === 'rejected' ? (
          <>
            <h4>{t.terms.rejectedHeading}</h4>
            <p>{t.terms.rejectedBody}</p>
            <p data-field={meaning.field}>{t.guidance.rejected[meaning.reason](meaning.found)}</p>
          </>
        ) : (
          <>
            <h4>{t.terms.unavailableHeading}</h4>
            <p data-why={meaning.why}>{meaning.why === 'busy' ? t.guidance.busyBody : meaning.why === 'limit' ? t.guidance.limitBody : t.terms.unavailableBody}</p>
            {/* What the server said is shown only where it explains something the words above do not. */}
            {meaning.why === 'no_answer' && <p className="fact-source">{meaning.error}</p>}
          </>
        )}
        <p className="guidance-actions">
          <button type="button" onClick={onAsk}>
            {t.guidance.askAgain}
          </button>
        </p>
      </div>
      {english}
    </>
  );
}

/** What one glossary term means, or what happened when a translation of that was asked for. */
export function TermPanel({ term, status, language, onAsk, onClose, t }: TermPanelProps) {
  return (
    <section className="term-panel" aria-labelledby="term-heading">
      <header>
        <h3 id="term-heading">{t.terms.heading(entryOf(term).words)}</h3>
        <button type="button" onClick={onClose}>
          {t.terms.close}
        </button>
      </header>
      <TermBody term={term} status={status} language={language} onAsk={onAsk} t={t} />
    </section>
  );
}

export interface GlossedLetterProps {
  letter: string;
  highlights: readonly Highlight[];
  /** The language a meaning is shown in. */
  language: LanguageId;
  source: TermSource;
  t: Strings;
}

/**
 * The letter with the glossary's terms in it made tappable.
 *
 * A tap is matched to an entry of the glossary before anything else happens.
 * In English the entry itself is shown and nothing is asked of anyone. In
 * another language a translation of the entry is asked for, and the request
 * can name only the entry and the language. What the reader's letter says
 * around the word is never part of it.
 */
export function GlossedLetter({ letter, highlights, language, source, t }: GlossedLetterProps) {
  // A word that is part of a highlighted fact stays a fact; it is not offered as a term.
  const terms = useMemo(
    () => findTerms(letter).filter((term) => !highlights.some((h) => h.start < term.end && term.start < h.end)),
    [letter, highlights],
  );
  const [picked, setPicked] = useState<TermId | null>(null);
  // What happened is remembered together with the request it happened for; after a change of
  // term or language the old answer simply no longer applies.
  const [known, setKnown] = useState<{ key: string; status: TermStatus } | null>(null);
  // One request per term and language at a time, however often the word is tapped.
  const flights = useRef(new Map<string, Promise<MeaningOutcome>>());

  if (terms.length === 0) return <LetterView letter={letter} highlights={highlights} />;

  const chosen = picked !== null && terms.some((term) => term.id === picked) ? picked : null;
  /** The request a tap on this term makes, or none: the glossary is in English already. */
  const requestFor = (id: TermId): TermRequest | null => (language === 'en' ? null : { purpose: 'term', term: id, language });

  function statusOf(id: TermId): TermStatus {
    const request = requestFor(id);
    if (request === null) return { at: 'answered', meaning: ownMeaning(id) };
    return known?.key === serialize(request) ? known.status : { at: 'ask' };
  }

  function ask(id: TermId): void {
    const request = requestFor(id);
    if (request === null) return;
    const key = serialize(request);
    setKnown({ key, status: { at: 'asking' } });
    let flight = flights.current.get(key);
    if (!flight) {
      flight = source
        .ask(request)
        .catch((error: unknown): MeaningOutcome => ({ status: 'unavailable', why: 'no_answer', error: error instanceof Error ? error.message : String(error) }))
        .finally(() => flights.current.delete(key));
      flights.current.set(key, flight);
    }
    void flight.then((meaning) => {
      setKnown((now) => (now?.key === key && now.status.at === 'asking' ? { key, status: { at: 'answered', meaning } } : now));
    });
  }

  function pick(id: TermId): void {
    if (id === chosen) {
      setPicked(null);
      return;
    }
    setPicked(id);
    // A translation already on screen for this word and language is shown again without asking.
    const request = requestFor(id);
    if (request !== null && known?.key !== serialize(request)) ask(id);
  }

  const name = languageName(language);
  const hint =
    language === 'en'
      ? t.terms.inEnglish(t.guidance.heading)
      : writableOnDevice(language)
        ? t.terms.onDevice(name, t.guidance.heading)
        : t.terms.inCloud(name, t.guidance.heading);
  return (
    <div className="letter-side">
      <p className="hint">{hint}</p>
      <LetterView letter={letter} highlights={highlights} terms={terms} chosen={chosen} onTerm={pick} />
      <div aria-live="polite">
        {chosen !== null && (
          <TermPanel term={chosen} status={statusOf(chosen)} language={language} onAsk={() => ask(chosen)} onClose={() => setPicked(null)} t={t} />
        )}
      </div>
    </div>
  );
}

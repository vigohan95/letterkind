import { useMemo, useRef, useState } from 'react';
import { findTerms } from '../domain/glossary';
import { type LanguageId, languageName, writableOnDevice } from '../domain/languages';
import { term as entryOf, type TermId } from '../domain/terms';
import type { TermSource } from '../guidance/live';
import type { MeaningOutcome, TermRequest } from '../guidance/term';
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

function TermBody({ status, language, onAsk, t }: Omit<TermPanelProps, 'term' | 'onClose'>) {
  if (status.at === 'asking') {
    return (
      <p className="working" role="status">
        {t.terms.asking(writableOnDevice(language))}
      </p>
    );
  }
  if (status.at === 'ask') {
    return (
      <p className="guidance-actions">
        <button type="button" className="primary" onClick={onAsk}>
          {t.terms.ask(languageName(language))}
        </button>
      </p>
    );
  }
  const { meaning } = status;
  if (meaning.status === 'ready') {
    const { from, entry } = meaning;
    return (
      <>
        <p className="term-meaning" lang={language} dir="auto">
          {meaning.template.explanation}
        </p>
        <p className="hint">{t.terms.general}</p>
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
  );
}

/** What one glossary term means, or what happened when that was asked. */
export function TermPanel({ term, status, language, onAsk, onClose, t }: TermPanelProps) {
  return (
    <section className="term-panel" aria-labelledby="term-heading">
      <header>
        <h3 id="term-heading">{t.terms.heading(entryOf(term).words)}</h3>
        <button type="button" onClick={onClose}>
          {t.terms.close}
        </button>
      </header>
      <TermBody status={status} language={language} onAsk={onAsk} t={t} />
    </section>
  );
}

export interface GlossedLetterProps {
  letter: string;
  highlights: readonly Highlight[];
  /** The language a meaning is written in. */
  language: LanguageId;
  source: TermSource;
  t: Strings;
}

/**
 * The letter with the glossary's terms in it made tappable.
 *
 * A tap is matched to an entry of the glossary before anything is asked, so
 * a request can name only that entry and the language. What the reader's
 * letter says around the word is never part of it.
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
  const requestFor = (id: TermId): TermRequest => ({ purpose: 'term', term: id, language });
  const status: TermStatus = chosen !== null && known?.key === serialize(requestFor(chosen)) ? known.status : { at: 'ask' };

  function ask(id: TermId): void {
    const request = requestFor(id);
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
    // An answer already on screen for this word and language is shown again without asking.
    if (known?.key !== serialize(requestFor(id))) ask(id);
  }

  const name = languageName(language);
  return (
    <div className="letter-side">
      <p className="hint">{writableOnDevice(language) ? t.terms.onDevice(name, t.guidance.heading) : t.terms.inCloud(name, t.guidance.heading)}</p>
      <LetterView letter={letter} highlights={highlights} terms={terms} chosen={chosen} onTerm={pick} />
      <div aria-live="polite">
        {chosen !== null && (
          <TermPanel term={chosen} status={status} language={language} onAsk={() => ask(chosen)} onClose={() => setPicked(null)} t={t} />
        )}
      </div>
    </div>
  );
}

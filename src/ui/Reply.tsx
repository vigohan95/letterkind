import { Fragment, useEffect, useState } from 'react';
import type { Reading } from '../ai/read';
import { type LanguageId, languageName } from '../domain/languages';
import { fillLetter, type LetterPiece } from '../domain/reply';
import { blanksFor, standInsFor } from '../domain/standIns';
import { stateName } from '../domain/states';
import { fill, filledText } from '../domain/template';
import type { ReplySource } from '../guidance/live';
import type { Draft, ReadyDraft, ReplyRequest } from '../guidance/reply';
import { valuesOf } from '../guidance/values';
import type { Strings } from '../i18n/en';
import { CLOUD_MODEL } from '../outbound/channel';
import { serialize } from '../outbound/requests';
import { Detail, Filled, type Filling } from './Filled';
import type { Prefs } from './prefs';

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

/** A draft with its gaps filled: plain characters, the letter's details marked, every blank left visible. */
function Letter({ pieces }: { pieces: readonly LetterPiece[] }) {
  return (
    <>
      {pieces.map((piece, i) =>
        piece.kind === 'text' ? (
          <Fragment key={i}>{piece.text}</Fragment>
        ) : piece.kind === 'value' ? (
          <Detail key={i} placeholder={piece.placeholder} text={piece.text} />
        ) : (
          <span key={i} className="blank">
            {piece.text}
          </span>
        ),
      )}
    </>
  );
}

export interface ReplyReadyProps {
  draft: ReadyDraft;
  reading: Reading;
  language: LanguageId;
  t: Strings;
}

/**
 * A checked draft, finished on this device.
 *
 * The reply to send is in English and takes its details as the letter prints
 * them. The copy for reading is in the reader's language. Neither is given a
 * count of days, and whatever the letter did not yield stays a blank.
 */
export function ReplyReady({ draft, reading, language, t }: ReplyReadyProps) {
  const { template, from, entry } = draft;
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');

  const asPrinted = valuesOf(reading, 'en');
  const subject = fillLetter(template.subject, asPrinted, blanksFor('en'));
  const body = fillLetter(template.bodyEn, asPrinted, blanksFor('en'));
  const blanks = [...subject, ...body].filter((piece) => piece.kind === 'blank').length;

  const filling: Filling = { values: valuesOf(reading, language), standIns: standInsFor(language) };
  const toRead = template.bodyTranslated === null ? null : fillLetter(template.bodyTranslated, filling.values, blanksFor(language));
  const usesStandIn = template.beforeSending.some((text) => fill(text, filling.values, filling.standIns).some((piece) => piece.kind === 'stand_in'));

  function copy(): void {
    const text = `${t.reply.subject} ${filledText(subject)}\n\n${filledText(body)}`;
    // The clipboard is this device's own; nothing is sent anywhere.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .then(
        () => setCopied('yes'),
        () => setCopied('failed'),
      );
  }

  return (
    <div className="reply-draft">
      <h3>{t.reply.toSend}</h3>
      <div className="reply-letter" lang="en" dir="ltr">
        <p className="reply-subject">
          <span>{t.reply.subject}</span> <Letter pieces={subject} />
        </p>
        <div className="reply-body">
          <Letter pieces={body} />
        </div>
      </div>
      <p className="hint">
        {t.reply.legend}
        {blanks > 0 && ` ${t.reply.blanks(blanks)}`}
      </p>
      <p className="guidance-actions">
        <button type="button" className="primary" onClick={copy}>
          {copied === 'yes' ? t.reply.copied : t.reply.copy}
        </button>
      </p>
      {copied === 'failed' && (
        <p className="hint" role="status">
          {t.reply.copyFailed}
        </p>
      )}

      {toRead && (
        <>
          <h3>{t.reply.translatedHeading(languageName(language))}</h3>
          <p className="hint">{t.reply.translatedNote}</p>
          <div className="reply-letter reply-reading" lang={language} dir="auto">
            <div className="reply-body">
              <Letter pieces={toRead} />
            </div>
          </div>
        </>
      )}

      <div className="guidance-text" lang={language}>
        <h3 lang="en">{t.reply.beforeSending}</h3>
        <ul>
          {template.beforeSending.map((item, i) => (
            <li key={i} dir="auto">
              <Filled text={item} {...filling} />
            </li>
          ))}
        </ul>
      </div>
      {usesStandIn && <p className="hint">{t.guidance.standInLegend}</p>}
      <p className="hint">{t.reply.draftNote}</p>
      <p className="fact-source" data-from={from}>
        {from === 'cloud' && entry ? t.reply.fromCloud(CLOUD_MODEL, entry.ms, entry.bytes) : t.guidance.fromSaved(day.format(new Date(draft.at)))}
      </p>
    </div>
  );
}

export type ReplyStatus = { at: 'checking' } | { at: 'ask' } | { at: 'asking' } | { at: 'answered'; outcome: Draft };

export interface ReplyBodyProps {
  status: ReplyStatus;
  reading: Reading;
  language: LanguageId;
  onAsk: () => void;
  t: Strings;
}

/** What the panel shows under the three things a request carries, for each thing that can have happened. */
export function ReplyBody({ status, reading, language, onAsk, t }: ReplyBodyProps) {
  if (status.at === 'checking' || status.at === 'asking') {
    return (
      <p className="working" role="status">
        {status.at === 'checking' ? t.reply.checking : t.reply.asking}
      </p>
    );
  }
  if (status.at === 'ask') {
    return (
      <>
        <p className="hint">{t.reply.nothingElse}</p>
        <p className="guidance-actions">
          <button type="button" className="primary" onClick={onAsk}>
            {t.reply.ask}
          </button>
        </p>
      </>
    );
  }
  const { outcome } = status;
  if (outcome.status === 'ready') return <ReplyReady draft={outcome} reading={reading} language={language} t={t} />;
  return (
    <div className="error" role="alert">
      {outcome.status === 'rejected' ? (
        <>
          <h3>{t.reply.rejectedHeading}</h3>
          <p>{t.guidance.rejectedBody}</p>
          <p>{t.guidance.rejected[outcome.reason](outcome.found)}</p>
        </>
      ) : (
        <>
          <h3>{t.reply.unavailableHeading}</h3>
          <p>{t.reply.unavailableBody}</p>
          <p className="fact-source">{outcome.error}</p>
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

export interface ReplyPanelProps {
  reading: Reading;
  prefs: Prefs;
  source: ReplySource;
  t: Strings;
}

/**
 * A draft of a reply to the kind of letter that was read.
 *
 * Like the explanation above it, the panel names the three things a request
 * carries before anything is sent, and sends only when asked. A checked
 * draft already on this device is shown at once and nothing is sent.
 */
export function ReplyPanel({ reading, prefs, source, t }: ReplyPanelProps) {
  const { type } = reading;
  const { state, language } = prefs;
  const key = serialize({ purpose: 'reply', type, state, language });
  // Remembered together with the request it is the answer to; see `GuidancePanel`.
  const [known, setKnown] = useState<{ key: string; status: ReplyStatus } | null>(null);
  const status: ReplyStatus = known?.key === key ? known.status : { at: 'checking' };

  useEffect(() => {
    let live = true;
    const settle = (found: ReadyDraft | null): void => {
      if (live) setKnown({ key, status: found ? { at: 'answered', outcome: found } : { at: 'ask' } });
    };
    source.saved({ purpose: 'reply', type, state, language }).then(settle, () => settle(null));
    return () => {
      live = false;
    };
  }, [key, type, state, language, source]);

  async function ask(): Promise<void> {
    const request: ReplyRequest = { purpose: 'reply', type, state, language };
    setKnown({ key, status: { at: 'asking' } });
    let outcome: Draft;
    try {
      outcome = await source.ask(request);
    } catch (error) {
      outcome = { status: 'unavailable', error: error instanceof Error ? error.message : String(error) };
    }
    setKnown((now) => (now?.key === key && now.status.at === 'asking' ? { key, status: { at: 'answered', outcome } } : now));
  }

  return (
    <section className="guidance reply" aria-labelledby="reply-heading">
      <h2 id="reply-heading">{t.reply.heading}</h2>
      <p>{t.reply.intro}</p>
      <dl className="guidance-sent">
        <div>
          <dt>{t.guidance.kind}</dt>
          <dd>{t.kinds[type]}</dd>
        </div>
        <div>
          <dt>{t.guidance.state}</dt>
          <dd>{state === 'US' ? t.guidance.stateNotGiven : stateName(state)}</dd>
        </div>
        <div>
          <dt>{t.guidance.language}</dt>
          <dd>{languageName(language)}</dd>
        </div>
      </dl>
      <p className="hint">{t.reply.change}</p>
      <ReplyBody status={status} reading={reading} language={language} onAsk={() => void ask()} t={t} />
    </section>
  );
}

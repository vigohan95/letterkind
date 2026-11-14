import { useEffect, useState } from 'react';
import type { Reading } from '../ai/read';
import { LANGUAGES, type LanguageId } from '../domain/languages';
import { standInsFor } from '../domain/standIns';
import { STATES, type StateId } from '../domain/states';
import { fill } from '../domain/template';
import type { ExplainRequest, Guidance, Ready } from '../guidance/explain';
import type { GuidanceSource } from '../guidance/live';
import { valuesOf } from '../guidance/values';
import type { Strings } from '../i18n/en';
import { CLOUD_MODEL } from '../outbound/channel';
import { serialize } from '../outbound/requests';
import { Filled, type Filling } from './Filled';
import type { Prefs } from './prefs';


export interface GuidanceReadyProps {
  guidance: Ready;
  reading: Reading;
  language: LanguageId;
  onForget?: () => void;
  t: Strings;
}

/** A checked template, filled in on this device with what was verified in the letter. */
export function GuidanceReady({ guidance, reading, language, onForget, t }: GuidanceReadyProps) {
  const { template, from, entry } = guidance;
  const filling: Filling = { values: valuesOf(reading, language), standIns: standInsFor(language) };
  const usesStandIn = [template.what, ...template.steps, template.ifIgnored, ...template.whoCanHelp].some((text) =>
    fill(text, filling.values, filling.standIns).some((piece) => piece.kind === 'stand_in'),
  );

  return (
    <>
      <div className="guidance-text" lang={language}>
        <h3 lang="en">{t.guidance.what}</h3>
        <p dir="auto">
          <Filled text={template.what} {...filling} />
        </p>
        <h3 lang="en">{t.guidance.steps}</h3>
        <ol>
          {template.steps.map((step, i) => (
            <li key={i} dir="auto">
              <Filled text={step} {...filling} />
            </li>
          ))}
        </ol>
        <h3 lang="en">{t.guidance.ifIgnored}</h3>
        <p dir="auto">
          <Filled text={template.ifIgnored} {...filling} />
        </p>
        <h3 lang="en">{t.guidance.whoCanHelp}</h3>
        <ul>
          {template.whoCanHelp.map((who, i) => (
            <li key={i} dir="auto">
              <Filled text={who} {...filling} />
            </li>
          ))}
        </ul>
      </div>
      <p className="hint">
        {t.guidance.legend}
        {usesStandIn && ` ${t.guidance.standInLegend}`}
      </p>
      <p className="fact-source" data-from={from}>
        {from === 'cloud' && entry
          ? t.guidance.fromCloud(CLOUD_MODEL, entry.ms, entry.bytes)
          : t.guidance.fromSaved(t.format.day(guidance.at))}
      </p>
      {from === 'saved' && onForget && (
        <p className="guidance-actions">
          <button type="button" onClick={onForget}>
            {t.guidance.forget}
          </button>
        </p>
      )}
    </>
  );
}

type Status = { at: 'checking' } | { at: 'ask' } | { at: 'asking' } | { at: 'answered'; guidance: Guidance };

export interface GuidanceBodyProps {
  status: Status;
  reading: Reading;
  prefs: Prefs;
  onAsk: () => void;
  onForget: () => void;
  t: Strings;
}

/** What the panel shows under the three choices, for each thing that can have happened. */
export function GuidanceBody({ status, reading, prefs, onAsk, onForget, t }: GuidanceBodyProps) {
  if (status.at === 'checking' || status.at === 'asking') {
    return (
      <p className="working" role="status">
        {status.at === 'checking' ? t.guidance.checking : t.guidance.asking}
      </p>
    );
  }
  if (status.at === 'ask') {
    return (
      <>
        <p className="hint">{t.guidance.nothingElse}</p>
        <p className="guidance-actions">
          <button type="button" className="primary" onClick={onAsk}>
            {t.guidance.ask}
          </button>
        </p>
      </>
    );
  }
  const { guidance } = status;
  if (guidance.status === 'ready') {
    return <GuidanceReady guidance={guidance} reading={reading} language={prefs.language} onForget={onForget} t={t} />;
  }
  return (
    <div className="error" role="alert">
      {guidance.status === 'rejected' ? (
        <>
          <h3>{t.guidance.rejectedHeading}</h3>
          <p>{t.guidance.rejectedBody}</p>
          <p data-field={guidance.field}>{t.guidance.rejected[guidance.reason](guidance.found)}</p>
        </>
      ) : (
        <>
          <h3>{t.guidance.unavailableHeading}</h3>
          <p data-why={guidance.why}>{guidance.why === 'busy' ? t.guidance.busyBody : guidance.why === 'limit' ? t.guidance.limitBody : t.guidance.unavailableBody}</p>
          {/* What the server said is shown only where it explains something the words above do not. */}
          {guidance.why === 'no_answer' && <p className="fact-source">{guidance.error}</p>}
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

export interface GuidancePanelProps {
  reading: Reading;
  prefs: Prefs;
  onPrefs: (prefs: Prefs) => void;
  source: GuidanceSource;
  /** The state the letter's own addresses are in, read on this device; offered, never chosen for the reader. */
  suggested?: StateId | null;
  t: Strings;
}

/**
 * Plain-language guidance for the kind of letter that was read.
 *
 * The panel names the three things a request carries before anything is
 * sent, and sends only when asked. If a checked template for the same three
 * things is already on this device, it is shown at once and nothing is sent.
 */
export function GuidancePanel({ reading, prefs, onPrefs, source, suggested = null, t }: GuidancePanelProps) {
  const { type } = reading;
  const { state, language } = prefs;
  const key = serialize({ purpose: 'explain', type, state, language });
  // What happened is remembered together with the request it happened for; after a change of
  // state or language the old answer simply no longer applies.
  const [known, setKnown] = useState<{ key: string; status: Status } | null>(null);
  const status: Status = known?.key === key ? known.status : { at: 'checking' };

  useEffect(() => {
    let live = true;
    const settle = (found: Ready | null): void => {
      if (live) setKnown({ key, status: found ? { at: 'answered', guidance: found } : { at: 'ask' } });
    };
    source.saved({ purpose: 'explain', type, state, language }).then(settle, () => settle(null));
    return () => {
      live = false;
    };
  }, [key, type, state, language, source]);

  async function ask(): Promise<void> {
    const request: ExplainRequest = { purpose: 'explain', type, state, language };
    setKnown({ key, status: { at: 'asking' } });
    let guidance: Guidance;
    try {
      guidance = await source.ask(request);
    } catch (error) {
      guidance = { status: 'unavailable', why: 'no_answer', error: error instanceof Error ? error.message : String(error) };
    }
    setKnown((now) => (now?.key === key && now.status.at === 'asking' ? { key, status: { at: 'answered', guidance } } : now));
  }

  async function forget(): Promise<void> {
    await source.forget();
    setKnown({ key, status: { at: 'ask' } });
  }

  return (
    <section className="guidance" aria-labelledby="guidance-heading">
      <h2 id="guidance-heading">{t.guidance.heading}</h2>
      <p>{t.guidance.intro}</p>
      <dl className="guidance-sent">
        <div>
          <dt>{t.guidance.kind}</dt>
          <dd>{t.kinds[type]}</dd>
        </div>
        <div>
          <dt>
            <label htmlFor="guidance-state">{t.guidance.state}</label>
          </dt>
          <dd>
            <select id="guidance-state" value={state} onChange={(event) => onPrefs({ ...prefs, state: event.target.value as StateId })}>
              {STATES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id === 'US' ? t.guidance.stateNotGiven : s.name}
                </option>
              ))}
            </select>
            {suggested && suggested !== state && (
              <button type="button" className="suggest-state" onClick={() => onPrefs({ ...prefs, state: suggested })}>
                {t.guidance.stateFromLetter(STATES.find((s) => s.id === suggested)!.name)}
              </button>
            )}
          </dd>
        </div>
        <div>
          <dt>
            <label htmlFor="guidance-language">{t.guidance.language}</label>
          </dt>
          <dd>
            <select id="guidance-language" value={language} onChange={(event) => onPrefs({ ...prefs, language: event.target.value as LanguageId })}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.own.toLowerCase() === t.languages[l.id].toLowerCase() ? l.own : `${l.own} — ${t.languages[l.id]}`}
                </option>
              ))}
            </select>
          </dd>
        </div>
      </dl>
      <GuidanceBody status={status} reading={reading} prefs={prefs} onAsk={() => void ask()} onForget={() => void forget()} t={t} />
    </section>
  );
}

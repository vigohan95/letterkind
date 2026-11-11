import { useSyncExternalStore } from 'react';
import { languageName } from '../domain/languages';
import { stateName } from '../domain/states';
import type { Strings } from '../i18n/en';
import type { Ledger, LedgerEntry } from '../outbound/ledger';

const clock = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' });

/** The few things a request carried, each with its name. */
function carried(entry: LedgerEntry, t: Strings): [string, string][] {
  const { request } = entry;
  if (request.purpose === 'term') {
    return [
      [t.ledger.term, request.term],
      [t.guidance.language, languageName(request.language)],
    ];
  }
  return [
    [t.guidance.kind, t.kinds[request.type]],
    [t.guidance.state, request.state === 'US' ? t.guidance.stateNotGiven : stateName(request.state)],
    [t.guidance.language, languageName(request.language)],
  ];
}

/**
 * Every request the app made to a model outside the reading path, in full.
 * It is on the page from the start and says so when it is empty.
 */
export function LedgerView({ ledger, t }: { ledger: Ledger; t: Strings }) {
  const entries = useSyncExternalStore(ledger.subscribe, ledger.entries, ledger.entries);
  const totals = ledger.totals();
  const out = totals.sent + totals.attempted;

  return (
    <details className="ledger">
      <summary>
        <span className="ledger-heading">{t.ledger.heading}</span>{' '}
        <span className="ledger-total" data-out={out}>
          {totals.sent === 0 && totals.attempted === 0 ? t.ledger.nothing : totals.sent > 0 ? t.ledger.sent(totals.sent, totals.bytesOut) : null}
          {totals.attempted > 0 && ` ${t.ledger.attempted(totals.attempted)}`}
          {totals.stayed > 0 && ` ${t.ledger.stayed(totals.stayed)}`}
        </span>
      </summary>
      <p className="hint">{t.ledger.note}</p>
      <p className="hint">{t.ledger.appCheck}</p>
      <ol className="ledger-entries">
        {entries.map((entry) => (
          <li key={entry.id} data-left={entry.left}>
            <p className="ledger-what">
              <strong>{t.ledger.left[entry.left]}</strong> — {t.ledger.purpose[entry.request.purpose]}
            </p>
            <dl className="guidance-sent">
              {carried(entry, t).map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="fact-source">
              {clock.format(new Date(entry.at))} · {t.ledger.ran[entry.ran]} · {t.where.seconds(entry.ms)} · {t.ledger.bytes(entry.bytes)}
              {entry.error && ` · ${entry.error}`}
            </p>
            <details>
              <summary>{t.ledger.words}</summary>
              <p className="hint">{t.ledger.wordsNote}</p>
              <pre className="ledger-words">{entry.prompt}</pre>
            </details>
          </li>
        ))}
      </ol>
    </details>
  );
}

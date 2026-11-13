import type { ReactNode } from 'react';
import type { Classification } from '../ai/classify';
import type { FieldName } from '../ai/extract';
import type { Reading } from '../ai/read';
import type { LanguageId } from '../domain/languages';
import { letterType } from '../domain/letterTypes';
import type { Found } from '../domain/parse/span';
import { formatPhone, type PhoneMatch } from '../domain/parse/phone';
import type { NotApplicable } from '../domain/rules';
import type { Verdict } from '../domain/verify';
import type { TermSource } from '../guidance/live';
import type { Strings } from '../i18n/en';
import { highlightsOf } from './highlights';
import { LetterView } from './LetterView';
import { GlossedLetter } from './Terms';


/** Every line a set of matches touches; a match that runs over a line break counts on each line. */
const uniqueLines = (matches: readonly { line: number; raw: string }[]): number[] => [
  ...new Set(matches.flatMap((m) => m.raw.split('\n').map((_, i) => m.line + i))),
];

/** Values found in the letter, one entry per distinct value, with every line it is on. */
function distinct<T, M extends Found<T>>(found: readonly M[]): { first: M; lines: number[] }[] {
  const byValue = new Map<T, M[]>();
  for (const m of found) byValue.set(m.value, [...(byValue.get(m.value) ?? []), m]);
  return [...byValue.values()].flatMap((group) => {
    const first = group[0];
    return first ? [{ first, lines: uniqueLines(group) }] : [];
  });
}

function Fact({ field, label, children }: { field: FieldName; label: string; children: ReactNode }) {
  return (
    <section className="fact" data-field={field}>
      <h3>{label}</h3>
      {children}
    </section>
  );
}

function VerdictBody<T, M extends Found<T>>({
  verdict,
  show,
  note,
  t,
}: {
  verdict: Verdict<T, M>;
  /** How to print a value found in the letter. */
  show: (match: M) => string;
  /** Extra line under a verified value. */
  note?: ReactNode;
  t: Strings;
}) {
  if (verdict.status === 'verified') {
    const first = verdict.matches[0];
    return (
      <>
        <p className="fact-value">{first ? show(first) : String(verdict.value)}</p>
        {note}
        <p className="fact-where">{t.where.lines(uniqueLines(verdict.matches))}</p>
      </>
    );
  }
  const candidates = distinct<T, M>(verdict.candidates);
  return (
    <>
      <p className="fact-missing">
        {verdict.status === 'unverified' ? t.field.notInLetter(verdict.claimed) : t.field.notStated}
      </p>
      {candidates.length > 0 && (
        <>
          <p className="fact-where">{t.field.inTheLetter}</p>
          <ul className="candidates">
            {candidates.map(({ first, lines }) => (
              <li key={first.start}>
                <span>{show(first)}</span> <span className="fact-where">{t.where.lines(lines)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

const isNotApplicable = (v: { status: string }): v is NotApplicable => v.status === 'not_applicable';

function kindReason(c: Classification, chosenByReader: boolean, t: Strings): string {
  if (chosenByReader) return t.kind.chosen;
  if (c.model && c.keywords) return t.kind.agreed;
  if (c.model) return t.kind.modelOnly;
  if (c.keywords) return t.kind.keywordsOnly;
  return t.kind.neither;
}

export interface ReadingViewProps {
  letter: string;
  classification: Classification;
  reading: Reading;
  /** True when the two readers disagreed and the person picked the kind. */
  chosenByReader: boolean;
  /** Given, the glossary's terms in the letter can be tapped for what they mean, in this language. */
  terms?: { language: LanguageId; source: TermSource };
  t: Strings;
}

/** The letter on one side; on the other, only what could be checked against it. */
export function ReadingView({ letter, classification, reading, chosenByReader, terms, t }: ReadingViewProps) {
  const kind = letterType(reading.type);
  const onDevice = (ms: number): string => `${t.where.onDevice} · ${t.where.seconds(ms)}`;
  const highlights = highlightsOf(reading);

  return (
    <div className="reading">
      {terms ? (
        <GlossedLetter letter={letter} highlights={highlights} language={terms.language} source={terms.source} t={t} />
      ) : (
        <LetterView letter={letter} label={t.input.label} highlights={highlights} />
      )}

      <div className="facts">
        <section className="fact fact-kind">
          <h3>{t.kind.heading}</h3>
          <p className="fact-value">{t.kinds[reading.type]}</p>
          <p>{kind.description}</p>
          <p className="fact-where">{kindReason(classification, chosenByReader, t)}</p>
          {classification.keywordEvidence.length > 0 && classification.keywords === reading.type && (
            <p className="fact-where">
              {t.kind.evidence} {classification.keywordEvidence.map((e) => `“${e}”`).join(', ')}
            </p>
          )}
          <p className="fact-source">{onDevice(classification.ms)}</p>
        </section>

        <Fact field="amount" label={t.amount[reading.amountMeaning]}>
          {isNotApplicable(reading.amount) ? (
            <p className="fact-missing">{reading.amount.withheld ? t.field.noAmountWithheld : t.field.noAmount}</p>
          ) : (
            <VerdictBody verdict={reading.amount} show={(m) => m.raw} t={t} />
          )}
        </Fact>

        <Fact field="deadline" label={t.deadline[reading.deadlineMeaning]}>
          {isNotApplicable(reading.deadline) ? (
            <p className="fact-missing">{reading.deadline.withheld ? t.field.noDeadlineWithheld : t.field.noDeadline}</p>
          ) : (
            <VerdictBody
              verdict={reading.deadline}
              show={(m) => t.format.letterDate(m.value)}
              note={reading.daysLeft === null ? null : <p className="fact-days">{t.days(reading.daysLeft)}</p>}
              t={t}
            />
          )}
        </Fact>

        <Fact field="phone" label={t.field.phone}>
          <VerdictBody verdict={reading.phone} show={(m: PhoneMatch) => formatPhone(m.value, m.extension)} t={t} />
        </Fact>

        <Fact field="sender" label={t.field.sender}>
          <VerdictBody verdict={reading.sender} show={(m) => m.raw} t={t} />
        </Fact>

        <Fact field="reference" label={t.field.reference}>
          <VerdictBody verdict={reading.reference} show={(m) => m.raw} t={t} />
        </Fact>

        <p className="fact-source">{onDevice(reading.ms)}</p>
      </div>
    </div>
  );
}

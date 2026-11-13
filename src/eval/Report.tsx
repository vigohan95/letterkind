import { EXTRACT_FIELDS, type FieldName } from '../ai/extract';
import { type LetterResult, type Variant, VARIANTS } from './run';
import type { Outcome } from './score';
import { FIRST_HELD_OUT, isHeldOut } from '../../eval/labels';
import { type FieldSummary, fieldsRead, type Summary, summarise } from './summary';

/**
 * The tables of an evaluation run. Presentation only: everything shown here
 * is computed in `score.ts` and `summary.ts`.
 */

const FIELD_NAME: Record<FieldName, string> = {
  sender: 'Sender',
  reference: 'Reference',
  amount: 'Amount',
  deadline: 'Deadline',
  phone: 'Phone',
};

const VARIANT_NAME: Record<Variant, string> = {
  full: 'As the app reads it',
  no_hint: 'Without the reading hint',
  untyped: 'As a generic letter',
};

const VARIANT_NOTE: Record<Variant, string> = {
  full: 'questions, hint and rules chosen by the kind of letter',
  no_hint: 'questions and rules by kind, no hint',
  untyped: 'the same questions for every letter, no rules by kind',
};

const MARK: Record<Outcome, string> = { right: '✓', blank: '–', wrong: '✗', missed: '○' };
const OUTCOME_NAME: Record<Outcome, string> = {
  right: 'right',
  blank: 'correctly blank',
  wrong: 'wrong value',
  missed: 'missed',
};

const ms = (value: number): string => `${(value / 1000).toFixed(1)} s`;

function Tile({ value, of, label }: { value: number; of?: number; label: string }) {
  return (
    <div className="tile">
      <div className="tile-value">
        {value}
        {of !== undefined && <span className="tile-of"> of {of}</span>}
      </div>
      <div className="tile-label">{label}</div>
    </div>
  );
}

function FieldRow({ name, s, total = false }: { name: string; s: FieldSummary; total?: boolean }) {
  return (
    <tr className={total ? 'total' : undefined}>
      <th scope="row">{name}</th>
      <td>{s.alone.right}</td>
      <td>{s.alone.blank}</td>
      <td className={s.alone.wrong > 0 ? 'bad' : undefined}>{s.alone.wrong}</td>
      <td>{s.alone.missed}</td>
      <td className="group">{s.final.right}</td>
      <td>{s.final.blank}</td>
      <td className={s.final.wrong > 0 ? 'bad' : undefined}>{s.final.wrong}</td>
      <td>{s.final.missed}</td>
      <td className="group">{s.caughtByVerify}</td>
      <td>{s.caughtByRules}</td>
      <td>{s.lost}</td>
    </tr>
  );
}

function Cell({ result, field }: { result: LetterResult; field: FieldName }) {
  const reading = result.variants.full;
  const score = reading.scores[field];
  const said = reading.raw?.[field] ?? '';
  const shown = reading.shown[field];
  const title = `Model said: ${said === '' ? '(nothing)' : `"${said}"`}\nShown: ${shown === null ? '(nothing)' : `"${shown}"`}`;
  return (
    <td title={title} className={score.final === 'wrong' ? 'bad' : undefined}>
      <span className="pair" aria-label={`model alone: ${OUTCOME_NAME[score.alone]}; shown: ${OUTCOME_NAME[score.final]}`}>
        <span className={score.alone === 'wrong' ? 'bad' : undefined}>{MARK[score.alone]}</span>
        <span className="arrow">→</span>
        <span>{MARK[score.final]}</span>
      </span>
    </td>
  );
}

function kindCell(result: LetterResult) {
  const { classificationScore: score, classification, typeUsed } = result;
  if (score.combined === 'right') return <td>✓</td>;
  if (score.combined === 'asked') {
    return (
      <td title={`Offered: ${classification.candidates.join(' or ')}\nWent on as: ${typeUsed}`}>
        asked{score.askedWithAnswer ? '' : ' ✗'}
      </td>
    );
  }
  return (
    <td className="bad" title={`Read as: ${classification.type ?? ''}`}>
      ✗
    </td>
  );
}

/**
 * The same headline counts for the letters the prompts were shaped on and for
 * the held-out letters, so a reader can see whether the numbers carry over.
 * Shown only when the run includes both.
 */
function SplitSection({ letters }: { letters: readonly LetterResult[] }) {
  const held = letters.filter((l) => isHeldOut(l.file));
  const dev = letters.filter((l) => !isHeldOut(l.file));
  if (held.length === 0 || dev.length === 0) return null;
  const rows: [string, readonly LetterResult[]][] = [
    [`Development (01–${String(FIRST_HELD_OUT - 1).padStart(2, '0')})`, dev],
    [`Held out (${FIRST_HELD_OUT} on)`, held],
  ];
  return (
    <section aria-labelledby="by-set">
      <h2 id="by-set">Development and held-out letters</h2>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <td />
              <th scope="col">Letters</th>
              <th scope="col">Fields</th>
              <th scope="col">Wrong, model alone</th>
              <th scope="col">Wrong, shown by the app</th>
              <th scope="col">Right or correctly blank, shown</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, subset]) => {
              const total = summarise(subset).variants.full.total;
              return (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>{subset.length}</td>
                  <td>{fieldsRead(total)}</td>
                  <td>{total.alone.wrong}</td>
                  <td className={total.final.wrong > 0 ? 'bad' : undefined}>{total.final.wrong}</td>
                  <td>{total.final.right + total.final.blank}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">The prompts and rules were shaped while reading the development letters. The held-out letters were written afterwards and not used to change them.</p>
    </section>
  );
}

export function Report({ letters, summary, setSize }: { letters: readonly LetterResult[]; summary: Summary; setSize: number }) {
  const full = summary.variants.full;
  const fields = fieldsRead(full.total);
  const c = summary.classification;
  return (
    <div className="report">
      {letters.length < setSize && (
        <p className="partial">
          Partial run: {letters.length} of {setSize} letters.
        </p>
      )}

      <section aria-labelledby="headline">
        <h2 id="headline">What ends up on the screen</h2>
        <div className="tiles">
          <Tile value={full.total.alone.wrong} of={fields} label="wrong values the model gave on its own" />
          <Tile value={full.total.final.wrong} of={fields} label="wrong values the app shows" />
          <Tile value={full.total.final.right + full.total.final.blank} of={fields} label="fields the app gets right (value shown, or correctly left blank)" />
          <Tile value={full.total.lost} label="right answers lost to the checks" />
        </div>
        <p className="note">
          {summary.letters} letters, five fields each. A wrong value is one that would be shown to the reader as a fact and is not the right answer — including any amount or date
          shown where the letter asks for none.
        </p>
      </section>

      <SplitSection letters={letters} />

      <section aria-labelledby="by-field">
        <h2 id="by-field">By field</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <td />
                <th colSpan={4} scope="colgroup">
                  Model alone
                </th>
                <th colSpan={4} scope="colgroup" className="group">
                  Shown by the app
                </th>
                <th colSpan={3} scope="colgroup" className="group">
                  What the checks did
                </th>
              </tr>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Right</th>
                <th scope="col">Blank</th>
                <th scope="col">Wrong</th>
                <th scope="col">Missed</th>
                <th scope="col" className="group">
                  Right
                </th>
                <th scope="col">Blank</th>
                <th scope="col">Wrong</th>
                <th scope="col">Missed</th>
                <th scope="col" className="group">
                  Stopped: not in letter
                </th>
                <th scope="col">Stopped: rule for this kind</th>
                <th scope="col">Right answer lost</th>
              </tr>
            </thead>
            <tbody>
              {EXTRACT_FIELDS.map((field) => (
                <FieldRow key={field} name={FIELD_NAME[field]} s={full.fields[field]} />
              ))}
              <FieldRow name="All fields" s={full.total} total />
            </tbody>
          </table>
        </div>
        <p className="note">Blank: nothing shown, and the letter has nothing to show. Missed: nothing shown, though the letter has an answer.</p>
      </section>

      <section aria-labelledby="ways">
        <h2 id="ways">Three ways of reading the same letters</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Reading</th>
                <th scope="col">Model alone: wrong</th>
                <th scope="col">Shown: wrong</th>
                <th scope="col">Shown: right or correctly blank</th>
                <th scope="col">Missed</th>
                <th scope="col">Median time</th>
              </tr>
            </thead>
            <tbody>
              {VARIANTS.map((variant) => {
                const v = summary.variants[variant];
                return (
                  <tr key={variant}>
                    <th scope="row">
                      {VARIANT_NAME[variant]}
                      <span className="sub">{VARIANT_NOTE[variant]}</span>
                    </th>
                    <td className={v.total.alone.wrong > 0 ? 'bad' : undefined}>{v.total.alone.wrong}</td>
                    <td className={v.total.final.wrong > 0 ? 'bad' : undefined}>{v.total.final.wrong}</td>
                    <td>{v.total.final.right + v.total.final.blank}</td>
                    <td>{v.total.final.missed}</td>
                    <td>{ms(v.ms.median)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="kind">
        <h2 id="kind">Telling what kind of letter it is</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Reader</th>
                <th scope="col">Right</th>
                <th scope="col">Wrong</th>
                <th scope="col">No opinion / asked</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">On-device model</th>
                <td>{c.model.right}</td>
                <td className={c.model.wrong > 0 ? 'bad' : undefined}>{c.model.wrong}</td>
                <td>–</td>
              </tr>
              <tr>
                <th scope="row">Keyword rules</th>
                <td>{c.keywords.right}</td>
                <td className={c.keywords.wrong > 0 ? 'bad' : undefined}>{c.keywords.wrong}</td>
                <td>{c.keywords.none}</td>
              </tr>
              <tr className="total">
                <th scope="row">
                  Both together
                  <span className="sub">when they disagree, the reader is asked to choose</span>
                </th>
                <td>{c.combined.right}</td>
                <td className={c.combined.wrong > 0 ? 'bad' : undefined}>{c.combined.wrong}</td>
                <td>
                  {c.combined.asked}
                  {c.combined.asked > 0 && <span className="sub">right kind on offer in {c.askedWithAnswer}</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="note">Median time to classify: {ms(c.ms.median)}.</p>
      </section>

      <section aria-labelledby="letters">
        <h2 id="letters">Letter by letter</h2>
        <p className="note">
          Each cell: the model alone → what the app shows. {MARK.right} right · {MARK.blank} correctly blank · {MARK.wrong} wrong value · {MARK.missed} missed. Hover a cell for the
          answers.
        </p>
        <div className="scroll">
          <table className="letters">
            <thead>
              <tr>
                <th scope="col">Letter</th>
                <th scope="col">Kind</th>
                {EXTRACT_FIELDS.map((field) => (
                  <th key={field} scope="col">
                    {FIELD_NAME[field]}
                  </th>
                ))}
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {letters.map((result) => (
                <tr key={result.file}>
                  <th scope="row">{result.file.replace(/\.txt$/, '')}</th>
                  {kindCell(result)}
                  {EXTRACT_FIELDS.map((field) => (
                    <Cell key={field} result={result} field={field} />
                  ))}
                  <td>{ms(result.classification.ms + result.variants.full.ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

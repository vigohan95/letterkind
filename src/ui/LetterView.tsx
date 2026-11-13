import type { TermMatch } from '../domain/glossary';
import type { TermId } from '../domain/terms';
import { type Highlight, letterLines } from './highlights';

export interface LetterViewProps {
  letter: string;
  /** What the letter is called, for screen readers, in the interface's language. */
  label: string;
  highlights: readonly Highlight[];
  /** Glossary terms found in the letter. Marked only when `onTerm` is given. */
  terms?: readonly TermMatch[];
  /** The term whose meaning is being shown, if any. */
  chosen?: TermId | null;
  /** Called with the glossary's id for a term when the reader picks it. */
  onTerm?: (id: TermId) => void;
}

/** The letter as pasted, with line numbers, and the facts shown beside it marked in place. */
export function LetterView({ letter, label, highlights, terms, chosen, onTerm }: LetterViewProps) {
  const lines = letterLines(letter, highlights, onTerm ? terms : undefined);
  return (
    <div className="letter" role="region" aria-label={label}>
      {lines.map((line) => (
        <div className="letter-line" key={line.number} id={`line-${line.number}`}>
          <span className="letter-no" aria-hidden="true">
            {line.number}
          </span>
          <span className="letter-text">
            {line.parts.map((part, i) => {
              const { term } = part;
              if (part.field) {
                return (
                  <mark key={i} data-field={part.field}>
                    {part.text}
                  </mark>
                );
              }
              if (term && onTerm) {
                return (
                  <button type="button" className="term" data-term={term} aria-pressed={chosen === term} onClick={() => onTerm(term)} key={i}>
                    {part.text}
                  </button>
                );
              }
              return <span key={i}>{part.text}</span>;
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

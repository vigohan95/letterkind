import { type Highlight, letterLines } from './highlights';

/** The letter as pasted, with line numbers, and the facts shown beside it marked in place. */
export function LetterView({ letter, highlights }: { letter: string; highlights: readonly Highlight[] }) {
  return (
    <div className="letter" role="region" aria-label="The letter">
      {letterLines(letter, highlights).map((line) => (
        <div className="letter-line" key={line.number} id={`line-${line.number}`}>
          <span className="letter-no" aria-hidden="true">
            {line.number}
          </span>
          <span className="letter-text">
            {line.parts.map((part, i) =>
              part.field ? (
                <mark key={i} data-field={part.field}>
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

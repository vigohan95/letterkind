import type { Reading } from '../ai/read';
import type { FieldName } from '../ai/extract';
import type { TermMatch } from '../domain/glossary';
import { dropOverlaps, lineStarts } from '../domain/parse/span';
import type { TermId } from '../domain/terms';

/** A stretch of the letter that backs one of the facts shown beside it. */
export interface Highlight {
  start: number;
  end: number;
  field: FieldName;
}

/** Every place in the letter that a verified fact was found. */
export function highlightsOf(reading: Reading): Highlight[] {
  const out: Highlight[] = [];
  const add = (field: FieldName, verdict: { status: string; matches?: readonly { start: number; end: number }[] }): void => {
    if (verdict.status !== 'verified') return;
    for (const m of verdict.matches ?? []) out.push({ start: m.start, end: m.end, field });
  };
  add('amount', reading.amount);
  add('deadline', reading.deadline);
  add('phone', reading.phone);
  add('sender', reading.sender);
  add('reference', reading.reference);
  return dropOverlaps(out);
}

export interface LinePart {
  text: string;
  /** Set when this stretch backs one of the facts shown beside the letter. */
  field?: FieldName;
  /** Set when this stretch is a term of the glossary. Never set together with `field`. */
  term?: TermId;
}

export interface LetterLine {
  number: number;
  parts: LinePart[];
}

type Mark = { start: number; end: number } & ({ field: FieldName } | { term: TermId });

const isSpace = (letter: string, at: number): boolean => /\s/.test(letter.charAt(at));

/**
 * Cuts the letter into numbered lines, each split where a highlight or a
 * glossary term starts or ends. Where the two overlap the highlight is kept:
 * it is a fact about this letter, and the term is only a word in it.
 */
export function letterLines(letter: string, highlights: readonly Highlight[], terms: readonly TermMatch[] = []): LetterLine[] {
  const starts = lineStarts(letter);
  const clear = terms.filter((term) => !highlights.some((h) => h.start < term.end && term.start < h.end));
  const marks: Mark[] = [
    ...highlights.map((h) => ({ start: h.start, end: h.end, field: h.field })),
    ...clear.map((term) => ({ start: term.start, end: term.end, term: term.id })),
  ].sort((a, b) => a.start - b.start);

  return starts.map((lineStart, index) => {
    const next = starts[index + 1];
    const lineEnd = next === undefined ? letter.length : next - 1;
    const parts: LinePart[] = [];
    let at = lineStart;
    for (const mark of marks) {
      let from = Math.max(mark.start, lineStart);
      let to = Math.min(mark.end, lineEnd);
      if ('term' in mark) {
        // A term that runs over a line break is marked on each line without the indent or the line's end.
        while (from < to && isSpace(letter, from)) from += 1;
        while (to > from && isSpace(letter, to - 1)) to -= 1;
      }
      if (from >= to || from < at) continue;
      if (from > at) parts.push({ text: letter.slice(at, from) });
      const text = letter.slice(from, to);
      parts.push('term' in mark ? { text, term: mark.term } : { text, field: mark.field });
      at = to;
    }
    if (at < lineEnd) parts.push({ text: letter.slice(at, lineEnd) });
    return { number: index + 1, parts };
  });
}

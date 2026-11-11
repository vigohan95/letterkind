import type { Reading } from '../ai/read';
import type { FieldName } from '../ai/extract';
import { dropOverlaps, lineStarts } from '../domain/parse/span';

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
  field?: FieldName;
}

export interface LetterLine {
  number: number;
  parts: LinePart[];
}

/** Cuts the letter into numbered lines, each split where a highlight starts or ends. */
export function letterLines(letter: string, highlights: readonly Highlight[]): LetterLine[] {
  const starts = lineStarts(letter);
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  return starts.map((lineStart, index) => {
    const next = starts[index + 1];
    const lineEnd = next === undefined ? letter.length : next - 1;
    const parts: LinePart[] = [];
    let at = lineStart;
    for (const h of sorted) {
      const from = Math.max(h.start, lineStart);
      const to = Math.min(h.end, lineEnd);
      if (from >= to || from < at) continue;
      if (from > at) parts.push({ text: letter.slice(at, from) });
      parts.push({ text: letter.slice(from, to), field: h.field });
      at = to;
    }
    if (at < lineEnd) parts.push({ text: letter.slice(at, lineEnd) });
    return { number: index + 1, parts };
  });
}

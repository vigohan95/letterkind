import { dropOverlaps, type Found, lineAt, lineStarts } from './span';

/** A calendar date in the letter. `value` is ISO `YYYY-MM-DD`. */
export interface DateMatch extends Found<string> {
  /** True when the letter gave no year and one was worked out from context. */
  yearInferred: boolean;
}

export interface DateOptions {
  /**
   * ISO date the letter was written. Dates without a year are resolved against
   * it. Defaults to the first fully written date in the text.
   */
  letterDate?: string;
  /** Year to assume when there is no letter date at all. */
  defaultYear?: number;
}

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, enero: 1,
  february: 2, feb: 2, febrero: 2,
  march: 3, mar: 3, marzo: 3,
  april: 4, apr: 4, abril: 4,
  may: 5, mayo: 5,
  june: 6, jun: 6, junio: 6,
  july: 7, jul: 7, julio: 7,
  august: 8, aug: 8, agosto: 8,
  september: 9, sept: 9, sep: 9, septiembre: 9, setiembre: 9,
  october: 10, oct: 10, octubre: 10,
  november: 11, nov: 11, noviembre: 11,
  december: 12, dec: 12, diciembre: 12,
};

const EN_FULL = 'January|February|March|April|May|June|July|August|September|October|November|December';
const EN_ABBR = 'Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec';
const EN_MONTH = String.raw`(?:${EN_FULL}|(?:${EN_ABBR})\.?)`;
// Without a year next to it, a month name has to look like one: "May 15" or
// "MAY 15" is a date, "you may 15 ..." is not.
const EN_MONTH_CASED = String.raw`(?:${EN_FULL}|${EN_FULL.toUpperCase()}|(?:${EN_ABBR}|${EN_ABBR.toUpperCase()})\.?)`;
const ES_MONTH = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
const ORDINAL = '(?:st|nd|rd|th)?';

interface Pattern {
  re: RegExp;
  /** Returns [year | null, month, day] from a match. */
  read: (m: RegExpMatchArray) => [number | null, number, number];
}

const month = (name: string | undefined): number => MONTHS[(name ?? '').toLowerCase().replace('.', '')] ?? 0;
const num = (s: string | undefined): number => Number(s ?? NaN);
const twoDigitYear = (yy: number): number => (yy <= 69 ? 2000 + yy : 1900 + yy);

const PATTERNS: Pattern[] = [
  {
    // December 15, 2026   Dec. 15, 2026   December 15th 2026
    re: new RegExp(String.raw`\b(${EN_MONTH})\s+(\d{1,2})${ORDINAL},?\s+(\d{4})\b`, 'gi'),
    read: (m) => [num(m[3]), month(m[1]), num(m[2])],
  },
  {
    // 15 December 2026   15th of December, 2026
    re: new RegExp(String.raw`\b(\d{1,2})${ORDINAL}(?:\s+of)?\s+(${EN_MONTH}),?\s+(\d{4})\b`, 'gi'),
    read: (m) => [num(m[3]), month(m[2]), num(m[1])],
  },
  {
    // 15 de diciembre de 2026   15 de diciembre
    re: new RegExp(String.raw`\b(\d{1,2})[º°]?\s+de\s+(${ES_MONTH})(?:\s+del?\s+(\d{4}))?\b`, 'gi'),
    read: (m) => [m[3] ? num(m[3]) : null, month(m[2]), num(m[1])],
  },
  {
    // 12/15/2026   12/15/26   12-15-2026   (US order: month first)
    re: /(?<![\d/.-])(\d{1,2})([/-])(\d{1,2})\2(\d{4}|\d{2})(?![\d/-])/g,
    read: (m) => {
      const y = num(m[4]);
      return [(m[4] ?? '').length === 2 ? twoDigitYear(y) : y, num(m[1]), num(m[3])];
    },
  },
  {
    // 2026-12-15
    re: /(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\d-])/g,
    read: (m) => [num(m[1]), num(m[2]), num(m[3])],
  },
  {
    // December 15   Dec. 15th   (no year)
    re: new RegExp(String.raw`\b(${EN_MONTH_CASED})\s+(\d{1,2})${ORDINAL}(?![\d:])\b`, 'g'),
    read: (m) => [null, month(m[1]), num(m[2])],
  },
];

function daysInMonth(year: number, m: number): number {
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

function isValid(year: number, m: number, day: number): boolean {
  return year >= 1900 && year <= 2100 && m >= 1 && m <= 12 && day >= 1 && day <= daysInMonth(year, m);
}

function iso(year: number, m: number, day: number): string {
  return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DAY_MS = 86_400_000;
const utc = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`);

/**
 * Picks the year for a date written without one. A letter talks about dates
 * near the day it was written, so use the letter's year — unless that lands
 * more than half a year in the past, in which case it means next year
 * (a letter dated December 20 asking for a reply by January 15).
 */
function resolveYear(m: number, day: number, anchor: string | undefined, fallbackYear: number | undefined): number | null {
  if (anchor) {
    const year = Number(anchor.slice(0, 4));
    if (!isValid(year, m, day)) return isValid(year + 1, m, day) ? year + 1 : null;
    return utc(anchor) - utc(iso(year, m, day)) > 183 * DAY_MS ? year + 1 : year;
  }
  return fallbackYear ?? null;
}

/** Every date in `text`, in order of appearance. */
export function findDates(text: string, options: DateOptions = {}): DateMatch[] {
  const starts = lineStarts(text);
  const raw: { start: number; end: number; year: number | null; month: number; day: number }[] = [];
  for (const { re, read } of PATTERNS) {
    for (const m of text.matchAll(re)) {
      const [year, mo, day] = read(m);
      if (!(mo >= 1 && mo <= 12 && day >= 1 && day <= 31)) continue;
      if (year !== null && !isValid(year, mo, day)) continue;
      raw.push({ start: m.index, end: m.index + m[0].length, year, month: mo, day });
    }
  }

  const spans = dropOverlaps(raw);
  const firstFull = spans.find((s) => s.year !== null);
  const anchor = options.letterDate ?? (firstFull?.year ? iso(firstFull.year, firstFull.month, firstFull.day) : undefined);

  const found: DateMatch[] = [];
  for (const s of spans) {
    const year = s.year ?? resolveYear(s.month, s.day, anchor, options.defaultYear);
    if (year === null || !isValid(year, s.month, s.day)) continue;
    found.push({
      value: iso(year, s.month, s.day),
      raw: text.slice(s.start, s.end),
      start: s.start,
      end: s.end,
      line: lineAt(starts, s.start),
      yearInferred: s.year === null,
    });
  }
  return found;
}

/**
 * Reads a single date out of a short string, such as a model's answer.
 * Returns ISO `YYYY-MM-DD`, or null when the string holds no date or more
 * than one different date.
 */
export function parseDate(raw: string | null | undefined, options: DateOptions = {}): string | null {
  if (!raw) return null;
  const distinct = new Set(findDates(raw, options).map((d) => d.value));
  return distinct.size === 1 ? ([...distinct][0] ?? null) : null;
}

/** Whole days from `fromIso` to `toIso`; negative when `toIso` is in the past. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((utc(toIso) - utc(fromIso)) / DAY_MS);
}

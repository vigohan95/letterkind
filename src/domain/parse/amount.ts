import { type Found, lineAt, lineStarts } from './span';

/** A dollar amount in the letter. `value` is integer cents; credits are negative. */
export type AmountMatch = Found<number>;

// 1,234 or 1234, optionally .56 — and not the front part of a longer number.
const NUM = String.raw`(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?(?![.,]?\d)`;

const AMOUNT = new RegExp(
  [
    String.raw`(?:US)?\$[ \t]?${NUM}(?:[ \t]?USD\b)?`, // $1,234.56   $ 25   US$40   $40 USD
    String.raw`\bUSD[ \t]?${NUM}`, // USD 1,234.56
    String.raw`(?<![\d.,$])${NUM}[ \t]?(?:USD|U\.S\. dollars|dollars)\b`, // 1234.56 USD   25 dollars
  ].join('|'),
  'gi',
);

function toCents(whole: string, cents: string | undefined): number {
  return Number(whole.replace(/,/g, '')) * 100 + Number(cents ?? 0);
}

/** Every dollar amount in `text`, in order of appearance. */
export function findAmounts(text: string): AmountMatch[] {
  const starts = lineStarts(text);
  const found: AmountMatch[] = [];
  for (const m of text.matchAll(AMOUNT)) {
    const whole = m[1] ?? m[3] ?? m[5];
    if (whole === undefined) continue;
    let value = toCents(whole, m[2] ?? m[4] ?? m[6]);
    let start = m.index;
    let end = start + m[0].length;

    const before = text[start - 1];
    const credit = /^[ \t]?CR\b/.exec(text.slice(end, end + 4));
    if (before === '(' && text[end] === ')') {
      // Accounting style: ($45.00) is a credit.
      value = -value;
      start -= 1;
      end += 1;
    } else if ((before === '-' || before === '−') && !/[\w)]/.test(text[start - 2] ?? ' ')) {
      value = -value;
      start -= 1;
    } else if (credit) {
      value = -value;
      end += credit[0].length;
    }

    found.push({ value, raw: text.slice(start, end), start, end, line: lineAt(starts, start) });
  }
  return found;
}

/**
 * Reads a single amount out of a short string, such as a model's answer.
 * Returns integer cents, or null when the string holds no amount or more
 * than one different amount.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw * 100) : null;

  const distinct = new Set(findAmounts(raw).map((a) => a.value));
  if (distinct.size === 1) return [...distinct][0] ?? null;
  if (distinct.size > 1) return null;

  const bare = /^\s*(-)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*$/.exec(raw);
  if (!bare || bare[2] === undefined) return null;
  const cents = toCents(bare[2], bare[3]?.padEnd(2, '0'));
  return bare[1] ? -cents : cents;
}

/** Formats integer cents as US dollars: 123456 -> "$1,234.56". */
export function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${cents < 0 ? '-' : ''}$${whole}.${frac}`;
}

import { dropOverlaps, type Found, lineAt, lineStarts } from './span';

/** A US phone number in the letter. `value` is the 10-digit national number. */
export interface PhoneMatch extends Found<string> {
  extension?: string;
}

// (800) 555-0199   800-555-0199   800.555.0199   1-800-555-0199   +1 800 555 0199
const NUMERIC = /(?<![\w.-])(?:\+?1[-. ]?)?(?:\(([2-9]\d{2})\)[ ]?|([2-9]\d{2})[-. ])([2-9]\d{2})[-. ](\d{4})(?!\d)/g;

// 1-800-TAX-FORM   1-800-829-HELP   1-800-MEDICARE   (toll-free prefixes only)
const VANITY = /(?<![\w.-])(?:\+?1[-. ]?)?\(?(8(?:00|33|44|55|66|77|88))\)?[-. ]((?:[A-Z0-9]{3}[-. ]?[A-Z0-9]{4,7}|[A-Z0-9]{7,10}))(?![A-Za-z0-9])/g;

const EXTENSION = /^,?[ ]?(?:ext\.?|extension|x)[ ]?(\d{1,6})\b/i;

const KEYPAD: Record<string, string> = {
  A: '2', B: '2', C: '2',
  D: '3', E: '3', F: '3',
  G: '4', H: '4', I: '4',
  J: '5', K: '5', L: '5',
  M: '6', N: '6', O: '6',
  P: '7', Q: '7', R: '7', S: '7',
  T: '8', U: '8', V: '8',
  W: '9', X: '9', Y: '9', Z: '9',
};

function dialled(lettersAndDigits: string): string {
  let out = '';
  for (const ch of lettersAndDigits) {
    if (ch >= '0' && ch <= '9') out += ch;
    else out += KEYPAD[ch] ?? '';
  }
  return out;
}

/** Every US phone number in `text`, in order of appearance. */
export function findPhones(text: string): PhoneMatch[] {
  const starts = lineStarts(text);
  const spans: { start: number; end: number; value: string }[] = [];

  for (const m of text.matchAll(NUMERIC)) {
    const area = m[1] ?? m[2];
    if (!area || !m[3] || !m[4]) continue;
    spans.push({ start: m.index, end: m.index + m[0].length, value: area + m[3] + m[4] });
  }
  for (const m of text.matchAll(VANITY)) {
    if (!m[1] || !m[2] || !/[A-Z]/.test(m[2])) continue;
    // A word longer than seven keys still dials the first seven.
    const local = dialled(m[2]).slice(0, 7);
    if (local.length < 7) continue;
    spans.push({ start: m.index, end: m.index + m[0].length, value: m[1] + local });
  }

  return dropOverlaps(spans).map((s) => {
    const ext = EXTENSION.exec(text.slice(s.end, s.end + 20));
    const end = ext ? s.end + ext[0].length : s.end;
    const match: PhoneMatch = {
      value: s.value,
      raw: text.slice(s.start, end),
      start: s.start,
      end,
      line: lineAt(starts, s.start),
    };
    if (ext?.[1]) match.extension = ext[1];
    return match;
  });
}

/**
 * Reads a single phone number out of a short string, such as a model's answer.
 * Returns the 10-digit national number, or null.
 */
export function parsePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const distinct = new Set(findPhones(raw).map((p) => p.value));
  if (distinct.size === 1) return [...distinct][0] ?? null;
  if (distinct.size > 1) return null;

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.length === 10 ? digits : null;
}

/** Formats a 10-digit number for display: "8005550199" -> "(800) 555-0199". */
export function formatPhone(value: string, extension?: string): string {
  const base = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
  return extension ? `${base} ext. ${extension}` : base;
}

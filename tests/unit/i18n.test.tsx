import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { classify } from '../../src/ai/classify';
import { readLetter } from '../../src/ai/read';
import type { Generate } from '../../src/ai/types';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { INTERFACE_LANGUAGES, stringsFor, type Strings } from '../../src/i18n';
import { zhHans } from '../../src/i18n/zhHans';
import { zhHant } from '../../src/i18n/zhHant';
import { SAMPLE_LETTERS } from '../../src/samples/letters';
import { ReadingView } from '../../src/ui/ReadingView';

const TRANSLATIONS: [string, Strings][] = [
  ['es', es],
  ['zh-Hans', zhHans],
  ['zh-Hant', zhHant],
];

/** Every leaf of a strings object, by its path. Functions are called with recognisable arguments. */
function leaves(value: unknown, path = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof value === 'string') out.set(path, value);
  else if (typeof value === 'function') {
    const args = Array.from({ length: value.length }, (_, i) => (path.endsWith('lines') ? [3, 4] : `ARG${i}`));
    const numeric = Array.from({ length: value.length }, (_, i) => 1000 * (i + 2));
    let said: unknown;
    try {
      said = (value as (...a: unknown[]) => unknown)(...args);
    } catch {
      said = undefined;
    }
    // Functions that take numbers are called with numbers; the rest with strings.
    out.set(path, typeof said === 'string' && !said.includes('NaN') ? said : String((value as (...a: unknown[]) => unknown)(...numeric)));
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, inner] of Object.entries(value)) for (const [p, s] of leaves(inner, path ? `${path}.${key}` : key)) out.set(p, s);
  }
  return out;
}

// Words that are the same in every language: names, and the letter's own word for an unreadable place.
const SAME_IN_ALL = new Set(['appName', 'lang']);
// «bytes» is the Spanish word too.
const SAME_IN = (language: string, path: string): boolean => language === 'es' && path === 'ledger.bytes';

describe('interface languages', () => {
  const english = leaves(en);

  it.each(TRANSLATIONS)('%s has every string English has, and no other', (_, strings) => {
    expect([...leaves(strings).keys()].sort()).toEqual([...english.keys()].sort());
  });

  it.each(TRANSLATIONS)('%s leaves nothing in English', (language, strings) => {
    const left = [...leaves(strings)].filter(([path, said]) => !SAME_IN_ALL.has(path) && !SAME_IN(language, path) && !path.startsWith('format.') && said === english.get(path));
    expect(left.map(([path]) => path)).toEqual([]);
  });

  it.each(TRANSLATIONS)('%s keeps what each message is told: the word quoted, the language, the heading', (_, strings) => {
    for (const [reason, say] of Object.entries(strings.guidance.rejected)) {
      if (say.length > 0) expect(say('«X»'), reason).toContain('«X»');
    }
    expect(strings.terms.inCloud('LANG', 'HEAD')).toContain('LANG');
    expect(strings.terms.inCloud('LANG', 'HEAD')).toContain('HEAD');
    expect(strings.terms.inEnglish('HEAD')).toContain('HEAD');
    expect(strings.field.notInLetter('CLAIM')).toContain('CLAIM');
    expect(strings.input.unsupportedFile('scan.heic')).toContain('scan.heic');
    expect(strings.guidance.fromCloud('gemini-x', 2300, 1234)).toContain('gemini-x');
  });

  it('writes Traditional Chinese with Traditional characters', () => {
    // Characters that exist only in the Simplified form (里 is left out: it is also Traditional, as in 克里).
    const simplifiedOnly = /[这读设来时为个说会发应获没对从们报务费账请认识选择删邮网]/u;
    const found = [...leaves(zhHant)].filter(([, said]) => simplifiedOnly.test(said));
    expect(found.map(([path, said]) => `${path}: ${said}`)).toEqual([]);
  });

  it('follows the reader’s language where there is an interface for it, and is in English otherwise', () => {
    expect(INTERFACE_LANGUAGES).toEqual(['en', 'es', 'zh-Hans', 'zh-Hant']);
    expect(stringsFor('es')).toBe(es);
    expect(stringsFor('zh-Hant')).toBe(zhHant);
    expect(stringsFor('ko')).toBe(en);
  });

  it('writes dates and byte counts the way the language does', () => {
    expect(es.format.letterDate('2026-12-15')).toBe('15 de diciembre de 2026');
    expect(zhHans.format.letterDate('2026-12-15')).toBe('2026年12月15日');
    expect(en.format.letterDate('2026-12-15')).toBe('December 15, 2026');
    // Spanish as written in the United States groups thousands with a comma.
    expect(es.ledger.bytes(12345)).toBe('12,345 bytes');
    expect(zhHans.ledger.bytes(12345)).toBe('12,345 字节');
  });
});

describe('a letter read with the interface in Spanish', () => {
  const recorded = (answer: unknown): Generate => () => Promise.resolve({ text: JSON.stringify(answer), ms: 1234 });

  it('names the fields in Spanish and leaves the letter as it is', async () => {
    const letter = SAMPLE_LETTERS.find((s) => s.id === 'medical-bill')?.text ?? '';
    const classification = await classify(letter, recorded({ letter_type: 'medical_bill' }));
    const reading = await readLetter(
      letter,
      'medical_bill',
      recorded({ sender: 'Riverbend Medical Group', reference: 'RMG-0042-7719', amount: '296.00', deadline: '12/15/2026', phone: '800-555-0199' }),
      '2026-12-01',
    );
    const html = renderToStaticMarkup(<ReadingView letter={letter} classification={classification} reading={reading} chosenByReader={false} t={es} />);
    expect(html).toContain('Factura médica');
    expect(html).toContain('Cantidad a pagar');
    expect(html).toContain('15 de diciembre de 2026');
    expect(html).toContain('Dentro de 14 días.');
    expect(html).toContain('aria-label="La carta"');
    // The letter itself is shown in its own words.
    expect(html).toContain('Riverbend Medical Group');
  });
});

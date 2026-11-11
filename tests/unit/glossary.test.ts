import { describe, expect, it } from 'vitest';
import { findTerms } from '../../src/domain/glossary';
import { roomFor } from '../../src/domain/meaning';
import { checkText, TemplateRejected } from '../../src/domain/template';
import { TERMS } from '../../src/domain/terms';

const found = (text: string): string[] => findTerms(text).map((m) => `${m.id}:${text.slice(m.start, m.end)}`);
const ids = (text: string): string[] => findTerms(text).map((m) => m.id);

describe('finding glossary terms in a letter', () => {
  it('finds a term where it stands, whatever its capitals', () => {
    const text = 'Your Deductible has not been met.';
    expect(findTerms(text)).toEqual([{ id: 'deductible', start: 5, end: 15 }]);
    expect(found('PAST DUE — pay now')).toEqual(['past-due:PAST DUE']);
  });

  it('finds every entry of the glossary when it is written as the glossary writes it', () => {
    const missed = TERMS.filter((t) => !ids(`Please read: ${/^\d+$/.test(t.words) ? `Form ${t.words}` : t.words}, then call.`).includes(t.id)).map((t) => t.id);
    expect(missed).toEqual([]);
  });

  it('prefers the longer term where two overlap', () => {
    expect(ids('A default judgment may be entered.')).toEqual(['default-judgment']);
    expect(ids('This is a notice of deficiency.')).toEqual(['notice-of-deficiency']);
    expect(ids('A failure-to-pay penalty applies.')).toEqual(['failure-to-pay-penalty']);
    expect(ids('Send it to the collection agency.')).toEqual(['collection-agency']);
  });

  it('matches whole words only', () => {
    expect(ids('An interesting statementlike reclaim.')).toEqual([]);
    expect(ids('The claimant filed.')).toEqual(['claimant']);
    expect(ids('Account 10995 and 21099.')).toEqual([]);
  });

  it('finds plurals', () => {
    expect(found('Late fees, penalties and liens may follow.')).toEqual(['late-fee:Late fees', 'penalty:penalties', 'lien:liens']);
  });

  it('reads a hyphen and a space as the same thing', () => {
    expect(ids('The account is a charge off.')).toEqual(['charge-off']);
    expect(ids('This provider is out of network.')).toEqual(['provider', 'out-of-network']);
    expect(ids('Your out-of-pocket maximum')).toEqual(['out-of-pocket-maximum']);
  });

  it('finds a term broken over two lines', () => {
    const text = 'This is a notice of adverse\n   action on your case.';
    expect(found(text)).toEqual(['notice:notice', 'adverse-action:adverse\n   action']);
  });

  it('takes an abbreviation only in capitals', () => {
    expect(ids('Your SNAP benefits and COBRA coverage')).toEqual(['snap', 'cobra', 'coverage']);
    expect(ids('It was a snap decision about the cobra.')).toEqual([]);
    expect(ids('ssi and tanf')).toEqual([]);
  });

  it('takes a form number only when it is called a form', () => {
    expect(found('See Form 1099-MISC and your W-2.')).toEqual(['1099:Form 1099', 'w-2:W-2']);
    expect(ids('1099 Main Street')).toEqual([]);
  });

  it('knows the other ways a few terms are written', () => {
    expect(ids('Your copay is due.')).toEqual(['copayment']);
    expect(ids('Your co-pay is due.')).toEqual(['copayment']);
    expect(ids('See your EOB.')).toEqual(['explanation-of-benefits']);
    expect(ids('Pre-authorization was not obtained.')).toEqual(['prior-authorization']);
    expect(ids('Preauthorization was not obtained.')).toEqual(['prior-authorization']);
    expect(ids('A shut-off is scheduled.')).toEqual(['shutoff']);
    expect(ids('Your AGI and co-insurance')).toEqual(['adjusted-gross-income', 'coinsurance']);
    expect(ids('We sent an RFE.')).toEqual(['request-for-evidence']);
  });

  it('returns matches in the order they stand, none overlapping', () => {
    const text = 'Notice: your claim was denied. You may appeal the denial; an external review is the last appeal.';
    const matches = findTerms(text);
    expect(matches.map((m) => m.id)).toEqual(['notice', 'claim', 'appeal', 'denial', 'external-review', 'appeal']);
    for (let i = 1; i < matches.length; i++) expect(matches[i]!.start).toBeGreaterThanOrEqual(matches[i - 1]!.end);
  });

  it('finds nothing in a letter with no such words', () => {
    expect(findTerms('Dear Sam, thank you for the lovely card. See you in May.')).toEqual([]);
    expect(findTerms('')).toEqual([]);
  });
});

describe('what the glossary says each term means', () => {
  // The meanings are the one part of a term's panel no model writes, so they are held to the
  // rules a model's text is held to, and to a few of their own.
  const broken = (check: (meaning: string) => boolean): string[] => TERMS.filter((t) => !check(t.meaning)).map((t) => t.id);

  it('has a meaning for every term, a sentence or two long', () => {
    expect(broken((m) => m.length >= 30 && m.length <= 270)).toEqual([]);
    expect(broken((m) => /^[A-Z]/.test(m) && m.endsWith('.'))).toEqual([]);
    expect(broken((m) => m === m.trim() && !/\s{2,}|[\r\n\t]/.test(m))).toEqual([]);
  });

  it('leaves a translation of the longest meaning room under the limit', () => {
    const longest = Math.max(...TERMS.map((t) => t.meaning.length));
    expect(2 * longest + 60).toBeLessThanOrEqual(600);
    expect(roomFor('x'.repeat(longest))).toBe(2 * longest + 60);
  });

  it('states no amount, date, phone number or web address, and leaves no gap to fill', () => {
    const rejected = TERMS.flatMap((t) => {
      try {
        checkText(t.meaning, t.id, 270, []);
        return [];
      } catch (error) {
        if (error instanceof TemplateRejected) return [`${t.id}: ${error.reason} ${error.found ?? ''}`.trim()];
        throw error;
      }
    });
    expect(rejected).toEqual([]);
  });

  it('is typeset the way the rest of Letterkind is: no straight quotes', () => {
    expect(broken((m) => !/['"]/.test(m))).toEqual([]);
  });

  it('gives no advice: it says what a word means, not what the reader should do', () => {
    // Telling the reader what to do, as against saying what a letter may ask of them.
    const advice = /\byou should\b|\bmake sure\b|\bbe sure to\b|\brecommend|(^|[.:] )(Call|Ask|Contact|Pay|Send|File|Check|Keep|Do not|Never|Always)\b/;
    expect(advice.test('The amount still owed. Call the number on the letter.')).toBe(true);
    expect(broken((m) => !advice.test(m))).toEqual([]);
  });
});

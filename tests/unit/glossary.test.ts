import { describe, expect, it } from 'vitest';
import { findTerms } from '../../src/domain/glossary';
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

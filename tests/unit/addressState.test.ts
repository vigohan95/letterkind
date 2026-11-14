import { describe, expect, it } from 'vitest';
import { statesInAddresses, suggestedState } from '../../src/domain/parse/addressState';

describe('state from the letter’s addresses', () => {
  it('reads the state before a ZIP code at the end of an address line', () => {
    expect(suggestedState('Jordan A. Sample\n100 Example Street\nColumbus, OH 43004\n')).toBe('OH');
    expect(suggestedState('PO Box 10\nAustin TX 78701-1234')).toBe('TX');
  });

  it('suggests nothing when the addresses are in more than one state', () => {
    const letter = 'Internal Revenue Service\nKansas City, MO 64999\n\nJordan A. Sample\nColumbus, OH 43004';
    expect(statesInAddresses(letter)).toEqual(['MO', 'OH']);
    expect(suggestedState(letter)).toBeNull();
  });

  it('counts the same state once', () => {
    expect(suggestedState('Springfield, IL 62701\nChicago, IL 60601')).toBe('IL');
  });

  it('ignores codes that are not states, and numbers that are not at the end of an address', () => {
    expect(suggestedState('Reference: AB 12345 for your records')).toBeNull();
    expect(suggestedState('Account XX 12345')).toBeNull();
    expect(suggestedState('Amount due $1,214 by December 9, 2026')).toBeNull();
    expect(suggestedState('')).toBeNull();
  });
});

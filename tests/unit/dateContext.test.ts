import { describe, expect, it } from 'vitest';
import { checkDeadlineContext, whyNotTheDeadline } from '../../src/domain/dateContext';
import { letterType } from '../../src/domain/letterTypes';
import { findDates } from '../../src/domain/parse/date';
import { verifyDate } from '../../src/domain/verify';
import { EVAL_SET } from '../../src/eval/dataset';

/** The reason given for the first place `raw` appears in `letter`. */
function why(letter: string, raw: string, meaning: Parameters<typeof whyNotTheDeadline>[2]) {
  const match = findDates(letter).find((d) => d.raw === raw);
  if (!match) throw new Error(`no date ${raw}`);
  return whyNotTheDeadline(letter, match, meaning);
}

describe('whyNotTheDeadline', () => {
  it('reads labels that record when something happened', () => {
    expect(why('Notice date: November 2, 2026', 'November 2, 2026', 'pay')).toBe('record_date');
    expect(why('DATE MAILED  11/02/2026', '11/02/2026', 'pay')).toBe('record_date');
    expect(why('Statement Date: 11/02/2026', '11/02/2026', 'pay')).toBe('record_date');
    expect(why('Service period: Oct 3, 2026 to Nov 2, 2026', 'Nov 2, 2026', 'pay')).toBe('record_date');
    expect(why('Date of service: 10/14/2026', '10/14/2026', 'pay')).toBe('record_date');
    expect(why('Billing period: October 3, 2026 to November 2, 2026', 'November 2, 2026', 'pay')).toBe('record_date');
    expect(why('Payment received November 2, 2026   -$40.00', 'November 2, 2026', 'pay')).toBe('record_date');
    expect(why('Fecha del aviso: 2 de noviembre de 2026', '2 de noviembre de 2026', 'pay')).toBe('record_date');
  });

  it('leaves dates to act by alone, including ones that mention receipt', () => {
    expect(why('Your response must be received by January 15, 2027.', 'January 15, 2027', 'respond')).toBe(null);
    expect(why('Due date: December 1, 2026', 'December 1, 2026', 'pay')).toBe(null);
    expect(why('Date:   Monday, December 7, 2026', 'December 7, 2026', 'appear')).toBe(null);
  });

  it('knows a last day to postpone is not the day to appear', () => {
    const letter = 'Report on December 7, 2026. Requests to postpone must be received by November 23, 2026.';
    expect(why(letter, 'November 23, 2026', 'appear')).toBe('postpone_by');
    expect(why(letter, 'December 7, 2026', 'appear')).toBe(null);
    // For a letter whose date is a reply-by date, the same words do not disqualify it.
    expect(why(letter, 'November 23, 2026', 'respond')).toBe(null);
  });

  it('knows a last day to give notice and leave is not when the new rent starts', () => {
    const letter = 'The new rent begins January 1, 2027. To move out instead, we must receive your notice by December 1, 2026.';
    expect(why(letter, 'December 1, 2026', 'takes_effect')).toBe('move_out_by');
    expect(why(letter, 'January 1, 2027', 'takes_effect')).toBe(null);
  });

  it('does not let "U.S." end the sentence early', () => {
    const letter = 'Mailed by the U.S. Postal Service. Notice date: November 2, 2026';
    expect(why(letter, 'November 2, 2026', 'pay')).toBe('record_date');
  });
});

describe('checkDeadlineContext', () => {
  const letter = 'Notice date: November 2, 2026\nPlease pay by December 1, 2026.';

  it('holds back a date only when every place it appears says it is something else', () => {
    const held = checkDeadlineContext(letter, verifyDate(letter, '2026-11-02'), 'pay');
    expect(held.status).toBe('unverified');
    if (held.status !== 'unverified') return;
    expect(held.candidates.map((c) => c.value)).toEqual(['2026-12-01']);
  });

  it('keeps a date that also appears as the date to act by', () => {
    const both = 'Notice date: December 1, 2026\nPlease pay by December 1, 2026.';
    expect(checkDeadlineContext(both, verifyDate(both, 'December 1, 2026'), 'pay').status).toBe('verified');
    expect(checkDeadlineContext(letter, verifyDate(letter, 'December 1, 2026'), 'pay').status).toBe('verified');
  });
});

describe('on the evaluation letters', () => {
  it.each(EVAL_SET.filter((i) => i.label.deadline !== null).map((i) => [i.label.file, i] as const))(
    '%s: the labelled deadline is never held back',
    (_file, item) => {
      const v = checkDeadlineContext(item.letter, verifyDate(item.letter, item.label.deadline?.iso), letterType(item.label.type).deadline);
      expect(v.status).toBe('verified');
    },
  );
});

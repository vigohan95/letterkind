import type { LanguageId } from './languages';
import type { LetterTypeId } from './letterTypes';
import {
  answerFields,
  checkList,
  checkText,
  fill,
  mark,
  markersIn,
  type Placeholder,
  PLACEHOLDERS,
  placeholdersFor,
  type StandIn,
  TemplateRejected,
  type Values,
  withoutMarkers,
  writtenAs,
} from './template';

/**
 * A reply to a kind of letter, drafted in the cloud by a model that never saw
 * the letter. Like guidance it is a template, held to the same rules: the
 * only details in it are marked gaps, filled on the device from what was
 * checked against the letter.
 *
 * A reply has a second kind of gap that guidance does not: what only the
 * reader knows — their name, their address, what they are asking for. Those
 * are blanks in square brackets, and nothing ever fills them in.
 */
export interface ReplyTemplate {
  /** In English. */
  subject: string;
  /** The reply to send. Always in English, the language of the office it goes to. */
  bodyEn: string;
  /** The same reply in the reader's language, to read and not to send. Null when the reader reads English. */
  bodyTranslated: string | null;
  /** What to check, attach and keep, in the reader's language. */
  beforeSending: string[];
}

/** Longest text accepted per field, in characters. */
const LIMITS = { subject: 200, body_en: 3500, body_translated: 5000, before_sending: 500 } as const;
const MAX_CHECKS = 6;

/** A blank for the reader to fill in by hand, as written in a draft. */
const BLANK = /\[[^[\]\n]{1,80}\]/g;

const oneLine = (value: unknown): unknown => (typeof value === 'string' ? value.replace(/\s+/g, ' ') : value);

/** Line endings made the same, and no more than one empty line in a row. */
const tidy = (value: unknown): unknown =>
  typeof value === 'string'
    ? value
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
    : value;

/** The words a model wrote itself: no markers, no blanks. */
const ownWords = (text: string): string => withoutMarkers(text).replace(BLANK, ' ');

/** The details of the letter a text has gaps for. A count of days is not one: no letter is given it. */
const details = (text: string): Set<Placeholder> => new Set(markersIn(text).filter((p) => p !== 'DAYS_LEFT'));

/**
 * Turn a model's answer into a draft of a reply, or throw `TemplateRejected`.
 *
 * Accepted only if it is exactly the expected fields — with a translation
 * when the reader does not read English, and without one when they do —
 * every marker is one this kind of letter may use, no text contains a dollar
 * amount, calendar date, phone number or web address of the model's own, the
 * reply to send is in English, what is for reading is written the way the
 * reader's language is written, and the translation has a gap for exactly
 * the details the English has.
 */
/**
 * What the law requires, a law by name, what the sender must do. The reader
 * signs the letter and cannot check any of it, and the cloud was never told
 * which rule applies to them. A letter may ask; it may not state.
 */
const LEGAL_CLAIMS = [
  /\b(?:[Ll]aws?|[Ss]tatutes?|[Rr]egulations?|Act|Code)\s+(?:requires?|mandates?|obligates?|entitles?|prohibits?|forbids?|says|states|provides|gives|guarantees?)\b/,
  /\b(?:[Uu]nder|[Aa]ccording to|[Aa]s required by|[Pp]ursuant to|[Ii]n accordance with)\s+(?:the\s+)?(?:[A-Za-z]+\s+){0,5}(?:laws?|statutes?|regulations?|Act|Code)\b/,
  /\b[Yy]ou\s+(?:must|are\s+(?:legally\s+)?(?:required|obligated|obliged))\b/,
];
function legalClaim(text: string): string | null {
  for (const claim of LEGAL_CLAIMS) {
    const found = claim.exec(text);
    if (found) return found[0].slice(0, 60);
  }
  return null;
}

/** A greeting, what is asked, and a closing: fewer lines than that is a block of text, not a letter. */
const MIN_LINES = 3;
const laidOut = (text: string): boolean => text.split('\n').filter((line) => line.trim() !== '').length >= MIN_LINES;

export function parseReply(answer: string, type: LetterTypeId, language: LanguageId): ReplyTemplate {
  const translated = language !== 'en';
  const names = translated ? ['subject', 'body_en', 'body_translated', 'before_sending'] : ['subject', 'body_en', 'before_sending'];
  const record = answerFields(answer, names);

  const allowed = placeholdersFor(type);
  const template: ReplyTemplate = {
    subject: checkText(oneLine(record.subject), 'subject', LIMITS.subject, allowed),
    bodyEn: checkText(tidy(record.body_en), 'body_en', LIMITS.body_en, allowed),
    bodyTranslated: translated ? checkText(tidy(record.body_translated), 'body_translated', LIMITS.body_translated, allowed) : null,
    beforeSending: checkList(record.before_sending, 'before_sending', LIMITS.before_sending, MAX_CHECKS, allowed),
  };

  // It is going to be printed and signed; one unbroken block is not something to put a name under.
  if (!laidOut(template.bodyEn)) throw new TemplateRejected('wrong_shape', 'body_en');
  if (!writtenAs(ownWords(template.bodyEn), 'en')) throw new TemplateRejected('not_in_language', 'body_en');
  const claim = legalClaim(template.bodyEn);
  if (claim) throw new TemplateRejected('states_the_law', 'body_en', claim);
  if (template.bodyTranslated !== null) {
    if (!laidOut(template.bodyTranslated)) throw new TemplateRejected('wrong_shape', 'body_translated');
    if (!writtenAs(ownWords(template.bodyTranslated), language)) throw new TemplateRejected('not_in_language', 'body_translated');
    // A reader who signs the English must have been shown the same details in their own language.
    const sent = details(template.bodyEn);
    const read = details(template.bodyTranslated);
    const odd = PLACEHOLDERS.find((p) => sent.has(p) !== read.has(p));
    if (odd) throw new TemplateRejected('translation_differs', 'body_translated', mark(odd));
    // What the reader has to write in must be named in words they can read. One word may be the same in both.
    const english = new Set(template.bodyEn.match(BLANK) ?? []);
    const left = (template.bodyTranslated.match(BLANK) ?? []).find((blank) => english.has(blank) && /\s/.test(blank));
    if (left) throw new TemplateRejected('blank_left_in_english', 'body_translated', left);
  }
  if (!writtenAs(ownWords(template.beforeSending.join(' ')), language)) throw new TemplateRejected('not_in_language', 'before_sending');
  return template;
}

export type LetterPiece =
  | { kind: 'text'; text: string }
  /** A detail from the letter the reader received. */
  | { kind: 'value'; placeholder: Placeholder; text: string }
  /** Something for the reader to write in by hand. */
  | { kind: 'blank'; text: string };

/**
 * Fill a draft's gaps on the device.
 *
 * A detail that was checked against the letter is put in. One that was not
 * becomes one more blank, never a guess. A count of days is always left out:
 * a letter is read days after it is written, and "in 14 days" would be wrong
 * by then.
 */
export function fillLetter(text: string, values: Values, blanks: Readonly<Record<StandIn, string>>): LetterPiece[] {
  const known: Values = {};
  for (const p of PLACEHOLDERS) {
    const value = values[p];
    if (p !== 'DAYS_LEFT' && value !== undefined) known[p] = value;
  }

  const pieces: LetterPiece[] = [];
  for (const piece of fill(text, known, blanks)) {
    if (piece.kind === 'value') pieces.push(piece);
    else if (piece.kind === 'stand_in') pieces.push({ kind: 'blank', text: piece.text });
    else {
      let at = 0;
      for (const m of piece.text.matchAll(BLANK)) {
        if (m.index > at) pieces.push({ kind: 'text', text: piece.text.slice(at, m.index) });
        pieces.push({ kind: 'blank', text: m[0] });
        at = m.index + m[0].length;
      }
      if (at < piece.text.length) pieces.push({ kind: 'text', text: piece.text.slice(at) });
    }
  }
  return pieces;
}

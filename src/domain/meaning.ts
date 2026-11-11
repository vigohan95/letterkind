import type { LanguageId } from './languages';
import { answerFields, checkText, TemplateRejected, writtenAs } from './template';

/**
 * What a glossary term means, in a language other than English.
 *
 * The English meaning is the glossary's own. A model is given it and asked
 * to put it into the reader's language; it has not seen the letter. Code
 * cannot tell a good translation from a bad one, so the English is always
 * shown beside it. What code can check, it does: exactly the one field asked
 * for, no amount, date, phone number or address of its own (the English has
 * none), no gap for a detail of the letter, written the way the language
 * asked for is written, and not much longer than what it translates.
 */
export interface Meaning {
  explanation: string;
}

/** No meaning in the glossary comes near this, in any language on the list. */
const LIMIT = 600;
/** A meaning is short, so the language is judged from fewer letters than a whole template needs. */
const ENOUGH_LETTERS = 40;

/**
 * The most characters a translation of `english` may have. Languages differ
 * in how long they run, so this is generous; it is there to stop a model that
 * goes on to add a paragraph of its own.
 */
export const roomFor = (english: string): number => Math.min(LIMIT, 2 * english.length + 60);

/** Turn a model's answer into a meaning, or throw `TemplateRejected`. `english` is what it was asked to translate. */
export function parseMeaning(answer: string, language: LanguageId, english: string): Meaning {
  const record = answerFields(answer, ['explanation']);
  const explanation = checkText(record.explanation, 'explanation', roomFor(english), []);
  if (!writtenAs(explanation, language, ENOUGH_LETTERS)) throw new TemplateRejected('not_in_language', 'explanation');
  return { explanation };
}

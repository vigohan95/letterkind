import type { LanguageId } from './languages';
import { answerFields, checkText, TemplateRejected, writtenAs } from './template';

/**
 * What a glossary term means, as a model wrote it.
 *
 * The model is told the term and the language and has not seen the letter,
 * so a meaning is general by construction. It is held to the same rules as
 * every other answer: exactly the one field asked for, short, no amount,
 * date, phone number or address of its own, no gap for a detail of the
 * letter, and written the way the language asked for is written.
 */
export interface Meaning {
  explanation: string;
}

/** Three short sentences fit in half of this, in any language on the list. */
const LIMIT = 600;
/** A meaning is short, so the language is judged from fewer letters than a whole template needs. */
const ENOUGH_LETTERS = 40;

/** Turn a model's answer into a meaning, or throw `TemplateRejected`. */
export function parseMeaning(answer: string, language: LanguageId): Meaning {
  const record = answerFields(answer, ['explanation']);
  const explanation = checkText(record.explanation, 'explanation', LIMIT, []);
  if (!writtenAs(explanation, language, ENOUGH_LETTERS)) throw new TemplateRejected('not_in_language', 'explanation');
  return { explanation };
}

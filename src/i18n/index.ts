import type { LanguageId } from '../domain/languages';
import { en, type Strings } from './en';
import { es } from './es';
import { zhHans } from './zhHans';
import { zhHant } from './zhHant';

/**
 * The interface follows the reader's language where Letterkind has one,
 * and is in English otherwise. Explanations, replies and glossary meanings
 * can still be had in every language on the list; only the words around
 * them fall back to English.
 */
const BY_LANGUAGE: Partial<Record<LanguageId, Strings>> = { en, es, 'zh-Hans': zhHans, 'zh-Hant': zhHant };

export const INTERFACE_LANGUAGES = Object.keys(BY_LANGUAGE) as LanguageId[];

export const stringsFor = (language: LanguageId): Strings => BY_LANGUAGE[language] ?? en;

export type { Strings };

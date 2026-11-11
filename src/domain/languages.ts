/**
 * Languages an explanation can be written in. One of only three things the
 * cloud is ever told about a letter.
 *
 * `onDevice` marks the languages the browser's built-in model can write. For
 * those, an explanation can still be produced with no connection; for the
 * others it cannot, and the app says so instead of showing a poor one.
 */

export const LANGUAGES = [
  { id: 'en', name: 'English', own: 'English', onDevice: true },
  { id: 'es', name: 'Spanish', own: 'Español', onDevice: true },
  { id: 'zh-Hans', name: 'Chinese (Simplified)', own: '简体中文', onDevice: false },
  { id: 'zh-Hant', name: 'Chinese (Traditional)', own: '繁體中文', onDevice: false },
  { id: 'vi', name: 'Vietnamese', own: 'Tiếng Việt', onDevice: false },
  { id: 'tl', name: 'Tagalog', own: 'Tagalog', onDevice: false },
  { id: 'ko', name: 'Korean', own: '한국어', onDevice: false },
  { id: 'ar', name: 'Arabic', own: 'العربية', onDevice: false },
  { id: 'ru', name: 'Russian', own: 'Русский', onDevice: false },
  { id: 'ht', name: 'Haitian Creole', own: 'Kreyòl ayisyen', onDevice: false },
  { id: 'pt', name: 'Portuguese', own: 'Português', onDevice: false },
  { id: 'fr', name: 'French', own: 'Français', onDevice: false },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export const LANGUAGE_IDS: readonly LanguageId[] = LANGUAGES.map((l) => l.id);

const BY_ID = new Map<string, (typeof LANGUAGES)[number]>(LANGUAGES.map((l) => [l.id, l]));

export const isLanguageId = (value: unknown): value is LanguageId => typeof value === 'string' && BY_ID.has(value);

export const languageName = (id: LanguageId): string => BY_ID.get(id)?.name ?? id;

/** Can the browser's built-in model write this language? */
export const writableOnDevice = (id: LanguageId): boolean => BY_ID.get(id)?.onDevice ?? false;

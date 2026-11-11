/**
 * Languages an explanation can be written in. One of only three things the
 * cloud is ever told about a letter.
 *
 * `onDevice` marks the languages the browser's built-in model can write. For
 * those, an explanation can still be produced with no connection; for the
 * others it cannot, and the app says so instead of showing a poor one.
 *
 * `script` is how the language is written. An answer that comes back written
 * some other way is not shown: `latin_marked` languages are written with
 * accents, and a long text without any is not that language written properly.
 */

export const LANGUAGES = [
  { id: 'en', name: 'English', own: 'English', onDevice: true, script: 'latin' },
  { id: 'es', name: 'Spanish', own: 'Español', onDevice: true, script: 'latin_marked' },
  { id: 'zh-Hans', name: 'Chinese (Simplified)', own: '简体中文', onDevice: false, script: 'han' },
  { id: 'zh-Hant', name: 'Chinese (Traditional)', own: '繁體中文', onDevice: false, script: 'han' },
  { id: 'vi', name: 'Vietnamese', own: 'Tiếng Việt', onDevice: false, script: 'latin_marked' },
  { id: 'tl', name: 'Tagalog', own: 'Tagalog', onDevice: false, script: 'latin' },
  { id: 'ko', name: 'Korean', own: '한국어', onDevice: false, script: 'hangul' },
  { id: 'ar', name: 'Arabic', own: 'العربية', onDevice: false, script: 'arabic' },
  { id: 'ru', name: 'Russian', own: 'Русский', onDevice: false, script: 'cyrillic' },
  { id: 'ht', name: 'Haitian Creole', own: 'Kreyòl ayisyen', onDevice: false, script: 'latin_marked' },
  { id: 'pt', name: 'Portuguese', own: 'Português', onDevice: false, script: 'latin_marked' },
  { id: 'fr', name: 'French', own: 'Français', onDevice: false, script: 'latin_marked' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export type Script = (typeof LANGUAGES)[number]['script'];

export const LANGUAGE_IDS: readonly LanguageId[] = LANGUAGES.map((l) => l.id);

const BY_ID = new Map<string, (typeof LANGUAGES)[number]>(LANGUAGES.map((l) => [l.id, l]));

export const isLanguageId = (value: unknown): value is LanguageId => typeof value === 'string' && BY_ID.has(value);

export const languageName = (id: LanguageId): string => BY_ID.get(id)?.name ?? id;

/** Can the browser's built-in model write this language? */
export const writableOnDevice = (id: LanguageId): boolean => BY_ID.get(id)?.onDevice ?? false;

/** How this language is written. */
export const scriptOf = (id: LanguageId): Script => BY_ID.get(id)?.script ?? 'latin';

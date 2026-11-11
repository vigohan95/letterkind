import { isLanguageId, type LanguageId } from '../domain/languages';
import { isStateId, type StateId } from '../domain/states';

/**
 * The two things the reader chooses that can be sent with a request: a US
 * state and a language. They are remembered in this browser so they need
 * not be chosen for every letter. Nothing else is remembered here.
 */
export interface Prefs {
  state: StateId;
  language: LanguageId;
}

const KEY = 'letterkind.prefs';

/** The offered language closest to what the browser says the reader prefers. */
export function guessLanguage(preferred: readonly string[]): LanguageId {
  for (const tag of preferred) {
    const [primary = '', ...rest] = tag.toLowerCase().split('-');
    if (primary === 'zh') return rest.some((part) => ['hant', 'tw', 'hk', 'mo'].includes(part)) ? 'zh-Hant' : 'zh-Hans';
    if (primary === 'fil') return 'tl';
    if (isLanguageId(primary)) return primary;
  }
  return 'en';
}

type Reads = Pick<Storage, 'getItem'>;
type Writes = Pick<Storage, 'setItem'>;

/** Browser storage, or nothing where the browser will not allow it. */
export function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadPrefs(storage: Reads | null, preferred: readonly string[]): Prefs {
  const fresh: Prefs = { state: 'US', language: guessLanguage(preferred) };
  try {
    const kept: unknown = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (typeof kept !== 'object' || kept === null) return fresh;
    const { state, language } = kept as Record<string, unknown>;
    return { state: isStateId(state) ? state : fresh.state, language: isLanguageId(language) ? language : fresh.language };
  } catch {
    return fresh;
  }
}

export function savePrefs(storage: Writes | null, prefs: Prefs): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ state: prefs.state, language: prefs.language }));
  } catch {
    // A browser that will not remember is not an error; the reader chooses again next time.
  }
}

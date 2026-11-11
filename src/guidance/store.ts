/**
 * Templates kept on this device, so the same kind of letter can be explained
 * again without asking anyone.
 *
 * What is kept is the model's answer exactly as it arrived, and the time. It
 * holds nothing from a letter: a template is written before any detail is
 * filled in. The answer goes through the same checks every time it is read
 * back, so a saved copy is trusted no more than a fresh one.
 */
export interface Saved {
  /** The answer as it came from the model. */
  text: string;
  /** When it arrived, ISO 8601. */
  at: string;
}

export interface TemplateStore {
  get(key: string): Promise<Saved | null>;
  put(key: string, saved: Saved): Promise<void>;
  /** Forget everything. */
  clear(): Promise<void>;
}

const isSaved = (value: unknown): value is Saved =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Saved).text === 'string' &&
  typeof (value as Saved).at === 'string';

/** Kept only until the page is closed. Used in tests, and when the browser offers nothing better. */
export function memoryStore(): TemplateStore {
  const kept = new Map<string, Saved>();
  return {
    get: (key) => Promise.resolve(kept.get(key) ?? null),
    put: (key, saved) => {
      kept.set(key, saved);
      return Promise.resolve();
    },
    clear: () => {
      kept.clear();
      return Promise.resolve();
    },
  };
}

const DATABASE = 'letterkind';
const TEMPLATES = 'templates';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(TEMPLATES);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The browser refused to open its storage.'));
    request.onblocked = () => reject(new Error('The browser storage is in use by another tab.'));
  });
}

/**
 * Kept in the browser's own database on this device. If the browser will
 * not allow that (some private windows do not), templates are kept until
 * the page is closed instead; nothing fails.
 */
export function browserStore(): TemplateStore {
  const fallback = memoryStore();
  let database: Promise<IDBDatabase> | null = null;

  async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    database ??= openDatabase();
    const db = await database;
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(TEMPLATES, mode);
      const request = work(transaction.objectStore(TEMPLATES));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error('The browser storage failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('The browser storage gave up.'));
    });
  }

  return {
    async get(key) {
      try {
        const value: unknown = await run('readonly', (store) => store.get(key));
        return isSaved(value) ? { text: value.text, at: value.at } : await fallback.get(key);
      } catch {
        return fallback.get(key);
      }
    },
    async put(key, saved) {
      try {
        await run('readwrite', (store) => store.put({ text: saved.text, at: saved.at }, key));
      } catch {
        await fallback.put(key, saved);
      }
    },
    async clear() {
      await fallback.clear();
      try {
        await run('readwrite', (store) => store.clear());
      } catch {
        // Nothing was kept there in the first place.
      }
    },
  };
}

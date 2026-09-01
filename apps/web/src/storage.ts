import type { JournalEntry } from '@munimuni/core/journal';

const DATABASE_NAME = 'munimuni-local';
const STORE_NAME = 'entries';
const OUTBOX_STORE_NAME = 'outbox';
const FALLBACK_KEY = 'munimuni.entries';
const OUTBOX_FALLBACK_KEY = 'munimuni.outbox';

const readFallback = (): JournalEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? '[]') as JournalEntry[];
  } catch {
    return [];
  }
};

const writeFallback = (entries: JournalEntry[]) => {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(entries));
};

const readOutboxFallback = (): JournalEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_FALLBACK_KEY) ?? '[]') as JournalEntry[];
  } catch {
    return [];
  }
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'date' });
      if (!database.objectStoreNames.contains(OUTBOX_STORE_NAME)) database.createObjectStore(OUTBOX_STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const listEntries = async (): Promise<JournalEntry[]> => {
  if (!('indexedDB' in window)) return readFallback();
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as JournalEntry[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return readFallback();
  }
};

export const saveEntry = async (entry: JournalEntry, options: { queueSync?: boolean } = {}): Promise<void> => {
  const queueSync = options.queueSync ?? true;
  if (!('indexedDB' in window)) {
    const entries = readFallback().filter((item) => item.date !== entry.date);
    writeFallback([...entries, entry]);
    if (queueSync) {
      const outbox = readOutboxFallback().filter((item) => item.id !== entry.id && item.date !== entry.date);
      localStorage.setItem(OUTBOX_FALLBACK_KEY, JSON.stringify([...outbox, entry]));
    }
    return;
  }
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(queueSync ? [STORE_NAME, OUTBOX_STORE_NAME] : STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(entry);
      if (queueSync) transaction.objectStore(OUTBOX_STORE_NAME).put(entry);
      const request = transaction.objectStore(STORE_NAME).get(entry.date);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    const entries = readFallback().filter((item) => item.date !== entry.date);
    writeFallback([...entries, entry]);
  }
};

export const listPendingEntries = async (): Promise<JournalEntry[]> => {
  if (!('indexedDB' in window)) return readOutboxFallback();
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(OUTBOX_STORE_NAME, 'readonly').objectStore(OUTBOX_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as JournalEntry[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
};

export const removePendingEntries = async (entries: JournalEntry[]): Promise<void> => {
  if (entries.length === 0) return;
  if (!('indexedDB' in window)) {
    const ids = new Set(entries.map((entry) => entry.id));
    localStorage.setItem(OUTBOX_FALLBACK_KEY, JSON.stringify(readOutboxFallback().filter((entry) => !ids.has(entry.id))));
    return;
  }
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE_NAME, 'readwrite');
      for (const entry of entries) transaction.objectStore(OUTBOX_STORE_NAME).delete(entry.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // A later sync will retry these entries if the browser interrupted the write.
  }
};

export const exportEntries = (entries: JournalEntry[], format: 'markdown' | 'text'): string => {
  const activeEntries = [...entries]
    .filter((entry) => !entry.deletedAt && entry.content.trim())
    .sort((a, b) => a.date.localeCompare(b.date));
  if (format === 'text') {
    return activeEntries.map((entry) => `${entry.date}\n${entry.content.trim()}`).join('\n\n');
  }
  return activeEntries.map((entry) => `# ${entry.date}\n\n${entry.content.trim()}`).join('\n\n');
};

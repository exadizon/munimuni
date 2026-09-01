import type { JournalEntry } from '@munimuni/core/journal';

const DATABASE_NAME = 'munimuni-desktop-local';
const STORE_NAME = 'entries';
const FALLBACK_KEY = 'munimuni.entries';

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

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'date' });
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

export const saveEntry = async (entry: JournalEntry): Promise<void> => {
  if (!('indexedDB' in window)) {
    const entries = readFallback().filter((item) => item.date !== entry.date);
    writeFallback([...entries, entry]);
    return;
  }
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(entry);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    const entries = readFallback().filter((item) => item.date !== entry.date);
    writeFallback([...entries, entry]);
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

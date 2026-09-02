import type { JournalEntry, MonthRecap } from '@munimuni/core/journal';

const DATABASE_NAME = 'munimuni-local';
const STORE_NAME = 'entries';
const OUTBOX_STORE_NAME = 'outbox';
const MONTH_STORE_NAME = 'monthRecaps';
const MONTH_OUTBOX_STORE_NAME = 'monthRecapOutbox';
const FALLBACK_KEY = 'munimuni.entries';
const OUTBOX_FALLBACK_KEY = 'munimuni.outbox';
const MONTH_FALLBACK_KEY = 'munimuni.monthRecaps';
const MONTH_OUTBOX_FALLBACK_KEY = 'munimuni.monthRecapOutbox';
const LOCAL_BACKUP_KEY = 'munimuni.localBackup';

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

const readLocalBackup = (dateKey: string): string => {
  try {
    return localStorage.getItem(`${LOCAL_BACKUP_KEY}.${dateKey}`) ?? '';
  } catch {
    return '';
  }
};

const writeLocalBackup = (dateKey: string, content: string) => {
  try {
    localStorage.setItem(`${LOCAL_BACKUP_KEY}.${dateKey}`, content);
    // Keep a timestamp for UI feedback and for listing backups
    localStorage.setItem(`${LOCAL_BACKUP_KEY}.${dateKey}.ts`, new Date().toISOString());
  } catch {}
};

const readOutboxFallback = (): JournalEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_FALLBACK_KEY) ?? '[]') as JournalEntry[];
  } catch {
    return [];
  }
};

const readMonthFallback = (): MonthRecap[] => {
  try {
    return JSON.parse(localStorage.getItem(MONTH_FALLBACK_KEY) ?? '[]') as MonthRecap[];
  } catch {
    return [];
  }
};

const writeMonthFallback = (recaps: MonthRecap[]) => {
  localStorage.setItem(MONTH_FALLBACK_KEY, JSON.stringify(recaps));
};

const readMonthOutboxFallback = (): MonthRecap[] => {
  try {
    return JSON.parse(localStorage.getItem(MONTH_OUTBOX_FALLBACK_KEY) ?? '[]') as MonthRecap[];
  } catch {
    return [];
  }
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 3);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'date' });
      if (!database.objectStoreNames.contains(OUTBOX_STORE_NAME)) database.createObjectStore(OUTBOX_STORE_NAME, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(MONTH_STORE_NAME)) database.createObjectStore(MONTH_STORE_NAME, { keyPath: 'month' });
      if (!database.objectStoreNames.contains(MONTH_OUTBOX_STORE_NAME)) database.createObjectStore(MONTH_OUTBOX_STORE_NAME, { keyPath: 'id' });
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
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      // Fallback resolve on success of put if oncomplete not fired due to earlier get check removal
      // Ensure we resolve even if transaction completes quickly
      setTimeout(() => resolve(), 100);
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

export const getLocalBackup = (dateKey: string): string => readLocalBackup(dateKey);
export const saveLocalBackup = (dateKey: string, content: string) => writeLocalBackup(dateKey, content);

export const getLocalBackupTimestamp = (dateKey: string): string | null => {
  try {
    return localStorage.getItem(`${LOCAL_BACKUP_KEY}.${dateKey}.ts`);
  } catch {
    return null;
  }
};

export const listLocalBackups = (): Array<{ dateKey: string; timestamp: string | null }> => {
  try {
    const result: Array<{ dateKey: string; timestamp: string | null }> = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`${LOCAL_BACKUP_KEY}.`) || key.endsWith('.ts')) continue;
      const dateKey = key.slice(LOCAL_BACKUP_KEY.length + 1);
      // Filter out non-date keys - must be YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
      result.push({ dateKey, timestamp: localStorage.getItem(`${key}.ts`) });
    }
    return result.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  } catch {
    return [];
  }
};

export const clearLocalBackup = (dateKey: string) => {
  try {
    localStorage.removeItem(`${LOCAL_BACKUP_KEY}.${dateKey}`);
    localStorage.removeItem(`${LOCAL_BACKUP_KEY}.${dateKey}.ts`);
  } catch {}
};

// Month recap storage

export const listMonthRecaps = async (): Promise<MonthRecap[]> => {
  if (!('indexedDB' in window)) return readMonthFallback();
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(MONTH_STORE_NAME, 'readonly').objectStore(MONTH_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as MonthRecap[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return readMonthFallback();
  }
};

export const saveMonthRecap = async (recap: MonthRecap, options: { queueSync?: boolean } = {}): Promise<void> => {
  const queueSync = options.queueSync ?? true;
  if (!('indexedDB' in window)) {
    const recaps = readMonthFallback().filter((item) => item.month !== recap.month);
    writeMonthFallback([...recaps, recap]);
    if (queueSync) {
      const outbox = readMonthOutboxFallback().filter((item) => item.id !== recap.id && item.month !== recap.month);
      localStorage.setItem(MONTH_OUTBOX_FALLBACK_KEY, JSON.stringify([...outbox, recap]));
    }
    return;
  }
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(queueSync ? [MONTH_STORE_NAME, MONTH_OUTBOX_STORE_NAME] : MONTH_STORE_NAME, 'readwrite');
      transaction.objectStore(MONTH_STORE_NAME).put(recap);
      if (queueSync) transaction.objectStore(MONTH_OUTBOX_STORE_NAME).put(recap);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      setTimeout(() => resolve(), 100);
    });
  } catch {
    const recaps = readMonthFallback().filter((item) => item.month !== recap.month);
    writeMonthFallback([...recaps, recap]);
  }
};

export const listPendingMonthRecaps = async (): Promise<MonthRecap[]> => {
  if (!('indexedDB' in window)) return readMonthOutboxFallback();
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(MONTH_OUTBOX_STORE_NAME, 'readonly').objectStore(MONTH_OUTBOX_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as MonthRecap[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
};

export const removePendingMonthRecaps = async (recaps: MonthRecap[]): Promise<void> => {
  if (recaps.length === 0) return;
  if (!('indexedDB' in window)) {
    const ids = new Set(recaps.map((r) => r.id));
    localStorage.setItem(MONTH_OUTBOX_FALLBACK_KEY, JSON.stringify(readMonthOutboxFallback().filter((r) => !ids.has(r.id))));
    return;
  }
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(MONTH_OUTBOX_STORE_NAME, 'readwrite');
      for (const recap of recaps) transaction.objectStore(MONTH_OUTBOX_STORE_NAME).delete(recap.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // retry later
  }
};

export const exportMonthRecaps = (recaps: MonthRecap[], format: 'markdown' | 'text'): string => {
  const active = [...recaps]
    .filter((r) => r.content.trim())
    .sort((a, b) => a.month.localeCompare(b.month));
  if (format === 'text') {
    return active.map((r) => `${r.month} recap\n${r.content.trim()}`).join('\n\n');
  }
  return active.map((r) => `# ${r.month} - Monthly Recap\n\n${r.content.trim()}`).join('\n\n');
};

export const exportAll = (entries: JournalEntry[], recaps: MonthRecap[], format: 'markdown' | 'text'): string => {
  const entriesExport = exportEntries(entries, format);
  const recapsExport = exportMonthRecaps(recaps, format);
  if (!entriesExport && !recapsExport) return '';
  if (!entriesExport) return recapsExport;
  if (!recapsExport) return entriesExport;
  return `${entriesExport}\n\n${recapsExport}`;
};

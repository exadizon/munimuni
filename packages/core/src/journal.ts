export type EntryId = string;

export interface JournalEntry {
  id: EntryId;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
}

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatLongDate = (key: string): string =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateKey(key));

export const formatMonth = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

export const countWords = (content: string): number => {
  const normalized = content.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
};

export const makeEntry = (date: string, content = ''): JournalEntry => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    date,
    content,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  };
};

export interface MonthRecap {
  id: string;
  month: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export const toMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const parseMonthKey = (key: string): Date => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

export const makeMonthRecap = (month: string, content = ''): MonthRecap => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    month,
    content,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
};

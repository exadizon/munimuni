import * as FileSystem from 'expo-file-system';
import type { JournalEntry } from '../../../packages/core/src/journal';
import { defaultPreferences, type Preferences } from './types';

const documentDirectory = FileSystem.documentDirectory;
const stateUri = documentDirectory ? `${documentDirectory}munimuni-state.json` : null;

type StoredState = {
  entries: JournalEntry[];
  pending: JournalEntry[];
  preferences: Preferences;
};

const emptyState = (): StoredState => ({ entries: [], pending: [], preferences: defaultPreferences });

export const loadState = async (): Promise<StoredState> => {
  if (!stateUri) return emptyState();
  try {
    const raw = await FileSystem.readAsStringAsync(stateUri);
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      pending: Array.isArray(parsed.pending) ? parsed.pending : [],
      preferences: { ...defaultPreferences, ...parsed.preferences },
    };
  } catch {
    return emptyState();
  }
};

export const saveState = async (state: StoredState): Promise<void> => {
  if (!stateUri) return;
  await FileSystem.writeAsStringAsync(stateUri, JSON.stringify(state));
};

export const exportEntries = (entries: JournalEntry[], format: 'markdown' | 'text'): string => {
  const active = entries
    .filter((entry) => !entry.deletedAt && entry.content.trim())
    .sort((a, b) => a.date.localeCompare(b.date));
  return format === 'markdown'
    ? active.map((entry) => `# ${entry.date}\n\n${entry.content.trim()}`).join('\n\n')
    : active.map((entry) => `${entry.date}\n${entry.content.trim()}`).join('\n\n');
};

export type { StoredState };

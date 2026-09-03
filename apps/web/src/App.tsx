'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JournalEntry, MonthReflection, YearReflection } from '@munimuni/core/journal';
import {
  countWords,
  formatLongDate,
  formatMonth,
  makeEntry,
  makeMonthReflection,
  makeYearReflection,
  parseDateKey,
  toDateKey,
  toMonthKey,
  toYearKey,
} from '@munimuni/core/journal';
import { authClient } from './auth-client';
import {
  deleteVersion,
  downloadExport as downloadExportFile,
  exportAll,
  exportDay,
  exportEntries,
  exportMonth,
  exportYear,
  getLocalBackup,
  getLocalBackupTimestamp,
  getVersionCount,
  listEntries,
  listLocalBackups,
  listMonthReflections,
  listPendingEntries,
  listPendingMonthReflections,
  listPendingYearReflections,
  listVersions,
  listYearReflections,
  removePendingEntries,
  removePendingMonthReflections,
  removePendingYearReflections,
  saveEntry,
  saveLocalBackup,
  saveMonthReflection,
  saveVersion,
  saveYearReflection,
} from './storage';
import { LandingPage } from './LandingPage';
import { LogoMark } from './Logo';
import LoadingScreen from './LoadingScreen';

type Appearance = 'system' | 'light' | 'dark';
type Accent = 'neutral' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';
type WritingFont = 'serif' | 'sans' | 'mono';
type WritingSize = 'small' | 'medium' | 'large';

const today = toDateKey(new Date());
const accents: Accent[] = ['neutral', 'blue', 'green', 'amber', 'rose', 'violet'];

const getStored = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(`munimuni.${key}`);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const saveSetting = (key: string, value: unknown) => localStorage.setItem(`munimuni.${key}`, JSON.stringify(value));

function FloppyDiskIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h12l2 2v15a1 1 0 0 1-1 1Z" />
      <path d="M7 3v5h9V3" />
      <path d="M7 21v-6h10v6" />
      <path d="M9 15h6" />
    </svg>
  );
}

function ArrowsClockwiseIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={spinning ? { animation: 'spin 0.9s linear infinite' } : undefined}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
      <path d="M3 12a9 9 0 1 0 2.64 6.36" />
      <path d="M3 21v-6h6" />
    </svg>
  );
}

function CalendarBlankIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 9h18" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function getUserInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function JournalApp({ userId }: { userId: string }) {
  const { data: session } = authClient.useSession();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [monthReflections, setMonthReflections] = useState<MonthReflection[]>([]);
  const [yearReflections, setYearReflections] = useState<YearReflection[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [content, setContent] = useState('');
  const [monthReflectionContent, setMonthReflectionContent] = useState('');
  const [yearReflectionContent, setYearReflectionContent] = useState('');
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving'>('loading');
  const [monthReflectionSaveState, setMonthReflectionSaveState] = useState<'saved' | 'saving'>('saved');
  const [yearReflectionSaveState, setYearReflectionSaveState] = useState<'saved' | 'saving'>('saved');
  const [appearance, setAppearance] = useState<Appearance>(() => getStored('appearance', 'system'));
  const [accent, setAccent] = useState<Accent>(() => getStored('accent', 'neutral'));
  const [writingFont, setWritingFont] = useState<WritingFont>(() => getStored('font', 'serif'));
  const [writingSize, setWritingSize] = useState<WritingSize>(() => getStored('size', 'medium'));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [syncState, setSyncState] = useState<'offline' | 'syncing' | 'synced' | 'pending'>('syncing');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [backupRefreshKey, setBackupRefreshKey] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'daily' | 'month-reflection' | 'year-reflection'>('daily');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<Array<{ content: string; timestamp: string }>>([]);
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const monthSaveTimer = useRef<number | undefined>(undefined);
  const syncTimer = useRef<number | undefined>(undefined);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const monthReflectionRef = useRef<HTMLTextAreaElement | null>(null);
  const yearReflectionRef = useRef<HTMLTextAreaElement | null>(null);

  const activeEditorRef = useCallback(() => {
    if (editorMode === 'month-reflection') return monthReflectionRef.current;
    if (editorMode === 'year-reflection') return yearReflectionRef.current;
    return editorRef.current;
  }, [editorMode]);

  const entryForDate = entries.find((entry) => entry.date === selectedDate && !entry.deletedAt);
  const currentMonthKey = toMonthKey(month);
  const currentYearKey = toYearKey(new Date());
  const monthReflectionForCurrentMonth = monthReflections.find((r) => r.month === currentMonthKey);
  const yearReflectionForCurrentYear = yearReflections.find((r) => r.year === currentYearKey);

  const syncWithServer = useCallback(async () => {
    setSyncState('syncing');
    try {
      const pending = await listPendingEntries();
      const pendingMonthReflections = await listPendingMonthReflections();
      const pendingYearReflections = await listPendingYearReflections();
      const hasPending = pending.length > 0 || pendingMonthReflections.length > 0 || pendingYearReflections.length > 0;
      const response = await fetch('/api/sync', {
        method: hasPending ? 'POST' : 'GET',
        headers: hasPending ? { 'Content-Type': 'application/json' } : undefined,
        body: hasPending ? JSON.stringify({ entries: pending, monthReflections: pendingMonthReflections, yearReflections: pendingYearReflections }) : undefined,
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Sync unavailable');
      const payload = (await response.json()) as { entries: JournalEntry[]; monthReflections?: MonthReflection[]; yearReflections?: YearReflection[] };
      for (const entry of payload.entries) await saveEntry(entry, { queueSync: false });
      if (payload.monthReflections) {
        for (const recap of payload.monthReflections) await saveMonthReflection(recap, { queueSync: false });
      }
      if (payload.yearReflections) {
        for (const recap of payload.yearReflections) await saveYearReflection(recap, { queueSync: false });
      }
      setEntries((current) => {
        const next = new Map(current.map((entry) => [entry.date, entry]));
        for (const entry of payload.entries) next.set(entry.date, entry);
        return [...next.values()];
      });
      if (payload.monthReflections) {
        setMonthReflections((current) => {
          const next = new Map(current.map((recap) => [recap.month, recap]));
          for (const recap of payload.monthReflections!) next.set(recap.month, recap);
          return [...next.values()];
        });
      }
      if (payload.yearReflections) {
        setYearReflections((current) => {
          const next = new Map(current.map((recap) => [recap.year, recap]));
          for (const recap of payload.yearReflections!) next.set(recap.year, recap);
          return [...next.values()];
        });
      }
      await removePendingEntries(pending);
      await removePendingMonthReflections(pendingMonthReflections);
      await removePendingYearReflections(pendingYearReflections);
      setSyncState('synced');
    } catch {
      setSyncState('offline');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listEntries(), listMonthReflections(), listYearReflections()]).then(([storedEntries, storedMonthReflections, storedYearReflections]) => {
      if (cancelled) return;
      setEntries(storedEntries);
      setMonthReflections(storedMonthReflections);
      setYearReflections(storedYearReflections);
      const current = storedEntries.find((entry) => entry.date === today && !entry.deletedAt);
      setContent(current?.content ?? '');
      const initialMonthKey = toMonthKey(new Date());
      const monthReflection = storedMonthReflections.find((r) => r.month === initialMonthKey);
      setMonthReflectionContent(monthReflection?.content ?? '');
      const initialYearKey = toYearKey(new Date());
      const yearReflection = storedYearReflections.find((r) => r.year === initialYearKey);
      setYearReflectionContent(yearReflection?.content ?? '');
      setSaveState('saved');
      void syncWithServer();
    });
    return () => {
      cancelled = true;
    };
  }, [userId, syncWithServer]);

  // Keep month reflection content in sync when month changes or reflections update from sync
  useEffect(() => {
    const recap = monthReflections.find((r) => r.month === currentMonthKey);
    // Only update if not currently editing that month (avoid overwriting user typing)
    // We check if the textarea is focused - if not focused, we can safely update
    if (document.activeElement !== monthReflectionRef.current) {
      setMonthReflectionContent(recap?.content ?? '');
    }
  }, [currentMonthKey, monthReflections]);

  // Keep year reflection content in sync when year changes or reflections update from sync
  useEffect(() => {
    const recap = yearReflections.find((r) => r.year === currentYearKey);
    if (document.activeElement !== yearReflectionRef.current) {
      setYearReflectionContent(recap?.content ?? '');
    }
  }, [currentYearKey, yearReflections]);

  useEffect(() => {
    if (saveState === 'loading') return;
    window.clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = window.setTimeout(async () => {
      const existing = entries.find((entry) => entry.date === selectedDate);
      // Avoid creating empty entries excessively - still allow clearing
      const nextContent = content;
      const entry = existing
        ? { ...existing, content: nextContent, updatedAt: new Date().toISOString(), version: existing.version + 1 }
        : makeEntry(selectedDate, nextContent);
      await saveEntry(entry);
      setEntries((current) => [...current.filter((item) => item.date !== selectedDate), entry]);
      setSaveState('saved');
      setSyncState('pending');
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => void syncWithServer(), 1_200);
    }, 700);
    return () => window.clearTimeout(saveTimer.current);
  }, [content, selectedDate, entries, saveState, syncWithServer]);

  useEffect(() => {
    window.clearTimeout(monthSaveTimer.current);
    // Don't trigger save on initial loading of monthReflections
    const existing = monthReflections.find((r) => r.month === currentMonthKey);
    if ((existing?.content ?? '') === monthReflectionContent) return;
    setMonthReflectionSaveState('saving');
    monthSaveTimer.current = window.setTimeout(async () => {
      const recap = existing
        ? { ...existing, content: monthReflectionContent, updatedAt: new Date().toISOString(), version: existing.version + 1 }
        : makeMonthReflection(currentMonthKey, monthReflectionContent);
      await saveMonthReflection(recap);
      setMonthReflections((current) => [...current.filter((r) => r.month !== currentMonthKey), recap]);
      setMonthReflectionSaveState('saved');
      setSyncState('pending');
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => void syncWithServer(), 1_200);
    }, 700);
    return () => window.clearTimeout(monthSaveTimer.current);
  }, [monthReflectionContent, currentMonthKey, monthReflections, syncWithServer]);

  // Year reflection save effect
  useEffect(() => {
    window.clearTimeout(monthSaveTimer.current);
    const existing = yearReflections.find((r) => r.year === currentYearKey);
    if ((existing?.content ?? '') === yearReflectionContent) return;
    setYearReflectionSaveState('saving');
    monthSaveTimer.current = window.setTimeout(async () => {
      const recap = existing
        ? { ...existing, content: yearReflectionContent, updatedAt: new Date().toISOString(), version: existing.version + 1 }
        : makeYearReflection(currentYearKey, yearReflectionContent);
      await saveYearReflection(recap);
      setYearReflections((current) => [...current.filter((r) => r.year !== currentYearKey), recap]);
      setYearReflectionSaveState('saved');
      setSyncState('pending');
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => void syncWithServer(), 1_200);
    }, 700);
    return () => window.clearTimeout(monthSaveTimer.current);
  }, [yearReflectionContent, currentYearKey, yearReflections, syncWithServer]);

  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.writingFont = writingFont;
    document.documentElement.dataset.writingSize = writingSize;
    saveSetting('appearance', appearance);
    saveSetting('accent', accent);
    saveSetting('font', writingFont);
    saveSetting('size', writingSize);
  }, [appearance, accent, writingFont, writingSize]);

  // Only autofocus on devices with a fine pointer (desktop). On touch devices
  // autofocus opens the keyboard on load and yanks the viewport to the top.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    activeEditorRef()?.focus({ preventScroll: true });
    // Run once on mount; mode changes are user-initiated and keep focus naturally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoGrow = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    // Mobile (same breakpoint as the CSS): the editor is a stable internal
    // scroller, so never touch its height there - per-keystroke resizing is
    // what made typing jump. Matched on width, not pointer, so it stays in
    // sync with the layout including touch-laptops and narrow windows.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches) {
      el.style.height = '';
      return;
    }
    // Reset to auto to measure scrollHeight correctly, then pin the height.
    el.style.height = 'auto';
    const nextHeight = Math.max(el.scrollHeight, window.innerHeight * 0.45);
    el.style.height = `${nextHeight}px`;
  }, []);

  // Auto-grow all editors so the page scrolls instead of trapping text inside
  // a fixed nested scroller where the keyboard can cover it.
  useEffect(() => {
    autoGrow(editorRef.current);
  }, [content, autoGrow, writingFont, writingSize, editorMode]);

  useEffect(() => {
    autoGrow(monthReflectionRef.current);
  }, [monthReflectionContent, autoGrow, writingFont, writingSize, editorMode]);

  useEffect(() => {
    autoGrow(yearReflectionRef.current);
  }, [yearReflectionContent, autoGrow, writingFont, writingSize, editorMode]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  }, [month]);

  const entryDates = useMemo(() => new Set(entries.filter((entry) => entry.content.trim() && !entry.deletedAt).map((entry) => entry.date)), [entries]);

  const selectDate = (date: string) => {
    window.clearTimeout(saveTimer.current);
    const current = entries.find((entry) => entry.date === selectedDate);
    if (current && current.content !== content) {
      const updated = { ...current, content, updatedAt: new Date().toISOString(), version: current.version + 1 };
      void saveEntry(updated);
      setEntries((items) => [...items.filter((item) => item.date !== selectedDate), updated]);
      setSyncState('pending');
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => void syncWithServer(), 1_200);
    }
    const next = entries.find((entry) => entry.date === date && !entry.deletedAt);
    setSelectedDate(date);
    setContent(next?.content ?? '');
    setCalendarOpen(false);
    setSaveState('saved');
    setEditorMode('daily');
  };

  const changeMonth = (offset: number) => {
    // Flush current month reflection before switching
    window.clearTimeout(monthSaveTimer.current);
    const existing = monthReflections.find((r) => r.month === currentMonthKey);
    if (existing && existing.content !== monthReflectionContent) {
      const updated = { ...existing, content: monthReflectionContent, updatedAt: new Date().toISOString(), version: existing.version + 1 };
      void saveMonthReflection(updated);
      setMonthReflections((items) => [...items.filter((r) => r.month !== currentMonthKey), updated]);
    } else if (!existing && monthReflectionContent.trim()) {
      const created = makeMonthReflection(currentMonthKey, monthReflectionContent);
      void saveMonthReflection(created);
      setMonthReflections((items) => [...items, created]);
    }
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handleManualSave = () => {
    saveLocalBackup(selectedDate, content);
    setSaveFeedback('Saved locally');
    setBackupRefreshKey((k) => k + 1);
    window.setTimeout(() => setSaveFeedback(null), 2000);
  };

  const handleManualSync = async () => {
    // Flush any pending daily save
    window.clearTimeout(saveTimer.current);
    window.clearTimeout(monthSaveTimer.current);
    window.clearTimeout(syncTimer.current);

    const existing = entries.find((entry) => entry.date === selectedDate);
    const existingContent = existing?.content ?? '';
    if (content !== existingContent) {
      const entry = existing
        ? { ...existing, content, updatedAt: new Date().toISOString(), version: existing.version + 1 }
        : makeEntry(selectedDate, content);
      await saveEntry(entry);
      setEntries((current) => [...current.filter((item) => item.date !== selectedDate), entry]);
      setSaveState('saved');
    }

    const existingRecap = monthReflections.find((r) => r.month === currentMonthKey);
    const existingRecapContent = existingRecap?.content ?? '';
    if (monthReflectionContent !== existingRecapContent) {
      const recap = existingRecap
        ? { ...existingRecap, content: monthReflectionContent, updatedAt: new Date().toISOString(), version: existingRecap.version + 1 }
        : makeMonthReflection(currentMonthKey, monthReflectionContent);
      await saveMonthReflection(recap);
      setMonthReflections((current) => [...current.filter((r) => r.month !== currentMonthKey), recap]);
      setMonthReflectionSaveState('saved');
    }

    await syncWithServer();
  };

  const handleRestoreBackup = (dateKey: string) => {
    const backup = getLocalBackup(dateKey);
    if (!backup) return;
    if (dateKey === selectedDate) {
      setContent(backup);
    } else {
      // Store for that date and switch
      const existing = entries.find((e) => e.date === dateKey);
      const entry = existing
        ? { ...existing, content: backup, updatedAt: new Date().toISOString(), version: existing.version + 1 }
        : makeEntry(dateKey, backup);
      void saveEntry(entry).then(() => {
        setEntries((curr) => [...curr.filter((i) => i.date !== dateKey), entry]);
        selectDate(dateKey);
      });
    }
    setSaveFeedback(`Restored backup for ${dateKey}`);
    window.setTimeout(() => setSaveFeedback(null), 2500);
  };

  const openHistory = () => {
    const historyKey = editorMode === 'year-reflection' ? currentYearKey : selectedDate;
    setVersions(listVersions(historyKey));
    setHistoryOpen(true);
    setVersionRefreshKey((k) => k + 1);
  };

  const handleSaveVersion = () => {
    const historyKey = editorMode === 'year-reflection' ? currentYearKey : selectedDate;
    const contentToSave = editorMode === 'year-reflection' ? yearReflectionContent : content;
    saveVersion(historyKey, contentToSave);
    setVersions(listVersions(historyKey));
    setVersionRefreshKey((k) => k + 1);
    setSaveFeedback('Version saved');
    window.setTimeout(() => setSaveFeedback(null), 2000);
  };

  const handleRestoreVersion = (versionContent: string) => {
    if (editorMode === 'year-reflection') {
      setYearReflectionContent(versionContent);
    } else {
      setContent(versionContent);
    }
    setHistoryOpen(false);
    setSaveFeedback('Version restored');
    window.setTimeout(() => setSaveFeedback(null), 2000);
  };

  const handleDeleteVersion = (index: number) => {
    const historyKey = editorMode === 'year-reflection' ? currentYearKey : selectedDate;
    deleteVersion(historyKey, index);
    setVersions(listVersions(historyKey));
    setVersionRefreshKey((k) => k + 1);
  };

  const downloadExport = (format: 'markdown' | 'text', type: 'day' | 'month' | 'year' | 'full' = 'full') => {
    let content = '';
    let filename = 'munimuni-export';
    
    switch (type) {
      case 'day': {
        const entry = entries.find((e) => e.date === selectedDate);
        content = exportDay(entry, format);
        filename = selectedDate;
        break;
      }
      case 'month': {
        content = exportMonth(entries, monthReflectionForCurrentMonth, currentMonthKey, format);
        filename = currentMonthKey;
        break;
      }
      case 'year': {
        content = exportYear(entries, monthReflections, yearReflectionForCurrentYear, currentYearKey, format);
        filename = currentYearKey;
        break;
      }
      case 'full':
      default: {
        content = exportAll(entries, monthReflections, yearReflections, format);
        filename = 'munimuni-export';
        break;
      }
    }
    
    if (content) {
      downloadExportFile(content, filename, format);
    }
  };

  const displayedDate = parseDateKey(selectedDate);
  const previousDay = toDateKey(new Date(displayedDate.getFullYear(), displayedDate.getMonth(), displayedDate.getDate() - 1));
  const nextDay = toDateKey(new Date(displayedDate.getFullYear(), displayedDate.getMonth(), displayedDate.getDate() + 1));
  const localBackups = useMemo(() => listLocalBackups(), [backupRefreshKey, saveState]);
  const hasLocalBackupForSelected = Boolean(getLocalBackup(selectedDate));

  return (
    <div className="app-shell">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <header className="topbar">
        <button className="wordmark" onClick={() => selectDate(today)} aria-label="Go to today">
          <LogoMark /> munimuni
        </button>
        <div className="topbar-actions">
          <span className="sync-status" data-tooltip="Syncs automatically when online"><span className={`status-dot ${syncState === 'syncing' ? 'syncing' : saveState === 'saving' ? 'saving' : syncState}`} />{saveState === 'saving' ? 'Saving locally' : syncState === 'syncing' ? 'Syncing securely' : syncState === 'offline' ? 'Saved locally' : syncState === 'pending' ? 'Waiting to sync' : 'Synced securely'}</span>
          <div className="user-menu-container" ref={userMenuRef}>
            <button className="avatar" onClick={() => setUserMenuOpen((open) => !open)} aria-label="Account & settings" aria-expanded={userMenuOpen}>
              {getUserInitials(session?.user?.name)}
            </button>
            {userMenuOpen && (
              <div className="user-menu">
                <div className="user-menu-header">
                  <span className="user-menu-name">{session?.user?.name ?? 'Journal'}</span>
                  <span className="user-menu-email">{session?.user?.email ?? ''}</span>
                </div>
                <div className="user-menu-divider" />
                <button className="user-menu-item" onClick={() => { setSettingsOpen(true); setUserMenuOpen(false); }}>
                  <span>Settings</span>
                  <span className="user-menu-shortcut">☰</span>
                </button>
                <button className="user-menu-item" onClick={() => { downloadExport('markdown'); setUserMenuOpen(false); }}>
                  <span>Export data</span>
                  <span className="user-menu-shortcut">↗</span>
                </button>
                <div className="user-menu-divider" />
                <button className="user-menu-item user-menu-danger" onClick={() => void authClient.signOut().then(() => window.location.assign('/'))}>
                  <span>Sign out</span>
                  <span className="user-menu-shortcut">→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="workspace">
        <aside className={`calendar-panel ${calendarOpen ? 'mobile-visible' : ''}`}>
          <div className="calendar-heading">
            <div>
              <p className="eyebrow">Your journal</p>
              <h2>{formatMonth(month)}</h2>
            </div>
            <div className="month-controls">
              <button className="small-button" onClick={() => changeMonth(-1)} aria-label="Previous month">←</button>
              <button className="small-button" onClick={() => changeMonth(1)} aria-label="Next month">→</button>
            </div>
          </div>

          <div className="month-reflection-card" onClick={() => setEditorMode('month-reflection')} data-tooltip="Write a monthly reflection">
            <div className="month-reflection-card-header">
              <span className="reflection-icon" aria-hidden="true"><CalendarBlankIcon /></span>
              <p className="reflection-label">{formatMonth(month)} reflection</p>
            </div>
            <div className="month-reflection-card-body">
              {monthReflectionContent.trim() ? (
                <>
                  <span className="reflection-word-count">{countWords(monthReflectionContent)} words</span>
                  <p className="reflection-preview">{monthReflectionContent.slice(0, 80)}{monthReflectionContent.length > 80 ? '...' : ''}</p>
                </>
              ) : (
                <p className="reflection-placeholder">Write your monthly reflection...</p>
              )}
            </div>
          </div>

          <div className="year-reflection-card" onClick={() => setEditorMode('year-reflection')} data-tooltip="Write a yearly reflection">
            <div className="year-reflection-card-header">
              <span className="reflection-icon" aria-hidden="true"><CalendarBlankIcon /></span>
              <p className="reflection-label">{new Date().getFullYear()} reflection</p>
            </div>
            <div className="year-reflection-card-body">
              {yearReflectionContent.trim() ? (
                <>
                  <span className="reflection-word-count">{countWords(yearReflectionContent)} words</span>
                  <p className="reflection-preview">{yearReflectionContent.slice(0, 80)}{yearReflectionContent.length > 80 ? '...' : ''}</p>
                </>
              ) : (
                <p className="reflection-placeholder">Write your yearly reflection...</p>
              )}
            </div>
          </div>

          <button className="today-button" onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); selectDate(today); }}>Return to today <span>⌘ T</span></button>
          <div className="calendar" aria-label="Journal calendar">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span className="weekday" key={`${day}-${index}`}>{day}</span>)}
            {calendarDays.map((day, index) => {
              if (!day) return <span className="calendar-day empty" key={`empty-${index}`} />;
              const date = toDateKey(new Date(month.getFullYear(), month.getMonth(), day));
              return <button className={`calendar-day ${date === selectedDate ? 'selected' : ''} ${date === today ? 'today' : ''}`} key={date} onClick={() => selectDate(date)}>{day}{entryDates.has(date) && <i data-tooltip="Entry written" />}</button>;
            })}
          </div>
          <div className="calendar-note"><span className="legend-dot" /> days with entries</div>
        </aside>

        <section className="editor-area">
          <div className="mobile-toolbar">
            {editorMode !== 'daily' ? (
              <button onClick={() => setEditorMode('daily')}>← <span>Back</span></button>
            ) : (
              <>
                <button onClick={() => setCalendarOpen((open) => !open)}>☷ <span>Calendar</span></button>
                <button onClick={() => selectDate(today)}>Today</button>
              </>
            )}
          </div>
          
          {editorMode === 'daily' ? (
            <>
              <div className="entry-header">
                <button className="date-nav" onClick={() => selectDate(previousDay)} aria-label="Previous day">←</button>
                <button className="date-title" onClick={() => setCalendarOpen(true)}>
                  <span className="date-label">{selectedDate === today ? 'Today' : 'Journal entry'}</span>
                  <h1>{formatLongDate(selectedDate)}</h1>
                </button>
                <button className="date-nav" onClick={() => selectDate(nextDay)} aria-label="Next day">→</button>
              </div>
              <div className="paper-wrap">
                <div className="editor-toolbar" aria-label="Editor status">
                  <span>Plain text</span>
                  <div className="editor-toolbar-actions">
                    <span className="toolbar-status">{saveState === 'saving' ? 'Saving...' : hasLocalBackupForSelected ? 'Backup available' : 'Saved on this device'}</span>
                    {saveFeedback && <span className="save-feedback" role="status">{saveFeedback}</span>}
                    <button className="history-button" onClick={openHistory} data-tooltip="Browse previous versions" title="Version history" aria-label="Version history">
                      <HistoryIcon />
                      {getVersionCount(selectedDate) > 0 && <span className="history-count">{getVersionCount(selectedDate)}</span>}
                    </button>
                    <button className="save-button" onClick={handleManualSave} data-tooltip="Save a local backup on this device" title="Save locally" aria-label="Save locally">
                      <FloppyDiskIcon />
                      <span>Save</span>
                    </button>
                    <button className="sync-button" onClick={() => void handleManualSync()} data-tooltip="Upload pending changes to the cloud" title="Sync now" aria-label="Sync now" disabled={syncState === 'syncing'}>
                      <ArrowsClockwiseIcon spinning={syncState === 'syncing'} />
                      <span>{syncState === 'syncing' ? 'Syncing' : 'Sync'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  ref={editorRef}
                  className="editor"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Begin wherever you are…"
                  aria-label={`Journal entry for ${formatLongDate(selectedDate)}`}
                  spellCheck="true"
                />
                <div className="paper-footer"><span>{countWords(content)} {countWords(content) === 1 ? 'word' : 'words'}</span><span>{entryForDate ? 'Private to you' : 'A blank page'}</span></div>
              </div>
              <p className="closing-note">No need to write every day. The page will be here when you are.</p>
            </>
          ) : editorMode === 'month-reflection' ? (
            <>
              <div className="entry-header">
                <button className="date-nav" onClick={() => setEditorMode('daily')} aria-label="Back to daily entry">←</button>
                <div className="date-title">
                  <span className="date-label">Monthly reflection</span>
                  <h1>{formatMonth(month)}</h1>
                </div>
                <span className="date-nav" />
              </div>
              <div className="paper-wrap">
                <div className="editor-toolbar" aria-label="Editor status">
                  <span>Plain text</span>
                  <div className="editor-toolbar-actions">
                    <span className="toolbar-status">{monthReflectionSaveState === 'saving' ? 'Saving...' : 'Saved on this device'}</span>
                    {saveFeedback && <span className="save-feedback" role="status">{saveFeedback}</span>}
                    <button className="save-button" onClick={() => { saveMonthReflection(makeMonthReflection(currentMonthKey, monthReflectionContent)); }} data-tooltip="Save a local backup on this device" title="Save locally" aria-label="Save locally">
                      <FloppyDiskIcon />
                      <span>Save</span>
                    </button>
                    <button className="sync-button" onClick={() => void handleManualSync()} data-tooltip="Upload pending changes to the cloud" title="Sync now" aria-label="Sync now" disabled={syncState === 'syncing'}>
                      <ArrowsClockwiseIcon spinning={syncState === 'syncing'} />
                      <span>{syncState === 'syncing' ? 'Syncing' : 'Sync'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  ref={monthReflectionRef}
                  className="editor"
                  value={monthReflectionContent}
                  onChange={(event) => setMonthReflectionContent(event.target.value)}
                  placeholder={`What shaped ${formatMonth(month)}?`}
                  aria-label={`Monthly reflection for ${formatMonth(month)}`}
                  spellCheck="true"
                />
                <div className="paper-footer"><span>{countWords(monthReflectionContent)} {countWords(monthReflectionContent) === 1 ? 'word' : 'words'}</span><span>Private to you</span></div>
              </div>
              <p className="closing-note">A month in review, just for you.</p>
            </>
          ) : (
            <>
              <div className="entry-header">
                <button className="date-nav" onClick={() => setEditorMode('daily')} aria-label="Back to daily entry">←</button>
                <div className="date-title">
                  <span className="date-label">Yearly reflection</span>
                  <h1>{new Date().getFullYear()}</h1>
                </div>
                <span className="date-nav" />
              </div>
              <div className="paper-wrap">
                <div className="editor-toolbar" aria-label="Editor status">
                  <span>Plain text</span>
                  <div className="editor-toolbar-actions">
                    <span className="toolbar-status">{yearReflectionSaveState === 'saving' ? 'Saving...' : 'Saved on this device'}</span>
                    {saveFeedback && <span className="save-feedback" role="status">{saveFeedback}</span>}
                    <button className="history-button" onClick={openHistory} data-tooltip="Browse previous versions" title="Version history" aria-label="Version history">
                      <HistoryIcon />
                      {getVersionCount(currentYearKey) > 0 && <span className="history-count">{getVersionCount(currentYearKey)}</span>}
                    </button>
                    <button className="save-button" onClick={() => { saveYearReflection(makeYearReflection(currentYearKey, yearReflectionContent)); }} data-tooltip="Save a local backup on this device" title="Save locally" aria-label="Save locally">
                      <FloppyDiskIcon />
                      <span>Save</span>
                    </button>
                    <button className="sync-button" onClick={() => void handleManualSync()} data-tooltip="Upload pending changes to the cloud" title="Sync now" aria-label="Sync now" disabled={syncState === 'syncing'}>
                      <ArrowsClockwiseIcon spinning={syncState === 'syncing'} />
                      <span>{syncState === 'syncing' ? 'Syncing' : 'Sync'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  ref={yearReflectionRef}
                  className="editor"
                  value={yearReflectionContent}
                  onChange={(event) => setYearReflectionContent(event.target.value)}
                  placeholder={`What defined ${new Date().getFullYear()}?`}
                  aria-label={`Yearly reflection for ${new Date().getFullYear()}`}
                  spellCheck="true"
                />
                <div className="paper-footer"><span>{countWords(yearReflectionContent)} {countWords(yearReflectionContent) === 1 ? 'word' : 'words'}</span><span>Private to you</span></div>
              </div>
              <p className="closing-note">A year in review, just for you.</p>
            </>
          )}
        </section>

        {settingsOpen && <aside className="settings-panel">
          <div className="settings-title"><div><p className="eyebrow">Munimuni</p><h2>Preferences</h2></div><button className="close-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button></div>
          <SettingGroup label="Appearance">
            <div className="segmented">{(['system', 'light', 'dark'] as Appearance[]).map((value) => <button className={appearance === value ? 'active' : ''} key={value} onClick={() => setAppearance(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
          </SettingGroup>
          <SettingGroup label="Accent color"><div className="accent-list">{accents.map((value) => <button className={`accent-swatch ${value} ${accent === value ? 'active' : ''}`} key={value} onClick={() => setAccent(value)} aria-label={`${value} accent`}><span /></button>)}</div></SettingGroup>
          <SettingGroup label="Writing font"><div className="font-list">{(['serif', 'sans', 'mono'] as WritingFont[]).map((value) => <button className={`${writingFont === value ? 'active' : ''} font-${value}`} key={value} onClick={() => setWritingFont(value)}>{value === 'serif' ? 'A quiet classic' : value === 'sans' ? 'A clear modern' : 'A measured typewriter'}</button>)}</div></SettingGroup>
          <SettingGroup label="Writing size"><div className="size-list">{(['small', 'medium', 'large'] as WritingSize[]).map((value) => <button className={writingSize === value ? 'active' : ''} key={value} onClick={() => setWritingSize(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></SettingGroup>
          <SettingGroup label="Data">
            <div className="export-list">
              <button onClick={() => downloadExport('markdown', 'day')}>Export today (Markdown) <span>↗</span></button>
              <button onClick={() => downloadExport('text', 'day')}>Export today (Text) <span>↗</span></button>
              <button onClick={() => downloadExport('markdown', 'month')}>Export month (Markdown) <span>↗</span></button>
              <button onClick={() => downloadExport('text', 'month')}>Export month (Text) <span>↗</span></button>
              <button onClick={() => downloadExport('markdown', 'year')}>Export year (Markdown) <span>↗</span></button>
              <button onClick={() => downloadExport('text', 'year')}>Export year (Text) <span>↗</span></button>
              <button onClick={() => downloadExport('markdown', 'full')}>Export all (Markdown) <span>↗</span></button>
              <button onClick={() => downloadExport('text', 'full')}>Export all (Text) <span>↗</span></button>
            </div>
            <div className="local-backup-section">
              <div className="backup-header">
                <span className="backup-title">Local backups</span>
                <span className="backup-count">{localBackups.length} saved</span>
              </div>
              <p className="backup-desc">Manual saves are kept on this device and never overwritten by sync. Restore if a sync overwrites your work.</p>
              {localBackups.length === 0 ? (
                <p className="backup-empty">No manual backups yet. Use Save in the editor.</p>
              ) : (
                <div className="backup-list">
                  {localBackups.slice(0, 8).map((b) => (
                    <div className="backup-item" key={b.dateKey}>
                      <div className="backup-item-info">
                        <span className="backup-date">{b.dateKey}</span>
                        {b.timestamp && <span className="backup-time">{new Date(b.timestamp).toLocaleDateString()}</span>}
                      </div>
                      <button className="backup-restore" onClick={() => handleRestoreBackup(b.dateKey)}>Restore</button>
                    </div>
                  ))}
                </div>
              )}
              {hasLocalBackupForSelected && (
                <div className="backup-current">
                  <span>Backup for {selectedDate}: {(() => { const ts = getLocalBackupTimestamp(selectedDate); return ts ? new Date(ts).toLocaleString() : 'saved'; })()}</span>
                  <button className="backup-restore" onClick={() => handleRestoreBackup(selectedDate)}>Restore this day</button>
                </div>
              )}
            </div>
          </SettingGroup>
          <SettingGroup label="Sync">
            <div className="account-card">
              <div className="account-status">
                <div className="account-user-info">
                  <span className="account-user-name">Cloud sync</span>
                  <span className="account-sync-badge">
                    <span className={`status-dot ${syncState === 'syncing' ? 'syncing' : syncState === 'pending' ? 'pending' : 'saving'}`} /> {syncState === 'syncing' ? 'Syncing' : syncState === 'offline' ? 'Offline - saved locally' : 'Cloud sync active'}
                  </span>
                </div>
              </div>
            </div>
          </SettingGroup>
          <p className="settings-footnote">Your entries are saved on this device first, then synced securely when you are signed in. Monthly reflections are saved per month and included in exports.</p>
        </aside>}

        {historyOpen && (editorMode === 'daily' || editorMode === 'year-reflection') && (
          <aside className="history-panel">
            <div className="settings-title">
              <div>
                <p className="eyebrow">Version history</p>
                <h2>{editorMode === 'year-reflection' ? currentYearKey : selectedDate}</h2>
              </div>
              <button className="close-button" onClick={() => setHistoryOpen(false)} aria-label="Close version history">×</button>
            </div>
            <div className="history-actions">
              <button className="primary-button" onClick={handleSaveVersion}>
                Save current version
              </button>
            </div>
            {versions.length === 0 ? (
              <p className="history-empty">No saved versions yet. Click "Save current version" to create a snapshot.</p>
            ) : (
              <div className="history-list">
                {versions.map((version, index) => {
                  const wordCount = version.content.trim() ? version.content.trim().split(/\s+/).length : 0;
                  const date = new Date(version.timestamp);
                  const timeAgo = getTimeAgo(date);
                  return (
                    <div className="history-item" key={version.timestamp}>
                      <div className="history-item-header">
                        <span className="history-item-time">{timeAgo}</span>
                        <span className="history-item-words">{wordCount} words</span>
                      </div>
                      <p className="history-item-preview">{version.content.slice(0, 120)}{version.content.length > 120 ? '...' : ''}</p>
                      <div className="history-item-actions">
                        <button className="history-restore" onClick={() => handleRestoreVersion(version.content)}>
                          Restore
                        </button>
                        <button className="history-delete" onClick={() => handleDeleteVersion(index)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        )}
      </main>
      <nav className="mobile-nav"><button className={!calendarOpen ? 'active' : ''} onClick={() => { setCalendarOpen(false); selectDate(today); }}>Today</button><button className={calendarOpen ? 'active' : ''} onClick={() => setCalendarOpen(true)}>Calendar</button><button className={settingsOpen ? 'active' : ''} onClick={() => setSettingsOpen((open) => !open)}>Settings</button></nav>
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="setting-group"><h3>{label}</h3>{children}</section>;
}

type Profile = { displayName: string; timezone: string; completedAt: string };

function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <LoadingScreen message="Opening your journal…" />;
  if (!session?.user) return <LandingPage />;
  return <AccountBootstrap userId={session.user.id} />;
}

function AccountBootstrap({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/profile', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Profile unavailable')))
      .then((payload: { profile: Profile | null }) => setProfile(payload.profile))
      .catch(() => setProfile(null));
  }, [userId]);

  if (profile === undefined) return <LoadingScreen message="Preparing your journal…" />;
  if (!profile) return <OnboardingScreen onComplete={setProfile} />;
  return <JournalApp userId={userId} />;
}

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

function PasswordField({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
}) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-field">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={12}
        required
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          {visible ? <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 4.8c5.2 0 8.7 4.8 9.7 7.2a14 14 0 0 1-3.2 4.4M6.3 6.3A14.8 14.8 0 0 0 2.3 12c1 2.4 4.5 7.2 9.7 7.2 1.1 0 2.2-.2 3.2-.6" /> : <><path d="M2.3 12C3.3 9.6 6.8 4.8 12 4.8s8.7 4.8 9.7 7.2c-1 2.4-4.5 7.2-9.7 7.2S3.3 14.4 2.3 12Z" /><circle cx="12" cy="12" r="2.5" /></>}
        </svg>
      </button>
    </span>
  );
}

export function AuthScreen({ initialMode = 'sign-in' }: { initialMode?: 'sign-in' | 'sign-up' }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      if (mode === 'forgot-password') {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (result.error) {
          setError(result.error.message ?? 'We could not send a reset link.');
          return;
        }
        setMessage('If an account exists for that email, a reset link is on its way.');
        return;
      }

      const result = mode === 'sign-in'
        ? await authClient.signIn.email({ email, password, callbackURL: '/' })
        : await authClient.signUp.email({ name: name.trim(), email, password, callbackURL: '/' });
      if (result.error) {
        setError(result.error.message ?? 'We could not complete that request.');
        return;
      }
      window.location.assign('/');
    } catch {
      setError('We could not complete that request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand"><LogoMark /><span>munimuni</span></div>
        <p className="eyebrow">A quiet place for your thoughts</p>
        <h1>{mode === 'sign-in' ? 'Welcome back.' : mode === 'sign-up' ? 'Make space to begin.' : 'Reset your password.'}</h1>
        <p className="auth-intro">{mode === 'forgot-password' ? 'Enter your email and we’ll send a secure link if there’s an account for it.' : 'Your journal stays yours. Sign in to carry it securely between your devices.'}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === 'sign-up' && <label>What should we call you?<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={80} /></label>}
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          {mode !== 'forgot-password' && <label>Password<PasswordField value={password} onChange={setPassword} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /><small>Use at least 12 characters.</small></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="primary-button" disabled={submitting}>{submitting ? 'Working…' : mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Email reset link'}</button>
        </form>
        {mode === 'sign-in' && <button className="auth-switch auth-forgot" onClick={() => { setError(''); setMessage(''); setMode('forgot-password'); }}>Forgot password?</button>}
        <button className="auth-switch" onClick={() => { setError(''); setMessage(''); setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); }}>{mode === 'forgot-password' ? 'Back to sign in' : mode === 'sign-in' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
      </div>
    </main>
  );
}

export function PasswordResetScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('This reset link is missing or expired. Request a new one.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        setError(result.error.message ?? 'We could not reset your password.');
        return;
      }
      setMessage('Your password has been updated. You can sign in now.');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('We could not reset your password. Please request a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  if (token === null) {
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand"><LogoMark /><span>munimuni</span></div>
          <p className="eyebrow">Password reset</p>
          <h1>That link is no longer valid.</h1>
          <p className="auth-intro">Request another reset link from the sign-in page and we’ll get you back in.</p>
          <button className="primary-button" onClick={() => window.location.assign('/auth/sign-in')}>Return to sign in</button>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand"><LogoMark /><span>munimuni</span></div>
        <p className="eyebrow">Password reset</p>
        <h1>Choose a new password.</h1>
        <p className="auth-intro">Use at least 12 characters. This will replace your old password on every device.</p>
        <form onSubmit={submit} className="auth-form">
          <label>New password<PasswordField value={newPassword} onChange={setNewPassword} autoComplete="new-password" /></label>
          <label>Confirm password<PasswordField value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="primary-button" disabled={submitting}>{submitting ? 'Updating…' : 'Update password'}</button>
        </form>
        {message && <button className="auth-switch" onClick={() => window.location.assign('/auth/sign-in')}>Return to sign in</button>}
      </div>
    </main>
  );
}

function OnboardingScreen({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ displayName, timezone }),
    });
    const payload = await response.json().catch(() => null) as { profile?: Profile; error?: string } | null;
    setSubmitting(false);
    if (!response.ok || !payload?.profile) {
      setError(payload?.error ?? 'We could not save your preferences.');
      return;
    }
    onComplete(payload.profile);
  };

  return (
    <main className="auth-screen onboarding-screen">
      <div className="auth-card">
        <div className="auth-brand"><LogoMark /><span>munimuni</span></div>
        <p className="eyebrow">Before your first page</p>
        <h1>Let’s make this yours.</h1>
        <p className="auth-intro">A couple of quiet details help Munimuni keep your dates right across devices.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Your name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" autoFocus required maxLength={80} /></label>
          <label>Time zone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} required maxLength={80} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={submitting}>{submitting ? 'Saving…' : 'Open my journal'}</button>
        </form>
      </div>
    </main>
  );
}

export default App;

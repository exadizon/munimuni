'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JournalEntry, MonthRecap } from '@munimuni/core/journal';
import {
  countWords,
  formatLongDate,
  formatMonth,
  makeEntry,
  makeMonthRecap,
  parseDateKey,
  toDateKey,
  toMonthKey,
} from '@munimuni/core/journal';
import { authClient } from './auth-client';
import {
  exportAll,
  exportEntries,
  getLocalBackup,
  getLocalBackupTimestamp,
  listEntries,
  listLocalBackups,
  listMonthRecaps,
  listPendingEntries,
  listPendingMonthRecaps,
  removePendingEntries,
  removePendingMonthRecaps,
  saveEntry,
  saveLocalBackup,
  saveMonthRecap,
} from './storage';
import { LandingPage } from './LandingPage';
import { LogoMark } from './Logo';

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

function JournalApp({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [monthRecaps, setMonthRecaps] = useState<MonthRecap[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [content, setContent] = useState('');
  const [monthRecapContent, setMonthRecapContent] = useState('');
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving'>('loading');
  const [monthRecapSaveState, setMonthRecapSaveState] = useState<'saved' | 'saving'>('saved');
  const [appearance, setAppearance] = useState<Appearance>(() => getStored('appearance', 'system'));
  const [accent, setAccent] = useState<Accent>(() => getStored('accent', 'neutral'));
  const [writingFont, setWritingFont] = useState<WritingFont>(() => getStored('font', 'serif'));
  const [writingSize, setWritingSize] = useState<WritingSize>(() => getStored('size', 'medium'));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [syncState, setSyncState] = useState<'offline' | 'syncing' | 'synced' | 'pending'>('syncing');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [backupRefreshKey, setBackupRefreshKey] = useState(0);
  const saveTimer = useRef<number | undefined>(undefined);
  const monthSaveTimer = useRef<number | undefined>(undefined);
  const syncTimer = useRef<number | undefined>(undefined);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const monthRecapRef = useRef<HTMLTextAreaElement | null>(null);

  const entryForDate = entries.find((entry) => entry.date === selectedDate && !entry.deletedAt);
  const currentMonthKey = toMonthKey(month);
  const monthRecapForCurrentMonth = monthRecaps.find((recap) => recap.month === currentMonthKey);

  const syncWithServer = useCallback(async () => {
    setSyncState('syncing');
    try {
      const pending = await listPendingEntries();
      const pendingRecaps = await listPendingMonthRecaps();
      const hasPending = pending.length > 0 || pendingRecaps.length > 0;
      const response = await fetch('/api/sync', {
        method: hasPending ? 'POST' : 'GET',
        headers: hasPending ? { 'Content-Type': 'application/json' } : undefined,
        body: hasPending ? JSON.stringify({ entries: pending, monthRecaps: pendingRecaps }) : undefined,
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Sync unavailable');
      const payload = (await response.json()) as { entries: JournalEntry[]; monthRecaps?: MonthRecap[] };
      for (const entry of payload.entries) await saveEntry(entry, { queueSync: false });
      if (payload.monthRecaps) {
        for (const recap of payload.monthRecaps) await saveMonthRecap(recap, { queueSync: false });
      }
      setEntries((current) => {
        const next = new Map(current.map((entry) => [entry.date, entry]));
        for (const entry of payload.entries) next.set(entry.date, entry);
        return [...next.values()];
      });
      if (payload.monthRecaps) {
        setMonthRecaps((current) => {
          const next = new Map(current.map((recap) => [recap.month, recap]));
          for (const recap of payload.monthRecaps!) next.set(recap.month, recap);
          return [...next.values()];
        });
      }
      await removePendingEntries(pending);
      await removePendingMonthRecaps(pendingRecaps);
      setSyncState('synced');
    } catch {
      setSyncState('offline');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listEntries(), listMonthRecaps()]).then(([storedEntries, storedRecaps]) => {
      if (cancelled) return;
      setEntries(storedEntries);
      setMonthRecaps(storedRecaps);
      const current = storedEntries.find((entry) => entry.date === today && !entry.deletedAt);
      setContent(current?.content ?? '');
      const initialMonthKey = toMonthKey(new Date());
      const recap = storedRecaps.find((r) => r.month === initialMonthKey);
      setMonthRecapContent(recap?.content ?? '');
      setSaveState('saved');
      void syncWithServer();
    });
    return () => {
      cancelled = true;
    };
  }, [userId, syncWithServer]);

  // Keep month recap content in sync when month changes or recaps update from sync
  useEffect(() => {
    const recap = monthRecaps.find((r) => r.month === currentMonthKey);
    // Only update if not currently editing that month (avoid overwriting user typing)
    // We check if the textarea is focused - if not focused, we can safely update
    if (document.activeElement !== monthRecapRef.current) {
      setMonthRecapContent(recap?.content ?? '');
    }
  }, [currentMonthKey, monthRecaps]);

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
    // Don't trigger save on initial loading of monthRecaps
    const existing = monthRecaps.find((r) => r.month === currentMonthKey);
    if ((existing?.content ?? '') === monthRecapContent) return;
    setMonthRecapSaveState('saving');
    monthSaveTimer.current = window.setTimeout(async () => {
      const recap = existing
        ? { ...existing, content: monthRecapContent, updatedAt: new Date().toISOString(), version: existing.version + 1 }
        : makeMonthRecap(currentMonthKey, monthRecapContent);
      await saveMonthRecap(recap);
      setMonthRecaps((current) => [...current.filter((r) => r.month !== currentMonthKey), recap]);
      setMonthRecapSaveState('saved');
      setSyncState('pending');
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => void syncWithServer(), 1_200);
    }, 700);
    return () => window.clearTimeout(monthSaveTimer.current);
  }, [monthRecapContent, currentMonthKey, monthRecaps, syncWithServer]);

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

  // Auto-grow editor but keep scrollable for mobile keyboard
  useEffect(() => {
    if (!editorRef.current) return;
    const el = editorRef.current;
    // Reset to auto to measure scrollHeight correctly, but cap at content height
    // With overflow: auto, this allows browser to keep caret visible when keyboard opens
    el.style.height = 'auto';
    const nextHeight = Math.max(el.scrollHeight, window.innerHeight * 0.45);
    el.style.height = `${nextHeight}px`;
  }, [content]);

  // Keep caret visible when virtual keyboard resizes viewport (mobile) - throttled, only when keyboard likely open
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (document.activeElement !== editorRef.current || !editorRef.current) return;
        // Only act when viewport shrank significantly (keyboard open), not on alt-tab restore
        const keyboardHeight = window.innerHeight - viewport.height;
        if (keyboardHeight < 120) return;
        // Ensure caret is visible without forcing scroll when not needed
        try {
          editorRef.current.scrollIntoView({ block: 'nearest' });
        } catch {}
      });
    };
    viewport.addEventListener('resize', handleResize);
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      viewport.removeEventListener('resize', handleResize);
    };
  }, []);

  // Auto-grow month recap textarea
  useEffect(() => {
    if (!monthRecapRef.current) return;
    const el = monthRecapRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 72), 200)}px`;
  }, [monthRecapContent, month]);

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
  };

  const changeMonth = (offset: number) => {
    // Flush current month recap before switching
    window.clearTimeout(monthSaveTimer.current);
    const existing = monthRecaps.find((r) => r.month === currentMonthKey);
    if (existing && existing.content !== monthRecapContent) {
      const updated = { ...existing, content: monthRecapContent, updatedAt: new Date().toISOString(), version: existing.version + 1 };
      void saveMonthRecap(updated);
      setMonthRecaps((items) => [...items.filter((r) => r.month !== currentMonthKey), updated]);
    } else if (!existing && monthRecapContent.trim()) {
      const created = makeMonthRecap(currentMonthKey, monthRecapContent);
      void saveMonthRecap(created);
      setMonthRecaps((items) => [...items, created]);
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

    const existingRecap = monthRecaps.find((r) => r.month === currentMonthKey);
    const existingRecapContent = existingRecap?.content ?? '';
    if (monthRecapContent !== existingRecapContent) {
      const recap = existingRecap
        ? { ...existingRecap, content: monthRecapContent, updatedAt: new Date().toISOString(), version: existingRecap.version + 1 }
        : makeMonthRecap(currentMonthKey, monthRecapContent);
      await saveMonthRecap(recap);
      setMonthRecaps((current) => [...current.filter((r) => r.month !== currentMonthKey), recap]);
      setMonthRecapSaveState('saved');
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

  const downloadExport = (format: 'markdown' | 'text') => {
    const blob = new Blob([format === 'markdown' || format === 'text' ? exportAll(entries, monthRecaps, format) : exportEntries(entries, format)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `munimuni-export.${format === 'markdown' ? 'md' : 'txt'}`;
    link.click();
    URL.revokeObjectURL(url);
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
          <span className="sync-status"><span className={`status-dot ${syncState === 'syncing' ? 'syncing' : saveState === 'saving' ? 'saving' : syncState}`} />{saveState === 'saving' ? 'Saving locally' : syncState === 'syncing' ? 'Syncing securely' : syncState === 'offline' ? 'Saved locally' : syncState === 'pending' ? 'Waiting to sync' : 'Synced securely'}</span>
          <button className="icon-button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Open settings">☼</button>
          <button className="avatar" onClick={() => void authClient.signOut().then(() => window.location.assign('/'))} aria-label="Sign out">M</button>
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

          <div className="month-recap">
            <div className="month-recap-header">
              <span className="recap-icon" aria-hidden="true"><CalendarBlankIcon /></span>
              <p className="recap-label">Monthly recap</p>
              <span className="recap-status">{monthRecapSaveState === 'saving' ? 'Saving...' : monthRecapContent.trim() ? `${countWords(monthRecapContent)} words` : 'A quiet summary'}</span>
            </div>
            <textarea
              ref={monthRecapRef}
              value={monthRecapContent}
              onChange={(event) => setMonthRecapContent(event.target.value)}
              placeholder={`What shaped ${formatMonth(month)}?`}
              aria-label={`Monthly recap for ${formatMonth(month)}`}
              rows={3}
            />
          </div>

          <button className="today-button" onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); selectDate(today); }}>Return to today <span>⌘ T</span></button>
          <div className="calendar" aria-label="Journal calendar">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span className="weekday" key={`${day}-${index}`}>{day}</span>)}
            {calendarDays.map((day, index) => {
              if (!day) return <span className="calendar-day empty" key={`empty-${index}`} />;
              const date = toDateKey(new Date(month.getFullYear(), month.getMonth(), day));
              return <button className={`calendar-day ${date === selectedDate ? 'selected' : ''} ${date === today ? 'today' : ''}`} key={date} onClick={() => selectDate(date)}>{day}{entryDates.has(date) && <i />}</button>;
            })}
          </div>
          <div className="calendar-note"><span className="legend-dot" /> days with entries</div>
        </aside>

        <section className="editor-area">
          <div className="mobile-toolbar">
            <button onClick={() => setCalendarOpen((open) => !open)}>☷ <span>Calendar</span></button>
            <button onClick={() => selectDate(today)}>Today</button>
          </div>
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
                <button className="save-button" onClick={handleManualSave} title="Save locally" aria-label="Save locally">
                  <FloppyDiskIcon />
                  <span>Save</span>
                </button>
                <button className="sync-button" onClick={() => void handleManualSync()} title="Sync now" aria-label="Sync now" disabled={syncState === 'syncing'}>
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
              autoFocus
            />
            <div className="paper-footer"><span>{countWords(content)} {countWords(content) === 1 ? 'word' : 'words'}</span><span>{entryForDate ? 'Private to you' : 'A blank page'}</span></div>
          </div>
          <p className="closing-note">No need to write every day. The page will be here when you are.</p>
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
              <button onClick={() => downloadExport('markdown')}>Export Markdown <span>↗</span></button>
              <button onClick={() => downloadExport('text')}>Export plain text <span>↗</span></button>
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
          <SettingGroup label="Account">
            <div className="account-card">
              <div className="account-status">
                <div className="account-user-info">
                  <span className="account-user-name">Personal Journal</span>
                  <span className="account-sync-badge">
                    <span className={`status-dot ${syncState === 'syncing' ? 'syncing' : syncState === 'pending' ? 'pending' : 'saving'}`} /> {syncState === 'syncing' ? 'Syncing' : syncState === 'offline' ? 'Offline - saved locally' : 'Cloud sync active'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="signout-button"
                onClick={() => void authClient.signOut().then(() => window.location.assign('/'))}
              >
                <span>Log out</span>
                <span>→</span>
              </button>
            </div>
          </SettingGroup>
          <p className="settings-footnote">Your entries are saved on this device first, then synced securely when you are signed in. Monthly recaps are saved per month and included in exports.</p>
        </aside>}
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

  if (isPending) return <div className="auth-loading">Opening your journal…</div>;
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

  if (profile === undefined) return <div className="auth-loading">Preparing your journal…</div>;
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

import { LogoMark } from './Logo';
import LoadingScreen from './LoadingScreen';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  countWords,
  formatLongDate,
  formatMonth,
  makeEntry,
  parseDateKey,
  toDateKey,
  type JournalEntry,
} from '@munimuni/core/journal';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { exportEntries, listEntries, saveEntry } from './storage';

type Appearance = 'system' | 'light' | 'dark';
type Accent = 'neutral' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';
type WritingFont = 'serif' | 'sans' | 'mono';
type WritingSize = 'small' | 'medium' | 'large';
type Profile = { displayName: string; timezone: string; completedAt: string };

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

const saveSetting = (key: string, value: unknown) => {
  localStorage.setItem(`munimuni.${key}`, JSON.stringify(value));
};

const getStoredProfile = (): Profile | null => getStored<Profile | null>('profile', null);

function JournalApp({ profile }: { profile: Profile }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving'>('loading');
  const [appearance, setAppearance] = useState<Appearance>(() => getStored('appearance', 'system'));
  const [accent, setAccent] = useState<Accent>(() => getStored('accent', 'neutral'));
  const [writingFont, setWritingFont] = useState<WritingFont>(() => getStored('font', 'serif'));
  const [writingSize, setWritingSize] = useState<WritingSize>(() => getStored('size', 'medium'));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const entryForDate = entries.find((entry) => entry.date === selectedDate && !entry.deletedAt);

  useEffect(() => {
    let cancelled = false;
    listEntries().then((storedEntries) => {
      if (cancelled) return;
      setEntries(storedEntries);
      const current = storedEntries.find((entry) => entry.date === today && !entry.deletedAt);
      setContent(current?.content ?? '');
      setSaveState('saved');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (saveState === 'loading') return;
    window.clearTimeout(saveTimer.current);
    setSaveState('saving');

    saveTimer.current = window.setTimeout(async () => {
      const existing = entries.find((entry) => entry.date === selectedDate);
      const entry = existing
        ? { ...existing, content, updatedAt: new Date().toISOString(), version: existing.version + 1 }
        : makeEntry(selectedDate, content);
      await saveEntry(entry);
      setEntries((current) => [...current.filter((item) => item.date !== selectedDate), entry]);
      setSaveState('saved');
    }, 700);

    return () => window.clearTimeout(saveTimer.current);
  }, [content, selectedDate]);

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

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.style.height = 'auto';
    editorRef.current.style.height = `${Math.max(editorRef.current.scrollHeight, window.innerHeight * 0.62)}px`;
  }, [content]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  }, [month]);

  const entryDates = useMemo(
    () => new Set(entries.filter((entry) => entry.content.trim() && !entry.deletedAt).map((entry) => entry.date)),
    [entries],
  );

  const selectDate = (date: string) => {
    window.clearTimeout(saveTimer.current);
    const current = entries.find((entry) => entry.date === selectedDate);
    if (current && current.content !== content) {
      const updated = { ...current, content, updatedAt: new Date().toISOString(), version: current.version + 1 };
      void saveEntry(updated);
      setEntries((items) => [...items.filter((item) => item.date !== selectedDate), updated]);
    }
    const next = entries.find((entry) => entry.date === date && !entry.deletedAt);
    setSelectedDate(date);
    setContent(next?.content ?? '');
    setSaveState('saved');
  };

  const changeMonth = (offset: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const downloadExport = async (format: 'markdown' | 'text') => {
    const contentToExport = exportEntries(entries, format);

    try {
      const filePath = await save({
        defaultPath: `munimuni-export.${format === 'markdown' ? 'md' : 'txt'}`,
        filters: [
          {
            name: format === 'markdown' ? 'Markdown' : 'Text',
            extensions: [format === 'markdown' ? 'md' : 'txt'],
          },
        ],
      });
      if (filePath) {
        await writeTextFile(filePath, contentToExport);
        return;
      }
    } catch {
      // Fall back to browser download behavior.
    }

    const blob = new Blob([contentToExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `munimuni-export.${format === 'markdown' ? 'md' : 'txt'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const shortcut = event.metaKey || event.ctrlKey;

      if (shortcut && key === 't') {
        event.preventDefault();
        setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
        selectDate(today);
      }

      if (shortcut && key === ',') {
        event.preventDefault();
        setSettingsOpen((open) => !open);
      }

      if (event.key === 'Escape') {
        setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entries, content, selectedDate]);

  const displayedDate = parseDateKey(selectedDate);
  const previousDay = toDateKey(new Date(displayedDate.getFullYear(), displayedDate.getMonth(), displayedDate.getDate() - 1));
  const nextDay = toDateKey(new Date(displayedDate.getFullYear(), displayedDate.getMonth(), displayedDate.getDate() + 1));

  return (
    <div className="app-shell">
      <header className="topbar" data-tauri-drag-region>
        <button className="wordmark" onClick={() => selectDate(today)} aria-label="Go to today">
          <LogoMark /> munimuni
        </button>
        <div className="topbar-actions">
          <span className="sync-status">
            <span className={`status-dot ${saveState}`} />
            {saveState === 'saving' ? 'Saving locally' : 'Saved on this device'}
          </span>
          <button className="icon-button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Open settings">
            ☼
          </button>
          <span className="avatar" aria-label={`Signed in as ${profile.displayName}`}>
            {profile.displayName.slice(0, 1).toUpperCase()}
          </span>
        </div>
      </header>

      <main className="workspace">
        <aside className="calendar-panel">
          <div className="calendar-heading">
            <div>
              <p className="eyebrow">Your journal</p>
              <h2>{formatMonth(month)}</h2>
            </div>
            <div className="month-controls">
              <button className="small-button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                ←
              </button>
              <button className="small-button" onClick={() => changeMonth(1)} aria-label="Next month">
                →
              </button>
            </div>
          </div>
          <button
            className="today-button"
            onClick={() => {
              setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
              selectDate(today);
            }}
          >
            Return to today <span>⌘/Ctrl + T</span>
          </button>
          <div className="calendar" aria-label="Journal calendar">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span className="weekday" key={`${day}-${index}`}>
                {day}
              </span>
            ))}
            {calendarDays.map((day, index) => {
              if (!day) return <span className="calendar-day empty" key={`empty-${index}`} />;
              const date = toDateKey(new Date(month.getFullYear(), month.getMonth(), day));
              return (
                <button
                  className={`calendar-day ${date === selectedDate ? 'selected' : ''} ${date === today ? 'today' : ''}`}
                  key={date}
                  onClick={() => selectDate(date)}
                >
                  {day}
                  {entryDates.has(date) && <i />}
                </button>
              );
            })}
          </div>
          <div className="calendar-note">
            <span className="legend-dot" /> days with entries
          </div>
        </aside>

        <section className="editor-area">
          <div className="entry-header">
            <button className="date-nav" onClick={() => selectDate(previousDay)} aria-label="Previous day">
              ←
            </button>
            <button className="date-title">
              <span className="date-label">{selectedDate === today ? 'Today' : 'Journal entry'}</span>
              <h1>{formatLongDate(selectedDate)}</h1>
            </button>
            <button className="date-nav" onClick={() => selectDate(nextDay)} aria-label="Next day">
              →
            </button>
          </div>
          <div className="paper-wrap">
            <div className="editor-toolbar" aria-label="Editor status">
              <span>Plain text</span>
              <span>Saved on this device</span>
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
            <div className="paper-footer">
              <span>
                {countWords(content)} {countWords(content) === 1 ? 'word' : 'words'}
              </span>
              <span>{entryForDate ? 'Private to you' : 'A blank page'}</span>
            </div>
          </div>
          <p className="closing-note">No need to write every day. The page will be here when you are.</p>
        </section>

        {settingsOpen && (
          <aside className="settings-panel">
            <div className="settings-title">
              <div>
                <p className="eyebrow">Munimuni</p>
                <h2>Preferences</h2>
              </div>
              <button className="close-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                ×
              </button>
            </div>
            <SettingGroup label="Appearance">
              <div className="segmented">
                {(['system', 'light', 'dark'] as Appearance[]).map((value) => (
                  <button className={appearance === value ? 'active' : ''} key={value} onClick={() => setAppearance(value)}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </SettingGroup>
            <SettingGroup label="Accent color">
              <div className="accent-list">
                {accents.map((value) => (
                  <button
                    className={`accent-swatch ${value} ${accent === value ? 'active' : ''}`}
                    key={value}
                    onClick={() => setAccent(value)}
                    aria-label={`${value} accent`}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </SettingGroup>
            <SettingGroup label="Writing font">
              <div className="font-list">
                {(['serif', 'sans', 'mono'] as WritingFont[]).map((value) => (
                  <button
                    className={`${writingFont === value ? 'active' : ''} font-${value}`}
                    key={value}
                    onClick={() => setWritingFont(value)}
                  >
                    {value === 'serif' ? 'A quiet classic' : value === 'sans' ? 'A clear modern' : 'A measured typewriter'}
                  </button>
                ))}
              </div>
            </SettingGroup>
            <SettingGroup label="Writing size">
              <div className="size-list">
                {(['small', 'medium', 'large'] as WritingSize[]).map((value) => (
                  <button className={writingSize === value ? 'active' : ''} key={value} onClick={() => setWritingSize(value)}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </SettingGroup>
            <SettingGroup label="Data">
              <div className="export-list">
                <button onClick={() => void downloadExport('markdown')}>
                  Export Markdown <span>↗</span>
                </button>
                <button onClick={() => void downloadExport('text')}>
                  Export plain text <span>↗</span>
                </button>
              </div>
            </SettingGroup>
            <SettingGroup label="Profile">
              <p className="settings-footnote">
                {profile.displayName} · {profile.timezone}
              </p>
            </SettingGroup>
            <p className="settings-footnote">Your entries are always saved on this device first.</p>
          </aside>
        )}
      </main>
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="setting-group">
      <h3>{label}</h3>
      {children}
    </section>
  );
}

function OnboardingScreen({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!displayName.trim()) {
      setError('Please add your name.');
      return;
    }

    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      setError('Please enter a valid time zone.');
      return;
    }

    const profile: Profile = {
      displayName: displayName.trim(),
      timezone: timezone.trim(),
      completedAt: new Date().toISOString(),
    };

    saveSetting('profile', profile);
    onComplete(profile);
  };

  return (
    <main className="auth-screen onboarding-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <LogoMark />
          <span>munimuni</span>
        </div>
        <p className="eyebrow">Before your first page</p>
        <h1>Let’s make this yours.</h1>
        <p className="auth-intro">A couple of quiet details help Munimuni keep your dates right on this device.</p>
        <form onSubmit={submit} className="auth-form">
          <label>
            Your name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              autoFocus
              required
              maxLength={80}
            />
          </label>
          <label>
            Time zone
            <input value={timezone} onChange={(event) => setTimezone(event.target.value)} required maxLength={80} />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button">Open my journal</button>
        </form>
      </div>
    </main>
  );
}

function App() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    setProfile(getStoredProfile());
  }, []);

  if (profile === undefined) return <LoadingScreen message="Opening your journal…" />;
  if (!profile) return <OnboardingScreen onComplete={setProfile} />;
  return <JournalApp profile={profile} />;
}

export default App;

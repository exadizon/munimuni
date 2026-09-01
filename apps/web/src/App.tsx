import { useEffect, useMemo, useRef, useState } from 'react';
import type { JournalEntry } from '@munimuni/core/journal';
import {
  countWords,
  formatLongDate,
  formatMonth,
  makeEntry,
  parseDateKey,
  toDateKey,
} from '@munimuni/core/journal';
import { exportEntries, listEntries, saveEntry } from './storage';
import './styles.css';

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

function App() {
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  const entryForDate = entries.find((entry) => entry.date === selectedDate && !entry.deletedAt);

  useEffect(() => {
    listEntries().then((storedEntries) => {
      setEntries(storedEntries);
      const current = storedEntries.find((entry) => entry.date === today && !entry.deletedAt);
      setContent(current?.content ?? '');
      setSaveState('saved');
    });
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
    }
    const next = entries.find((entry) => entry.date === date && !entry.deletedAt);
    setSelectedDate(date);
    setContent(next?.content ?? '');
    setCalendarOpen(false);
    setSaveState('saved');
  };

  const changeMonth = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  const downloadExport = (format: 'markdown' | 'text') => {
    const blob = new Blob([exportEntries(entries, format)], { type: 'text/plain;charset=utf-8' });
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="wordmark" onClick={() => selectDate(today)} aria-label="Go to today">
          <span className="wordmark-mark">m</span> munimuni
        </button>
        <div className="topbar-actions">
          <span className="sync-status"><span className={`status-dot ${saveState}`} />{saveState === 'saving' ? 'Saving locally' : 'Saved locally'}</span>
          <button className="icon-button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Open settings">☼</button>
          <button className="avatar" aria-label="Account">M</button>
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
            <div className="paper-lines" aria-hidden="true" />
            <textarea
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
          <SettingGroup label="Data"><div className="export-list"><button onClick={() => downloadExport('markdown')}>Export Markdown <span>↗</span></button><button onClick={() => downloadExport('text')}>Export plain text <span>↗</span></button></div></SettingGroup>
          <p className="settings-footnote">Your entries are saved on this device first. Cloud sync will arrive in the next layer.</p>
        </aside>}
      </main>
      <nav className="mobile-nav"><button className={!calendarOpen ? 'active' : ''} onClick={() => { setCalendarOpen(false); selectDate(today); }}>Today</button><button className={calendarOpen ? 'active' : ''} onClick={() => setCalendarOpen(true)}>Calendar</button><button className={settingsOpen ? 'active' : ''} onClick={() => setSettingsOpen((open) => !open)}>Settings</button></nav>
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="setting-group"><h3>{label}</h3>{children}</section>;
}

export default App;

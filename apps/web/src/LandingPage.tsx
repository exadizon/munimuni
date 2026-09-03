'use client';

import { useEffect, useMemo, useState } from 'react';
import { countWords, formatLongDate, formatMonth, parseDateKey, toDateKey } from '@munimuni/core/journal';
import { AuthScreen } from './App';
import { LogoMark } from './Logo';

type Appearance = 'system' | 'light' | 'dark';
type Accent = 'neutral' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';
type WritingFont = 'serif' | 'sans' | 'mono';
type WritingSize = 'small' | 'medium' | 'large';

const accents: Accent[] = ['neutral', 'blue', 'green', 'amber', 'rose', 'violet'];
const todayKey = toDateKey(new Date());

const sampleEntry = `The morning came in quiet and grey.
There is a particular kind of peace in having nowhere urgent to be, and nothing demanding to be performed. Just a cup of black coffee, cool air through the cracked window, and a blank page waiting patiently.

No notifications. No unread badges. No hurry.
Just a quiet place for your thoughts.`;

export function LandingPage({ initialAuthMode = 'sign-in' }: { initialAuthMode?: 'sign-in' | 'sign-up' }) {
  const [demoContent, setDemoContent] = useState(sampleEntry);
  const [demoFont, setDemoFont] = useState<WritingFont>('serif');
  const [demoSize, setDemoSize] = useState<WritingSize>('medium');
  const [demoAccent, setDemoAccent] = useState<Accent>('amber');
  const [demoAppearance, setDemoAppearance] = useState<Appearance>('system');
  const [demoDate, setDemoDate] = useState(todayKey);
  const [demoMonth, setDemoMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    document.documentElement.dataset.appearance = demoAppearance;
    document.documentElement.dataset.accent = demoAccent;
    document.documentElement.dataset.writingFont = demoFont;
    document.documentElement.dataset.writingSize = demoSize;
  }, [demoAppearance, demoAccent, demoFont, demoSize]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(demoMonth.getFullYear(), demoMonth.getMonth(), 1).getDay();
    const daysInMonth = new Date(demoMonth.getFullYear(), demoMonth.getMonth() + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  }, [demoMonth]);

  const displayedDate = parseDateKey(demoDate);
  const prevDay = toDateKey(new Date(displayedDate.getFullYear(), displayedDate.getMonth(), displayedDate.getDate() - 1));
  const nextDay = toDateKey(new Date(displayedDate.getFullYear(), displayedDate.getMonth(), displayedDate.getDate() + 1));

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-shell">
      {/* Top Navigation */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#" className="wordmark" aria-label="Munimuni Home">
            <LogoMark /> munimuni
          </a>

          <nav className="landing-nav-links" aria-label="Main Navigation">
            <button type="button" onClick={() => scrollToSection('experience')}>Experience</button>
            <button type="button" onClick={() => scrollToSection('features')}>Principles</button>
            <button type="button" onClick={() => scrollToSection('sync')}>Sync & Privacy</button>
            <button type="button" onClick={() => scrollToSection('typography')}>Typography</button>
            <button type="button" onClick={() => scrollToSection('download')}>Apps</button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="landing-theme-toggle"
              onClick={() => setDemoAppearance(demoAppearance === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle dark mode preview"
              title="Toggle theme preview"
            >
              {demoAppearance === 'dark' ? '☀' : '☽'}
            </button>
            <button
              type="button"
              className="landing-cta-button"
              onClick={() => scrollToSection('auth')}
            >
              Start writing
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero" id="hero">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-badge">
              <span className="status-dot saving" /> A quiet place for your thoughts
            </div>
            <h1 className="landing-headline">
              A local-first, plaintext journal designed to follow you across devices.
            </h1>
            <p className="landing-subhead">
              No algorithms, no unread badges, no streaks to maintain. Just an unhurried blank page that writes directly to your device and syncs securely to your personal account.
            </p>

            <div className="landing-pills">
              <span className="pill">IndexedDB-first</span>
              <span className="pill">Plain text & Markdown</span>
              <span className="pill">Encrypted sync</span>
              <span className="pill">Zero lock-in</span>
            </div>

            <div className="landing-hero-cta-row">
              <button
                type="button"
                className="landing-primary-button"
                onClick={() => scrollToSection('auth')}
              >
                Create your journal <span>→</span>
              </button>
              <button
                type="button"
                className="landing-secondary-button"
                onClick={() => scrollToSection('experience')}
              >
                Try the live preview <span>↓</span>
              </button>
            </div>

            <p className="landing-reassurance">
              Offline-ready from your very first word. No credit card required.
            </p>
          </div>

          <div className="landing-hero-auth" id="auth">
            <AuthScreen initialMode={initialAuthMode} />
          </div>
        </div>
      </section>

      {/* Interactive Experience Section */}
      <section className="landing-section landing-experience" id="experience">
        <div className="landing-section-header">
          <p className="eyebrow">Interactive Preview</p>
          <h2>An interface that steps out of your way.</h2>
          <p className="landing-section-desc">
            Try the calm typography, instant autosave, and restrained paper canvas right now in your browser.
          </p>
        </div>

        <div className="landing-demo-frame">
          {/* Demo Controls Bar */}
          <div className="landing-demo-bar">
            <div className="demo-control-group">
              <span className="demo-label">Font</span>
              <div className="segmented">
                <button
                  type="button"
                  className={demoFont === 'serif' ? 'active' : ''}
                  onClick={() => setDemoFont('serif')}
                >
                  Serif
                </button>
                <button
                  type="button"
                  className={demoFont === 'sans' ? 'active' : ''}
                  onClick={() => setDemoFont('sans')}
                >
                  Sans
                </button>
                <button
                  type="button"
                  className={demoFont === 'mono' ? 'active' : ''}
                  onClick={() => setDemoFont('mono')}
                >
                  Mono
                </button>
              </div>
            </div>

            <div className="demo-control-group">
              <span className="demo-label">Size</span>
              <div className="size-list">
                <button
                  type="button"
                  className={demoSize === 'small' ? 'active' : ''}
                  onClick={() => setDemoSize('small')}
                >
                  S
                </button>
                <button
                  type="button"
                  className={demoSize === 'medium' ? 'active' : ''}
                  onClick={() => setDemoSize('medium')}
                >
                  M
                </button>
                <button
                  type="button"
                  className={demoSize === 'large' ? 'active' : ''}
                  onClick={() => setDemoSize('large')}
                >
                  L
                </button>
              </div>
            </div>

            <div className="demo-control-group">
              <span className="demo-label">Accent</span>
              <div className="accent-list">
                {accents.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`accent-swatch ${item} ${demoAccent === item ? 'active' : ''}`}
                    onClick={() => setDemoAccent(item)}
                    aria-label={`${item} accent`}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Demo Journal Canvas */}
          <div className="landing-demo-canvas">
            <aside className="landing-demo-sidebar">
              <div className="calendar-heading">
                <div>
                  <p className="eyebrow">Your journal</p>
                  <h2>{formatMonth(demoMonth)}</h2>
                </div>
                <div className="month-controls">
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => setDemoMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1))}
                    aria-label="Previous month"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => setDemoMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() + 1, 1))}
                    aria-label="Next month"
                  >
                    →
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="today-button"
                onClick={() => {
                  const now = new Date(); setDemoMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setDemoDate(todayKey);
                }}
              >
                Return to today <span>⌘ T</span>
              </button>

              <div className="calendar" aria-label="Demo calendar">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <span className="weekday" key={`w-${day}-${idx}`}>{day}</span>
                ))}
                {calendarDays.map((day, idx) => {
                  if (!day) return <span className="calendar-day empty" key={`empty-${idx}`} />;
                  const date = toDateKey(new Date(demoMonth.getFullYear(), demoMonth.getMonth(), day));
                  const isSelected = date === demoDate;
                  const isToday = date === todayKey;
                  return (
                    <button
                      key={date}
                      type="button"
                      className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => setDemoDate(date)}
                    >
                      {day}
                      {(day === 2 || day === 7 || day === 14 || day === 21) && <i />}
                    </button>
                  );
                })}
              </div>
              <div className="calendar-note">
                <span className="legend-dot" /> days with entries
              </div>
            </aside>

            <div className="landing-demo-editor">
              <div className="entry-header">
                <button
                  type="button"
                  className="date-nav"
                  onClick={() => setDemoDate(prevDay)}
                  aria-label="Previous day"
                >
                  ←
                </button>
                <div className="date-title">
                  <span className="date-label">{demoDate === todayKey ? 'Today' : 'Journal entry'}</span>
                  <h1>{formatLongDate(demoDate)}</h1>
                </div>
                <button
                  type="button"
                  className="date-nav"
                  onClick={() => setDemoDate(nextDay)}
                  aria-label="Next day"
                >
                  →
                </button>
              </div>

              <div className="paper-wrap">
                <div className="editor-toolbar" aria-label="Editor status">
                  <span>Plain text</span>
                  <span>Saved on this device</span>
                </div>
                <textarea
                  className="editor"
                  value={demoContent}
                  onChange={(e) => setDemoContent(e.target.value)}
                  placeholder="Begin wherever you are..."
                  aria-label={`Interactive preview for ${formatLongDate(demoDate)}`}
                  spellCheck="true"
                  rows={8}
                />
                <div className="paper-footer">
                  <span>{countWords(demoContent)} {countWords(demoContent) === 1 ? 'word' : 'words'}</span>
                  <span>Private to you</span>
                </div>
              </div>
              <p className="closing-note">No need to write every day. The page will be here when you are.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles & Features Section */}
      <section className="landing-section landing-features" id="features">
        <div className="landing-section-header">
          <p className="eyebrow">Principles</p>
          <h2>Designed for clear, unhurried thought.</h2>
          <p className="landing-section-desc">
            Munimuni is built on core commitments to local ownership, quiet interfaces, and lasting data independence.
          </p>
        </div>

        <div className="landing-feature-grid">
          <div className="feature-card">
            <div className="feature-icon">◈</div>
            <h3>Local-first persistence</h3>
            <p>
              Your thoughts are stored in IndexedDB right on your device. Zero loading spinners, zero network latency, and fully operational when offline.
            </p>
            <span className="feature-tag">Offline-first</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">§</div>
            <h3>Plain text simplicity</h3>
            <p>
              Free from complex styling toolbars or heavy block embeds. Just raw, unvarnished words that will remain readable decades into the future.
            </p>
            <span className="feature-tag">Future-proof</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⊗</div>
            <h3>Authenticated Neon sync</h3>
            <p>
              When online, changes merge safely through your authenticated Neon Postgres backend. Your private session keeps data strictly yours.
            </p>
            <span className="feature-tag">Postgres backed</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">↗</div>
            <h3>Complete export freedom</h3>
            <p>
              Export your entire journal history to clean Markdown or plain text files whenever you wish. No lock-in, ever.
            </p>
            <span className="feature-tag">Your data is yours</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">❀</div>
            <h3>Restrained aesthetics</h3>
            <p>
              Thoughtfully curated typography with classic serif, modern sans, and typewriter monospace, paired with calming earthy accent tones.
            </p>
            <span className="feature-tag">Eye-friendly</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">✦</div>
            <h3>No streaks or guilt</h3>
            <p>
              Life does not happen on a daily metric. Munimuni has no streak trackers, guilt reminders, or gamified incentives. Write only when you want to.
            </p>
            <span className="feature-tag">Unhurried</span>
          </div>
        </div>
      </section>

      {/* Sync Architecture & Privacy Section */}
      <section className="landing-section landing-sync-section" id="sync">
        <div className="landing-section-header">
          <p className="eyebrow">Architecture</p>
          <h2>How your thoughts stay local yet synchronized.</h2>
          <p className="landing-section-desc">
            A durable, local outbox with per-user, per-day last-write-wins merging in Neon Postgres.
          </p>
        </div>

        <div className="sync-steps-grid">
          <div className="sync-step-card">
            <div className="step-num">01</div>
            <h4>Instant local write</h4>
            <p>
              Typing immediately persists into your browser's IndexedDB. Your session is never interrupted by flaky connections or slow servers.
            </p>
          </div>

          <div className="sync-step-card">
            <div className="step-num">02</div>
            <h4>Durable outbox queue</h4>
            <p>
              Pending edits are recorded in an internal queue. If you close the tab or go on an airplane, updates wait safely on your disk.
            </p>
          </div>

          <div className="sync-step-card">
            <div className="step-num">03</div>
            <h4>Secure session replay</h4>
            <p>
              Once online, pending writes are replayed to Neon Postgres over secure same-origin cookies with robust conflict resolution.
            </p>
          </div>

          <div className="sync-step-card">
            <div className="step-num">04</div>
            <h4>Cross-device calm</h4>
            <p>
              Open Munimuni on your phone, laptop, or tablet. Your journal is right where you left it, seamlessly up to date.
            </p>
          </div>
        </div>
      </section>

      {/* Typography Showcase */}
      <section className="landing-section landing-typography-section" id="typography">
        <div className="landing-section-header">
          <p className="eyebrow">Crafted Typography</p>
          <h2>Three distinct voices for your reflections.</h2>
          <p className="landing-section-desc">
            Carefully tuned line heights, character spacing, and optical sizing for effortless reading.
          </p>
        </div>

        <div className="typography-cards-grid">
          <div className="type-spec-card type-serif">
            <div className="type-meta">
              <span className="type-badge">Newsreader</span>
              <span className="type-role">A quiet classic</span>
            </div>
            <p className="type-sample">
              "We do not write in order to be understood; we write in order to understand."
            </p>
            <p className="type-desc">
              An elegant, optical-size serif tuned for long-form reflective writing and introspective prose.
            </p>
          </div>

          <div className="type-spec-card type-sans">
            <div className="type-meta">
              <span className="type-badge">DM Sans</span>
              <span className="type-role">A clear modern</span>
            </div>
            <p className="type-sample">
              "Clear thinking requires courage rather than intelligence."
            </p>
            <p className="type-desc">
              Geometric yet humane sans-serif providing high legibility for daily logs and quick observations.
            </p>
          </div>

          <div className="type-spec-card type-mono">
            <div className="type-meta">
              <span className="type-badge">DM Mono</span>
              <span className="type-role">A measured typewriter</span>
            </div>
            <p className="type-sample">
              "2026-09-02: All thoughts committed locally to disk."
            </p>
            <p className="type-desc">
              Precise, fixed-width monospace offering rhythm and structure for deliberate, ordered entries.
            </p>
          </div>
        </div>
      </section>

      {/* Get the Apps */}
      <section className="landing-section landing-download-section" id="download">
        <div className="landing-section-header">
          <p className="eyebrow">Take it with you</p>
          <h2>Your journal, on every device.</h2>
          <p className="landing-section-desc">
            The web app is the source of truth - desktop and mobile match it, release for release.
          </p>
        </div>

        <div className="landing-feature-grid">
          <div className="feature-card">
            <div>
              <p className="feature-icon" aria-hidden="true">◍</p>
              <h3>Web app</h3>
              <p>
                The full journal right in your browser. Installable as an app, usable offline,
                and synced securely when you sign in.
              </p>
            </div>
            <div>
              <span className="feature-tag">PWA - always current</span>
              <div className="banner-actions" style={{ marginTop: 16, marginBottom: 0 }}>
                <button type="button" className="landing-secondary-button" onClick={() => scrollToSection('auth')}>
                  Open the web app <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>

          <div className="feature-card">
            <div>
              <p className="feature-icon" aria-hidden="true">▣</p>
              <h3>Desktop app</h3>
              <p>
                Native Windows, macOS, and Linux builds. The same quiet editor,
                with entries saved on your device first.
              </p>
            </div>
            <div>
              <span className="feature-tag">Tauri - per release</span>
              <div className="banner-actions" style={{ marginTop: 16, marginBottom: 0 }}>
                <a
                  className="landing-secondary-button"
                  href="https://github.com/exadizon/munimuni/releases"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download for desktop <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>

          <div className="feature-card">
            <div>
              <p className="feature-icon" aria-hidden="true">▤</p>
              <h3>Mobile app</h3>
              <p>
                iOS and Android builds for writing anywhere. The same plaintext entries,
                the same private-by-default promise.
              </p>
            </div>
            <div>
              <span className="feature-tag">Expo - per release</span>
              <div className="banner-actions" style={{ marginTop: 16, marginBottom: 0 }}>
                <a
                  className="landing-secondary-button"
                  href="https://github.com/exadizon/munimuni/releases"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download for mobile <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-Footer Call to Action */}
      <section className="landing-cta-banner">
        <div className="landing-cta-banner-inner">
          <p className="eyebrow">Begin today</p>
          <h2>Make space for your thoughts.</h2>
          <p>
            Create an account in seconds or use it as an offline journal right from your browser.
          </p>
          <div className="banner-actions">
            <button
              type="button"
              className="landing-primary-button"
              onClick={() => {
                scrollToSection('auth');
                const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement | null;
                emailInput?.focus();
              }}
            >
              Get started for free
            </button>
            <button
              type="button"
              className="landing-secondary-button"
              onClick={() => scrollToSection('experience')}
            >
              Explore the journal preview
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand-block">
            <a href="#" className="wordmark">
              <LogoMark /> munimuni
            </a>
            <p className="footer-tagline">
              A quiet place for your thoughts. Local-first, plaintext, and private.
            </p>
            <p className="footer-copy">
              Munimuni - A local-first, plaintext journal.
            </p>
          </div>

          <div className="footer-links-group">
            <h5>Product</h5>
            <ul>
              <li><button type="button" onClick={() => scrollToSection('experience')}>Interactive Editor</button></li>
              <li><button type="button" onClick={() => scrollToSection('features')}>Design Principles</button></li>
              <li><button type="button" onClick={() => scrollToSection('sync')}>Sync Architecture</button></li>
              <li><button type="button" onClick={() => scrollToSection('typography')}>Typography Modes</button></li>
              <li><button type="button" onClick={() => scrollToSection('download')}>Get the Apps</button></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h5>Account</h5>
            <ul>
              <li><a href="/auth/sign-in">Sign In</a></li>
              <li><a href="/auth/sign-up">Create Account</a></li>
              <li><a href="/auth/reset-password">Reset Password</a></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h5>Data & Privacy</h5>
            <ul>
              <li><span className="footer-text">IndexedDB local storage</span></li>
              <li><span className="footer-text">Markdown export</span></li>
              <li><span className="footer-text">Neon Postgres backend</span></li>
              <li><span className="footer-text">Zero third-party trackers</span></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

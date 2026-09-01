# Munimuni

Munimuni is a quiet place for your thoughts: a local-first, plaintext journal designed to follow you across devices.

## Current slice

The first runnable slice lives in `apps/web` and includes:

- date-based journal entries with a quiet paper-like editor
- debounced local autosave to IndexedDB, with a localStorage fallback
- monthly calendar navigation and entry indicators
- word count and local saved state
- system/light/dark appearance modes
- restrained accent colors, writing font, and writing size preferences
- Markdown and plain text export
- Neon Auth sign-in/sign-up with same-origin session cookies
- first-run onboarding for display name and time zone
- durable local outbox with authenticated sync to Neon Postgres

The shared journal model and date helpers live in `packages/core`. The web client is a Next.js PWA shell so Vercel can serve the editor and secure database routes in one deployment. IndexedDB remains the first write target; pending entries are replayed to Neon when the account is available. A later native client can reuse the core journal model and sync contract without moving plaintext through the browser bundle.

## Run it

```sh
npm install
npm run dev
```

Open the local Next.js URL in a browser. To build the app:

```sh
npm run build
```

After Neon Auth is enabled, pull the linked branch variables into `apps/web/.env.local`:

```sh
npx neon@latest env pull --file apps/web/.env.local
```

Set `NEON_AUTH_COOKIE_SECRET` locally and in every Vercel environment. It must be a stable secret of at least 32 characters. Apply the database schema with:

```sh
npm run db:migrate
```

The production app must have `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET` configured as server-only variables. Add each deployed Vercel domain to Neon Auth’s trusted domains before enabling sign-in there.

Run the core tests with:

```sh
npm test
```


## Desktop app

A native desktop implementation now lives in `apps/desktop` (Tauri + React). It mirrors the web journaling experience while keeping local-first persistence and desktop-native export dialogs.

Run it with:

```sh
npm run dev:desktop
```

Build desktop binaries with:

```sh
npm run build:desktop
```

## Architecture direction

The data model uses stable IDs, timestamps, soft-delete metadata, and a version field. The browser writes to IndexedDB and an outbox first, then the authenticated server route applies per-user, per-day last-write-wins merging in Neon Postgres. Server routes never accept a user ID from the client: ownership comes from the Neon Auth session. Cross-origin state-changing requests are rejected, payloads are bounded and validated, and baseline security headers are applied by Next.js.

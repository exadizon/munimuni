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

The shared journal model and date helpers live in `packages/core`. Cloud accounts, PostgreSQL, SQLite adapters for native clients, and incremental sync are intentionally the next vertical slice; this client does not claim those features are implemented yet.

## Run it

```sh
npm install
npm run dev
```

Open the local Vite URL in a browser. To build the app:

```sh
npm run build
```

Run the core tests with:

```sh
npm test
```

## Architecture direction

The data model already includes stable IDs, timestamps, soft-delete metadata, and a version field so a future outbox and push/pull sync layer can be added without changing the editor contract. The next planned package is a persistence adapter that can share the same model with a SQLite-backed Windows/mobile client.

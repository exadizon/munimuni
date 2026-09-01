# Munimuni mobile

The native client is an Expo implementation of Munimuni's local-first journal.
It deliberately writes a small plaintext JSON state file in the app's private
Documents directory before attempting any network work. It reuses the shared
journal entry model and date helpers in `packages/core`.

## Run

```sh
npm install
npm --workspace @munimuni/mobile run start
```

Then open the project in Expo Go, an iOS simulator, or an Android emulator.

## Current scope

- Date-based journal editor with debounced local saves
- Monthly calendar with entry indicators and day navigation
- System/light/dark themes, accent colors, writing fonts, and writing sizes
- Native sharing for Markdown and plain-text exports
- Safe-area-aware mobile layout and bottom sheets

The existing server uses same-origin, cookie-based Neon Auth session routes.
Those routes are intentionally not called from the native app: a native token
exchange/API is required before authenticated sync can be enabled safely. The
mobile client retains an on-device outbox in the meantime, preserving the
web product's local-first data model without pretending a browser cookie is a
native credential.

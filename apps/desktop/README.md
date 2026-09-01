# Munimuni Desktop (Tauri)

`apps/desktop` is the native desktop shell for Munimuni, built with Tauri + React.

## Run in development

From repository root:

```sh
npm install
npm run dev:desktop
```

## Build desktop binaries

```sh
npm run build:desktop
```

## Product behavior

The desktop app follows the web app's journal experience:

- date-based entries with monthly calendar navigation
- debounced local autosave
- appearance, accent, font, and writing-size preferences
- markdown/plain-text export
- first-run profile onboarding

Desktop-specific adaptations:

- keyboard shortcuts (`⌘/Ctrl+T` for today, `⌘/Ctrl+,` for preferences)
- native save dialog for exports
- desktop-first layout and window sizing

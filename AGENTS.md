# Agent instructions
- Use `gh-axi` for GitHub and `chrome-devtools-axi` for browser automation.
- Keep commits structured around one coherent change.
- Never include a `Co-authored-by:` trailer or equivalent co-author attribution in commit messages.
- Prefer small, maintainable implementations that preserve Munimuni's local-first and plaintext principles.
- Never use the em dash. Use a plain dash "-" instead.
- When writing commit messages, NEVER auto-add your agent name as co-author.
- Never mention AI involvement, AI authorship, or AI co-authorship unless explicitly requested.
- Never manually modify CHANGELOG.md files or any files that are marked as auto-generated.
- When making technical decisions, do not give much weight to development cost. Instead, prefer quality, simplicity, robustness, scalability, and long term maintainability.
- When doing bug fixes, always start with reproducing the bug in an E2E setting as closely aligned with how an end user would experience it as possible.
- This makes sure you find the real problem so your fix will actually solve it.
- When end-to-end testing a product, be picky about the UI you see and be obsessed with pixel perfection. If something clearly looks off, even if it is not directly related to what you are doing, try to get it fixed along the way.
- Apply that same high standard to engineering excellence: lint, test failures, and test flakiness. If you see one, even if it is not caused by what you are working on right now, still get it fixed.

## Source of truth: web first

- `apps/web` is the source of truth for brand, UX copy, PWA icons/splash/loading, and feature behavior. Desktop and mobile match it, not the other way around.
- When brand or shared UX changes in web, propagate to `apps/desktop` and `apps/mobile` in the same change: icons, splash/loading screens, wordmark (Newsreader italic + pen-star mark), and theme tokens (`#151916` bg, `#e3b66d` accent).
- Never hand-draw icons. Regenerate install assets from the shared scripts: `scripts/generate-pwa-assets.mjs` (web), `scripts/generate-desktop-icons.mjs` (Tauri), `scripts/generate-mobile-assets.mjs` (Expo).
- Desktop: `npm run build` in `apps/desktop` produces the frontend `dist/` bundle. Native installers need a Rust toolchain (`npm run tauri build`); without one, only `dist/` can be verified.
- Mobile: export with `npx expo export --platform android --platform ios` in `apps/mobile` (web is covered by `apps/web`, so the Expo web platform is intentionally skipped). Keep `apps/mobile/index.js` as the local entry point (the hoisted `expo/AppEntry` resolves `../../App` outside the project in this monorepo). Only list config plugins in `app.json` that actually ship one, and keep `expo-asset` as an explicit dependency (Metro config requires it and it is not reliably hoisted).
- Release artifacts (desktop installers, mobile builds) are published on GitHub Releases - the website download section links there.

## Test account (E2E / manual checks - isolated from personal data by user_id)

- Email: test@munimuni.test
- Password: MunimuniTest123!@#
- Name: Test Journal
- Created via `npm run seed:test-account` (checks `neon_auth."user"` and inserts `profiles` if missing) - requires `TEST_ACCOUNT_EMAIL` to contain `test` as guard
- Reset server data only: `npm run reset:test-account` (deletes `journal_entries`, `month_reflections`, `profiles` for that user_id)
- Sign in at `/auth/sign-in` - onboarding is auto-skipped if profile exists, otherwise complete display name / timezone
- Isolation: RLS per `user_id` in `journal_entries` and `month_reflections` - personal journal is untouched
- Env vars in `.env.local` and `apps/web/.env.local`: `TEST_ACCOUNT_EMAIL`, `TEST_ACCOUNT_PASSWORD`, `TEST_ACCOUNT_NAME`

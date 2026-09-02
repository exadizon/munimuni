# Agent instructions

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

## Test account (E2E / manual checks - isolated from personal data by user_id)

- Email: test@munimuni.test
- Password: MunimuniTest123!@#
- Name: Test Journal
- Created via `npm run seed:test-account` (checks `neon_auth."user"` and inserts `profiles` if missing) - requires `TEST_ACCOUNT_EMAIL` to contain `test` as guard
- Reset server data only: `npm run reset:test-account` (deletes `journal_entries`, `month_reflections`, `profiles` for that user_id)
- Sign in at `/auth/sign-in` - onboarding is auto-skipped if profile exists, otherwise complete display name / timezone
- Isolation: RLS per `user_id` in `journal_entries` and `month_reflections` - personal journal is untouched
- Env vars in `.env.local` and `apps/web/.env.local`: `TEST_ACCOUNT_EMAIL`, `TEST_ACCOUNT_PASSWORD`, `TEST_ACCOUNT_NAME`

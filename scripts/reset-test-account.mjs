import { neon } from '@neondatabase/serverless';

const TEST_EMAIL = process.env.TEST_ACCOUNT_EMAIL || 'test@munimuni.test';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL_UNPOOLED or DATABASE_URL is required');
  process.exit(1);
}

if (!TEST_EMAIL.includes('test')) {
  console.error('Refusing to reset: TEST_ACCOUNT_EMAIL must contain "test"');
  process.exit(1);
}

const sql = neon(url);
const users = await sql`SELECT id, email FROM neon_auth."user" WHERE email = ${TEST_EMAIL} LIMIT 1`;

if (users.length === 0) {
  console.log(`No account found for ${TEST_EMAIL}. Nothing to reset.`);
  console.log('Create it first with: npm run seed:test-account');
  process.exit(0);
}

const userId = users[0].id;
console.log(`Resetting data for test account ${TEST_EMAIL} (${userId}) ...`);

let deletedEntries = 0;
let deletedMonthReflections = 0;
let deletedYearReflections = 0;
let deletedProfiles = 0;

try {
  const r = await sql`DELETE FROM journal_entries WHERE user_id = ${userId}`;
  deletedEntries = r.count ?? 0;
  console.log(` - journal_entries: ${deletedEntries} rows deleted`);
} catch (e) {
  console.log(` - journal_entries: skipped (${e.message})`);
}

try {
  const r = await sql`DELETE FROM month_reflections WHERE user_id = ${userId}`;
  deletedMonthReflections = r.count ?? 0;
  console.log(` - month_reflections: ${deletedMonthReflections} rows deleted`);
} catch (e) {
  console.log(` - month_reflections: skipped (table may not exist yet)`);
}

try {
  const r = await sql`DELETE FROM year_reflections WHERE user_id = ${userId}`;
  deletedYearReflections = r.count ?? 0;
  console.log(` - year_reflections: ${deletedYearReflections} rows deleted`);
} catch (e) {
  console.log(` - year_reflections: skipped (table may not exist yet)`);
}

try {
  const r = await sql`DELETE FROM profiles WHERE user_id = ${userId}`;
  deletedProfiles = r.count ?? 0;
  console.log(` - profiles: ${deletedProfiles} rows deleted`);
} catch (e) {
  console.log(` - profiles: skipped (${e.message})`);
}

// Also clear outbox? No, client-side only (IndexedDB/localStorage). We clear server only.

console.log('\nDone. This only cleared server data for the test account.');
console.log('Your personal account is untouched (data is isolated by user_id via RLS).');
console.log('If you had local data for the test account in this browser, clear site data or sign out/in.');
console.log('To re-onboard the test account, sign in again and you will see the onboarding screen.');

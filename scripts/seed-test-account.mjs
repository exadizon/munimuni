import { neon } from '@neondatabase/serverless';

const TEST_EMAIL = process.env.TEST_ACCOUNT_EMAIL || 'test@munimuni.test';
const TEST_PASSWORD = process.env.TEST_ACCOUNT_PASSWORD || 'MunimuniTest123!@#';
const TEST_NAME = process.env.TEST_ACCOUNT_NAME || 'Test Journal';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL_UNPOOLED or DATABASE_URL is required (check .env.local)');
  process.exit(1);
}

if (!TEST_EMAIL.includes('test')) {
  console.error('Refusing to seed: TEST_ACCOUNT_EMAIL must contain "test" to avoid touching a personal account.');
  process.exit(1);
}

if (TEST_PASSWORD.length < 12) {
  console.error('TEST_ACCOUNT_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

const sql = neon(url);

const existing = await sql`SELECT id, email FROM neon_auth."user" WHERE email = ${TEST_EMAIL} LIMIT 1`;

if (existing.length > 0) {
  console.log(`Test account already exists: ${TEST_EMAIL} (id=${existing[0].id})`);
  const pid = existing[0].id;
  const prof = await sql`SELECT user_id FROM profiles WHERE user_id = ${pid} LIMIT 1`;
  if (prof.length === 0) {
    console.log('No profile found - creating default profile (Test Journal, UTC)...');
    try {
      await sql`INSERT INTO profiles (user_id, display_name, timezone) VALUES (${pid}, ${TEST_NAME}, 'UTC') ON CONFLICT (user_id) DO NOTHING`;
      console.log('Profile created.');
    } catch (e) {
      console.log(`Profile creation skipped: ${e.message}`);
    }
  } else {
    console.log('Profile already exists.');
  }
  console.log('You can sign in at /auth/sign-in with this email and your TEST_ACCOUNT_PASSWORD.');
  console.log('To reset its journal data, run: npm run reset:test-account');
  process.exit(0);
}

console.log(`Test account ${TEST_EMAIL} not found in DB.`);
console.log('Attempting to create via Neon Auth sign-up endpoint...');

let baseUrl = process.env.NEON_AUTH_BASE_URL;
if (!baseUrl) {
  console.log('NEON_AUTH_BASE_URL not set - will try local dev server at http://localhost:3000');
  baseUrl = 'http://localhost:3000/api/auth';
}

let created = false;
const candidates = [
  `${baseUrl}/sign-up/email`,
  `${baseUrl}/api/auth/sign-up/email`,
  `http://localhost:3000/api/auth/sign-up/email`,
];

for (const endpoint of candidates) {
  try {
    console.log(`Trying ${endpoint} ...`);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME }),
    });
    const text = await res.text();
    console.log(` -> ${res.status} ${text.slice(0, 400)}`);
    if (res.ok) {
      created = true;
      console.log(`Created test account via ${endpoint}`);
      break;
    }
  } catch (err) {
    console.log(` -> failed: ${err.message}`);
  }
}

if (!created) {
  console.log('\nAutomatic creation did not succeed (server may not be running, or endpoint differs).');
  console.log('Please create the account manually - takes 20 seconds:');
  console.log('  1. npm run dev');
  console.log('  2. Open http://localhost:3000/auth/sign-up');
  console.log(`  3. Sign up with:`);
  console.log(`       Email:    ${TEST_EMAIL}`);
  console.log(`       Password: ${TEST_PASSWORD}`);
  console.log(`       Name:     ${TEST_NAME}`);
  console.log('  4. Complete onboarding (display name / timezone) when prompted.');
  console.log('\nAlternatively, run this once the dev server is up:');
  console.log('  node --env-file=.env.local scripts/seed-test-account.mjs');
  process.exit(0);
}

// Verify again
const verify = await sql`SELECT id FROM neon_auth."user" WHERE email = ${TEST_EMAIL} LIMIT 1`;
if (verify.length > 0) {
  console.log(`Verified test account exists: ${verify[0].id}`);
  const prof = await sql`SELECT user_id FROM profiles WHERE user_id = ${verify[0].id} LIMIT 1`;
  if (prof.length === 0) {
    console.log('Creating default profile for new account...');
    try {
      await sql`INSERT INTO profiles (user_id, display_name, timezone) VALUES (${verify[0].id}, ${TEST_NAME}, 'UTC')`;
      console.log('Profile created - onboarding will be skipped on next sign-in.');
    } catch (e) {
      console.log(`Profile creation note: ${e.message} (you can complete onboarding in UI)`);
    }
  }
  console.log('Next: sign in at /auth/sign-in to use the test account.');
  console.log('Reset data anytime with: npm run reset:test-account');
} else {
  console.log('Account creation was reported as success but user not found in DB - check Neon Auth logs.');
}

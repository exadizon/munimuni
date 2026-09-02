import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required');

const sql = neon(url);
const migrations = ['001_journal.sql', '002_month_recaps.sql', '003_rename_recaps_to_reflections.sql', '004_year_reflections.sql'];
for (const file of migrations) {
  const migration = await readFile(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8');
  for (const statement of migration.split(';').map((item) => item.trim()).filter(Boolean)) {
    await sql.query(statement);
  }
}
console.log('Munimuni database migration applied.');

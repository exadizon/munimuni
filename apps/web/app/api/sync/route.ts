import { z } from 'zod';
import { getSql } from '@/lib/db';
import { rejectCrossOrigin } from '@/lib/request';
import { getCurrentUserId } from '@/lib/session';

export const runtime = 'nodejs';

const entrySchema = z.object({
  id: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().max(200_000),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  deletedAt: z.string().datetime({ offset: true }).nullable(),
  version: z.number().int().positive().max(2_000_000_000),
});

const monthRecapSchema = z.object({
  id: z.string().min(1).max(120),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  content: z.string().max(200_000),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  version: z.number().int().positive().max(2_000_000_000),
});

const payloadSchema = z.object({
  entries: z.array(entrySchema).max(100).optional().default([]),
  monthRecaps: z.array(monthRecapSchema).max(100).optional().default([]),
});

const toEntry = (row: Record<string, unknown>) => ({
  id: row.id,
  date: row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date,
  content: row.content,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  deletedAt: row.deleted_at instanceof Date ? row.deleted_at.toISOString() : row.deleted_at,
  version: row.version,
});

const toMonthRecap = (row: Record<string, unknown>) => ({
  id: row.id,
  month: row.month,
  content: row.content,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  version: row.version,
});

const listForUser = async (userId: string) => {
  const sql = getSql();
  const rows = await sql`
    SELECT id, entry_date, content, created_at, updated_at, deleted_at, version
    FROM journal_entries
    WHERE user_id = ${userId}
    ORDER BY entry_date ASC
    LIMIT 500
  `;
  let monthRows: Record<string, unknown>[] = [];
  try {
    monthRows = await sql`
      SELECT id, month, content, created_at, updated_at, version
      FROM month_recaps
      WHERE user_id = ${userId}
      ORDER BY month ASC
      LIMIT 500
    `;
  } catch {
    // Table may not exist yet before migration 002 is applied - return empty
    monthRows = [];
  }
  return { entries: rows.map(toEntry), monthRecaps: monthRows.map(toMonthRecap) };
};

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cursor = new URL(request.url).searchParams.get('cursor');
  const sql = getSql();
  let entryRows;
  if (cursor) {
    entryRows = await sql`
        SELECT id, entry_date, content, created_at, updated_at, deleted_at, version
        FROM journal_entries
        WHERE user_id = ${userId} AND updated_at > ${cursor}
        ORDER BY updated_at ASC
        LIMIT 500
      `;
  } else {
    entryRows = await sql`
        SELECT id, entry_date, content, created_at, updated_at, deleted_at, version
        FROM journal_entries
        WHERE user_id = ${userId}
        ORDER BY updated_at ASC
        LIMIT 500
      `;
  }

  let monthRows: Record<string, unknown>[] = [];
  try {
    if (cursor) {
      monthRows = await sql`
        SELECT id, month, content, created_at, updated_at, version
        FROM month_recaps
        WHERE user_id = ${userId} AND updated_at > ${cursor}
        ORDER BY updated_at ASC
        LIMIT 500
      `;
    } else {
      monthRows = await sql`
        SELECT id, month, content, created_at, updated_at, version
        FROM month_recaps
        WHERE user_id = ${userId}
        ORDER BY updated_at ASC
        LIMIT 500
      `;
    }
  } catch {
    monthRows = [];
  }

  return Response.json({
    entries: entryRows.map(toEntry),
    monthRecaps: monthRows.map(toMonthRecap),
    cursor: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const crossOriginResponse = rejectCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid sync payload' }, { status: 400 });

  const sql = getSql();
  for (const entry of parsed.data.entries) {
    await sql`
      INSERT INTO journal_entries (id, user_id, entry_date, content, created_at, updated_at, deleted_at, version)
      VALUES (${entry.id}, ${userId}, ${entry.date}, ${entry.content}, ${entry.createdAt}, ${entry.updatedAt}, ${entry.deletedAt}, ${entry.version})
      ON CONFLICT (user_id, entry_date) DO UPDATE SET
        id = EXCLUDED.id,
        content = EXCLUDED.content,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        version = EXCLUDED.version
      WHERE EXCLUDED.updated_at > journal_entries.updated_at
         OR (EXCLUDED.updated_at = journal_entries.updated_at AND EXCLUDED.version > journal_entries.version)
    `;
  }

  for (const recap of parsed.data.monthRecaps) {
    try {
      await sql`
        INSERT INTO month_recaps (id, user_id, month, content, created_at, updated_at, version)
        VALUES (${recap.id}, ${userId}, ${recap.month}, ${recap.content}, ${recap.createdAt}, ${recap.updatedAt}, ${recap.version})
        ON CONFLICT (user_id, month) DO UPDATE SET
          id = EXCLUDED.id,
          content = EXCLUDED.content,
          updated_at = EXCLUDED.updated_at,
          version = EXCLUDED.version
        WHERE EXCLUDED.updated_at > month_recaps.updated_at
           OR (EXCLUDED.updated_at = month_recaps.updated_at AND EXCLUDED.version > month_recaps.version)
      `;
    } catch {
      // Table missing before migration - silently skip, client will retry later
    }
  }

  const data = await listForUser(userId);
  return Response.json({ ...data, cursor: new Date().toISOString() });
}

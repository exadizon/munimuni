import { z } from 'zod';
import { getSql } from '@/lib/db';
import { rejectCrossOrigin } from '@/lib/request';
import { getCurrentUserId } from '@/lib/session';

export const runtime = 'nodejs';

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(80),
});

const serializeProfile = (row: Record<string, unknown> | undefined) => row
  ? {
      displayName: row.display_name,
      timezone: row.timezone,
      completedAt: row.completed_at,
    }
  : null;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getSql();
  const rows = await sql`SELECT display_name, timezone, completed_at FROM profiles WHERE user_id = ${userId}`;
  return Response.json({ profile: serializeProfile(rows[0]) });
}

export async function POST(request: Request) {
  const crossOriginResponse = rejectCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid profile' }, { status: 400 });

  try {
    Intl.DateTimeFormat(undefined, { timeZone: parsed.data.timezone });
  } catch {
    return Response.json({ error: 'Invalid timezone' }, { status: 400 });
  }

  const sql = getSql();
  const rows = await sql`
    INSERT INTO profiles (user_id, display_name, timezone, completed_at)
    VALUES (${userId}, ${parsed.data.displayName}, ${parsed.data.timezone}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      timezone = EXCLUDED.timezone,
      completed_at = COALESCE(profiles.completed_at, EXCLUDED.completed_at)
    RETURNING display_name, timezone, completed_at
  `;
  return Response.json({ profile: serializeProfile(rows[0]) });
}

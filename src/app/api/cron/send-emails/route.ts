import { NextRequest, NextResponse } from 'next/server';
import { sendScheduledEmails } from '@/lib/sendScheduledEmails';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/send-emails
 *
 * Thin HTTP wrapper around sendScheduledEmails().
 * Auth: Authorization: Bearer <ADMIN_API_KEY>
 */
export async function POST(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || request.headers.get('authorization') !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sendScheduledEmails();
  return NextResponse.json(result);
}

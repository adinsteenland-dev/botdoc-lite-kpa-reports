import { NextResponse } from 'next/server';
import { getPool } from '@/infrastructure/fabric/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env: Record<string, string> = {};
  for (const key of ['FABRIC_SERVER', 'FABRIC_DATABASE', 'FABRIC_TENANT_ID', 'FABRIC_CLIENT_ID', 'FABRIC_CLIENT_SECRET']) {
    env[key] = process.env[key] ? '✓ set' : '✗ MISSING';
  }

  try {
    const pool = await getPool();
    const result = await pool.request().query<{ now: Date }>('SELECT GETDATE() AS now');
    return NextResponse.json({
      status: 'ok',
      env,
      serverTime: result.recordset[0]?.now,
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      env,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}

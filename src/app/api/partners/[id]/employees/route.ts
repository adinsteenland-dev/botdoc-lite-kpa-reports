import { NextRequest, NextResponse } from 'next/server';
import { LiteMetricsProvider } from '@/infrastructure/fabric/LiteMetricsProvider';
import { parseDateParam, last30Days } from '@/lib/reportUtils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params; // partner ID — available for future auth scoping

  const { searchParams } = request.nextUrl;
  const storeId = searchParams.get('storeId');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  const defaults = last30Days();
  const fromParam = searchParams.get('from');
  const toParam   = searchParams.get('to');
  const start = parseDateParam(fromParam ?? undefined) ?? defaults.start;
  const endRaw = parseDateParam(toParam ?? undefined);
  if (endRaw) endRaw.setHours(23, 59, 59, 999);
  const end = endRaw ?? defaults.end;

  try {
    const fabric = new LiteMetricsProvider();
    const employees = await fabric.fetchStoreEmployees(storeId, start, end);
    return NextResponse.json(employees);
  } catch (err) {
    console.error('[API] fetchStoreEmployees failed:', err);
    return NextResponse.json({ error: 'Failed to fetch employee data' }, { status: 500 });
  }
}

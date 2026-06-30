import { NextRequest, NextResponse } from 'next/server';
import { PostgresCustomerRepository } from '@/infrastructure/db/PostgresCustomerRepository';
import { FabricMetricsProvider } from '@/infrastructure/fabric/FabricMetricsProvider';
import { last30Days } from '@/lib/reportUtils';

export const dynamic = 'force-dynamic';

/**
 * Discovery route — returns a sample of distinct callback_url values from Fabric
 * for a given customer. Used to determine the correct LIKE patterns for the
 * engagement tools classification in FabricMetricsProvider.fetchEngagementTools().
 *
 * Usage: GET /api/admin/callback-sample?customerId=<id>
 * Auth:  Requires Authorization: Bearer <ADMIN_API_KEY>
 */
export async function GET(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  const authHeader = request.headers.get('authorization');

  if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerId = request.nextUrl.searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json(
      { error: 'customerId query param required' },
      { status: 400 },
    );
  }

  const customerRepo = new PostgresCustomerRepository();
  const customer = await customerRepo.findById(customerId);

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  if (!customer.dataFilter) {
    return NextResponse.json({ error: 'Customer has no dataFilter configured' }, { status: 422 });
  }

  const { start, end } = last30Days();
  const fabric = new FabricMetricsProvider();
  const [urlRows, scanMeanRows] = await Promise.all([
    fabric.fetchEngagementSample(customer.dataFilter, start, end),
    fabric.fetchScanMeanSample(customer.dataFilter, start, end),
  ]);

  return NextResponse.json({
    customer: customer.name,
    period: { start: start.toISOString(), end: end.toISOString() },
    callbackUrls: urlRows,
    scanMeans: scanMeanRows,
  });
}

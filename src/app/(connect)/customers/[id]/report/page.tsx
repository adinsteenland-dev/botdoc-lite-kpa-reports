import { notFound } from 'next/navigation';
import Link from 'next/link';
import { headers } from 'next/headers';
import { PostgresCustomerRepository } from '@/infrastructure/db/PostgresCustomerRepository';
import { FabricMetricsProvider } from '@/infrastructure/fabric/FabricMetricsProvider';
import { Dashboard } from '@/components/Dashboard';
import { color, font, Button } from '@/design';
import type { ReportData, TrendData, TrendMetrics } from '@/lib/parseCSV';
import { PrintButton } from './PrintButton';
import { Sidebar } from '@/components/Sidebar';
import { last30Days, fmtDate, toDateParam, trendWindows, calcTrendPct, parseDateParam } from '@/lib/reportUtils';
import { AvgCarsInput } from '@/components/AvgCarsInput';

export const dynamic = 'force-dynamic';

export default async function CustomerReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; token?: string }>;
}) {
  const { id } = await params;
  const { from: fromParam, to: toParam, token: tokenParam } = await searchParams;

  const reqHeaders = await headers();
  const isRestricted = reqHeaders.get('x-report-restricted') === '1';

  const customerRepo = new PostgresCustomerRepository();

  const [customer, allCustomers] = await Promise.all([
    customerRepo.findById(id),
    isRestricted ? Promise.resolve([]) : customerRepo.findAll(),
  ]);

  if (!customer) notFound();

  const logoSrc =
    customer.logo && customer.logoMimeType
      ? `data:${customer.logoMimeType};base64,${customer.logo.toString('base64')}`
      : null;

  // Serialize customers for the sidebar (Buffer → base64 string)
  const sidebarCustomers = allCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    logoMimeType: c.logoMimeType,
    logo: c.logo ? c.logo.toString('base64') : null,
  }));

  // Resolve date range: URL params → last 30 days default.
  const defaults = last30Days();
  const start = parseDateParam(fromParam) ?? defaults.start;
  const end = parseDateParam(toParam) ?? defaults.end;
  const fromStr = toDateParam(start);
  const toStr = toDateParam(end);

  // Fetch live metrics from Fabric.
  let reportData: ReportData | null = null;
  let trendData: TrendData | undefined;

  if (customer.dataFilter) {
    // Main report fetch — must succeed for the page to render.
    try {
      const fabric = new FabricMetricsProvider();
      const rawMetrics = await fabric.fetchMetrics(customer.dataFilter, start, end);
      const cfg = customer.avgCarsConfig;
      const metrics = rawMetrics.map((loc) => ({
        ...loc,
        avgCarsSold: cfg.stores?.[loc.name] ?? cfg.group,
      }));
      reportData = {
        customerName: customer.name,
        logoBase64: logoSrc,
        period: `${fmtDate(start)} – ${fmtDate(end)}`,
        locations: metrics,
      };

      // Trend fetches — isolated so a failure never kills the main report.
      try {
        const windows = trendWindows();
        const [t0, t1, t2] = await Promise.all([
          fabric.fetchMetrics(customer.dataFilter, windows[0].start, windows[0].end),
          fabric.fetchMetrics(customer.dataFilter, windows[1].start, windows[1].end),
          fabric.fetchMetrics(customer.dataFilter, windows[2].start, windows[2].end),
        ]);

        const sumWindow = (rows: typeof rawMetrics): TrendMetrics =>
          rows.reduce(
            (acc, l) => ({ scans: acc.scans + l.scans, leads: acc.leads + l.leads, dlCompleted: acc.dlCompleted + l.dlCompleted }),
            { scans: 0, leads: 0, dlCompleted: 0 },
          );

        const m0 = sumWindow(t0);
        const m1 = sumWindow(t1);
        const m2 = sumWindow(t2);

        trendData = {
          windows: [
            { label: windows[0].label, metrics: m0, pctVsPrior: calcTrendPct(m0, m1) },
            { label: windows[1].label, metrics: m1, pctVsPrior: calcTrendPct(m1, m2) },
            { label: windows[2].label, metrics: m2, pctVsPrior: null },
          ],
        };
      } catch (trendErr) {
        console.error(`[Fabric] Failed to fetch trend data for customer ${id}.`, trendErr);
      }
    } catch (err) {
      console.error(`[Fabric] Failed to fetch metrics for customer ${id}.`, err);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Toolbar — hidden on print */}
      <div
        className="no-print"
        style={{
          background: color.navy,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: font.sans,
          flexShrink: 0,
        }}
      >
        <span style={{ color: color.muted, fontSize: 12 }}>
          {customer.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PrintButton />
          {!isRestricted && (
            <>
              <Link href={`/customers/${id}/emails`} style={{ textDecoration: 'none' }}>
                <Button variant="outline">Email Schedule</Button>
              </Link>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <Button variant="outline">Return To Dashboard</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Body: sidebar + report content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {!isRestricted && <Sidebar customers={sidebarCustomers} currentId={id} />}

        <main style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
          {/* Avg cars config bar — admin only */}
          {!isRestricted && (
          <div
            className="no-print"
            style={{
              background: color.surface,
              borderBottom: `1px solid ${color.border}`,
              padding: '8px 32px',
            }}
          >
            <AvgCarsInput
              customerId={id}
              storeName={null}
              currentValue={customer.avgCarsConfig.group}
            />
          </div>
          )}

          {reportData ? (
            <Dashboard
              data={reportData}
              storeBasePath={`/customers/${id}/stores`}
              tokenSuffix={isRestricted && tokenParam ? `?token=${tokenParam}` : undefined}
              initialFrom={fromStr}
              initialTo={toStr}
              groupAvgCars={customer.avgCarsConfig.group}
              trendData={trendData}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: 400,
                color: color.muted,
                fontFamily: font.sans,
                gap: 8,
              }}
            >
              <p style={{ fontSize: 15, margin: 0, color: color.subtext }}>Unable to load report data for {customer.name}.</p>
              <p style={{ fontSize: 13, margin: 0 }}>Check that a Fabric data filter is configured and try again.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

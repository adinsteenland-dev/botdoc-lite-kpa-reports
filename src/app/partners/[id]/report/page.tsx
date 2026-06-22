import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PostgresPartnerRepository } from '@/infrastructure/db/PostgresPartnerRepository';
import { LiteMetricsProvider } from '@/infrastructure/fabric/LiteMetricsProvider';
import { Dashboard } from '@/components/Dashboard';
import { color, font, Button } from '@/design';
import type { ReportData, TrendData, TrendMetrics } from '@/lib/parseCSV';
import { PrintButton } from './PrintButton';
import { Sidebar } from '@/components/Sidebar';
import { last30Days, fmtDate, toDateParam, trendWindows, calcTrendPct, parseDateParam } from '@/lib/reportUtils';

export const dynamic = 'force-dynamic';

export default async function PartnerReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from: fromParam, to: toParam } = await searchParams;

  const partnerRepo = new PostgresPartnerRepository();

  const [partner, allPartners] = await Promise.all([
    partnerRepo.findById(id),
    partnerRepo.findAll(),
  ]);

  if (!partner) notFound();

  const logoSrc =
    partner.logo && partner.logoMimeType
      ? `data:${partner.logoMimeType};base64,${partner.logo.toString('base64')}`
      : null;

  const sidebarPartners = allPartners.map((p) => ({
    id: p.id,
    name: p.name,
    logoMimeType: p.logoMimeType,
    logo: p.logo ? p.logo.toString('base64') : null,
  }));

  // Resolve date range
  const defaults = last30Days();
  const start = parseDateParam(fromParam) ?? defaults.start;
  const end = parseDateParam(toParam) ?? defaults.end;
  const fromStr = toDateParam(start);
  const toStr = toDateParam(end);

  let reportData: ReportData | null = null;
  let trendData: TrendData | undefined;

  if (partner.dataFilter) {
    try {
      const fabric = new LiteMetricsProvider();
      const rawMetrics = await fabric.fetchMetrics(partner.dataFilter, start, end);

      reportData = {
        customerName: partner.name,
        logoBase64: logoSrc,
        period: `${fmtDate(start)} – ${fmtDate(end)}`,
        locations: rawMetrics,
      };

      try {
        const windows = trendWindows();
        const [t0, t1, t2] = await Promise.all([
          fabric.fetchMetrics(partner.dataFilter, windows[0].start, windows[0].end),
          fabric.fetchMetrics(partner.dataFilter, windows[1].start, windows[1].end),
          fabric.fetchMetrics(partner.dataFilter, windows[2].start, windows[2].end),
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
        console.error(`[Fabric] Failed to fetch trend data for partner ${id}.`, trendErr);
      }
    } catch (err) {
      console.error(`[Fabric] Failed to fetch metrics for partner ${id}.`, err);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Toolbar */}
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
          {partner.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PrintButton />
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="outline">Return To Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Body: sidebar + report content */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar partners={sidebarPartners} currentId={id} />

        <main style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
          {reportData ? (
            <Dashboard
              data={reportData}
              initialFrom={fromStr}
              initialTo={toStr}
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
              <p style={{ fontSize: 15, margin: 0, color: color.subtext }}>
                Unable to load report data for {partner.name}.
              </p>
              <p style={{ fontSize: 13, margin: 0 }}>
                Check that a Fabric data filter is configured for this partner.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

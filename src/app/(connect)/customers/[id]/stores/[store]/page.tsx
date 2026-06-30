import { notFound } from 'next/navigation';
import Link from 'next/link';
import { headers } from 'next/headers';
import { PostgresCustomerRepository } from '@/infrastructure/db/PostgresCustomerRepository';
import { FabricMetricsProvider } from '@/infrastructure/fabric/FabricMetricsProvider';
import { Dashboard } from '@/components/Dashboard';
import { Sidebar } from '@/components/Sidebar';
import { color, font, Button } from '@/design';
import type { ReportData, TrendData, TrendMetrics, HealthScoreData, RequestorData, EngagementToolsData } from '@/lib/parseCSV';
import { PrintButton } from '../../report/PrintButton';
import { last30Days, fmtDate, toDateParam, trendWindows, calcTrendPct, computeHealthScore, parseDateParam } from '@/lib/reportUtils';
import { AvgCarsInput } from '@/components/AvgCarsInput';

export const dynamic = 'force-dynamic';

export default async function StoreReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; store: string }>;
  searchParams: Promise<{ from?: string; to?: string; token?: string }>;
}) {
  const { id, store: encodedStore } = await params;
  const { from: fromParam, to: toParam, token: tokenParam } = await searchParams;
  const storeName = decodeURIComponent(encodedStore);

  const reqHeaders = await headers();
  const isRestricted = reqHeaders.get('x-report-restricted') === '1';
  const tokenScope = reqHeaders.get('x-report-token-scope'); // 'group' | 'store' | null

  const customerRepo = new PostgresCustomerRepository();

  const [customer, allCustomers] = await Promise.all([
    customerRepo.findById(id),
    isRestricted ? Promise.resolve([]) : customerRepo.findAll(),
  ]);

  if (!customer) notFound();

  const sidebarCustomers = allCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    logoMimeType: c.logoMimeType,
    logo: c.logo ? c.logo.toString('base64') : null,
  }));

  const logoSrc =
    customer.logo && customer.logoMimeType
      ? `data:${customer.logoMimeType};base64,${customer.logo.toString('base64')}`
      : null;

  let reportData: ReportData | null = null;
  let trendData: TrendData | undefined;
  let healthScore: HealthScoreData | undefined;
  let requestorData: RequestorData | undefined;

  // Resolve date range: URL params → last 30 days default.
  const defaults = last30Days();
  const start = parseDateParam(fromParam) ?? defaults.start;
  const end = parseDateParam(toParam) ?? defaults.end;
  const fromStr = toDateParam(start);
  const toStr = toDateParam(end);

  // Fabric-first: main fetch must succeed; trend fetches are isolated.
  if (customer.dataFilter) {
    try {
      const fabric = new FabricMetricsProvider();
      const metrics = await fabric.fetchMetrics(customer.dataFilter, start, end);
      const cfg = customer.avgCarsConfig;
      const avgCarsSold = cfg.stores?.[storeName] ?? cfg.group;
      const rawMetric = metrics.find((m) => m.name === storeName) ?? {
        name: storeName,
        scans: 0, leads: 0, pullFiles: 0, idVerify: 0, dlCompleted: 0, appts: 0,
      };
      reportData = {
        customerName: storeName,
        logoBase64: logoSrc,
        period: `${fmtDate(start)} – ${fmtDate(end)}`,
        locations: [{ ...rawMetric, avgCarsSold }],
      };

      // Trend fetches — isolated so a failure never kills the main report.
      try {
        const windows = trendWindows();
        const [t0, t1, t2] = await Promise.all([
          fabric.fetchMetrics(customer.dataFilter, windows[0].start, windows[0].end),
          fabric.fetchMetrics(customer.dataFilter, windows[1].start, windows[1].end),
          fabric.fetchMetrics(customer.dataFilter, windows[2].start, windows[2].end),
        ]);

        const storeMetrics = (rows: typeof metrics): TrendMetrics => {
          const row = rows.find((m) => m.name === storeName);
          return { scans: row?.scans ?? 0, leads: row?.leads ?? 0, dlCompleted: row?.dlCompleted ?? 0 };
        };

        const m0 = storeMetrics(t0);
        const m1 = storeMetrics(t1);
        const m2 = storeMetrics(t2);

        trendData = {
          windows: [
            { label: windows[0].label, metrics: m0, pctVsPrior: calcTrendPct(m0, m1) },
            { label: windows[1].label, metrics: m1, pctVsPrior: calcTrendPct(m1, m2) },
            { label: windows[2].label, metrics: m2, pctVsPrior: null },
          ],
        };
      } catch (trendErr) {
        console.error(`[Fabric] Failed to fetch trend data for store ${storeName}.`, trendErr);
      }

      // Monthly DL fetch — isolated so failure never kills the main report.
      if (trendData) {
        try {
          const monthlyRows = await fabric.fetchMonthlyDL(customer.dataFilter);
          const storeRows = monthlyRows.filter((r) => r.storeName === storeName);
          healthScore = computeHealthScore(trendData, storeRows);
        } catch (monthlyErr) {
          console.error(`[Fabric] Failed to fetch monthly DL for store ${storeName}.`, monthlyErr);
        }
      }

      // Requestor + engagement tools fetches — run in parallel, both isolated.
      const [requestorResult, engagementResult] = await Promise.allSettled([
        fabric.fetchRequestorData(customer.dataFilter, start, end),
        fabric.fetchEngagementTools(customer.dataFilter, start, end),
      ]);

      if (requestorResult.status === 'fulfilled') {
        const storeRows = requestorResult.value.filter((r) => r.storeName === storeName);

        // isCustomer = true means no employee ID was set — the customer submitted the session themselves.
        const customerScans = storeRows.filter((r) => r.isCustomer).reduce((s, r) => s + r.scans, 0);
        const employeeScans = storeRows.filter((r) => !r.isCustomer).reduce((s, r) => s + r.scans, 0);

        // Employee usage chart: exclude generic "CUSTOMER" and "EMPLOYEE" labels —
        // only include rows with actual employee names.
        const GENERIC = new Set(['CUSTOMER', 'EMPLOYEE']);
        const employeeMap = new Map<string, { pullFiles: number; dlCompleted: number }>();
        for (const row of storeRows) {
          if (!row.employeeName || GENERIC.has(row.employeeName.toUpperCase())) continue;
          const existing = employeeMap.get(row.employeeName) ?? { pullFiles: 0, dlCompleted: 0 };
          employeeMap.set(row.employeeName, {
            pullFiles: existing.pullFiles + row.pullFiles,
            dlCompleted: existing.dlCompleted + row.dlCompleted,
          });
        }
        const employees = Array.from(employeeMap.entries())
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.pullFiles - a.pullFiles);

        let engagementTools: EngagementToolsData | undefined;
        if (engagementResult.status === 'fulfilled') {
          // SQL already groups by storeName + toolLabel, so each entry is unique per tool.
          const storeEngagement = engagementResult.value.filter((r) => r.storeName === storeName);
          if (storeEngagement.length > 0) {
            engagementTools = {
              tools: storeEngagement
                .map((r) => ({ label: r.toolLabel, count: r.count }))
                .sort((a, b) => b.count - a.count),
            };
          }
        } else {
          console.error(`[Fabric] Failed to fetch engagement tools for store ${storeName}.`, engagementResult.reason);
        }

        requestorData = { customerScans, employeeScans, employees, engagementTools };
      } else {
        console.error(`[Fabric] Failed to fetch requestor data for store ${storeName}.`, requestorResult.reason);
      }
    } catch (err) {
      console.error(`[Fabric] Failed to fetch metrics for store ${storeName}.`, err);
    }
  }

  if (!reportData) notFound();

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
        {!isRestricted ? (
          <Link href={`/customers/${id}/report`} style={{ textDecoration: 'none' }}>
            <Button variant="ghost">← {customer.name}</Button>
          </Link>
        ) : tokenScope === 'group' && tokenParam ? (
          <Link href={`/customers/${id}/report?token=${tokenParam}`} style={{ textDecoration: 'none' }}>
            <Button variant="ghost">← {customer.name}</Button>
          </Link>
        ) : null}
        <span style={{ color: color.muted, fontSize: 12 }}>
          {storeName} — {reportData.period}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PrintButton />
          {!isRestricted && (
            <>
              <Link href={`/customers/${id}/stores/${encodedStore}/emails`} style={{ textDecoration: 'none' }}>
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
              storeName={storeName}
              currentValue={customer.avgCarsConfig.stores?.[storeName]}
            />
          </div>
          )}

          <Dashboard data={reportData} initialFrom={fromStr} initialTo={toStr} trendData={trendData} healthScore={healthScore} requestorData={requestorData} />
        </main>
      </div>
    </div>
  );
}

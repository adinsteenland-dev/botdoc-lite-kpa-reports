'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { BarChart } from './BarChart';
import { formatKPI, sumLocations, getUsageScore, getScoreColor } from '@/lib/parseCSV';
import type { ReportData, LocationData, TrendData, HealthScoreData, RequestorData } from '@/lib/parseCSV';
import { TrendsSection } from './TrendsSection';
import { StoreHealthScore } from './StoreHealthScore';
import { CustomerVsEmployeePie } from './CustomerVsEmployeePie';
import { EmployeeUsageChart } from './EmployeeUsageChart';
import { EngagementToolsPie } from './EngagementToolsPie';
import {
  color,
  font,
  status,
  type StatusVariant,
  Card,
  CardHeader,
  CardEyebrow,
  SectionEyebrow,
  KpiCard,
  Badge,
  BrandMark,
} from '@/design';
import { InfoPopover } from './InfoPopover';

const USAGE_SCORE_INFO = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      How Usage Score is Calculated
    </div>
    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
      <strong>DL Captured ÷ (Avg Monthly Cars Sold × 1.5) × 100</strong>
    </div>
    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
      The 1.5× multiplier accounts for showroom ups — customers who visit but don&apos;t purchase. More car sales means more ID scan opportunities.
    </div>
    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
      <span style={{ color: '#16A34A', fontWeight: 700 }}>≥80%</span> Excellent &nbsp;
      <span style={{ color: '#D97706', fontWeight: 700 }}>≥70%</span> Good &nbsp;
      <span style={{ color: '#DC2626', fontWeight: 700 }}>&lt;70%</span> Needs Attention
    </div>
  </div>
);

// Map the score color returned by the domain layer to a design-system status variant.
const SCORE_VARIANT: Record<'green' | 'yellow' | 'red', StatusVariant> = {
  green: 'strong',
  yellow: 'moderate',
  red: 'low',
};

function UsageScoreCard({
  locations,
  groupAvgCars,
}: {
  locations: LocationData[];
  groupAvgCars?: number;
}) {
  // Group mode: single score using group avg cars and total DL captured.
  if (groupAvgCars && groupAvgCars > 0) {
    const totalDl = locations.reduce((sum, l) => sum + l.dlCompleted, 0);
    const score = (totalDl / (groupAvgCars * 1.5)) * 100;
    const variant = SCORE_VARIANT[getScoreColor(score)];
    const s = status[variant];
    return (
      <Card padding="16px 14px 14px" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CardEyebrow>Usage Score</CardEyebrow>
          <InfoPopover>{USAGE_SCORE_INFO}</InfoPopover>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: s.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {score.toFixed(0)}%
        </div>
        <Badge variant={variant} dot>
          {s.label}
        </Badge>
      </Card>
    );
  }

  // Store mode: score for the single location using its own avgCarsSold.
  const scored = locations.filter((l) => l.avgCarsSold && l.avgCarsSold > 0);
  if (scored.length === 0) {
    return (
      <Card padding="16px 14px 14px" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CardEyebrow>Usage Score</CardEyebrow>
          <InfoPopover>{USAGE_SCORE_INFO}</InfoPopover>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: color.muted }}>—</div>
        <Badge variant="neutral" italic>No Sales Data</Badge>
      </Card>
    );
  }

  const loc = scored[0];
  const score = getUsageScore(loc)!;
  const variant = SCORE_VARIANT[getScoreColor(score)];
  const s = status[variant];

  return (
    <Card padding="16px 14px 14px" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <CardEyebrow>Usage Score</CardEyebrow>
        <InfoPopover>{USAGE_SCORE_INFO}</InfoPopover>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: s.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {score.toFixed(0)}%
      </div>
      <Badge variant={variant} dot>
        {s.label}
      </Badge>
    </Card>
  );
}


export function Dashboard({
  data,
  storeBasePath,
  tokenSuffix,
  initialFrom,
  initialTo,
  groupAvgCars,
  trendData,
  healthScore,
  requestorData,
}: {
  data: ReportData;
  storeBasePath?: string;
  /** Appended to every store link — used to forward a scoped token in restricted mode. */
  tokenSuffix?: string;
  initialFrom?: string;
  initialTo?: string;
  groupAvgCars?: number;
  trendData?: TrendData;
  healthScore?: HealthScoreData;
  requestorData?: RequestorData;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch]   = useState('');
  const [from, setFrom]       = useState(initialFrom ?? '');
  const [to, setTo]           = useState(initialTo ?? '');
  const [loading, setLoading] = useState(false);

  const filtered = storeBasePath
    ? data.locations.filter((loc) => loc.name.toLowerCase().includes(search.toLowerCase()))
    : data.locations;

  const totals = sumLocations(filtered);

  function applyDates() {
    if (!from || !to) return;
    setLoading(true);
    router.push(`${pathname}?from=${from}&to=${to}`);
  }

  return (
    <div style={{ fontFamily: font.sans, background: color.bg, minHeight: '100vh', color: color.navy }}>
      {/* ZONE 1: HEADER */}
      <div
        style={{
          background: color.navy,
          padding: '20px 32px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        {/* Customer logo / name */}
        <div style={{ minWidth: 160, display: 'flex', alignItems: 'center' }}>
          {data.logoBase64 ? (
            <div
              style={{
                background: color.surface,
                borderRadius: 6,
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.logoBase64}
                alt={data.customerName}
                style={{ height: 36, maxWidth: 160, objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div>
              <div
                style={{
                  color: color.onDark,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {data.customerName}
              </div>
              <div
                style={{ color: color.muted, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Powered by Botdoc
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ color: color.onDark, fontSize: 22, fontWeight: 700, letterSpacing: '0.02em', margin: 0 }}>
            Dealership Usage Dashboard
          </h1>
          <div style={{ color: color.muted, fontSize: 12, marginTop: 4, letterSpacing: '0.04em' }}>
            Reporting Period: {data.period}
          </div>
        </div>

        {/* Botdoc wordmark */}
        <div style={{ minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <BrandMark size="md" />
        </div>
      </div>

      {/* FILTER BAR */}
      <div
        style={{
          background: color.surface,
          borderBottom: `1px solid ${color.border}`,
          padding: '12px 32px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: color.subtext,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}
        >
          Filter by
        </span>

        {/* Location search — group report only */}
        {storeBasePath && (
          <input
            type="text"
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: `1.5px solid ${color.border}`,
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 13,
              color: color.navy,
              fontFamily: 'inherit',
              minWidth: 180,
              outline: 'none',
              background: color.bg,
            }}
          />
        )}

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{
              border: `1.5px solid ${color.border}`,
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 13,
              color: color.navy,
              fontFamily: 'inherit',
              background: color.bg,
              cursor: 'pointer',
            }}
          />
          <span style={{ color: color.muted, fontSize: 13 }}>–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              border: `1.5px solid ${color.border}`,
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 13,
              color: color.navy,
              fontFamily: 'inherit',
              background: color.bg,
              cursor: 'pointer',
            }}
          />
          <button
            onClick={applyDates}
            disabled={loading}
            style={{
              border: `1.5px solid ${color.border}`,
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 13,
              color: loading ? color.muted : color.navy,
              fontFamily: 'inherit',
              background: color.bg,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              minWidth: 72,
            }}
          >
            {loading ? 'Loading…' : 'Apply'}
          </button>
        </div>
      </div>

      {/* ZONE 2: KPI CARDS */}
      <div style={{ padding: '24px 32px 8px' }}>
        <SectionEyebrow>Key Performance Indicators</SectionEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: healthScore ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
          <KpiCard label="Total Scans" value={formatKPI(totals.scans)} />
          <KpiCard label="Leads Created" value={formatKPI(totals.leads)} />
          <KpiCard label="ID Verified" value={formatKPI(totals.idVerify)} />
          <KpiCard label="DL Captured" value={formatKPI(totals.dlCompleted)} />
          {healthScore && <UsageScoreCard locations={filtered} groupAvgCars={groupAvgCars} />}
        </div>
      </div>

      {/* ZONE 3: TRENDS */}
      {trendData && <TrendsSection trendData={trendData} />}

      {/* ZONE 4: store mode = pie + employee charts | group mode = table + bar chart */}
      {healthScore ? (
        /* STORE MODE: two pies side-by-side (top) + employee usage chart (bottom) + health score (right) */
        <div style={{ padding: '20px 32px 32px', display: 'grid', gridTemplateColumns: '60% 40%', gap: 20 }}>
          {/* LEFT: pies row (top) + employee usage chart (bottom) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, breakInside: 'avoid' }}>
              <CustomerVsEmployeePie data={requestorData} />
              <EngagementToolsPie data={requestorData?.engagementTools} />
            </div>
            <EmployeeUsageChart data={requestorData} />
          </div>
          {/* RIGHT: Health Score card (unchanged) */}
          <StoreHealthScore healthScore={healthScore} />
        </div>
      ) : (
        /* GROUP MODE: unchanged table + bar chart */
        <div style={{ padding: '20px 32px 32px', display: 'grid', gridTemplateColumns: '60% 40%', gap: 20 }}>
          {/* LEFT: Location Table */}
          <Card style={{ overflow: 'hidden' }}>
            <CardHeader title="Performance by Location" />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: color.navy }}>
                  {['Location', 'Scans', 'Leads', 'Pull Files', 'ID Verify', 'DL Completed'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        color: color.onDark,
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '10px 14px',
                        textAlign: i === 0 ? 'left' : 'right',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((loc, i) => (
                  <tr
                    key={loc.name}
                    style={{
                      background: i % 2 === 0 ? color.surface : color.bg,
                      borderLeft: i === 0 ? `4px solid ${color.orange}` : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 14px',
                        fontWeight: 600,
                        color: color.navy,
                        borderBottom: `1px solid ${color.fillSubtle}`,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          fontSize: 10,
                          fontWeight: 700,
                          marginRight: 8,
                          background: i === 0 ? color.orange : color.fillSubtle,
                          color: i === 0 ? color.onDark : color.subtext,
                        }}
                      >
                        {i + 1}
                      </span>
                      {storeBasePath ? (
                        <Link
                          href={`${storeBasePath}/${encodeURIComponent(loc.name)}${tokenSuffix ?? ''}`}
                          style={{
                            color: color.navy,
                            textDecoration: 'none',
                            borderBottom: `1px dashed ${color.muted}`,
                          }}
                        >
                          {loc.name}
                        </Link>
                      ) : (
                        loc.name
                      )}
                    </td>
                    {[loc.scans, loc.leads, loc.pullFiles, loc.idVerify, loc.dlCompleted].map((val, j) => (
                      <td
                        key={j}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'right',
                          borderBottom: `1px solid ${color.fillSubtle}`,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* RIGHT: Bar Chart */}
          <Card style={{ overflow: 'hidden' }}>
            <CardHeader title="Scans by Location" />
            <BarChart locations={filtered} />
          </Card>
        </div>
      )}
    </div>
  );
}

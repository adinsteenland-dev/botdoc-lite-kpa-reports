import type { TrendData, HealthScoreData, MonthlyDLRow } from '@/lib/parseCSV';

/** Start-inclusive / end-exclusive window for the current Mon–Mon week. */
export function currentWeek(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysBack = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

/** Rolling 30-day window ending today (default report range). */
export function last30Days(): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/** Format a Date as YYYY-MM-DD for use in date inputs and URL params. Uses local date to avoid UTC-offset day shifts. */
export function toDateParam(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely parse a YYYY-MM-DD date param from URL search params.
 * Returns null if the value is missing, malformed, or out of a sensible range.
 * Callers should fall back to a default when null is returned.
 */
export function parseDateParam(value: string | undefined | null): Date | null {
  if (!value) return null;
  // Must be exactly YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  // Parse as LOCAL midnight to avoid UTC-offset display bugs (e.g. "May 1" showing as "Apr 30").
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return null;
  // Only reject clearly invalid dates (before 2020)
  if (d < new Date(2020, 0, 1)) return null;
  return d;
}

/**
 * Returns 3 consecutive non-overlapping 30-day windows ending today, newest first:
 *   [0] last 30 days   (today-30 → today)
 *   [1] 30–60 days ago (today-60 → today-30)
 *   [2] 60–90 days ago (today-90 → today-60)
 */
export function trendWindows(): [
  { start: Date; end: Date; label: string },
  { start: Date; end: Date; label: string },
  { start: Date; end: Date; label: string },
] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const d = (daysBack: number) => {
    const t = new Date(now);
    t.setDate(now.getDate() - daysBack);
    t.setHours(0, 0, 0, 0);
    return t;
  };

  return [
    { start: d(30), end: new Date(now), label: 'Last 30 Days' },
    { start: d(60), end: d(30),         label: '30–60 Days Ago' },
    { start: d(90), end: d(60),         label: '60–90 Days Ago' },
  ];
}

/**
 * Computes a 0-100 Store Health Score from trend windows and all-time high DL.
 *
 * Components:
 *   - Peak ratio  (50 pts): min(m0 / allTimeHighDL, 1) × 50
 *   - Recent trend (30 pts): normalized pct change m0 vs m1, clamped ±50% → 0-30 pts
 *   - Medium trend (20 pts): normalized pct change m1 vs m2, clamped ±50% → 0-20 pts
 *
 * If allTimeHighDL=0, peak ratio is skipped and score is capped at 50 (trend-only).
 */
export function computeHealthScore(
  trendData: TrendData,
  storeRows: MonthlyDLRow[],
): HealthScoreData {
  const m0 = trendData.windows[0].metrics.dlCompleted;
  const m1 = trendData.windows[1].metrics.dlCompleted;
  const m2 = trendData.windows[2].metrics.dlCompleted;

  // Find all-time high month
  const peakRow = storeRows.reduce(
    (best, r) => (r.dlCompleted > best.dlCompleted ? r : best),
    { dlCompleted: 0, yearMonth: '', storeName: '' },
  );
  const allTimeHighDL = peakRow.dlCompleted;
  const peakMonth = peakRow.yearMonth
    ? new Date(peakRow.yearMonth + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  // Last 12 months sorted oldest → newest for sparkline
  const sorted = [...storeRows].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const monthlyHistory = sorted.slice(-12).map(({ yearMonth, dlCompleted }) => ({ yearMonth, dlCompleted }));

  // Consistency: last 6 months above 50% of peak
  const last6 = sorted.slice(-6);
  const above50 = last6.filter((r) => r.dlCompleted >= allTimeHighDL * 0.5).length;

  // Peak ratio component (0-50 pts)
  const peakPts = allTimeHighDL > 0 ? Math.min(m0 / allTimeHighDL, 1) * 50 : 0;

  // Normalize a pct change (±50% range → 0-1) then scale to maxPts
  const normPts = (pct: number | null, maxPts: number): number => {
    if (pct === null) return maxPts * 0.5; // neutral when no prior data
    const clamped = Math.max(-50, Math.min(50, pct));
    return ((clamped + 50) / 100) * maxPts;
  };

  const recentPct = calcTrendPct({ dlCompleted: m0 }, { dlCompleted: m1 });
  const mediumPct = calcTrendPct({ dlCompleted: m1 }, { dlCompleted: m2 });

  const score = Math.round(peakPts + normPts(recentPct, 30) + normPts(mediumPct, 20));
  const label =
    score >= 75 ? 'Excellent' :
    score >= 55 ? 'Good' :
    score >= 35 ? 'Fair' :
    'At Risk';

  return {
    score,
    label,
    allTimeHighDL,
    peakMonth,
    currentPctOfPeak: allTimeHighDL > 0 ? Math.round((m0 / allTimeHighDL) * 100) : null,
    recentTrendPct: recentPct !== null ? Math.round(recentPct) : null,
    mediumTrendPct: mediumPct !== null ? Math.round(mediumPct) : null,
    monthlyHistory,
    consistency: { above50, of: last6.length },
  };
}

/** Percentage change in dlCompleted from prior → curr window. Null when prior is zero. */
export function calcTrendPct(curr: { dlCompleted: number }, prior: { dlCompleted: number }): number | null {
  if (prior.dlCompleted === 0) return null;
  return ((curr.dlCompleted - prior.dlCompleted) / prior.dlCompleted) * 100;
}

export function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

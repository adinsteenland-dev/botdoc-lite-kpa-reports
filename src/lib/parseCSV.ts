export interface LocationData {
  name: string;
  scans: number;
  leads: number;
  pullFiles: number;
  idVerify: number;
  dlCompleted: number;
  appts: number;
  avgCarsSold?: number; // avg cars sold/month — used for usage score calculation
}

// Usage score: DL captures vs expected showroom ups (avgCarsSold * 1.5)
export function getUsageScore(loc: LocationData): number | null {
  if (!loc.avgCarsSold || loc.avgCarsSold <= 0) return null;
  const showroomUps = loc.avgCarsSold * 1.5;
  return (loc.dlCompleted / showroomUps) * 100;
}

export function getScoreColor(score: number): 'red' | 'yellow' | 'green' {
  if (score >= 80) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

export interface ReportData {
  customerName: string;
  logoBase64: string | null;
  period: string;
  locations: LocationData[];
}

export function cleanStoreName(storeTitle: string): string {
  const parts = storeTitle.split(' - ');
  const slug = parts[parts.length - 1].trim();
  // Strip leading "US" + digits prefix (e.g. "US2227")
  const withoutPrefix = slug.replace(/^US\d+/, '');

  // If the title already has spaces it's human-readable — just normalise whitespace.
  if (withoutPrefix.includes(' ')) {
    return withoutPrefix.replace(/\s+/g, ' ').trim();
  }

  // CamelCase slug (e.g. Fabric store titles like "ToyotaofMelbourneFL"):
  return withoutPrefix
    // Lowercase "of" between a word (3+ chars) or an acronym and an uppercase letter:
    //   "ToyotaofMelbourne" → "Toyota of Melbourne"
    //   "BMWMINIofFreeport"  → "BMWMINI of Freeport"
    //   "DeLandNissan"       → NOT matched ('L' alone is < 3 chars)
    .replace(/([A-Z][a-z]{2,}|[A-Z]{2,})(of)([A-Z])/g, '$1 of $3')
    // Normal camelCase split — only at lowercase→uppercase boundary.
    // This preserves two-letter state codes ("FL", "NC", "TX") since F→L is upper→upper.
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Acronym followed by a capitalised word: "BMWMini" → "BMW Mini"
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ');
}

export interface MonthlyDLRow {
  storeName: string;
  yearMonth: string;  // 'yyyy-MM'
  dlCompleted: number;
}

export interface RequestorRow {
  storeName: string;
  employeeName: string | null;
  isCustomer: boolean;  // true = customer self-service (requesterDoingIt=1), false = employee-initiated
  scans: number;
  pullFiles: number;
  dlCompleted: number;
}

export interface EngagementToolsData {
  tools: { label: string; count: number }[];
}

export interface RequestorData {
  customerScans: number;
  employeeScans: number;
  employees: { name: string; pullFiles: number; dlCompleted: number }[];
  engagementTools?: EngagementToolsData;
}

export interface HealthScoreData {
  score: number;              // 0-100
  label: 'Excellent' | 'Good' | 'Fair' | 'At Risk';
  allTimeHighDL: number;      // peak historical monthly DL
  peakMonth: string;          // human-readable peak month, e.g. "Mar 2024"
  currentPctOfPeak: number | null; // m0 / allTimeHighDL * 100, null if no peak
  recentTrendPct: number | null;   // m0 vs m1 pct change
  mediumTrendPct: number | null;   // m1 vs m2 pct change
  monthlyHistory: { yearMonth: string; dlCompleted: number }[]; // last 12 months, oldest first
  consistency: { above50: number; of: number }; // months in last 6 above 50% of peak
}

export interface TrendMetrics {
  scans: number;
  leads: number;
  dlCompleted: number;
}

export interface TrendWindow {
  label: string;
  metrics: TrendMetrics;
  /** Percentage change vs the prior window. Null when no prior window or prior is zero. */
  pctVsPrior: number | null;
}

export interface TrendData {
  windows: [TrendWindow, TrendWindow, TrendWindow]; // newest first
}

export function formatKPI(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export function sumLocations(locations: LocationData[]) {
  return locations.reduce(
    (acc, loc) => ({
      scans:       acc.scans + loc.scans,
      leads:       acc.leads + loc.leads,
      pullFiles:   acc.pullFiles + loc.pullFiles,
      idVerify:    acc.idVerify + loc.idVerify,
      dlCompleted: acc.dlCompleted + loc.dlCompleted,
      appts:       acc.appts + loc.appts,
    }),
    { scans: 0, leads: 0, pullFiles: 0, idVerify: 0, dlCompleted: 0, appts: 0 }
  );
}

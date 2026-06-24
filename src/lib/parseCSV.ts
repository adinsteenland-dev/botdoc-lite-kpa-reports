export interface LocationData {
  storeId: string;
  name: string;
  scans: number;
  leads: number;
  pullFiles: number;
  idVerify: number;
  dlCompleted: number;
  appts: number;
  employeeInitiated: number;
  customerSelfService: number;
  avgCarsSold?: number; // avg cars sold/month — used for usage score calculation
}

export interface StoreEmployee {
  employeeId: string;
  employeeName: string;
  email: string | null;
  mobile: string | null;
  onboardedAt: string | null; // ISO date string
  sessions: number;
  pullFiles: number;
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

// Two-letter US state codes — kept uppercase in store names.
const US_STATES = new Set([
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
  'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
  'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
  'va','wa','wv','wi','wy','dc',
]);

// Words that stay lowercase mid-name (unless first word).
const SMALL_WORDS = new Set(['of','the','and','a','an','in','at','by','for','to','with']);

export function cleanStoreName(storeTitle: string): string {
  // KPA format: kpa<digits>_word_word_..._state
  if (/^kpa\d+_/i.test(storeTitle)) {
    const withoutPrefix = storeTitle.replace(/^kpa\d+_/i, '');
    const words = withoutPrefix.split('_').filter(Boolean);
    return words
      .map((word, i) => {
        const lower = word.toLowerCase();
        if (US_STATES.has(lower)) return lower.toUpperCase();
        if (i > 0 && SMALL_WORDS.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }

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
    .replace(/([A-Z][a-z]{2,}|[A-Z]{2,})(of)([A-Z])/g, '$1 of $3')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
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
      scans:               acc.scans + loc.scans,
      leads:               acc.leads + loc.leads,
      pullFiles:           acc.pullFiles + loc.pullFiles,
      idVerify:            acc.idVerify + loc.idVerify,
      dlCompleted:         acc.dlCompleted + loc.dlCompleted,
      appts:               acc.appts + loc.appts,
      employeeInitiated:   acc.employeeInitiated + loc.employeeInitiated,
      customerSelfService: acc.customerSelfService + loc.customerSelfService,
    }),
    { scans: 0, leads: 0, pullFiles: 0, idVerify: 0, dlCompleted: 0, appts: 0, employeeInitiated: 0, customerSelfService: 0 }
  );
}

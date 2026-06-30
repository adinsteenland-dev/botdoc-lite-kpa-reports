import type { LocationData } from '@/lib/parseCSV';

/**
 * Report entity — pure domain type. No framework or DB imports allowed here.
 * LocationData is a pure data interface (no framework deps), safe to import.
 */
export interface Report {
  id: string;
  customerId: string;
  /** Null when the user left the period fields blank. */
  periodStart: Date | null;
  periodEnd: Date | null;
  /** Human-readable period string, e.g. "Apr 19 – May 18, 2026". */
  periodLabel: string;
  /** Full location metrics snapshot at report generation time. */
  metrics: LocationData[];
  generatedAt: Date;
}

export type NewReport = Omit<Report, 'id' | 'generatedAt'>;

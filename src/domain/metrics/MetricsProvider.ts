import type { DataFilter } from '@/domain/partner/Partner';
import type { LocationData } from '@/lib/parseCSV';

export interface MetricsProvider {
  fetchMetrics(filter: DataFilter, periodStart: Date, periodEnd: Date): Promise<LocationData[]>;
}

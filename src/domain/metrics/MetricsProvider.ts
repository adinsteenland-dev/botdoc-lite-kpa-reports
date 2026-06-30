import type { DataFilter } from '@/domain/shared/DataFilter';
import type { LocationData } from '@/lib/parseCSV';

export interface MetricsProvider {
  fetchMetrics(filter: DataFilter, periodStart: Date, periodEnd: Date): Promise<LocationData[]>;
}

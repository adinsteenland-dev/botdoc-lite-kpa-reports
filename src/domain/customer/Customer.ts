/**
 * Customer entity (Connect product) — pure domain type.
 * No framework or DB imports allowed here.
 */
import type { DataFilter } from '@/domain/shared/DataFilter';

/** Average cars sold per month config.
 *  group  = default for all stores without an explicit entry.
 *  stores = per-store overrides keyed by cleaned store name.
 */
export interface AvgCarsConfig {
  group?: number;
  stores?: Record<string, number>;
}

export interface Customer {
  id: string;
  name: string;
  /** Raw logo bytes — null when no logo uploaded. */
  logo: Buffer | null;
  /** MIME type of the logo (e.g. 'image/png'). Null when logo is null. */
  logoMimeType: string | null;
  /** Fabric data filter — null in Phase 1 (CSV-only). */
  dataFilter: DataFilter | null;
  /** Default avg cars/month config for pre-filling new reports. */
  avgCarsConfig: AvgCarsConfig;
  /** Preferred IANA timezone for email scheduling (e.g. 'America/New_York'). */
  defaultTimezone: string | null;
  createdAt: Date;
}

export type NewCustomer = Omit<Customer, 'id' | 'createdAt'>;

/**
 * Partner entity — pure domain type. No framework or DB imports allowed here.
 */

/** Filter definition used to build Fabric SQL WHERE clauses. */
export interface DataFilter {
  userIds?: number[];
  storeIds?: string[];
  titleIncludes?: string[];  // LIKE patterns — store name must match at least one
  titleExcludes?: string[];  // LIKE patterns — store name must not match any
}

export interface Partner {
  id: string;
  name: string;
  /** Raw logo bytes — null when no logo uploaded. */
  logo: Buffer | null;
  /** MIME type of the logo (e.g. 'image/png'). Null when logo is null. */
  logoMimeType: string | null;
  /** Fabric data filter — null until configured. */
  dataFilter: DataFilter | null;
  /** Preferred IANA timezone for display (e.g. 'America/New_York'). */
  defaultTimezone: string | null;
  createdAt: Date;
}

export type NewPartner = Omit<Partner, 'id' | 'createdAt'>;

/**
 * Unified data filter — used by both Connect (Customer) and Lite (Partner)
 * to build Fabric SQL WHERE clauses.
 */
export interface DataFilter {
  userIds?: number[];
  storeIds?: string[];
  titleIncludes?: string[];  // LIKE patterns — store name must match at least one (Lite)
  titleExcludes?: string[];  // LIKE patterns — store name must not match any
}

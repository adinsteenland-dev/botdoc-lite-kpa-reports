/**
 * FabricMetricsProvider — queries dbo.vw_DocumentStats on the Microsoft
 * Fabric SQL endpoint and returns store-level aggregated metrics.
 *
 * The WHERE clause is built from the customer's DataFilter, which is one of:
 *   • user_ids (int[]) + optional title_excludes (NOT LIKE patterns), OR
 *   • store_ids (text[]) — explicit Botdoc Store Id (apikey) hashes.
 *
 * All filter values are injected via mssql named parameters — never by
 * string concatenation — as required by docs/queries/README.md.
 */
import sql from 'mssql';
import { getPool } from './client';
import type { MetricsProvider } from '@/domain/metrics/MetricsProvider';
import type { DataFilter } from '@/domain/shared/DataFilter';
import type { LocationData, MonthlyDLRow, RequestorRow, EngagementToolsData } from '@/lib/parseCSV';
import { cleanStoreName } from '@/lib/parseCSV';

interface FabricRow {
  storeName: string;
  scans: number;
  leads: number;
  pullFiles: number;
  idVerify: number;
  dlCompleted: number;
  appts: number;
}

interface FabricMonthlyRow {
  storeName: string;
  yearMonth: string;
  dlCompleted: number;
}

interface FabricRequestorRow {
  storeName: string;
  employeeName: string | null;
  requesterName: string | null;
  requesterDoingIt: string | number | boolean | null;
  scans: number;
  pullFiles: number;
  dlCompleted: number;
}

interface FabricEngagementRow {
  storeName: string;
  toolLabel: string;
  count: number;
}

interface FabricCallbackSampleRow {
  callbackUrl: string | null;
  cnt: number;
}

export class FabricMetricsProvider implements MetricsProvider {
  async fetchMetrics(
    filter: DataFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<LocationData[]> {
    const pool = await getPool();
    const req = pool.request();

    // Date range — start-inclusive / end-exclusive (Monday→Monday window).
    req.input('periodStart', sql.Date, periodStart);
    req.input('periodEnd', sql.Date, periodEnd);

    const extraClauses: string[] = [];

    // Filter by user_ids (e.g. AMSI = 215).
    if (filter.userIds && filter.userIds.length > 0) {
      const names = filter.userIds.map((_, i) => `@uid${i}`);
      extraClauses.push(`[User Id] IN (${names.join(', ')})`);
      filter.userIds.forEach((id, i) => req.input(`uid${i}`, sql.Int, id));
    }

    // Filter by explicit Botdoc Store Id hashes.
    if (filter.storeIds && filter.storeIds.length > 0) {
      const names = filter.storeIds.map((_, i) => `@sid${i}`);
      extraClauses.push(`[Botdoc Store Id] IN (${names.join(', ')})`);
      filter.storeIds.forEach((id, i) => req.input(`sid${i}`, sql.NVarChar(64), id));
    }

    // Title exclusions (e.g. NOT LIKE '%Campbell%').
    if (filter.titleExcludes && filter.titleExcludes.length > 0) {
      filter.titleExcludes.forEach((pat, i) => {
        extraClauses.push(`[Store Title] NOT LIKE @tex${i}`);
        req.input(`tex${i}`, sql.NVarChar(256), pat);
      });
    }

    const extraWhere =
      extraClauses.length > 0 ? '\n  AND ' + extraClauses.join('\n  AND ') : '';

    // Aggregate one row per store. Lead Created may be a datetime (→ IS NOT NULL
    // counting) while the numeric columns use TRY_CAST for safety.
    //
    // NOTE: [ID Verify] from vw_DocumentStats is unreliable — it mirrors
    // [Complete Document] for some customers (e.g. AMSI). We bypass it and
    // join directly to the raw ID verify feature table, which is the source
    // of truth (same approach as the Lite provider).
    const queryText = `
      SELECT
        v.[Store Title]                                            AS storeName,
        COUNT(*)                                                   AS scans,
        COUNT(CASE WHEN v.[Lead Created] IS NOT NULL THEN 1 END)  AS leads,
        SUM(ISNULL(TRY_CAST(v.[Pull Files]        AS INT), 0))    AS pullFiles,
        SUM(ISNULL(iv_agg.idVerifyCount, 0))                      AS idVerify,
        SUM(ISNULL(TRY_CAST(v.[Complete Document] AS INT), 0))    AS dlCompleted,
        SUM(ISNULL(TRY_CAST(v.[Appointments Set]  AS INT), 0))    AS appts
      FROM [dbo].[vw_DocumentStats] v
      LEFT JOIN (
        SELECT container_id, SUM(cnt) AS idVerifyCount
        FROM (
          SELECT f.container_id, COUNT(iv.feature_ptr_id) AS cnt
          FROM dbo.module_container_idverify_service_idverify iv
          INNER JOIN dbo.module_container_feature f ON f.id = iv.feature_ptr_id
          WHERE f.state = 'complete'
          GROUP BY f.container_id
          UNION ALL
          SELECT f.container_id, COUNT(mw.feature_ptr_id) AS cnt
          FROM dbo.module_container_mworkflow_mworkflow mw
          INNER JOIN dbo.module_container_feature f ON f.id = mw.feature_ptr_id
          WHERE f.state = 'complete' AND mw.workflow_id = '69f0c96a6ad82ade356a2f0c'
          GROUP BY f.container_id
        ) AS iv_combined
        GROUP BY container_id
      ) AS iv_agg ON TRY_CAST(v.[Container ID] AS BIGINT) = iv_agg.container_id
      WHERE
        v.[creation_date] >= @periodStart
        AND v.[creation_date] < @periodEnd${extraWhere.replace(/\[/g, 'v.[')}
      GROUP BY v.[Store Title]
      ORDER BY scans DESC
    `;

    const result = await req.query<FabricRow>(queryText);

    return result.recordset.map((row) => ({
      name: cleanStoreName(row.storeName),
      scans: row.scans ?? 0,
      leads: row.leads ?? 0,
      pullFiles: row.pullFiles ?? 0,
      idVerify: row.idVerify ?? 0,
      dlCompleted: row.dlCompleted ?? 0,
      appts: row.appts ?? 0,
    }));
  }

  /**
   * Returns all-time monthly DL completed totals for every store matching
   * the customer's filter — no date restriction. Caller filters to a specific
   * store and finds the all-time high month.
   */
  async fetchMonthlyDL(filter: DataFilter): Promise<MonthlyDLRow[]> {
    const pool = await getPool();
    const req = pool.request();

    const extraClauses: string[] = [];

    if (filter.userIds && filter.userIds.length > 0) {
      const names = filter.userIds.map((_, i) => `@uid${i}`);
      extraClauses.push(`[User Id] IN (${names.join(', ')})`);
      filter.userIds.forEach((id, i) => req.input(`uid${i}`, sql.Int, id));
    }

    if (filter.storeIds && filter.storeIds.length > 0) {
      const names = filter.storeIds.map((_, i) => `@sid${i}`);
      extraClauses.push(`[Botdoc Store Id] IN (${names.join(', ')})`);
      filter.storeIds.forEach((id, i) => req.input(`sid${i}`, sql.NVarChar(64), id));
    }

    if (filter.titleExcludes && filter.titleExcludes.length > 0) {
      filter.titleExcludes.forEach((pat, i) => {
        extraClauses.push(`[Store Title] NOT LIKE @tex${i}`);
        req.input(`tex${i}`, sql.NVarChar(256), pat);
      });
    }

    const extraWhere =
      extraClauses.length > 0 ? '\n  WHERE ' + extraClauses.join('\n  AND ') : '';

    const queryText = `
      SELECT
        [Store Title]                                            AS storeName,
        FORMAT([creation_date], 'yyyy-MM')                       AS yearMonth,
        SUM(ISNULL(TRY_CAST([Complete Document] AS INT), 0))     AS dlCompleted
      FROM [dbo].[vw_DocumentStats]${extraWhere}
      GROUP BY [Store Title], FORMAT([creation_date], 'yyyy-MM')
    `;

    const result = await req.query<FabricMonthlyRow>(queryText);

    return result.recordset.map((row) => ({
      storeName: cleanStoreName(row.storeName),
      yearMonth: row.yearMonth,
      dlCompleted: row.dlCompleted ?? 0,
    }));
  }

  /**
   * Returns per-store requestor breakdown for a date range: groups by store,
   * employee name, and whether the requester did it themselves. Used to build
   * the customer vs employee pie chart and per-employee usage chart.
   */
  async fetchRequestorData(
    filter: DataFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RequestorRow[]> {
    const pool = await getPool();
    const req = pool.request();

    req.input('periodStart', sql.Date, periodStart);
    req.input('periodEnd', sql.Date, periodEnd);

    const extraClauses: string[] = [];

    if (filter.userIds && filter.userIds.length > 0) {
      const names = filter.userIds.map((_, i) => `@uid${i}`);
      extraClauses.push(`[User Id] IN (${names.join(', ')})`);
      filter.userIds.forEach((id, i) => req.input(`uid${i}`, sql.Int, id));
    }

    if (filter.storeIds && filter.storeIds.length > 0) {
      const names = filter.storeIds.map((_, i) => `@sid${i}`);
      extraClauses.push(`[Botdoc Store Id] IN (${names.join(', ')})`);
      filter.storeIds.forEach((id, i) => req.input(`sid${i}`, sql.NVarChar(64), id));
    }

    if (filter.titleExcludes && filter.titleExcludes.length > 0) {
      filter.titleExcludes.forEach((pat, i) => {
        extraClauses.push(`[Store Title] NOT LIKE @tex${i}`);
        req.input(`tex${i}`, sql.NVarChar(256), pat);
      });
    }

    const extraWhere =
      extraClauses.length > 0 ? '\n  AND ' + extraClauses.join('\n  AND ') : '';

    const queryText = `
      SELECT
        [Store Title]                                              AS storeName,
        [Who is working?]                                          AS employeeName,
        [requester]                                                AS requesterName,
        [requesterDoingIt]                                         AS requesterDoingIt,
        COUNT(*)                                                   AS scans,
        SUM(ISNULL(TRY_CAST([Pull Files]        AS INT), 0))       AS pullFiles,
        SUM(ISNULL(TRY_CAST([Complete Document] AS INT), 0))       AS dlCompleted
      FROM [dbo].[vw_DocumentStats]
      WHERE
        [creation_date] >= @periodStart
        AND [creation_date] < @periodEnd${extraWhere}
      GROUP BY [Store Title], [Who is working?], [requester], [requesterDoingIt]
    `;

    const result = await req.query<FabricRequestorRow>(queryText);

    const GENERIC = new Set(['EMPLOYEE', 'CUSTOMER', '']);
    return result.recordset.map((row) => {
      const whoIsWorking = row.employeeName?.trim() ?? '';
      const requesterFull = row.requesterName?.trim() ?? '';
      // Prefer [Who is working?] when it's a real name; fall back to [requester] if generic.
      const empName = !GENERIC.has(whoIsWorking.toUpperCase())
        ? whoIsWorking
        : !GENERIC.has(requesterFull.toUpperCase())
          ? requesterFull
          : null;
      // requesterDoingIt contains the employee's ID when an employee initiated the session.
      // Empty / null / 0 means no employee was involved — the customer submitted themselves.
      const rid = row.requesterDoingIt;
      const isCustomer = rid === null || rid === '' || rid === 0 || rid === false || rid === '0';
      return {
        storeName: cleanStoreName(row.storeName),
        employeeName: empName,
        isCustomer,
        scans: row.scans ?? 0,
        pullFiles: row.pullFiles ?? 0,
        dlCompleted: row.dlCompleted ?? 0,
      };
    });
  }

  /**
   * Returns a sample of distinct callback_url values for discovery purposes.
   * Also includes sample [Who is working?] and [requester] values so employee
   * name resolution can be validated. Used by the /api/admin/callback-sample route.
   */
  async fetchEngagementSample(
    filter: DataFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ callbackUrl: string | null; cnt: number }[]> {
    const pool = await getPool();
    const req = pool.request();

    req.input('periodStart', sql.Date, periodStart);
    req.input('periodEnd', sql.Date, periodEnd);

    const extraClauses: string[] = [];

    if (filter.userIds && filter.userIds.length > 0) {
      const names = filter.userIds.map((_, i) => `@uid${i}`);
      extraClauses.push(`[User Id] IN (${names.join(', ')})`);
      filter.userIds.forEach((id, i) => req.input(`uid${i}`, sql.Int, id));
    }

    if (filter.storeIds && filter.storeIds.length > 0) {
      const names = filter.storeIds.map((_, i) => `@sid${i}`);
      extraClauses.push(`[Botdoc Store Id] IN (${names.join(', ')})`);
      filter.storeIds.forEach((id, i) => req.input(`sid${i}`, sql.NVarChar(64), id));
    }

    if (filter.titleExcludes && filter.titleExcludes.length > 0) {
      filter.titleExcludes.forEach((pat, i) => {
        extraClauses.push(`[Store Title] NOT LIKE @tex${i}`);
        req.input(`tex${i}`, sql.NVarChar(256), pat);
      });
    }

    const extraWhere =
      extraClauses.length > 0 ? '\n  AND ' + extraClauses.join('\n  AND ') : '';

    const queryText = `
      SELECT TOP 100
        [callback_url] AS callbackUrl,
        COUNT(*)       AS cnt
      FROM [dbo].[vw_DocumentStats]
      WHERE
        [creation_date] >= @periodStart
        AND [creation_date] < @periodEnd${extraWhere}
      GROUP BY [callback_url]
      ORDER BY cnt DESC
    `;

    const result = await req.query<FabricCallbackSampleRow>(queryText);
    return result.recordset.map((row) => ({
      callbackUrl: row.callbackUrl ?? null,
      cnt: row.cnt ?? 0,
    }));
  }

  /**
   * Discovery: returns top 100 distinct [scanMean] values to identify the
   * correct field/patterns for engagement tool classification.
   */
  async fetchScanMeanSample(
    filter: DataFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ scanMean: string | null; requesterDoingIt: unknown; cnt: number }[]> {
    const pool = await getPool();
    const req = pool.request();

    req.input('periodStart', sql.Date, periodStart);
    req.input('periodEnd', sql.Date, periodEnd);

    const extraClauses: string[] = [];

    if (filter.userIds && filter.userIds.length > 0) {
      const names = filter.userIds.map((_, i) => `@uid${i}`);
      extraClauses.push(`[User Id] IN (${names.join(', ')})`);
      filter.userIds.forEach((id, i) => req.input(`uid${i}`, sql.Int, id));
    }

    if (filter.storeIds && filter.storeIds.length > 0) {
      const names = filter.storeIds.map((_, i) => `@sid${i}`);
      extraClauses.push(`[Botdoc Store Id] IN (${names.join(', ')})`);
      filter.storeIds.forEach((id, i) => req.input(`sid${i}`, sql.NVarChar(64), id));
    }

    if (filter.titleExcludes && filter.titleExcludes.length > 0) {
      filter.titleExcludes.forEach((pat, i) => {
        extraClauses.push(`[Store Title] NOT LIKE @tex${i}`);
        req.input(`tex${i}`, sql.NVarChar(256), pat);
      });
    }

    const extraWhere =
      extraClauses.length > 0 ? '\n  AND ' + extraClauses.join('\n  AND ') : '';

    const queryText = `
      SELECT TOP 100
        [scanMean]          AS scanMean,
        [requesterDoingIt]  AS requesterDoingIt,
        COUNT(*)            AS cnt
      FROM [dbo].[vw_DocumentStats]
      WHERE
        [creation_date] >= @periodStart
        AND [creation_date] < @periodEnd${extraWhere}
      GROUP BY [scanMean], [requesterDoingIt]
      ORDER BY cnt DESC
    `;

    const result = await req.query<{ scanMean: string | null; requesterDoingIt: unknown; cnt: number }>(queryText);
    return result.recordset.map((row) => ({
      scanMean: row.scanMean ?? null,
      requesterDoingIt: row.requesterDoingIt,
      cnt: row.cnt ?? 0,
    })) as { scanMean: string | null; requesterDoingIt: unknown; cnt: number }[];
  }

  /**
   * Returns per-store engagement tool breakdown for a date range.
   * Classifies each row by callback_url pattern into one of the named tool types.
   * NOTE: The LIKE patterns below are initial guesses — run fetchEngagementSample
   * first and update these patterns based on actual callback_url values in Fabric.
   */
  async fetchEngagementTools(
    filter: DataFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<FabricEngagementRow[]> {
    const pool = await getPool();
    const req = pool.request();

    req.input('periodStart', sql.Date, periodStart);
    req.input('periodEnd', sql.Date, periodEnd);

    const extraClauses: string[] = [];

    if (filter.userIds && filter.userIds.length > 0) {
      const names = filter.userIds.map((_, i) => `@uid${i}`);
      extraClauses.push(`[User Id] IN (${names.join(', ')})`);
      filter.userIds.forEach((id, i) => req.input(`uid${i}`, sql.Int, id));
    }

    if (filter.storeIds && filter.storeIds.length > 0) {
      const names = filter.storeIds.map((_, i) => `@sid${i}`);
      extraClauses.push(`[Botdoc Store Id] IN (${names.join(', ')})`);
      filter.storeIds.forEach((id, i) => req.input(`sid${i}`, sql.NVarChar(64), id));
    }

    if (filter.titleExcludes && filter.titleExcludes.length > 0) {
      filter.titleExcludes.forEach((pat, i) => {
        extraClauses.push(`[Store Title] NOT LIKE @tex${i}`);
        req.input(`tex${i}`, sql.NVarChar(256), pat);
      });
    }

    const extraWhere =
      extraClauses.length > 0 ? '\n  AND ' + extraClauses.join('\n  AND ') : '';

    // Use [scanMean] — the field that directly encodes the engagement tool type.
    // OEM variants (storeQrOEM, storeNfcOEM) are merged into their parent category.
    // samsung_wallet is merged with Apple Wallet under "Mobile Wallet".
    const classifyExpr = `
        CASE
          WHEN [scanMean] IN ('storeQr', 'storeQrOEM')     THEN 'StoreQR'
          WHEN [scanMean] IN ('storeNfc', 'storeNfcOEM')   THEN 'StoreNFC'
          WHEN [scanMean] = 'cardQr'                        THEN 'CardQR'
          WHEN [scanMean] = 'cardNfc'                       THEN 'CardNFC'
          WHEN [scanMean] IN ('apple_wallet', 'samsung_wallet') THEN 'Mobile Wallet'
          WHEN [scanMean] = 'smd'                           THEN 'SMD'
          WHEN [scanMean] = 'website'                       THEN 'Website'
          WHEN [scanMean] = 'crm'                           THEN 'CRM'
          WHEN [scanMean] = 'onboarding'                    THEN 'Onboarding'
          ELSE 'Other'
        END`;
    const queryText = `
      SELECT
        [Store Title] AS storeName,
        ${classifyExpr} AS toolLabel,
        COUNT(*) AS [count]
      FROM [dbo].[vw_DocumentStats]
      WHERE
        [creation_date] >= @periodStart
        AND [creation_date] < @periodEnd
        AND [scanMean] IS NOT NULL
        AND [scanMean] NOT IN ('None', 'notProvided')${extraWhere}
      GROUP BY [Store Title], ${classifyExpr}
    `;

    const result = await req.query<FabricEngagementRow>(queryText);
    return result.recordset.map((row) => ({
      storeName: cleanStoreName(row.storeName),
      toolLabel: row.toolLabel,
      count: row.count ?? 0,
    }));
  }
}

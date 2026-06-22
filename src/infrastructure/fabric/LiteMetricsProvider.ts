/**
 * LiteMetricsProvider — queries Botdoc Lite data directly from Fabric SQL
 * (raw tables, no view) and returns location-level aggregated metrics.
 *
 * Based on the KPA Looker Studio query. User ID 225 = LITE platform.
 * Pass DataFilter.userIds = [225] to scope all stores for the Lite platform,
 * or DataFilter.storeIds = [...] to scope specific stores.
 *
 * Metrics mapping:
 *   scans        → COUNT of container sessions in period
 *   leads        → SUM of session_opened callbacks (engagement signal)
 *   pullFiles    → SUM of pull file counts per session
 *   idVerify     → SUM of ID verify completions per session
 *   dlCompleted  → COUNT of sessions where container_state = 'complete'
 *   appts        → 0 (no appointments concept in Lite data)
 *
 * All filter values use mssql named parameters — never string concatenation.
 */
import sql from 'mssql';
import { getPool } from './client';
import type { MetricsProvider } from '@/domain/metrics/MetricsProvider';
import type { DataFilter } from '@/domain/partner/Partner';
import type { LocationData } from '@/lib/parseCSV';
import { cleanStoreName } from '@/lib/parseCSV';

interface LiteRow {
  storeId: string;
  storeName: string;
  scans: number;
  pullFiles: number;
  idVerify: number;
  dlCompleted: number;
  sessionOpened: number;
  employeeInitiated: number;
  customerSelfService: number;
}

export class LiteMetricsProvider implements MetricsProvider {
  async fetchMetrics(
    filter: DataFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<LocationData[]> {
    const pool = await getPool();
    const req = pool.request();

    req.input('periodStart', sql.DateTime, periodStart);
    req.input('periodEnd', sql.DateTime, periodEnd);

    const extraClauses: string[] = [];

    // Filter by user_id (e.g. 225 = LITE platform, 221 = KPA)
    if (filter.userIds && filter.userIds.length > 0) {
      const names = filter.userIds.map((_, i) => `@uid${i}`);
      extraClauses.push(`ak.user_id IN (${names.join(', ')})`);
      filter.userIds.forEach((id, i) => req.input(`uid${i}`, sql.Int, id));
    }

    // Filter by explicit store API key IDs
    if (filter.storeIds && filter.storeIds.length > 0) {
      const names = filter.storeIds.map((_, i) => `@sid${i}`);
      extraClauses.push(`ak.id IN (${names.join(', ')})`);
      filter.storeIds.forEach((id, i) => req.input(`sid${i}`, sql.NVarChar(64), id));
    }

    // Title inclusions (LIKE patterns — store name must match at least one)
    if (filter.titleIncludes && filter.titleIncludes.length > 0) {
      const orClauses = filter.titleIncludes.map((_, i) => `ak.name LIKE @tinc${i}`);
      extraClauses.push(`(${orClauses.join(' OR ')})`);
      filter.titleIncludes.forEach((pat, i) => req.input(`tinc${i}`, sql.NVarChar(256), pat));
    }

    // Title exclusions (NOT LIKE patterns on store name)
    if (filter.titleExcludes && filter.titleExcludes.length > 0) {
      filter.titleExcludes.forEach((pat, i) => {
        extraClauses.push(`ak.name NOT LIKE @tex${i}`);
        req.input(`tex${i}`, sql.NVarChar(256), pat);
      });
    }

    const extraWhere =
      extraClauses.length > 0 ? '\n  AND ' + extraClauses.join('\n  AND ') : '';

    const queryText = `
      /* CTE: aggregate all session metrics for the date window.
         Keeping this separate lets the outer query LEFT JOIN from stores → sessions,
         so stores with zero activity in the period still appear in results. */
      WITH session_agg AS (
        SELECT
          c.apikey_id,
          COUNT(c.id)                                                 AS scans,
          SUM(pf_agg.cnt)                                             AS pullFiles,
          SUM(iv_agg.cnt)                                             AS idVerify,
          COUNT(CASE WHEN
            CASE
              WHEN (c.callback_url LIKE '%obwh%' OR c.callback_url LIKE '%onboarding%')
              THEN 'onboarding'
              ELSE cs.[value]
            END = 'complete'
          THEN 1 END)                                                 AS dlCompleted,
          SUM(so_agg.cnt)                                             AS sessionOpened,
          COUNT(CASE WHEN rdi_agg.val <> '' THEN 1 END)               AS employeeInitiated,
          COUNT(CASE WHEN rdi_agg.val = '' THEN 1 END)                AS customerSelfService
        FROM dbo.module_container_container c
        LEFT JOIN dbo.module_container_containermetadata cs
          ON cs.container_id = c.id AND cs.[key] = 'state'
        CROSS APPLY (
          SELECT COUNT(pf.id) AS cnt
          FROM dbo.module_container_pull_pullfile pf
          INNER JOIN dbo.module_container_pull_pull pp ON pf.pull_id = pp.feature_ptr_id
          INNER JOIN dbo.module_container_feature mf ON pp.feature_ptr_id = mf.id
          WHERE mf.container_id = c.id
        ) AS pf_agg
        CROSS APPLY (
          SELECT
            (SELECT COUNT(iv.feature_ptr_id)
             FROM dbo.module_container_idverify_service_idverify iv
             INNER JOIN dbo.module_container_feature f ON f.id = iv.feature_ptr_id
             WHERE f.container_id = c.id AND f.state = 'complete')
            +
            (SELECT COUNT(mw.feature_ptr_id)
             FROM dbo.module_container_mworkflow_mworkflow mw
             INNER JOIN dbo.module_container_feature f ON f.id = mw.feature_ptr_id
             WHERE f.container_id = c.id AND f.state = 'complete'
             AND mw.workflow_id = '69f0c96a6ad82ade356a2f0c')
            AS cnt
        ) AS iv_agg
        CROSS APPLY (
          SELECT COUNT(cb.id) AS cnt
          FROM dbo.module_container_callbackcall cb
          WHERE cb.callback_type = 'session_opened'
            AND cb.created >= c.created
            AND cb.container_id = c.id
        ) AS so_agg
        CROSS APPLY (
          SELECT ISNULL(
            (SELECT TOP 1 [value]
             FROM dbo.module_container_containermetadata
             WHERE container_id = c.id AND [key] = 'requester_id'),
            ''
          ) AS val
        ) AS rdi_agg
        WHERE
          c.created >= @periodStart
          AND c.created < @periodEnd
          AND c.callback_url <> ''
        GROUP BY c.apikey_id
      )
      /* Outer query: all active stores matching the filter, LEFT JOIN to session totals.
         Stores with no sessions in the period get ISNULL → 0 rather than being omitted. */
      SELECT
        ak.id                                   AS storeId,
        ak.name                                 AS storeName,
        ISNULL(sa.scans, 0)                     AS scans,
        ISNULL(sa.pullFiles, 0)                 AS pullFiles,
        ISNULL(sa.idVerify, 0)                  AS idVerify,
        ISNULL(sa.dlCompleted, 0)               AS dlCompleted,
        ISNULL(sa.sessionOpened, 0)             AS sessionOpened,
        ISNULL(sa.employeeInitiated, 0)         AS employeeInitiated,
        ISNULL(sa.customerSelfService, 0)       AS customerSelfService
      FROM dbo.mod_api_key_apikey ak
      LEFT JOIN session_agg sa ON sa.apikey_id = ak.id
      WHERE ak.active = 1${extraWhere}
      ORDER BY ISNULL(sa.scans, 0) DESC
    `;

    const result = await req.query<LiteRow>(queryText);

    return result.recordset.map((row) => ({
      name: cleanStoreName(row.storeName),
      scans: row.scans ?? 0,
      leads: row.sessionOpened ?? 0,
      pullFiles: row.pullFiles ?? 0,
      idVerify: row.idVerify ?? 0,
      dlCompleted: row.dlCompleted ?? 0,
      appts: 0,
      employeeInitiated: row.employeeInitiated ?? 0,
      customerSelfService: row.customerSelfService ?? 0,
    }));
  }
}

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
      SELECT
        ak.id                                                       AS storeId,
        ak.name                                                     AS storeName,
        COUNT(c.id)                                                 AS scans,

        /* Pull Files — count of pulled files across all pull features per session */
        SUM((
          SELECT COUNT(pf.id)
          FROM dbo.module_container_pull_pullfile pf
          INNER JOIN dbo.module_container_pull_pull pp ON pf.pull_id = pp.feature_ptr_id
          INNER JOIN dbo.module_container_feature mf ON pp.feature_ptr_id = mf.id
          WHERE mf.container_id = c.id
        ))                                                          AS pullFiles,

        /* ID Verify — completed idverify + mworkflow (id_scan_verify workflow) */
        SUM((
          SELECT COUNT(iv.feature_ptr_id)
          FROM dbo.module_container_idverify_service_idverify iv
          INNER JOIN dbo.module_container_feature f ON f.id = iv.feature_ptr_id
          WHERE f.container_id = c.id AND f.state = 'complete'
        ) + (
          SELECT COUNT(mw.feature_ptr_id)
          FROM dbo.module_container_mworkflow_mworkflow mw
          INNER JOIN dbo.module_container_feature f ON f.id = mw.feature_ptr_id
          WHERE f.container_id = c.id AND f.state = 'complete'
          AND mw.workflow_id = '69f0c96a6ad82ade356a2f0c'
        ))                                                          AS idVerify,

        /* DL Completed — sessions where container_state = 'complete'
           (onboarding callback URLs are classified as 'onboarding', not 'complete') */
        COUNT(CASE WHEN
          CASE
            WHEN (c.callback_url LIKE '%obwh%' OR c.callback_url LIKE '%onboarding%')
            THEN 'onboarding'
            ELSE cs.[value]
          END = 'complete'
        THEN 1 END)                                                 AS dlCompleted,

        /* Session Opened — total session_opened callbacks (engagement signal, used as "leads") */
        SUM((
          SELECT COUNT(cb.id)
          FROM dbo.module_container_callbackcall cb
          WHERE cb.callback_type = 'session_opened'
            AND cb.created >= c.created
            AND cb.container_id = c.id
        ))                                                          AS sessionOpened

      FROM dbo.module_container_container c
      LEFT JOIN dbo.module_container_containermetadata cs
        ON cs.container_id = c.id
        AND cs.[key] = 'state'
      INNER JOIN dbo.mod_api_key_apikey ak
        ON c.apikey_id = ak.id
      WHERE
        c.created >= @periodStart
        AND c.created < @periodEnd
        AND c.callback_url <> ''
        AND c.id > 10160412${extraWhere}
      GROUP BY ak.id, ak.name
      ORDER BY COUNT(c.id) DESC
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
    }));
  }
}

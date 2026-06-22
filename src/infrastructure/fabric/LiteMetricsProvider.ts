/**
 * LiteMetricsProvider — queries the Botdoc Lite Fabric SQL endpoint and
 * returns location-level aggregated metrics for the KPA partnership.
 *
 * The view name is read from the LITE_FABRIC_VIEW environment variable.
 * TODO: Update the column names below once the actual KPA Fabric view schema
 *       is confirmed. Current names mirror Botdoc Connect's vw_DocumentStats
 *       as a starting scaffold — replace with real query from the user.
 *
 * Filter behavior mirrors Connect's FabricMetricsProvider:
 *   • storeIds (text[]) — explicit Botdoc Store Id (apikey) hashes
 *   • userIds (int[])   — legacy user-based filter
 *   • titleExcludes     — NOT LIKE patterns on location title
 *
 * All filter values are injected via mssql named parameters — never by
 * string concatenation.
 */
import sql from 'mssql';
import { getPool } from './client';
import type { MetricsProvider } from '@/domain/metrics/MetricsProvider';
import type { DataFilter } from '@/domain/partner/Partner';
import type { LocationData } from '@/lib/parseCSV';
import { cleanStoreName } from '@/lib/parseCSV';

interface LiteRow {
  storeName: string;
  scans: number;
  leads: number;
  pullFiles: number;
  idVerify: number;
  dlCompleted: number;
  appts: number;
}

function getLiteView(): string {
  const view = process.env.LITE_FABRIC_VIEW;
  if (!view) {
    throw new Error(
      'LITE_FABRIC_VIEW environment variable is not set.\n' +
        'Add it to .env (see .env.example). Value should be the fully-qualified Fabric view name, ' +
        'e.g. "dbo.vw_LiteDocumentStats".',
    );
  }
  return view;
}

export class LiteMetricsProvider implements MetricsProvider {
  async fetchMetrics(
    filter: DataFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<LocationData[]> {
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

    // TODO: Replace column names below with the actual KPA Fabric view columns.
    //       Share the Fabric query with the dev and update accordingly.
    const view = getLiteView();
    const queryText = `
      SELECT
        [Store Title]                                              AS storeName,
        COUNT(*)                                                   AS scans,
        COUNT(CASE WHEN [Lead Created] IS NOT NULL THEN 1 END)     AS leads,
        SUM(ISNULL(TRY_CAST([Pull Files]        AS INT), 0))       AS pullFiles,
        SUM(ISNULL(TRY_CAST([ID Verify]         AS INT), 0))       AS idVerify,
        SUM(ISNULL(TRY_CAST([Complete Document]  AS INT), 0))      AS dlCompleted,
        SUM(ISNULL(TRY_CAST([Appointments Set]  AS INT), 0))       AS appts
      FROM ${view}
      WHERE
        [creation_date] >= @periodStart
        AND [creation_date] < @periodEnd${extraWhere}
      GROUP BY [Store Title]
      ORDER BY scans DESC
    `;

    const result = await req.query<LiteRow>(queryText);

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
}

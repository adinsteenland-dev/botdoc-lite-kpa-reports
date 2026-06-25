/**
 * Verify store dedup: confirm no duplicate store names in results
 */
import sql from 'mssql';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const [key, ...rest] = line.trim().split('=');
  if (key && !key.startsWith('#')) process.env[key] = rest.join('=');
}

const config = {
  server: process.env.FABRIC_SERVER,
  database: process.env.FABRIC_DATABASE,
  port: 1433,
  options: { encrypt: true, trustServerCertificate: false },
  connectionTimeout: 30_000,
  requestTimeout: 90_000,
  authentication: {
    type: 'azure-active-directory-service-principal-secret',
    options: {
      clientId: process.env.FABRIC_CLIENT_ID,
      clientSecret: process.env.FABRIC_CLIENT_SECRET,
      tenantId: process.env.FABRIC_TENANT_ID,
    },
  },
};

const pool = await sql.connect(config);
const req = pool.request();

req.input('periodStart', sql.DateTime, new Date('2025-01-01'));
req.input('periodEnd',   sql.DateTime, new Date('2026-01-01'));
req.input('uid0', sql.Int, 221);

const result = await req.query(`
  WITH emp_count AS (
    SELECT apikey_id, COUNT(id) AS onboardedCount
    FROM dbo.module_container_requester
    GROUP BY apikey_id
  ),
  session_agg AS (
    SELECT
      c.apikey_id,
      COUNT(c.id) AS scans,
      SUM(pf_agg.cnt) AS pullFiles,
      SUM(iv_agg.cnt) AS idVerify,
      COUNT(CASE WHEN CASE WHEN (c.callback_url LIKE '%obwh%' OR c.callback_url LIKE '%onboarding%') THEN 'onboarding' ELSE cs.[value] END = 'complete' THEN 1 END) AS dlCompleted,
      SUM(so_agg.cnt) AS sessionOpened,
      COUNT(CASE WHEN rdi_agg.val <> '' THEN 1 END) AS employeeInitiated,
      COUNT(CASE WHEN rdi_agg.val = '' THEN 1 END) AS customerSelfService
    FROM dbo.module_container_container c
    LEFT JOIN dbo.module_container_containermetadata cs ON cs.container_id = c.id AND cs.[key] = 'state'
    CROSS APPLY (SELECT COUNT(pf.id) AS cnt FROM dbo.module_container_pull_pullfile pf INNER JOIN dbo.module_container_pull_pull pp ON pf.pull_id = pp.feature_ptr_id INNER JOIN dbo.module_container_feature mf ON pp.feature_ptr_id = mf.id WHERE mf.container_id = c.id) AS pf_agg
    CROSS APPLY (SELECT (SELECT COUNT(iv.feature_ptr_id) FROM dbo.module_container_idverify_service_idverify iv INNER JOIN dbo.module_container_feature f ON f.id = iv.feature_ptr_id WHERE f.container_id = c.id AND f.state = 'complete') + (SELECT COUNT(mw.feature_ptr_id) FROM dbo.module_container_mworkflow_mworkflow mw INNER JOIN dbo.module_container_feature f ON f.id = mw.feature_ptr_id WHERE f.container_id = c.id AND f.state = 'complete' AND mw.workflow_id = '69f0c96a6ad82ade356a2f0c') AS cnt) AS iv_agg
    CROSS APPLY (SELECT COUNT(cb.id) AS cnt FROM dbo.module_container_callbackcall cb WHERE cb.callback_type = 'session_opened' AND cb.created >= c.created AND cb.container_id = c.id) AS so_agg
    CROSS APPLY (SELECT ISNULL((SELECT TOP 1 [value] FROM dbo.module_container_containermetadata WHERE container_id = c.id AND [key] = 'requester_id'), '') AS val) AS rdi_agg
    WHERE c.created >= @periodStart AND c.created < @periodEnd AND c.callback_url <> ''
    GROUP BY c.apikey_id
  ),
  ranked AS (
    SELECT
      ak.id AS storeId,
      ak.name AS storeName,
      ISNULL(sa.scans, 0) AS scans,
      ISNULL(sa.pullFiles, 0) AS pullFiles,
      ISNULL(sa.idVerify, 0) AS idVerify,
      ISNULL(sa.dlCompleted, 0) AS dlCompleted,
      ISNULL(sa.sessionOpened, 0) AS sessionOpened,
      ISNULL(sa.employeeInitiated, 0) AS employeeInitiated,
      ISNULL(sa.customerSelfService, 0) AS customerSelfService,
      ISNULL(ec.onboardedCount, 0) AS onboardedEmployeeCount,
      ROW_NUMBER() OVER (PARTITION BY ak.name ORDER BY ISNULL(sa.scans, 0) DESC, ak.id) AS rn
    FROM dbo.mod_api_key_apikey ak
    LEFT JOIN session_agg sa ON sa.apikey_id = ak.id
    LEFT JOIN emp_count ec ON ec.apikey_id = ak.id
    WHERE ak.active = 1 AND ak.user_id IN (@uid0)
  )
  SELECT storeId, storeName, scans, pullFiles, idVerify, dlCompleted,
         sessionOpened, employeeInitiated, customerSelfService, onboardedEmployeeCount
  FROM ranked
  WHERE rn = 1
  ORDER BY scans DESC
`);

const rows = result.recordset;
const names = rows.map(r => r.storeName);
const uniqueNames = new Set(names);

console.log(`Total rows returned: ${rows.length}`);
console.log(`Unique store names:  ${uniqueNames.size}`);

if (rows.length === uniqueNames.size) {
  console.log('\n✓ No duplicates — every store name appears exactly once.');
} else {
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  console.log('\n✗ Duplicates still present:', dupes);
}

// Show previously-duplicated stores to confirm they now return one row with correct data
const watchList = [
  'ne00116_baxter_toyota_of_la_vista_la_vista_ne',
  'ne00155_baxter_volkswagen_of_omaha_omaha_ne',
  'kpa15919_orange_buick_gmc_orlando_fl',
  'kpa112622_north_georgia_toyota_dalton_ga',
];
console.log('\n=== Previously duplicated stores (should each appear once) ===');
console.table(rows.filter(r => watchList.some(w => r.storeName.startsWith(w.slice(0, 20)))));

await pool.close();

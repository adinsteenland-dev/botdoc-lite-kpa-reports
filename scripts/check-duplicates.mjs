/**
 * Diagnostic: check for duplicate requesters in KPA stores (user_id = 221)
 * Run: node scripts/check-duplicates.mjs
 */
import sql from 'mssql';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env manually
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
  requestTimeout: 60_000,
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

// 1. Duplicate names within the same store
console.log('\n=== Duplicate names (same store) ===');
const dupNames = await pool.request().query(`
  SELECT
    ak.id         AS storeId,
    ak.name       AS storeName,
    CONCAT(r.first_name, ' ', r.last_name) AS employeeName,
    COUNT(r.id)   AS cnt,
    MIN(r.created) AS firstOnboarded,
    MAX(r.created) AS lastOnboarded
  FROM dbo.module_container_requester r
  INNER JOIN dbo.mod_api_key_apikey ak ON ak.id = r.apikey_id
  WHERE ak.user_id = 221
  GROUP BY ak.id, ak.name, r.first_name, r.last_name
  HAVING COUNT(r.id) > 1
  ORDER BY COUNT(r.id) DESC, ak.name
`);
if (dupNames.recordset.length === 0) {
  console.log('None found.');
} else {
  console.table(dupNames.recordset);
}

// 2. Duplicate emails within the same store (ignoring nulls)
console.log('\n=== Duplicate emails (same store) ===');
const dupEmails = await pool.request().query(`
  SELECT
    ak.id       AS storeId,
    ak.name     AS storeName,
    r.email,
    COUNT(r.id) AS cnt
  FROM dbo.module_container_requester r
  INNER JOIN dbo.mod_api_key_apikey ak ON ak.id = r.apikey_id
  WHERE ak.user_id = 221
    AND r.email IS NOT NULL
    AND r.email <> ''
  GROUP BY ak.id, ak.name, r.email
  HAVING COUNT(r.id) > 1
  ORDER BY COUNT(r.id) DESC, ak.name
`);
if (dupEmails.recordset.length === 0) {
  console.log('None found.');
} else {
  console.table(dupEmails.recordset);
}

// 3. Sessions with multiple requester_id metadata entries (inflated counts risk)
console.log('\n=== Sessions with multiple requester_id metadata rows ===');
const dupMeta = await pool.request().query(`
  SELECT TOP 20
    c.id          AS containerId,
    c.apikey_id   AS storeId,
    COUNT(cm.id)  AS metaRowCount
  FROM dbo.module_container_container c
  INNER JOIN dbo.mod_api_key_apikey ak ON ak.id = c.apikey_id
  INNER JOIN dbo.module_container_containermetadata cm
    ON cm.container_id = c.id AND cm.[key] = 'requester_id'
  WHERE ak.user_id = 221
  GROUP BY c.id, c.apikey_id
  HAVING COUNT(cm.id) > 1
  ORDER BY COUNT(cm.id) DESC
`);
if (dupMeta.recordset.length === 0) {
  console.log('None found.');
} else {
  console.log(`Found ${dupMeta.recordset.length} sessions (showing up to 20):`);
  console.table(dupMeta.recordset);
}

// 4. Verify dedup query returns one row per name for a known-duplicate store
console.log('\n=== Dedup verification: sayville_ford (should show Clifford Korade once) ===');
const verify = await pool.request()
  .input('storeId', '998dd0974a414715b63d6918b2a43556')
  .input('periodStart', new Date('2025-01-01'))
  .input('periodEnd', new Date('2026-12-31'))
  .query(`
    WITH all_requesters AS (
      SELECT
        r.id, r.first_name, r.last_name, r.email, r.mobile, r.created,
        FIRST_VALUE(r.id) OVER (
          PARTITION BY r.first_name, r.last_name
          ORDER BY r.created DESC
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS canonicalId
      FROM dbo.module_container_requester r
      WHERE r.apikey_id = @storeId
    ),
    employees AS (
      SELECT
        canonicalId AS requesterId,
        CONCAT(first_name, ' ', last_name) AS employeeName,
        MAX(CASE WHEN id = canonicalId THEN email   ELSE NULL END) AS email,
        MAX(CASE WHEN id = canonicalId THEN created ELSE NULL END) AS onboardedAt
      FROM all_requesters
      GROUP BY canonicalId, first_name, last_name
    ),
    period_usage AS (
      SELECT ar.canonicalId AS requesterId, COUNT(c.id) AS sessions, SUM(pf_agg.cnt) AS pullFiles
      FROM dbo.module_container_container c
      INNER JOIN dbo.module_container_containermetadata cm ON cm.container_id = c.id AND cm.[key] = 'requester_id'
      INNER JOIN all_requesters ar ON ar.id = TRY_CAST(cm.value AS INT)
      CROSS APPLY (
        SELECT COUNT(pf.id) AS cnt
        FROM dbo.module_container_pull_pullfile pf
        INNER JOIN dbo.module_container_pull_pull pp ON pf.pull_id = pp.feature_ptr_id
        INNER JOIN dbo.module_container_feature mf ON pp.feature_ptr_id = mf.id
        WHERE mf.container_id = c.id
      ) AS pf_agg
      WHERE c.apikey_id = @storeId AND cm.value <> ''
        AND c.created >= @periodStart AND c.created < @periodEnd
      GROUP BY ar.canonicalId
    )
    SELECT e.requesterId AS employeeId, e.employeeName, e.email, e.onboardedAt,
           ISNULL(pu.sessions, 0) AS sessions, ISNULL(pu.pullFiles, 0) AS pullFiles
    FROM employees e
    LEFT JOIN period_usage pu ON pu.requesterId = e.requesterId
    ORDER BY e.onboardedAt DESC
  `);
console.table(verify.recordset);

await pool.close();

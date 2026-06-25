/**
 * Find stores with multiple active UUIDs under user_id=221
 * and check if each UUID has actual session data
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

// 1. All stores with duplicate active names
console.log('\n=== Stores with multiple active UUIDs (same name) ===');
const dupes = await pool.request().query(`
  SELECT
    name AS storeName,
    COUNT(id) AS uuidCount,
    STRING_AGG(id, ' | ') AS uuids
  FROM dbo.mod_api_key_apikey
  WHERE user_id = 221 AND active = 1
  GROUP BY name
  HAVING COUNT(id) > 1
  ORDER BY COUNT(id) DESC, name
`);
console.log(`Affected stores: ${dupes.recordset.length}`);
console.table(dupes.recordset.map(r => ({ storeName: r.storeName, uuidCount: r.uuidCount })));

// 2. For each duplicate store, check session counts per UUID (all-time)
console.log('\n=== Session counts per UUID for duplicate stores ===');
const sessionCounts = await pool.request().query(`
  SELECT
    ak.name   AS storeName,
    ak.id     AS storeId,
    COUNT(c.id) AS totalSessions,
    MIN(c.created) AS firstSession,
    MAX(c.created) AS lastSession
  FROM dbo.mod_api_key_apikey ak
  LEFT JOIN dbo.module_container_container c ON c.apikey_id = ak.id
  WHERE ak.user_id = 221 AND ak.active = 1
    AND ak.name IN (
      SELECT name
      FROM dbo.mod_api_key_apikey
      WHERE user_id = 221 AND active = 1
      GROUP BY name
      HAVING COUNT(id) > 1
    )
  GROUP BY ak.id, ak.name
  ORDER BY ak.name, COUNT(c.id) DESC
`);
console.table(sessionCounts.recordset);

await pool.close();

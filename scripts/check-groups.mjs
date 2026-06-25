/**
 * Cross-reference onboarding spreadsheet groups against live Fabric stores (user_id=221)
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

// All active stores under KPA (user_id=221)
console.log('\n=== All live KPA stores in Fabric (user_id=221) ===');
const live = await pool.request().query(`
  SELECT id AS storeId, name AS storeName
  FROM dbo.mod_api_key_apikey
  WHERE user_id = 221 AND active = 1
  ORDER BY name
`);
console.log(`Total live stores: ${live.recordset.length}`);
console.table(live.recordset);

// Q1: Homer Skelton - check if 4 stores share an ID or each have their own
console.log('\n=== Q1: Homer Skelton stores in Fabric ===');
const homer = await pool.request().query(`
  SELECT id AS storeId, name AS storeName, active
  FROM dbo.mod_api_key_apikey
  WHERE user_id = 221 AND name LIKE '%homer%skelton%' OR name LIKE '%skelton%'
  ORDER BY name
`);
console.table(homer.recordset);

// Also check by the KPA IDs from the spreadsheet that Homer Skelton used
// All 4 rows had KPA141455 — check if that maps to multiple stores somehow
// The storeId in Fabric is the apikey id (uuid), not the KPA customer number
// Let's search by name keywords
console.log('\n=== Q1b: Search by store name keywords for Homer Skelton ===');
const homerByName = await pool.request().query(`
  SELECT id AS storeId, name AS storeName, active
  FROM dbo.mod_api_key_apikey
  WHERE user_id = 221
    AND (
      name LIKE '%homer%' OR name LIKE '%skelton%' OR
      name LIKE '%olive%branch%' OR name LIKE '%millington%'
    )
  ORDER BY name
`);
console.table(homerByName.recordset);

// Q2: Towbin stores - old Automall entries vs new Towbin Automotive Group
console.log('\n=== Q2: Towbin stores in Fabric ===');
const towbin = await pool.request().query(`
  SELECT id AS storeId, name AS storeName, active
  FROM dbo.mod_api_key_apikey
  WHERE user_id = 221 AND name LIKE '%towbin%'
  ORDER BY name
`);
console.table(towbin.recordset);

// Q3: Baxter - check KPA42699 conflict (Baxter Ford vs Baxter Audi)
console.log('\n=== Q3: Baxter stores in Fabric ===');
const baxter = await pool.request().query(`
  SELECT id AS storeId, name AS storeName, active
  FROM dbo.mod_api_key_apikey
  WHERE user_id = 221 AND name LIKE '%baxter%'
  ORDER BY name
`);
console.table(baxter.recordset);

await pool.close();

/**
 * Fabric connection POC.
 *
 * Proves that our service-principal credentials can connect to the Microsoft
 * Fabric SQL endpoint and read data. This is the very first task of Phase 2
 * (see docs/IMPLEMENTATION_PLAN.md) — run it before building any query logic.
 *
 * Run it with Bun (which auto-loads .env):
 *   bun run test:fabric
 *
 * It does NOT modify anything — it only connects and runs read-only queries.
 */
import sql from 'mssql';

const REQUIRED = [
  'FABRIC_SERVER',
  'FABRIC_DATABASE',
  'FABRIC_TENANT_ID',
  'FABRIC_CLIENT_ID',
  'FABRIC_CLIENT_SECRET',
] as const;

function checkEnv(): Record<(typeof REQUIRED)[number], string> | null {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('\n✗ Missing required values in your .env file:\n');
    for (const k of missing) console.error(`    - ${k}`);
    console.error('\n  Fill them in .env (see .env.example and docs/IMPLEMENTATION_PLAN.md section 3),');
    console.error('  then run this again.\n');
    return null;
  }
  return Object.fromEntries(REQUIRED.map((k) => [k, process.env[k]!])) as Record<
    (typeof REQUIRED)[number],
    string
  >;
}

async function main() {
  const env = checkEnv();
  if (!env) process.exit(1);

  const config: sql.config = {
    server: env.FABRIC_SERVER,
    database: env.FABRIC_DATABASE,
    port: 1433,
    options: { encrypt: true, trustServerCertificate: false },
    connectionTimeout: 30_000,
    requestTimeout: 30_000,
    authentication: {
      type: 'azure-active-directory-service-principal-secret',
      options: {
        clientId: env.FABRIC_CLIENT_ID,
        clientSecret: env.FABRIC_CLIENT_SECRET,
        tenantId: env.FABRIC_TENANT_ID,
      },
    },
  };

  console.log(`\nConnecting to ${env.FABRIC_SERVER} / ${env.FABRIC_DATABASE} ...`);

  let pool: sql.ConnectionPool | undefined;
  try {
    pool = await sql.connect(config);

    const ping = await pool.request().query<{ ok: number }>('SELECT 1 AS ok');
    if (ping.recordset[0]?.ok !== 1) throw new Error('Unexpected response to SELECT 1');
    console.log('✓ Authenticated and connected.');

    const tables = await pool
      .request()
      .query<{ TABLE_SCHEMA: string; TABLE_NAME: string }>(
        'SELECT TOP 10 TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_SCHEMA, TABLE_NAME',
      );

    if (tables.recordset.length === 0) {
      console.log('✓ Query ran, but no tables are visible to this service principal yet.');
      console.log('  -> Check Part C: the SP needs read access to the warehouse data.');
    } else {
      console.log(`✓ Read access confirmed. First ${tables.recordset.length} table(s):\n`);
      for (const t of tables.recordset) console.log(`    ${t.TABLE_SCHEMA}.${t.TABLE_NAME}`);
    }

    console.log('\nSUCCESS — the Fabric credentials work.\n');
  } catch (err) {
    console.error('\n✗ Connection FAILED.\n');
    console.error(`  ${err instanceof Error ? err.message : String(err)}\n`);
    console.error('  Common causes:');
    console.error('   - Client secret wrong or expired -> recreate it in Entra (Certificates & secrets).');
    console.error('   - Service principals not allowed in Fabric -> Admin portal > Tenant settings');
    console.error('     > Developer settings > "Service principals can use Fabric APIs".');
    console.error('   - SP has no access to the data -> add botdoc-reports-reader to the workspace');
    console.error('     (Manage access) or share the warehouse with Read.');
    console.error('   - Wrong FABRIC_SERVER / FABRIC_DATABASE values.\n');
    process.exitCode = 1;
  } finally {
    await pool?.close();
  }
}

void main();

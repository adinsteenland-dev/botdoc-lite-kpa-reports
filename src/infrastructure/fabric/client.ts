/**
 * Lazy mssql connection pool for the Microsoft Fabric SQL endpoint.
 * Uses service-principal (Entra) authentication.
 *
 * Required environment variables:
 *   FABRIC_SERVER        e.g. xxx.datawarehouse.fabric.microsoft.com
 *   FABRIC_DATABASE      e.g. botdocapi
 *   FABRIC_TENANT_ID     Entra "Directory (tenant) ID"
 *   FABRIC_CLIENT_ID     Entra "Application (client) ID"
 *   FABRIC_CLIENT_SECRET Entra client secret value
 */
import sql from 'mssql';

const REQUIRED = [
  'FABRIC_SERVER',
  'FABRIC_DATABASE',
  'FABRIC_TENANT_ID',
  'FABRIC_CLIENT_ID',
  'FABRIC_CLIENT_SECRET',
] as const;

// Stored as a promise so concurrent callers share the same connect attempt.
let _poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (_poolPromise) return _poolPromise;

  _poolPromise = (async () => {
    const missing = REQUIRED.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(
        'Microsoft Fabric credentials are not configured.\n' +
          `Missing: ${missing.join(', ')}\n` +
          'Add them to .env (see .env.example and docs/IMPLEMENTATION_PLAN.md section 3).',
      );
    }

    const config: sql.config = {
      server: process.env.FABRIC_SERVER!,
      database: process.env.FABRIC_DATABASE!,
      port: 1433,
      options: { encrypt: true, trustServerCertificate: false },
      connectionTimeout: 30_000,
      requestTimeout: 60_000,
      authentication: {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          clientId: process.env.FABRIC_CLIENT_ID!,
          clientSecret: process.env.FABRIC_CLIENT_SECRET!,
          tenantId: process.env.FABRIC_TENANT_ID!,
        },
      },
    };

    return sql.connect(config);
  })().catch((err) => {
    _poolPromise = null; // allow retry on next request
    throw err;
  });

  return _poolPromise;
}

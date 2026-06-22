/**
 * Lazy Drizzle client — the `db` getter only initialises the connection on
 * first use, so `next build` succeeds without a live DATABASE_URL.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type DB = PostgresJsDatabase<typeof schema>;

let _db: DB | null = null;

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is required but was not set.\n' +
        'Copy .env.example → .env and fill in your Postgres connection string.',
    );
  }
  const sql = postgres(url);
  return drizzle(sql, { schema });
}

export function getDb(): DB {
  if (!_db) _db = createDb();
  return _db;
}

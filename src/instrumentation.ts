/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Applies pending migrations before the first request is handled.
 */
import { join } from 'path';

export async function register() {
  // Only run in Node.js runtime (not Edge); DB is not available on Edge.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./infrastructure/db/migrator');
    const migrationsDir = join(process.cwd(), 'src/infrastructure/db/migrations');
    await runMigrations(migrationsDir);
  }
}

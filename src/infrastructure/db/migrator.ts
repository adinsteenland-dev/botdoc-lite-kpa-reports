/**
 * Custom migration runner.
 * Tracks applied migrations in botdoc.__migrations (not drizzle.__drizzle_migrations)
 * so it works on Azure PostgreSQL where creating new schemas is restricted.
 */
import postgres from 'postgres';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function runMigrations(migrationsDir: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');

  const sql = postgres(url);

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS botdoc.__migrations (
        id         serial PRIMARY KEY,
        name       text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const applied = new Set(
      (await sql`SELECT name FROM botdoc.__migrations`).map((r) => r.name as string),
    );

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sqlText = await readFile(join(migrationsDir, file), 'utf8');
      const statements = sqlText
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean);

      console.log(`[migrations] Applying: ${file}`);
      for (const statement of statements) {
        await sql.unsafe(statement);
      }
      await sql`INSERT INTO botdoc.__migrations (name) VALUES (${file})`;
      count++;
    }

    if (count === 0) {
      console.log('[migrations] No pending migrations.');
    } else {
      console.log(`[migrations] Done — ${count} migration(s) applied.`);
    }
  } finally {
    await sql.end();
  }
}

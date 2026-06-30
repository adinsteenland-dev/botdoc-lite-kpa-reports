/**
 * Custom migration runner.
 * Reads .sql files from the migrations folder in order and applies any that
 * haven't been recorded in the __migrations tracking table.
 */
import postgres from 'postgres';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const sql = postgres(url);

// Ensure the tracking table exists in the botdoc schema
await sql`
  CREATE TABLE IF NOT EXISTS botdoc.__migrations (
    id        serial PRIMARY KEY,
    name      text NOT NULL UNIQUE,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

const migrationsDir = join(process.cwd(), 'src/infrastructure/db/migrations');
const files = (await readdir(migrationsDir))
  .filter(f => f.endsWith('.sql'))
  .sort();

const applied = new Set(
  (await sql`SELECT name FROM botdoc.__migrations`).map(r => r.name)
);

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;

  const sqlText = await readFile(join(migrationsDir, file), 'utf8');
  // Drizzle generates multi-statement files separated by "--> statement-breakpoint"
  const statements = sqlText
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean);

  console.log(`Applying: ${file}`);
  for (const statement of statements) {
    await sql.unsafe(statement);
  }
  await sql`INSERT INTO botdoc.__migrations (name) VALUES (${file})`;
  count++;
}

if (count === 0) {
  console.log('No pending migrations.');
} else {
  console.log(`Done — ${count} migration(s) applied.`);
}

await sql.end();

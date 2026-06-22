import { pgSchema, uuid, text, jsonb, timestamp, customType } from 'drizzle-orm/pg-core';

export const botdocSchema = pgSchema('botdoc');

/** Custom bytea column type — Postgres.js returns bytea as Uint8Array. */
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: unknown): Buffer {
    if (value instanceof Buffer) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    return Buffer.from(value as ArrayBuffer);
  },
});

export const partners = botdocSchema.table('partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  logo: bytea('logo'),
  logoMimeType: text('logo_mime_type'),
  dataFilter: jsonb('data_filter'),
  defaultTimezone: text('default_timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

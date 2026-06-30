import { pgSchema, uuid, text, jsonb, timestamp, integer, customType } from 'drizzle-orm/pg-core';

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

// ── Lite product tables ──────────────────────────────────────────────────────

export const partners = botdocSchema.table('partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  logo: bytea('logo'),
  logoMimeType: text('logo_mime_type'),
  dataFilter: jsonb('data_filter'),
  defaultTimezone: text('default_timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Connect product tables ───────────────────────────────────────────────────

export const customers = botdocSchema.table('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  logo: bytea('logo'),
  logoMimeType: text('logo_mime_type'),
  dataFilter: jsonb('data_filter'),
  avgCarsConfig: jsonb('avg_cars_config').notNull().default({}),
  defaultTimezone: text('default_timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const recipients = botdocSchema.table('recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  storeName: text('store_name'),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const emailSchedules = botdocSchema.table('email_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  storeName: text('store_name'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  recurrence: text('recurrence').notNull().default('once'),
  timezone: text('timezone'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const emailLog = botdocSchema.table('email_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  storeName: text('store_name'),
  scheduleId: uuid('schedule_id').references(() => emailSchedules.id, { onDelete: 'set null' }),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  recipientCount: integer('recipient_count').notNull().default(0),
  status: text('status').notNull().default('sent'),
  error: text('error'),
});

export const reports = botdocSchema.table('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  periodLabel: text('period_label').notNull().default('Current Period'),
  metrics: jsonb('metrics').notNull().default([]),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
});

'use server';

import { revalidatePath } from 'next/cache';
import { PostgresCustomerRepository } from '@/infrastructure/db/PostgresCustomerRepository';

export async function addCustomer(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required.');
  if (trimmed.length > 200) throw new Error('Name must be 200 characters or fewer.');
  const repo = new PostgresCustomerRepository();
  await repo.save({ name: trimmed, logo: null, logoMimeType: null, dataFilter: null, avgCarsConfig: {}, defaultTimezone: null });
  revalidatePath('/');
}

export async function deleteCustomer(id: string): Promise<void> {
  const repo = new PostgresCustomerRepository();
  await repo.delete(id);
  revalidatePath('/');
}

// ── Email scheduling ─────────────────────────────────────────────────────────

import { PostgresEmailContactRepository } from '@/infrastructure/db/PostgresEmailContactRepository';
import { PostgresEmailScheduleRepository } from '@/infrastructure/db/PostgresEmailScheduleRepository';
import type { Recurrence } from '@/domain/email/types';

export interface ScheduleEmailInput {
  customerId: string;
  storeName: string | null;
  scheduledAt: string; // ISO date string — serializable across server boundary
  recurrence: Recurrence;
  timezone: string;
}

const VALID_RECURRENCES = new Set(['once', 'weekly', 'monthly']);

export async function scheduleEmail(input: ScheduleEmailInput): Promise<void> {
  if (!VALID_RECURRENCES.has(input.recurrence)) throw new Error('Invalid recurrence value.');
  const scheduledAt = new Date(input.scheduledAt);
  if (isNaN(scheduledAt.getTime())) throw new Error('Invalid scheduled date.');
  if (scheduledAt < new Date()) throw new Error('Scheduled date must be in the future.');

  const repo = new PostgresEmailScheduleRepository();
  await repo.save({
    customerId: input.customerId,
    storeName: input.storeName,
    scheduledAt,
    recurrence: input.recurrence,
    timezone: input.timezone,
  });
  revalidatePath('/emails');
  revalidatePath(`/customers/${input.customerId}/emails`);
  if (input.storeName) {
    revalidatePath(`/customers/${input.customerId}/stores/${encodeURIComponent(input.storeName)}/emails`);
  }
}

const ALLOWED_TIMEZONES = new Set([
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]);

export async function saveCustomerTimezone(customerId: string, timezone: string): Promise<void> {
  if (!ALLOWED_TIMEZONES.has(timezone)) throw new Error('Invalid timezone.');
  const repo = new PostgresCustomerRepository();
  await repo.updateDefaultTimezone(customerId, timezone);
  revalidatePath(`/customers/${customerId}/emails`);
}

export async function cancelSchedule(id: string, customerId: string): Promise<void> {
  const repo = new PostgresEmailScheduleRepository();
  await repo.cancel(id, customerId);
  revalidatePath('/emails');
  revalidatePath(`/customers/${customerId}/emails`);
}

export interface AddContactInput {
  customerId: string;
  storeName: string | null;
  email: string;
  name: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addContact(input: AddContactInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) throw new Error('Valid email address is required.');
  if (email.length > 254) throw new Error('Email address is too long.');
  const name = input.name?.trim() ?? null;
  if (name && name.length > 200) throw new Error('Name must be 200 characters or fewer.');
  const repo = new PostgresEmailContactRepository();
  await repo.save({ customerId: input.customerId, storeName: input.storeName, email, name });
  revalidatePath(`/customers/${input.customerId}/emails`);
}

export async function removeContact(id: string, customerId: string): Promise<void> {
  const repo = new PostgresEmailContactRepository();
  await repo.delete(id, customerId);
  revalidatePath(`/customers/${customerId}/emails`);
}

// ── Avg cars config ───────────────────────────────────────────────────────────

import type { AvgCarsConfig } from '@/domain/customer/Customer';

/**
 * Save group-level or store-level avg cars sold.
 * Pass storeName=null to update the group baseline; pass a store name for per-store.
 * Pass value=null to clear the entry.
 */
export async function saveAvgCarsConfig(
  customerId: string,
  storeName: string | null,
  value: number | null,
): Promise<void> {
  if (value !== null && (value <= 0 || value > 10_000 || !Number.isFinite(value))) {
    throw new Error('Avg cars sold must be between 1 and 10,000.');
  }
  const repo = new PostgresCustomerRepository();
  const customer = await repo.findById(customerId);
  if (!customer) throw new Error('Customer not found.');

  const config: AvgCarsConfig = { ...customer.avgCarsConfig };

  if (storeName === null) {
    // Group-level
    if (value === null) delete config.group;
    else config.group = value;
  } else {
    // Store-level
    const stores = { ...(config.stores ?? {}) };
    if (value === null) delete stores[storeName];
    else stores[storeName] = value;
    config.stores = stores;
  }

  await repo.updateAvgCarsConfig(customerId, config);
  revalidatePath(`/customers/${customerId}/report`);
  revalidatePath(`/customers/${customerId}/stores`);
}

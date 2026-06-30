import { eq, and, isNull, gt, lte } from 'drizzle-orm';
import { getDb } from './client';
import { emailSchedules } from './schema';
import type { EmailSchedule, NewEmailSchedule, Recurrence } from '@/domain/email/types';

function rowToSchedule(row: typeof emailSchedules.$inferSelect): EmailSchedule {
  return {
    id: row.id,
    customerId: row.customerId,
    storeName: row.storeName ?? null,
    scheduledAt: row.scheduledAt,
    recurrence: row.recurrence as EmailSchedule['recurrence'],
    timezone: row.timezone ?? null,
    status: row.status as EmailSchedule['status'],
    createdAt: row.createdAt,
  };
}

export class PostgresEmailScheduleRepository {
  async save(schedule: NewEmailSchedule): Promise<EmailSchedule> {
    const [row] = await getDb()
      .insert(emailSchedules)
      .values({
        customerId: schedule.customerId,
        storeName: schedule.storeName ?? undefined,
        scheduledAt: schedule.scheduledAt,
        recurrence: schedule.recurrence,
        timezone: schedule.timezone ?? undefined,
      })
      .returning();
    return rowToSchedule(row);
  }

  async findAllFuture(): Promise<EmailSchedule[]> {
    const rows = await getDb()
      .select()
      .from(emailSchedules)
      .where(and(eq(emailSchedules.status, 'active'), gt(emailSchedules.scheduledAt, new Date())))
      .orderBy(emailSchedules.scheduledAt);
    return rows.map(rowToSchedule);
  }

  async findByCustomer(customerId: string): Promise<EmailSchedule[]> {
    const rows = await getDb()
      .select()
      .from(emailSchedules)
      .where(and(
        eq(emailSchedules.customerId, customerId),
        eq(emailSchedules.status, 'active'),
        gt(emailSchedules.scheduledAt, new Date()),
        isNull(emailSchedules.storeName),
      ))
      .orderBy(emailSchedules.scheduledAt);
    return rows.map(rowToSchedule);
  }

  async findByCustomerAndStore(customerId: string, storeName: string): Promise<EmailSchedule[]> {
    const rows = await getDb()
      .select()
      .from(emailSchedules)
      .where(and(
        eq(emailSchedules.customerId, customerId),
        eq(emailSchedules.storeName, storeName),
        eq(emailSchedules.status, 'active'),
        gt(emailSchedules.scheduledAt, new Date()),
      ))
      .orderBy(emailSchedules.scheduledAt);
    return rows.map(rowToSchedule);
  }

  async cancel(id: string, customerId: string): Promise<void> {
    await getDb()
      .update(emailSchedules)
      .set({ status: 'cancelled' })
      .where(and(eq(emailSchedules.id, id), eq(emailSchedules.customerId, customerId)));
  }

  /** Returns all active schedules whose send time is now or in the past. */
  async findDue(): Promise<EmailSchedule[]> {
    const rows = await getDb()
      .select()
      .from(emailSchedules)
      .where(and(eq(emailSchedules.status, 'active'), lte(emailSchedules.scheduledAt, new Date())));
    return rows.map(rowToSchedule);
  }

  /**
   * After a schedule fires: cancel it (once) or advance scheduledAt (recurring).
   */
  async markFired(id: string): Promise<void> {
    const [row] = await getDb()
      .select()
      .from(emailSchedules)
      .where(eq(emailSchedules.id, id));

    if (!row) return;

    if (row.recurrence === 'once') {
      await getDb()
        .update(emailSchedules)
        .set({ status: 'cancelled' })
        .where(eq(emailSchedules.id, id));
    } else {
      const next = advanceDate(row.scheduledAt, row.recurrence as Recurrence);
      await getDb()
        .update(emailSchedules)
        .set({ scheduledAt: next })
        .where(eq(emailSchedules.id, id));
    }
  }
}

function advanceDate(from: Date, recurrence: Recurrence): Date {
  const d = new Date(from);
  switch (recurrence) {
    case 'weekly':    d.setDate(d.getDate() + 7);        break;
    case 'monthly':   d.setMonth(d.getMonth() + 1);      break;
    case 'quarterly': d.setMonth(d.getMonth() + 3);      break;
    case 'annually':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

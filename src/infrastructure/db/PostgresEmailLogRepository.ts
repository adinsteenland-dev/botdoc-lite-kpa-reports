import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb } from './client';
import { emailLog } from './schema';
import type { EmailLogEntry } from '@/domain/email/types';

export interface NewEmailLogEntry {
  customerId: string;
  storeName: string | null;
  scheduleId: string | null;
  recipientCount: number;
  status: 'sent' | 'failed';
  error: string | null;
}

function rowToLog(row: typeof emailLog.$inferSelect): EmailLogEntry {
  return {
    id: row.id,
    customerId: row.customerId,
    storeName: row.storeName ?? null,
    scheduleId: row.scheduleId ?? null,
    sentAt: row.sentAt,
    recipientCount: row.recipientCount,
    status: row.status as EmailLogEntry['status'],
    error: row.error ?? null,
  };
}

export class PostgresEmailLogRepository {
  async save(entry: NewEmailLogEntry): Promise<void> {
    await getDb().insert(emailLog).values({
      customerId: entry.customerId,
      storeName: entry.storeName ?? undefined,
      scheduleId: entry.scheduleId ?? undefined,
      recipientCount: entry.recipientCount,
      status: entry.status,
      error: entry.error ?? undefined,
    });
  }

  async findAll(): Promise<EmailLogEntry[]> {
    const rows = await getDb()
      .select()
      .from(emailLog)
      .orderBy(desc(emailLog.sentAt));
    return rows.map(rowToLog);
  }

  async findByCustomer(customerId: string): Promise<EmailLogEntry[]> {
    const rows = await getDb()
      .select()
      .from(emailLog)
      .where(and(eq(emailLog.customerId, customerId), isNull(emailLog.storeName)))
      .orderBy(desc(emailLog.sentAt));
    return rows.map(rowToLog);
  }

  async findByCustomerAndStore(customerId: string, storeName: string): Promise<EmailLogEntry[]> {
    const rows = await getDb()
      .select()
      .from(emailLog)
      .where(and(eq(emailLog.customerId, customerId), eq(emailLog.storeName, storeName)))
      .orderBy(desc(emailLog.sentAt));
    return rows.map(rowToLog);
  }
}

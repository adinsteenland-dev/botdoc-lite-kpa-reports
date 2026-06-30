import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from './client';
import { recipients } from './schema';
import type { EmailContact, NewEmailContact } from '@/domain/email/types';

function rowToContact(row: typeof recipients.$inferSelect): EmailContact {
  return {
    id: row.id,
    customerId: row.customerId,
    storeName: row.storeName ?? null,
    email: row.email,
    name: row.name ?? null,
    createdAt: row.createdAt,
  };
}

export class PostgresEmailContactRepository {
  async save(contact: NewEmailContact): Promise<EmailContact> {
    const [row] = await getDb()
      .insert(recipients)
      .values({
        customerId: contact.customerId,
        storeName: contact.storeName ?? undefined,
        email: contact.email,
        name: contact.name ?? undefined,
      })
      .returning();
    return rowToContact(row);
  }

  async findByCustomer(customerId: string): Promise<EmailContact[]> {
    const rows = await getDb()
      .select()
      .from(recipients)
      .where(and(eq(recipients.customerId, customerId), isNull(recipients.storeName)));
    return rows.map(rowToContact);
  }

  async findByCustomerAndStore(customerId: string, storeName: string): Promise<EmailContact[]> {
    const rows = await getDb()
      .select()
      .from(recipients)
      .where(and(eq(recipients.customerId, customerId), eq(recipients.storeName, storeName)));
    return rows.map(rowToContact);
  }

  async delete(id: string, customerId: string): Promise<void> {
    await getDb().delete(recipients)
      .where(and(eq(recipients.id, id), eq(recipients.customerId, customerId)));
  }
}

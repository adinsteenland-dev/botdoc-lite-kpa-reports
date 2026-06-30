import { desc, eq } from 'drizzle-orm';
import { getDb } from './client';
import { customers } from './schema';
import type { Customer, NewCustomer, AvgCarsConfig } from '@/domain/customer/Customer';
import type { CustomerRepository } from '@/domain/customer/CustomerRepository';

function rowToCustomer(row: typeof customers.$inferSelect): Customer {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo ?? null,
    logoMimeType: row.logoMimeType ?? null,
    dataFilter: (row.dataFilter as Customer['dataFilter']) ?? null,
    avgCarsConfig: (row.avgCarsConfig as Customer['avgCarsConfig']) ?? {},
    defaultTimezone: row.defaultTimezone ?? null,
    createdAt: row.createdAt,
  };
}

export class PostgresCustomerRepository implements CustomerRepository {
  async save(customer: NewCustomer): Promise<Customer> {
    const [row] = await getDb()
      .insert(customers)
      .values({
        name: customer.name,
        logo: customer.logo ?? undefined,
        logoMimeType: customer.logoMimeType ?? undefined,
        dataFilter: customer.dataFilter ?? undefined,
        avgCarsConfig: customer.avgCarsConfig,
      })
      .returning();
    return rowToCustomer(row);
  }

  async findAll(): Promise<Customer[]> {
    const rows = await getDb()
      .select()
      .from(customers)
      .orderBy(desc(customers.createdAt));
    return rows.map(rowToCustomer);
  }

  async findById(id: string): Promise<Customer | null> {
    const [row] = await getDb()
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return row ? rowToCustomer(row) : null;
  }

  async delete(id: string): Promise<void> {
    await getDb().delete(customers).where(eq(customers.id, id));
  }

  async updateAvgCarsConfig(id: string, config: AvgCarsConfig): Promise<void> {
    await getDb()
      .update(customers)
      .set({ avgCarsConfig: config })
      .where(eq(customers.id, id));
  }

  async updateDefaultTimezone(id: string, timezone: string): Promise<void> {
    await getDb()
      .update(customers)
      .set({ defaultTimezone: timezone })
      .where(eq(customers.id, id));
  }
}

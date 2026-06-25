import { desc, eq } from 'drizzle-orm';
import { getDb } from './client';
import { partners } from './schema';
import type { Partner, NewPartner } from '@/domain/partner/Partner';
import type { PartnerRepository } from '@/domain/partner/PartnerRepository';

function rowToPartner(row: typeof partners.$inferSelect): Partner {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo ?? null,
    logoMimeType: row.logoMimeType ?? null,
    dataFilter: (typeof row.dataFilter === 'string'
      ? JSON.parse(row.dataFilter)
      : row.dataFilter) as Partner['dataFilter'] ?? null,
    defaultTimezone: row.defaultTimezone ?? null,
    createdAt: row.createdAt,
  };
}

export class PostgresPartnerRepository implements PartnerRepository {
  async save(partner: NewPartner): Promise<Partner> {
    const [row] = await getDb()
      .insert(partners)
      .values({
        name: partner.name,
        logo: partner.logo ?? undefined,
        logoMimeType: partner.logoMimeType ?? undefined,
        dataFilter: partner.dataFilter ?? undefined,
        defaultTimezone: partner.defaultTimezone ?? undefined,
      })
      .returning();
    return rowToPartner(row);
  }

  async findAll(): Promise<Partner[]> {
    const rows = await getDb()
      .select()
      .from(partners)
      .orderBy(desc(partners.createdAt));
    return rows.map(rowToPartner);
  }

  async findById(id: string): Promise<Partner | null> {
    const [row] = await getDb()
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);
    return row ? rowToPartner(row) : null;
  }

  async delete(id: string): Promise<void> {
    await getDb().delete(partners).where(eq(partners.id, id));
  }
}

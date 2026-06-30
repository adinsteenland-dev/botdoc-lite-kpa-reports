import { desc, eq } from 'drizzle-orm';
import { getDb } from './client';
import { reports } from './schema';
import type { Report, NewReport } from '@/domain/report/Report';
import type { ReportRepository } from '@/domain/report/ReportRepository';
import type { LocationData } from '@/lib/parseCSV';

function rowToReport(row: typeof reports.$inferSelect): Report {
  return {
    id: row.id,
    customerId: row.customerId,
    periodStart: row.periodStart ?? null,
    periodEnd: row.periodEnd ?? null,
    periodLabel: row.periodLabel,
    metrics: (row.metrics as LocationData[]) ?? [],
    generatedAt: row.generatedAt,
  };
}

export class PostgresReportRepository implements ReportRepository {
  async save(report: NewReport): Promise<Report> {
    const [row] = await getDb()
      .insert(reports)
      .values({
        customerId: report.customerId,
        periodStart: report.periodStart ?? undefined,
        periodEnd: report.periodEnd ?? undefined,
        periodLabel: report.periodLabel,
        metrics: report.metrics as unknown as Record<string, unknown>[],
      })
      .returning();
    return rowToReport(row);
  }

  async findLatestByCustomer(customerId: string): Promise<Report | null> {
    const [row] = await getDb()
      .select()
      .from(reports)
      .where(eq(reports.customerId, customerId))
      .orderBy(desc(reports.generatedAt))
      .limit(1);
    return row ? rowToReport(row) : null;
  }
}

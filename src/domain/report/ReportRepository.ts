import type { Report, NewReport } from './Report';

export interface ReportRepository {
  save(report: NewReport): Promise<Report>;
  findLatestByCustomer(customerId: string): Promise<Report | null>;
}

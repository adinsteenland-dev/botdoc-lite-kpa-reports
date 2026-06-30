import Link from 'next/link';
import { PostgresCustomerRepository } from '@/infrastructure/db/PostgresCustomerRepository';
import { PostgresEmailScheduleRepository } from '@/infrastructure/db/PostgresEmailScheduleRepository';
import { PostgresEmailLogRepository } from '@/infrastructure/db/PostgresEmailLogRepository';
import { EmailManager } from '@/components/EmailManager';
import { color, font, BrandMark, Button } from '@/design';

export const dynamic = 'force-dynamic';

export default async function GlobalEmailsPage() {
  const customerRepo = new PostgresCustomerRepository();
  const scheduleRepo = new PostgresEmailScheduleRepository();
  const logRepo = new PostgresEmailLogRepository();

  const [customers, schedules, logs] = await Promise.all([
    customerRepo.findAll(),
    scheduleRepo.findAllFuture(),
    logRepo.findAll(),
  ]);

  const serializedCustomers = customers.map((c) => ({ id: c.id, name: c.name }));

  const serializedSchedules = schedules.map((s) => ({
    id: s.id,
    customerId: s.customerId,
    storeName: s.storeName,
    scheduledAt: s.scheduledAt.toISOString(),
    recurrence: s.recurrence,
    timezone: s.timezone,
    status: s.status,
  }));

  const serializedLogs = logs.map((e) => ({
    id: e.id,
    storeName: e.storeName,
    sentAt: e.sentAt.toISOString(),
    recipientCount: e.recipientCount,
    status: e.status,
    error: e.error,
  }));

  return (
    <div style={{ minHeight: '100vh', background: color.bg, fontFamily: font.sans }}>
      {/* Header */}
      <div
        style={{
          background: color.navy,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <BrandMark size="sm" />
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Button variant="outline">Return To Dashboard</Button>
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: color.navy, margin: '0 0 4px' }}>
          Email Schedules
        </h1>
        <p style={{ color: color.subtext, fontSize: 14, margin: '0 0 28px' }}>
          Manage scheduled report emails across all dealership groups.
        </p>

        <EmailManager
          schedules={serializedSchedules}
          logs={serializedLogs}
          contacts={[]}
          customers={serializedCustomers}
          customerId={null}
          storeName={null}
          defaultTimezone={null}
          readOnly
        />
      </div>
    </div>
  );
}

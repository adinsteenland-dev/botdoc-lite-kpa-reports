import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PostgresCustomerRepository } from '@/infrastructure/db/PostgresCustomerRepository';
import { PostgresEmailScheduleRepository } from '@/infrastructure/db/PostgresEmailScheduleRepository';
import { PostgresEmailLogRepository } from '@/infrastructure/db/PostgresEmailLogRepository';
import { PostgresEmailContactRepository } from '@/infrastructure/db/PostgresEmailContactRepository';
import { EmailManager } from '@/components/EmailManager';
import { Sidebar } from '@/components/Sidebar';
import { color, font, Button } from '@/design';

export const dynamic = 'force-dynamic';

export default async function GroupEmailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customerRepo = new PostgresCustomerRepository();
  const scheduleRepo = new PostgresEmailScheduleRepository();
  const logRepo = new PostgresEmailLogRepository();
  const contactRepo = new PostgresEmailContactRepository();

  const [customer, allCustomers, schedules, logs, contacts] = await Promise.all([
    customerRepo.findById(id),
    customerRepo.findAll(),
    scheduleRepo.findByCustomer(id),
    logRepo.findByCustomer(id),
    contactRepo.findByCustomer(id),
  ]);

  if (!customer) notFound();

  const sidebarCustomers = allCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    logoMimeType: c.logoMimeType,
    logo: c.logo ? c.logo.toString('base64') : null,
  }));

  const serializedCustomers = allCustomers.map((c) => ({ id: c.id, name: c.name }));

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

  const serializedContacts = contacts.map((c) => ({
    id: c.id,
    customerId: c.customerId,
    storeName: c.storeName,
    email: c.email,
    name: c.name,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Toolbar */}
      <div
        className="no-print"
        style={{
          background: color.navy,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: font.sans,
          flexShrink: 0,
        }}
      >
        <Link href={`/customers/${id}/report`} style={{ textDecoration: 'none' }}>
          <Button variant="ghost">← {customer.name}</Button>
        </Link>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Button variant="outline">Return To Dashboard</Button>
        </Link>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar customers={sidebarCustomers} currentId={id} />

        <main style={{ flex: 1, minWidth: 0, padding: '32px 28px', overflowX: 'auto' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: color.navy, margin: '0 0 4px', fontFamily: font.sans }}>
            Email Schedules — {customer.name}
          </h1>
          <p style={{ color: color.subtext, fontSize: 14, margin: '0 0 24px', fontFamily: font.sans }}>
            Manage scheduled report emails for this dealership group.
          </p>

          <EmailManager
            schedules={serializedSchedules}
            logs={serializedLogs}
            contacts={serializedContacts}
            customers={serializedCustomers}
            customerId={id}
            storeName={null}
            defaultTimezone={customer.defaultTimezone}
          />
        </main>
      </div>
    </div>
  );
}

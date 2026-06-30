import { PostgresCustomerRepository } from '@/infrastructure/db/PostgresCustomerRepository';
import { color, font, BrandMark, Button } from '@/design';
import Link from 'next/link';
import { DashboardGrid } from './DashboardGrid';
import { logout } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const repo = new PostgresCustomerRepository();
  const customers = await repo.findAll();

  const serialized = customers.map((c) => ({
    id: c.id,
    name: c.name,
    logoSrc:
      c.logo && c.logoMimeType
        ? `data:${c.logoMimeType};base64,${c.logo.toString('base64')}`
        : null,
  }));

  return (
    <div style={{ minHeight: '100vh', background: color.bg, fontFamily: font.sans }}>
      {/* Header */}
      <div
        style={{
          background: color.navy,
          padding: '18px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <BrandMark size="sm" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/emails" style={{ textDecoration: 'none' }}>
            <Button variant="compact">Scheduled Emails</Button>
          </Link>
          <form action={logout}>
            <Button variant="compact" type="submit">Sign Out</Button>
          </form>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '48px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: color.navy, margin: '0 0 4px' }}>
          Dealership Groups
        </h1>
        <p style={{ color: color.subtext, fontSize: 14, margin: '0 0 32px' }}>
          Select a group to view their usage report.
        </p>

        <DashboardGrid customers={serialized} />
      </div>
    </div>
  );
}

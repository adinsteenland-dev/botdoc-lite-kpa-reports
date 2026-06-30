import { PostgresPartnerRepository } from '@/infrastructure/db/PostgresPartnerRepository';
import { color, font, BrandMark, Button } from '@/design';
import { DashboardGrid } from './DashboardGrid';
import { logout } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const repo = new PostgresPartnerRepository();
  const partners = await repo.findAll();

  const serialized = partners.map((p) => ({
    id: p.id,
    name: p.name,
    logoSrc:
      p.logo && p.logoMimeType
        ? `data:${p.logoMimeType};base64,${p.logo.toString('base64')}`
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
        <form action={logout}>
          <Button variant="compact" type="submit">Sign Out</Button>
        </form>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '48px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: color.navy, margin: '0 0 4px' }}>
          KPA Partners
        </h1>
        <p style={{ color: color.subtext, fontSize: 14, margin: '0 0 32px' }}>
          Select a partner to view their usage report.
        </p>

        <DashboardGrid partners={serialized} />
      </div>
    </div>
  );
}

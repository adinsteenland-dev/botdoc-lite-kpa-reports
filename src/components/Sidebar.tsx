'use client';

import Link from 'next/link';
import { color, font, radius } from '@/design';

export interface SidebarCustomer {
  id: string;
  name: string;
  logoMimeType: string | null;
  logo: string | null; // base64 string, pre-serialized server-side
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Sidebar({
  customers,
  currentId,
}: {
  customers: SidebarCustomer[];
  currentId: string;
}) {
  return (
    <aside
      className="no-print"
      style={{
        width: 240,
        flexShrink: 0,
        background: color.navy,
        minHeight: '100%',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: color.muted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '0 16px 12px',
          fontFamily: font.sans,
        }}
      >
        Dealership Groups
      </div>

      {customers.map((c) => {
        const isActive = c.id === currentId;
        const logoSrc =
          c.logo && c.logoMimeType ? `data:${c.logoMimeType};base64,${c.logo}` : null;

        return (
          <Link key={c.id} href={`/customers/${c.id}/report`} style={{ textDecoration: 'none' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                margin: '0 8px',
                borderRadius: radius.md,
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderLeft: isActive ? `3px solid ${color.orange}` : '3px solid transparent',
                cursor: 'pointer',
                transition: 'background 0.12s',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: radius.sm,
                  background: isActive ? color.orange : 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt=""
                    style={{ width: 26, height: 26, objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: color.onDark }}>
                    {initials(c.name)}
                  </span>
                )}
              </div>

              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? color.onDark : color.muted,
                  lineHeight: 1.3,
                  fontFamily: font.sans,
                }}
              >
                {c.name}
              </span>
            </div>
          </Link>
        );
      })}
    </aside>
  );
}

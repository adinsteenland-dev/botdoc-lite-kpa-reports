'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { color, font, radius, shadow, Button, TextInput } from '@/design';
import { addPartner, deletePartner } from '@/app/(lite)/lite/actions';

export interface DashboardPartner {
  id: string;
  name: string;
  logoSrc: string | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function DashboardGrid({ partners }: { partners: DashboardPartner[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  function handleAdd() {
    setAddError('');
    if (!newName.trim()) {
      setAddError('Name is required.');
      return;
    }
    startTransition(async () => {
      try {
        await addPartner(newName.trim());
        setNewName('');
        router.refresh();
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Failed to add partner.');
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}" from the dashboard? This cannot be undone.`)) return;
    startTransition(async () => {
      await deletePartner(id);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Add partner form */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 32,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 260px', minWidth: 200 }}>
          <TextInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Partner name…"
          />
          {addError && (
            <p style={{ fontSize: 12, color: color.danger, margin: '4px 0 0' }}>{addError}</p>
          )}
        </div>
        <Button variant="primary" onClick={handleAdd} disabled={isPending}>
          {isPending ? 'Adding…' : '+ Add Partner'}
        </Button>
      </div>

      {/* Card grid */}
      {partners.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: color.muted,
            fontSize: 14,
            fontFamily: font.sans,
          }}
        >
          No partners yet. Add one above.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {partners.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <Link href={`/lite/partners/${p.id}/report`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: color.surface,
                    borderRadius: radius.xl,
                    boxShadow: shadow.card,
                    padding: '24px 20px',
                    paddingRight: 48,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer',
                    border: `1.5px solid ${color.border}`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.lg,
                      background: color.navy,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {p.logoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.logoSrc}
                        alt=""
                        style={{ width: 40, height: 40, objectFit: 'contain' }}
                      />
                    ) : (
                      <span
                        style={{
                          color: color.onDark,
                          fontSize: 15,
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {initials(p.name)}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: color.navy,
                        fontSize: 15,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: color.subtext, marginTop: 3 }}>
                      View report →
                    </div>
                  </div>
                </div>
              </Link>

              {/* Remove button */}
              <button
                onClick={() => handleDelete(p.id, p.name)}
                disabled={isPending}
                title={`Remove ${p.name}`}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 26,
                  height: 26,
                  borderRadius: radius.sm,
                  border: `1px solid ${color.border}`,
                  background: color.surface,
                  color: color.muted,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

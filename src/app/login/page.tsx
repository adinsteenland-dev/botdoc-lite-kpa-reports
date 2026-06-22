'use client';

import { useActionState } from 'react';
import { login } from './actions';
import { color, font } from '@/design';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: color.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font.sans,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: color.navy, letterSpacing: '-0.01em' }}>
            BOT<span style={{ color: color.orange }}>•</span>DOC
            <span style={{ fontWeight: 400, color: color.orange, marginLeft: 4 }}>lite</span>
          </span>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>KPA Report Generator</div>
        </div>

        <form action={formAction}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                htmlFor="password"
                style={{ fontSize: 11, fontWeight: 700, color: color.navy, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                autoComplete="current-password"
                required
                style={{
                  border: `1.5px solid ${state?.error ? '#DC2626' : '#CBD5E1'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: color.navy,
                  fontFamily: font.sans,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              {state?.error && (
                <span style={{ fontSize: 12, color: '#DC2626' }}>{state.error}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              style={{
                background: pending ? '#94A3B8' : color.orange,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: font.sans,
                cursor: pending ? 'not-allowed' : 'pointer',
                width: '100%',
                letterSpacing: '0.01em',
              }}
            >
              {pending ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

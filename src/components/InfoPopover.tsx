'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { color, font, shadow, radius } from '@/design';

export function InfoPopover({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="How is this calculated?"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 2px',
          display: 'inline-flex',
          alignItems: 'center',
          color: open ? color.navy : color.muted,
          lineHeight: 1,
          transition: 'color 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <text
            x="8" y="12"
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fontFamily="sans-serif"
            fill="currentColor"
          >
            i
          </text>
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            background: color.surface,
            boxShadow: shadow.card,
            borderRadius: radius.lg,
            border: `1px solid ${color.border}`,
            padding: '12px 14px',
            width: 270,
            zIndex: 50,
            fontFamily: font.sans,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

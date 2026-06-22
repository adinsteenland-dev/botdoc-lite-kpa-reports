import type { ReactNode } from 'react';
import { radius, status, type StatusVariant } from '../tokens';

/** Pill-shaped status indicator. Used for usage-score levels and "disabled" states. */
export function Badge({
  children,
  variant = 'neutral',
  dot = false,
  italic = false,
}: {
  children: ReactNode;
  variant?: StatusVariant;
  dot?: boolean;
  italic?: boolean;
}) {
  const s = status[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? 5 : 0,
        width: 'fit-content',
        background: s.bg,
        color: s.text,
        fontSize: 11,
        fontWeight: italic ? 400 : 700,
        fontStyle: italic ? 'italic' : 'normal',
        padding: '3px 8px',
        borderRadius: radius.xl,
      }}
    >
      {dot && (
        <span
          style={{ width: 6, height: 6, borderRadius: '50%', background: s.text, display: 'inline-block' }}
        />
      )}
      {children}
    </span>
  );
}

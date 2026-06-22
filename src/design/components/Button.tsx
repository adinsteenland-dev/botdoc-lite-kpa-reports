import type { CSSProperties, ReactNode } from 'react';
import { color, radius } from '../tokens';

type Variant = 'primary' | 'compact' | 'outline' | 'ghost';

const variants: Record<Variant, CSSProperties> = {
  // Full-width call to action (e.g. "Generate Report").
  primary: {
    background: color.orange,
    color: color.onDark,
    borderRadius: radius.md,
    padding: '14px',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.02em',
    width: '100%',
  },
  // Inline solid button (e.g. toolbar "Print / Save PDF").
  compact: {
    background: color.orange,
    color: color.onDark,
    borderRadius: radius.sm,
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 700,
  },
  // Outlined secondary button for dark surfaces — same size as compact, no fill.
  outline: {
    background: 'transparent',
    color: color.onDark,
    border: '1.5px solid rgba(255,255,255,0.35)',
    borderRadius: radius.sm,
    padding: '7px 18px',
    fontSize: 13,
    fontWeight: 600,
  },
  // Text-only button for use on dark surfaces (e.g. "New Report").
  ghost: {
    background: 'none',
    color: color.muted,
    fontSize: 13,
    fontWeight: 400,
  },
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: 'inherit', ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

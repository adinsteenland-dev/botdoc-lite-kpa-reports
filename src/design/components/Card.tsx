import type { CSSProperties, ReactNode } from 'react';
import { color, radius, shadow } from '../tokens';

/** Elevated white surface used for KPI tiles, tables, and chart panels. */
export function Card({
  children,
  padding,
  style,
  className,
}: {
  children: ReactNode;
  padding?: CSSProperties['padding'];
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: color.surface,
        borderRadius: radius.lg,
        boxShadow: shadow.card,
        ...(padding !== undefined ? { padding } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Panel header with the orange accent bar (used above tables and charts). */
export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div
      style={{
        padding: '16px 20px 12px',
        borderBottom: `1px solid ${color.fillSubtle}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ width: 3, height: 16, background: color.orange, borderRadius: 2 }} />
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: color.navy,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          flex: 1,
        }}
      >
        {title}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/** Small uppercase label rendered inside a card (e.g. KPI metric name). */
export function CardEyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: color.muted,
        lineHeight: 1.3,
      }}
    >
      {children}
    </div>
  );
}

/** Section heading with the orange left border (e.g. "Key Performance Indicators"). */
export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: color.subtext,
        borderLeft: `3px solid ${color.orange}`,
        paddingLeft: 10,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

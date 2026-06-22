import type { ReactNode } from 'react';
import { color, trendColor, type TrendVariant } from '../tokens';
import { Card, CardEyebrow } from './Card';
import { Badge } from './Badge';

/**
 * A single KPI tile. When `value` is null the tile renders a muted dash plus an
 * optional `disabledLabel` badge (e.g. "Not Yet Enabled", "No Sales Data").
 * `children` can supply extra controls (e.g. a store selector) between the label
 * and value.
 */
export function KpiCard({
  label,
  value,
  disabledLabel,
  trend,
  trendVariant = 'orange',
  valueColor,
  children,
}: {
  label: string;
  value: string | null;
  disabledLabel?: string;
  trend?: string;
  trendVariant?: TrendVariant;
  valueColor?: string;
  children?: ReactNode;
}) {
  const disabled = value === null;
  return (
    <Card padding="16px 14px 14px" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <CardEyebrow>{label}</CardEyebrow>
      {children}
      {disabled ? (
        <>
          <div style={{ fontSize: 20, fontWeight: 800, color: color.muted }}>—</div>
          {disabledLabel && (
            <Badge variant="neutral" italic>
              {disabledLabel}
            </Badge>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: valueColor ?? color.navy,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {value}
          </div>
          {trend && (
            <div style={{ fontSize: 12, fontWeight: 600, color: trendColor[trendVariant] }}>{trend}</div>
          )}
        </>
      )}
    </Card>
  );
}

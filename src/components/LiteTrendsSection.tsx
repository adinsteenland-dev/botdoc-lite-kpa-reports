import type { TrendData } from '@/lib/parseCSV';
import { color, font, Card, CardEyebrow, SectionEyebrow } from '@/design';

function PctBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: up ? color.success : color.danger,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function TrendsSection({ trendData }: { trendData: TrendData }) {
  return (
    <div style={{ padding: '0 32px 20px' }}>
      <SectionEyebrow>Usage Trends</SectionEyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {trendData.windows.map((win) => (
          <Card key={win.label} padding="14px 16px" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <CardEyebrow>{win.label}</CardEyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, color: color.subtext, fontFamily: font.sans }}>Sessions Generated</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: color.navy, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {win.metrics.scans.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

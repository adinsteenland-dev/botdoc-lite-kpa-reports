'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { HealthScoreData } from '@/lib/parseCSV';
import { color, font, shadow, radius, status, Card } from '@/design';
import { InfoPopover } from './InfoPopover';

const LABEL_STYLE: Record<HealthScoreData['label'], { text: string; bg: string }> = {
  Excellent: { text: color.success,  bg: status.strong.bg   },
  Good:      { text: '#2563EB',      bg: '#DBEAFE'          },
  Fair:      { text: color.warning,  bg: status.moderate.bg },
  'At Risk': { text: color.danger,   bg: status.low.bg      },
};

function fmtMonth(ym: string): string {
  return new Date(ym + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function TrendArrow({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ color: color.muted, fontSize: 12 }}>—</span>;
  const up = pct >= 0;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: up ? color.success : color.danger }}>
      {up ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 0',
        borderBottom: `1px solid ${color.fillSubtle}`,
        fontFamily: font.sans,
      }}
    >
      <span style={{ fontSize: 12, color: color.subtext }}>{label}</span>
      {children}
    </div>
  );
}

function Sparkline({ history, peakDL }: { history: HealthScoreData['monthlyHistory']; peakDL: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (history.length === 0) return null;

  const max = Math.max(...history.map((r) => r.dlCompleted), 1);
  const hovered = hoveredIndex !== null ? history[hoveredIndex] : null;

  return (
    <div style={{ padding: '12px 16px 0' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: color.subtext, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: font.sans }}>
        Monthly DL History
      </span>

      {/* Hover label — fixed height so layout doesn't shift */}
      <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 4 }}>
        {hovered ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: color.navy, fontFamily: font.sans }}>
            {fmtMonth(hovered.yearMonth)} — {hovered.dlCompleted.toLocaleString()} DL
          </span>
        ) : (
          <span style={{ fontSize: 10, color: color.muted, fontFamily: font.sans }}>Hover a bar for details</span>
        )}
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginTop: 4 }}>
        {history.map((r, i) => {
          const h = Math.max((r.dlCompleted / max) * 36, 2);
          const isPeak = r.dlCompleted === peakDL && peakDL > 0;
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={r.yearMonth}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                flex: 1,
                height: h,
                background: isPeak ? color.orange : color.navy,
                borderRadius: 2,
                opacity: isHovered ? 1 : isPeak ? 1 : 0.35,
                cursor: 'default',
                transition: 'opacity 0.1s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function StoreHealthScore({ healthScore }: { healthScore: HealthScoreData }) {
  const { score, label, allTimeHighDL, peakMonth, currentPctOfPeak, recentTrendPct, mediumTrendPct, monthlyHistory } = healthScore;
  const ls = LABEL_STYLE[label];

  return (
    <Card style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header with info icon */}
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
        <div style={{ fontSize: 13, fontWeight: 700, color: color.navy, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Store Health Score
        </div>
        <InfoPopover>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              How Health Score is Calculated
            </div>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
              A 0–100 score built from three components:
            </div>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
              <strong style={{ color: '#0F172A' }}>Peak Ratio (50 pts)</strong> — How close your current DL captures are to your all-time monthly high.
            </div>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
              <strong style={{ color: '#0F172A' }}>Recent Trend (30 pts)</strong> — Last 30 days vs. prior 30 days (±50% range).
            </div>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
              <strong style={{ color: '#0F172A' }}>Medium Trend (20 pts)</strong> — 30–60 day vs. 60–90 day period (±50% range).
            </div>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
              <span style={{ color: '#16A34A', fontWeight: 700 }}>≥75</span> Excellent &nbsp;
              <span style={{ color: '#2563EB', fontWeight: 700 }}>≥55</span> Good &nbsp;
              <span style={{ color: '#D97706', fontWeight: 700 }}>≥35</span> Fair &nbsp;
              <span style={{ color: '#DC2626', fontWeight: 700 }}>&lt;35</span> At Risk
            </div>
          </div>
        </InfoPopover>
      </div>

      {/* Score display */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 20px', gap: 8 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: ls.bg,
            border: `3px solid ${ls.text}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadow.card,
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 900, color: ls.text, lineHeight: 1, letterSpacing: '-0.03em', fontFamily: font.sans }}>
            {score}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: ls.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            / 100
          </span>
        </div>

        <div
          style={{
            background: ls.bg,
            color: ls.text,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderRadius: radius.pill,
            padding: '3px 12px',
            fontFamily: font.sans,
          }}
        >
          {label}
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline history={monthlyHistory} peakDL={allTimeHighDL} />

      {/* Stats rows */}
      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column' }}>
        <Row label="All-Time Peak DL">
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: color.navy, fontVariantNumeric: 'tabular-nums' }}>
              {allTimeHighDL.toLocaleString()}
            </span>
            {peakMonth !== '—' && (
              <span style={{ fontSize: 10, color: color.muted, marginLeft: 5 }}>{peakMonth}</span>
            )}
          </div>
        </Row>
        <Row label="Current % of Peak">
          {currentPctOfPeak !== null ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: color.navy, fontVariantNumeric: 'tabular-nums' }}>
              {currentPctOfPeak}%
            </span>
          ) : (
            <span style={{ fontSize: 12, color: color.muted }}>—</span>
          )}
        </Row>
        <Row label="30-Day Trend">
          <TrendArrow pct={recentTrendPct} />
        </Row>
        <Row label="60-Day Trend">
          <TrendArrow pct={mediumTrendPct} />
        </Row>
      </div>
    </Card>
  );
}

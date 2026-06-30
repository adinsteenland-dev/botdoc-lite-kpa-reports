'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EngagementToolsData } from '@/lib/parseCSV';
import { color, font, Card, CardHeader } from '@/design';

// All defined engagement tool categories in display order.
// Every category always appears in the legend; zero-count ones are shown grayed out.
const TOOL_CATEGORIES: { label: string; color: string }[] = [
  { label: 'StoreQR',       color: '#3B82F6' },
  { label: 'StoreNFC',      color: '#10B981' },
  { label: 'CardQR',        color: '#8B5CF6' },
  { label: 'CardNFC',       color: '#F59E0B' },
  { label: 'Mobile Wallet', color: '#06B6D4' },
  { label: 'SMD',           color: '#84CC16' },
  { label: 'Website',       color: '#EC4899' },
  { label: 'CRM',           color: '#EF4444' },
  { label: 'Onboarding',    color: '#F97316' },
];

export function EngagementToolsPie({ data }: { data: EngagementToolsData | undefined }) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Merge incoming data against the full category list so every tool always appears.
  const countMap = new Map((data?.tools ?? []).map((t) => [t.label, t.count]));
  const allTools = TOOL_CATEGORIES.map((cat) => ({
    ...cat,
    count: countMap.get(cat.label) ?? 0,
  }));
  const activeTools = allTools.filter((t) => t.count > 0);
  const total = activeTools.reduce((s, t) => s + t.count, 0);
  const hasData = total > 0;

  useEffect(() => {
    if (!svgRef.current || !hasData) return;

    const size = 140;
    const radius = size / 2;
    const innerRadius = radius * 0.55;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', size).attr('height', size);

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

    const pie = d3.pie<{ label: string; color: string; count: number }>()
      .value((d) => d.count)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ label: string; color: string; count: number }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 2);

    g.selectAll('path')
      .data(pie(activeTools))
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Centre label: total
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.15em')
      .attr('font-size', '18px')
      .attr('font-weight', '800')
      .attr('fill', color.navy)
      .attr('font-family', font.sans)
      .text(total >= 1000 ? `${(total / 1000).toFixed(1)}K` : String(total));

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('fill', color.subtext)
      .attr('font-family', font.sans)
      .attr('letter-spacing', '0.05em')
      .text('TOTAL');
  }, [data, hasData, total]);

  return (
    <Card className="pie-card" style={{ overflow: 'hidden', breakInside: 'avoid' }}>
      <CardHeader title="Engagement Tools" />
      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {hasData ? (
          <>
            <svg ref={svgRef} />
            {/* Legend: 2-column grid — all categories shown, zero-count ones dimmed */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', width: '100%' }}>
              {allTools.map((t) => {
                const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                const inactive = t.count === 0;
                return (
                  <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: inactive ? 0.35 : 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: color.subtext, fontFamily: font.sans, whiteSpace: 'nowrap' }}>
                      {t.label}
                    </span>
                    <span style={{ fontSize: 10, color: color.navy, fontWeight: 700, fontFamily: font.sans, marginLeft: 'auto' }}>
                      {inactive ? '—' : `${pct}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ padding: '20px 0', color: color.muted, fontSize: 13, fontFamily: font.sans }}>
            No engagement data available
          </div>
        )}
      </div>
    </Card>
  );
}

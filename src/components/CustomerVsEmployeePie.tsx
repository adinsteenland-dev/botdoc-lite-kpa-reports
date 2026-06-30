'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { RequestorData } from '@/lib/parseCSV';
import { color, font, Card } from '@/design';

export function CustomerVsEmployeePie({ data }: { data: RequestorData | undefined }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const total = (data?.customerScans ?? 0) + (data?.employeeScans ?? 0);
  const hasData = total > 0;

  useEffect(() => {
    if (!svgRef.current || !hasData || !data) return;

    const size = 140;
    const radius = size / 2;
    const innerRadius = radius * 0.55;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', size).attr('height', size);

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

    const pieData = [
      { label: 'Customer', value: data.customerScans, fill: color.navy },
      { label: 'Employee', value: data.employeeScans, fill: color.orange },
    ];

    const pie = d3.pie<{ label: string; value: number; fill: string }>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; fill: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 2);

    g.selectAll('path')
      .data(pie(pieData))
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.fill)
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

  const customerPct = hasData ? Math.round(((data?.customerScans ?? 0) / total) * 100) : 0;
  const employeePct = hasData ? 100 - customerPct : 0;

  return (
    <Card className="pie-card" style={{ overflow: 'hidden', breakInside: 'avoid' }}>
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
        <div style={{ fontSize: 13, fontWeight: 700, color: color.navy, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font.sans }}>
          Customer vs Employee Usage
        </div>
      </div>
      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {hasData ? (
          <>
            <svg ref={svgRef} />
            {/* Legend */}
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Customer', count: data!.customerScans, pct: customerPct, fill: color.navy },
                { label: 'Employee', count: data!.employeeScans, pct: employeePct, fill: color.orange },
              ].map(({ label, count, pct, fill }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: color.subtext, fontFamily: font.sans }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: color.navy, letterSpacing: '-0.02em', fontFamily: font.sans }}>
                    {count.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 11, color: color.muted, fontFamily: font.sans }}>{pct}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ padding: '20px 0', color: color.muted, fontSize: 13, fontFamily: font.sans }}>
            No requestor data available
          </div>
        )}
      </div>
    </Card>
  );
}

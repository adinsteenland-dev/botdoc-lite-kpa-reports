'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { RequestorData } from '@/lib/parseCSV';
import { color, font, Card, CardHeader } from '@/design';

type Metric = 'pullFiles' | 'dlCompleted';

export function EmployeeUsageChart({ data }: { data: RequestorData | undefined }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<Metric>('pullFiles');

  const employees = data?.employees ?? [];
  const hasData = employees.length > 0;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !hasData) return;

    const sorted = [...employees].sort((a, b) => b[metric] - a[metric]);

    function draw() {
      if (!svgRef.current || !containerRef.current) return;
      const totalWidth = svgRef.current.getBoundingClientRect().width || containerRef.current.clientWidth || 380;
      const maxAllowedLeft = totalWidth - 48 - 80;
    const margin = {
      top: 8,
      right: 48,
      bottom: 8,
      left: Math.min(maxAllowedLeft, Math.max(140, Math.max(...sorted.map((d) => d.name.length * 6.5)) + 16)),
    };
    const barHeight = 26;
    const barGap = 8;
    const height = sorted.length * (barHeight + barGap) + margin.top + margin.bottom;
    const innerWidth = totalWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', totalWidth).attr('height', height)
       .attr('viewBox', `0 0 ${totalWidth} ${height}`)
       .style('height', 'auto');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(sorted, (d) => d[metric]) ?? 1])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(sorted.map((d) => d.name))
      .range([0, innerHeight])
      .padding(0.2);

    // Gridlines
    g.append('g')
      .call(d3.axisBottom(xScale).ticks(4).tickSize(innerHeight).tickFormat(() => ''))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('.tick line')
        .attr('stroke', color.border)
        .attr('stroke-dasharray', '3,3'));

    // Bars
    g.selectAll('.bar')
      .data(sorted)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.name)!)
      .attr('height', yScale.bandwidth())
      .attr('width', (d) => xScale(d[metric]))
      .attr('fill', metric === 'dlCompleted' ? color.navy : color.orange)
      .attr('rx', 3);

    // Value labels — always outside bar (to the right), margin.right has space
    g.selectAll('.bar-label')
      .data(sorted)
      .join('text')
      .attr('x', (d) => xScale(d[metric]) + 5)
      .attr('y', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('fill', color.navy)
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('font-family', font.sans)
      .text((d) => d[metric]);

    // Y-axis (employee names) — truncate with ellipsis only if wider than margin
    const maxTextWidth = margin.left - 16;
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll<SVGTextElement, string>('.tick text')
        .attr('fill', color.navy)
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('font-family', font.sans)
        .attr('dx', '-8')
        .each(function () {
          const node = this;
          while (node.getComputedTextLength() > maxTextWidth && node.textContent!.length > 1) {
            node.textContent = node.textContent!.slice(0, -2) + '…';
          }
        }));
    }

    draw();
    window.addEventListener('beforeprint', draw);
    return () => window.removeEventListener('beforeprint', draw);
  }, [employees, hasData, metric]);

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 0' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: color.subtext, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font.sans }}>
          Employee Usage
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['pullFiles', 'dlCompleted'] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: font.sans,
                padding: '3px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: metric === m ? color.navy : color.fillSubtle,
                color: metric === m ? color.onDark : color.subtext,
                transition: 'background 0.15s',
              }}
            >
              {m === 'pullFiles' ? 'Additional Docs/Stips' : 'DL Captured'}
            </button>
          ))}
        </div>
      </div>
      {hasData ? (
        <div ref={containerRef} className="employee-chart-scroll" style={{ padding: '12px 16px 16px', overflowY: 'auto', maxHeight: 320 }}>
          <svg ref={svgRef} style={{ width: '100%' }} />
        </div>
      ) : (
        <div style={{ padding: '20px 16px', color: color.muted, fontSize: 13, fontFamily: font.sans }}>
          No employee usage data for this period
        </div>
      )}
    </Card>
  );
}

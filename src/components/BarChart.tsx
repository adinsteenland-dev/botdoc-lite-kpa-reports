'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { LocationData } from '@/lib/parseCSV';
import { color } from '@/design';

export function BarChart({ locations }: { locations: LocationData[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const data = [...locations].reverse();
    const totalWidth = containerRef.current.clientWidth || 400;
    // Reserve at least 120px for bars; cap left margin so innerWidth stays positive.
    const maxAllowedLeft = totalWidth - 48 - 120;
    const margin = { top: 8, right: 48, bottom: 16, left: Math.min(maxAllowedLeft, Math.max(148, Math.max(...data.map(d => d.name.length * 7.5)) + 16)) };
    const barHeight = 30;
    const barGap = 10;
    const height = data.length * (barHeight + barGap) + margin.top + margin.bottom;
    const innerWidth = totalWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', totalWidth).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.scans) ?? 1])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, innerHeight])
      .padding(0.25);

    // Gridlines
    g.append('g')
      .call(d3.axisBottom(xScale).ticks(5).tickSize(innerHeight).tickFormat(() => ''))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('.tick line')
        .attr('stroke', color.border)
        .attr('stroke-dasharray', '3,3'));

    // Bars
    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.name)!)
      .attr('height', yScale.bandwidth())
      .attr('width', d => xScale(d.scans))
      .attr('fill', color.orange)
      .attr('rx', 4);

    // Value labels — inside bar (white) if close to max, outside (navy) otherwise
    const labelSpace = 42; // px needed to the right of the bar for the label
    g.selectAll('.bar-label')
      .data(data)
      .join('text')
      .attr('x', d => xScale(d.scans) > innerWidth - labelSpace
        ? xScale(d.scans) - 8
        : xScale(d.scans) + 6)
      .attr('y', d => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => xScale(d.scans) > innerWidth - labelSpace ? 'end' : 'start')
      .attr('fill', d => xScale(d.scans) > innerWidth - labelSpace ? '#ffffff' : color.navy)
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .text(d => d.scans);

    // Y-axis labels — truncate with ellipsis if wider than available margin
    const maxTextWidth = margin.left - 16;
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll<SVGTextElement, string>('.tick text')
        .attr('fill', color.navy)
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('dx', '-8')
        .each(function() {
          const node = this;
          while (node.getComputedTextLength() > maxTextWidth && node.textContent!.length > 1) {
            node.textContent = node.textContent!.slice(0, -2) + '…';
          }
        }));
  }, [locations]);

  return (
    <div ref={containerRef} style={{ padding: '16px 20px 20px' }}>
      <svg ref={svgRef} style={{ width: '100%' }} />
    </div>
  );
}

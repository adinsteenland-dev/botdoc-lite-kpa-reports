'use client';

import React, { useEffect, useState } from 'react';
import { formatKPI } from '@/lib/parseCSV';
import type { LocationData, StoreEmployee } from '@/lib/parseCSV';
import {
  color,
  font,
  Card,
  CardHeader,
  SectionEyebrow,
  KpiCard,
  BrandMark,
} from '@/design';

const METRICS: { label: string; key: keyof LocationData }[] = [
  { label: 'Onboarded Employees',   key: 'onboardedEmployeeCount' },
  { label: 'Sessions Generated',    key: 'scans' },
  { label: 'Sessions Opened',       key: 'leads' },
  { label: 'Pull Files',            key: 'pullFiles' },
  { label: 'Employee Initiated',    key: 'employeeInitiated' },
  { label: 'Customer Self-Service', key: 'customerSelfService' },
];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function StoreReport({
  store,
  partnerId,
  period,
  partnerName,
  logoBase64,
  fromParam,
  toParam,
  onBack,
}: {
  store: LocationData;
  partnerId: string;
  period: string;
  partnerName: string;
  logoBase64: string | null;
  fromParam: string;
  toParam: string;
  onBack: () => void;
}) {
  type EmpSortField = 'sessions' | 'pullFiles' | 'onboardedAt';

  const EMP_SORT_OPTIONS: { label: string; value: EmpSortField }[] = [
    { label: 'Sessions',       value: 'sessions' },
    { label: 'Pull Files',     value: 'pullFiles' },
    { label: 'Onboarded Date', value: 'onboardedAt' },
  ];

  const [employees, setEmployees] = useState<StoreEmployee[] | null>(null);
  const [empError, setEmpError]   = useState<string | null>(null);
  const [empSort, setEmpSort]     = useState<EmpSortField>('sessions');

  const sortedEmployees = employees ? employees.slice().sort((a, b) => {
    if (empSort === 'onboardedAt') {
      return new Date(b.onboardedAt!).getTime() - new Date(a.onboardedAt!).getTime();
    }
    return b[empSort] - a[empSort];
  }) : [];

  useEffect(() => {
    const params = new URLSearchParams({ storeId: store.storeId ?? '', from: fromParam, to: toParam });
    fetch(`/api/partners/${partnerId}/employees?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEmployees(data);
        else setEmpError(data.error ?? 'Unknown error');
      })
      .catch((e) => setEmpError(String(e)));
  }, [store.storeId, partnerId, fromParam, toParam]);

  return (
    <div style={{ fontFamily: font.sans, background: color.bg, minHeight: '100vh', color: color.navy }}>
      {/* HEADER */}
      <div
        style={{
          background: color.navy,
          padding: '20px 32px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div style={{ minWidth: 160, display: 'flex', alignItems: 'center' }}>
          {logoBase64 ? (
            <div
              style={{
                background: color.surface,
                borderRadius: 6,
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoBase64}
                alt={partnerName}
                style={{ height: 36, maxWidth: 160, objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div>
              <div
                style={{
                  color: color.onDark,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {partnerName}
              </div>
              <div style={{ color: color.muted, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Powered by Botdoc
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ color: color.onDark, fontSize: 22, fontWeight: 700, letterSpacing: '0.02em', margin: 0 }}>
            {store.name}
          </h1>
          <div style={{ color: color.orange, fontSize: 12, fontWeight: 700, marginTop: 6, letterSpacing: '0.04em', border: `1px solid ${color.orange}`, borderRadius: 6, padding: '3px 10px', display: 'inline-block' }}>
            Reporting Period: {period}
          </div>
        </div>

        <div style={{ minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <BrandMark size="md" />
        </div>
      </div>

      {/* BACK NAV */}
      <div
        className="no-print"
        style={{
          background: color.surface,
          borderBottom: `1px solid ${color.border}`,
          padding: '10px 32px',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: `1.5px solid ${color.border}`,
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: color.navy,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ← Back to All Locations
        </button>
      </div>

      {/* KPI CARDS */}
      <div style={{ padding: '28px 32px 8px' }}>
        <SectionEyebrow>Store Performance</SectionEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {METRICS.map(({ label, key }) => (
            <KpiCard
              key={key}
              label={label}
              value={formatKPI(store[key] as number)}
            />
          ))}
        </div>
      </div>

      {/* EMPLOYEE TABLE */}
      <div style={{ padding: '20px 32px 32px' }}>
        <Card style={{ overflow: 'auto' }}>
          <CardHeader
            title="Employee Usage"
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: color.subtext, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Sort by
                </span>
                <select
                  value={empSort}
                  onChange={(e) => setEmpSort(e.target.value as EmpSortField)}
                  style={{
                    border: `1.5px solid ${color.border}`,
                    borderRadius: 8,
                    padding: '5px 10px',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    color: color.navy,
                    background: color.bg,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {EMP_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            }
          />

          {employees === null && !empError && (
            <div style={{ padding: '24px 16px', color: color.muted, fontSize: 13 }}>
              Loading employees…
            </div>
          )}

          {empError && (
            <div style={{ padding: '24px 16px', color: '#c0392b', fontSize: 13 }}>
              Failed to load employee data: {empError}
            </div>
          )}

          {employees && employees.length === 0 && (
            <div style={{ padding: '24px 16px', color: color.muted, fontSize: 13 }}>
              No employee records found for this store.
            </div>
          )}

          {employees && employees.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: color.navy }}>
                  {[
                    { label: 'Employee',       align: 'left'   },
                    { label: 'Phone',          align: 'left'   },
                    { label: 'Onboarded Date', align: 'center' },
                    { label: 'Sessions',       align: 'right'  },
                    { label: 'Pull Files',     align: 'right'  },
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      style={{
                        color: color.onDark,
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '10px 14px',
                        textAlign: align as React.CSSProperties['textAlign'],
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((emp, i) => (
                  <tr
                    key={emp.employeeId}
                    style={{ background: i % 2 === 0 ? color.surface : color.bg }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: color.navy, borderBottom: `1px solid ${color.fillSubtle}` }}>
                      {emp.employeeName}
                    </td>
                    <td style={{ padding: '10px 14px', color: color.subtext, borderBottom: `1px solid ${color.fillSubtle}`, fontSize: 12 }}>
                      {emp.mobile ? `••• ${emp.mobile.replace(/\D/g, '').slice(-4)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: `1px solid ${color.fillSubtle}`, color: color.subtext }}>
                      {fmtDate(emp.onboardedAt)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', borderBottom: `1px solid ${color.fillSubtle}`, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      {emp.sessions.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', borderBottom: `1px solid ${color.fillSubtle}`, fontVariantNumeric: 'tabular-nums' }}>
                      {emp.pullFiles.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

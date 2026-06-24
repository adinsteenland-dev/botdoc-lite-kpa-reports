export default function ReportLoading() {
  const navy = '#0A1628';
  const bg = '#F4F6F9';
  const surface = '#FFFFFF';
  const fillSubtle = '#F1F5F9';
  const border = '#E2E8F0';
  const muted = '#94A3B8';
  const orange = '#E8521A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Toolbar */}
      <div
        className="no-print"
        style={{
          background: navy,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ width: 120, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 120, height: 30, borderRadius: 8, background: orange, opacity: 0.5 }} />
          <div style={{ width: 140, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.15)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar skeleton */}
        <div style={{ width: 224, background: navy, flexShrink: 0, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ width: 80, height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.2)', marginBottom: 8 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>

        {/* Main content skeleton */}
        <main style={{ flex: 1, background: bg, minWidth: 0 }}>
          {/* Header */}
          <div style={{ background: navy, padding: '20px 32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 120, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 240, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.2)', margin: '0 auto 8px' }} />
              <div style={{ width: 180, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.12)', margin: '0 auto' }} />
            </div>
            <div style={{ width: 100, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Filter bar */}
          <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '12px 32px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 180, height: 32, borderRadius: 8, background: fillSubtle }} />
            <div style={{ width: 120, height: 32, borderRadius: 8, background: fillSubtle }} />
            <div style={{ width: 120, height: 32, borderRadius: 8, background: fillSubtle }} />
            <div style={{ width: 60, height: 32, borderRadius: 8, background: fillSubtle }} />
          </div>

          {/* KPI cards */}
          <div style={{ padding: '24px 32px 8px' }}>
            <div style={{ width: 180, height: 10, borderRadius: 4, background: muted, marginBottom: 16, opacity: 0.4 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={{ background: surface, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                  <div style={{ width: '70%', height: 9, borderRadius: 3, background: fillSubtle, marginBottom: 12 }} />
                  <div style={{ width: '50%', height: 22, borderRadius: 4, background: fillSubtle }} />
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ padding: '20px 32px 32px' }}>
            <div style={{ background: surface, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${fillSubtle}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 16, background: orange, borderRadius: 2 }} />
                <div style={{ width: 200, height: 11, borderRadius: 3, background: fillSubtle }} />
              </div>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} style={{ padding: '12px 20px', borderBottom: `1px solid ${fillSubtle}`, display: 'flex', gap: 16, background: i % 2 === 0 ? surface : bg }}>
                  <div style={{ width: '35%', height: 11, borderRadius: 3, background: fillSubtle }} />
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} style={{ flex: 1, height: 11, borderRadius: 3, background: fillSubtle }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

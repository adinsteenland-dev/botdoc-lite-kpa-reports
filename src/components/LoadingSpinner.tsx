import { color, font } from '@/design';

export function LoadingSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: color.bg,
        fontFamily: font.sans,
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: `4px solid ${color.border}`,
          borderTopColor: color.navy,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: color.subtext, fontSize: 13 }}>Loading report…</span>
    </div>
  );
}

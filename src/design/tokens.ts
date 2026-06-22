/**
 * Design tokens — the single source of truth for color, spacing, type, and
 * elevation across the app. Components and pages must consume these tokens
 * instead of hard-coding hex values or shadow strings (see AGENTS.md → DRY).
 */

export const color = {
  navy: '#0A1628',
  orange: '#E8521A',
  orangeDeep: '#EA580C', // trend / secondary orange accent
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  muted: '#94A3B8',
  subtext: '#64748B',
  fillSubtle: '#F1F5F9',
  fillFaint: '#F8FAFC',
  success: '#16A34A',
  warning: '#CA8A04',
  danger: '#DC2626',
  onDark: '#FFFFFF',
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  pill: 999,
} as const;

export const shadow = {
  /** Standard elevated card / KPI tile. */
  card: '0 1px 4px rgba(10,22,40,0.08), 0 4px 16px rgba(10,22,40,0.04)',
  /** Heavier elevation for the form panel. */
  panel: '0 4px 24px rgba(10,22,40,0.08)',
} as const;

export const font = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

/** Status palette shared by usage-score badges and other state indicators. */
export const status = {
  strong: { bg: '#DCFCE7', text: color.success, label: 'Strong' },
  moderate: { bg: '#FEF9C3', text: color.warning, label: 'Moderate' },
  low: { bg: '#FEE2E2', text: color.danger, label: 'Low' },
  neutral: { bg: color.fillSubtle, text: color.muted, label: '' },
} as const;

export type StatusVariant = keyof typeof status;

/** Trend text colors for KPI deltas. */
export const trendColor = {
  green: color.success,
  orange: color.orangeDeep,
  red: color.danger,
  disabled: color.muted,
} as const;

export type TrendVariant = keyof typeof trendColor;

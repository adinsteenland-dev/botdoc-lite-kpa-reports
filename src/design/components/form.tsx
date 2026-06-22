import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import { color, radius } from '../tokens';

/** Uppercase field label. `hint` renders as a softer inline note (e.g. "(optional)"). */
export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 700,
        color: color.navy,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 8,
      }}
    >
      {children}
      {hint && (
        <span style={{ color: color.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          {' '}
          {hint}
        </span>
      )}
    </span>
  );
}

const controlBase: CSSProperties = {
  border: `1.5px solid ${color.border}`,
  borderRadius: radius.md,
  fontSize: 14,
  color: color.navy,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  style,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  min?: string;
  style?: CSSProperties;
}) {
  return (
    <input
      type={type}
      min={min}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      style={{ ...controlBase, width: '100%', padding: '10px 14px', ...style }}
    />
  );
}

export function Select({
  value,
  onChange,
  children,
  style,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        ...controlBase,
        padding: '10px 10px',
        background: color.surface,
        cursor: 'pointer',
        appearance: 'auto',
        ...style,
      }}
    >
      {children}
    </select>
  );
}

/** Dashed drop zone wrapping a hidden file input. `active` highlights the border. */
export function FileDrop({
  accept,
  onChange,
  fileName,
  placeholder,
  active = false,
}: {
  accept: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  fileName?: string;
  placeholder: string;
  active?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: `1.5px dashed ${active ? color.orange : color.border}`,
        borderRadius: radius.md,
        padding: '10px 14px',
        fontSize: 13,
        color: color.subtext,
        cursor: 'pointer',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <input type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
      <span>{fileName || placeholder}</span>
      <span style={{ color: color.orange, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>Browse</span>
    </label>
  );
}

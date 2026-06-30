'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveAvgCarsConfig } from '@/app/(connect)/actions';
import { color, font } from '@/design';

interface Props {
  customerId: string;
  /** null = group level; store name = store level */
  storeName: string | null;
  /** Current saved value (undefined = not set) */
  currentValue: number | undefined;
}

export function AvgCarsInput({ customerId, storeName, currentValue }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(currentValue?.toString() ?? '');
  const [error, setError] = useState('');

  function handleSave() {
    setError('');
    const num = input.trim() === '' ? null : parseInt(input, 10);
    if (input.trim() !== '' && (isNaN(num!) || num! <= 0)) {
      setError('Enter a positive number.');
      return;
    }
    startTransition(async () => {
      await saveAvgCarsConfig(customerId, storeName, num);
      setEditing(false);
      router.refresh();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setEditing(false); setInput(currentValue?.toString() ?? ''); }
  }

  const label = storeName ? 'Avg Cars Sold / Month (this store)' : 'Avg Cars Sold / Month (group)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: font.sans,
        fontSize: 12,
        color: color.subtext,
      }}
    >
      <span style={{ fontWeight: 600 }}>{label}:</span>

      {editing ? (
        <>
          <input
            type="number"
            min="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: 80,
              padding: '4px 8px',
              border: `1.5px solid ${color.border}`,
              borderRadius: 6,
              fontSize: 12,
              fontFamily: font.sans,
              color: color.navy,
            }}
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            style={btnStyle(color.navy, color.onDark)}
          >
            {isPending ? '…' : 'Save'}
          </button>
          <button
            onClick={() => { setEditing(false); setInput(currentValue?.toString() ?? ''); setError(''); }}
            style={btnStyle(color.surface, color.subtext)}
          >
            Cancel
          </button>
          {error && <span style={{ color: color.danger, fontSize: 11 }}>{error}</span>}
        </>
      ) : (
        <>
          <span style={{ color: currentValue ? color.navy : color.muted, fontWeight: currentValue ? 600 : 400 }}>
            {currentValue ? currentValue.toLocaleString() : 'Not set'}
          </span>
          <button
            onClick={() => setEditing(true)}
            style={btnStyle(color.surface, color.subtext)}
          >
            {currentValue ? 'Edit' : 'Set'}
          </button>
          {currentValue && (
            <button
              onClick={() => { setInput(''); startTransition(async () => { await saveAvgCarsConfig(customerId, storeName, null); router.refresh(); }); }}
              disabled={isPending}
              style={{ ...btnStyle(color.surface, color.danger), fontSize: 11 }}
            >
              Clear
            </button>
          )}
        </>
      )}
    </div>
  );
}

function btnStyle(bg: string, textColor: string): React.CSSProperties {
  return {
    padding: '3px 10px',
    borderRadius: 6,
    border: `1px solid ${color.border}`,
    background: bg,
    color: textColor,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: font.sans,
    fontWeight: 600,
  };
}

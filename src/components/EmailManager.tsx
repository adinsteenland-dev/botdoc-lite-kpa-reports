'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { color, font, radius, shadow, Button, TextInput } from '@/design';
import { scheduleEmail, cancelSchedule, addContact, removeContact, saveCustomerTimezone } from '@/app/(connect)/actions';
import type { Recurrence } from '@/domain/email/types';
import { fmtDate } from '@/lib/reportUtils';

export interface SerializedSchedule {
  id: string;
  customerId: string;
  storeName: string | null;
  scheduledAt: string; // ISO string
  recurrence: Recurrence;
  timezone: string | null;
  status: string;
}

export interface SerializedContact {
  id: string;
  customerId: string;
  storeName: string | null;
  email: string;
  name: string | null;
}

export interface SerializedLogEntry {
  id: string;
  storeName: string | null;
  sentAt: string; // ISO string
  recipientCount: number;
  status: string;
  error: string | null;
}

export interface SerializedCustomer {
  id: string;
  name: string;
}

interface ScheduleInput {
  customerId: string;
  storeName: string | null;
  scheduledAt: string;
  recurrence: Recurrence;
  timezone: string;
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: 'Once',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const US_TIMEZONES: { value: string; label: string; abbr: string }[] = [
  { value: 'America/New_York',   label: 'Eastern (ET)',  abbr: 'ET' },
  { value: 'America/Chicago',    label: 'Central (CT)',  abbr: 'CT' },
  { value: 'America/Denver',     label: 'Mountain (MT)', abbr: 'MT' },
  { value: 'America/Los_Angeles',label: 'Pacific (PT)',  abbr: 'PT' },
  { value: 'America/Anchorage',  label: 'Alaska (AKT)',  abbr: 'AKT' },
  { value: 'Pacific/Honolulu',   label: 'Hawaii (HT)',   abbr: 'HT' },
];

const DEFAULT_TZ = 'America/New_York';

/** Convert a naive date+time string to UTC, treating it as local time in `tz`. */
function zonedToUtcIso(date: string, time: string, tz: string): string {
  const utcMs = Date.parse(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  // Build tzMs arithmetically to avoid '24:00:00' string parsing edge case on some platforms
  const tzBase = Date.parse(`${get('year')}-${get('month')}-${get('day')}T00:00:00Z`);
  const tzMs = tzBase + (parseInt(get('hour'), 10) % 24) * 3600000
    + parseInt(get('minute'), 10) * 60000
    + parseInt(get('second'), 10) * 1000;
  return new Date(utcMs + (utcMs - tzMs)).toISOString();
}

function tzAbbr(iana: string | null): string {
  return US_TIMEZONES.find((z) => z.value === iana)?.abbr ?? iana ?? '';
}

function buildCustomerMap(customers: SerializedCustomer[]): Record<string, string> {
  return Object.fromEntries(customers.map((c) => [c.id, c.name]));
}


function sectionHeader(title: string) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: color.subtext, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
      {title}
    </div>
  );
}

// ── Schedule List ─────────────────────────────────────────────────────────────

function ScheduleList({
  schedules,
  customers,
  onCancel,
  isPending,
}: {
  schedules: SerializedSchedule[];
  customers: SerializedCustomer[];
  onCancel: (id: string, customerId: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState('');
  const customerMap = buildCustomerMap(customers);

  const filtered = schedules.filter((s) => {
    const q = search.toLowerCase();
    return (
      (customerMap[s.customerId] ?? '').toLowerCase().includes(q) ||
      (s.storeName ?? '').toLowerCase().includes(q) ||
      fmtDate(s.scheduledAt).toLowerCase().includes(q) ||
      s.recurrence.includes(q)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schedules…" />
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: color.muted, fontSize: 13 }}>No upcoming schedules.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: color.navy }}>
                {['Group', 'Store', 'Send Date', 'Recurrence', ''].map((h, i) => (
                  <th key={h + i} style={{ color: color.onDark, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 14px', textAlign: i < 4 ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? color.surface : color.bg }}>
                  <td style={tdStyle}>{customerMap[s.customerId] ?? s.customerId}</td>
                  <td style={{ ...tdStyle, color: color.subtext }}>{s.storeName ?? '—'}</td>
                  <td style={tdStyle}>
                    {fmtDate(s.scheduledAt)}{' '}
                    {new Date(s.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: s.timezone ?? undefined })}
                    {s.timezone && <span style={{ color: color.muted, fontSize: 11, marginLeft: 4 }}>{tzAbbr(s.timezone)}</span>}
                  </td>
                  <td style={tdStyle}>{RECURRENCE_LABELS[s.recurrence]}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => onCancel(s.id, s.customerId)}
                      disabled={isPending}
                      style={{ ...cancelBtnStyle }}
                      title="Cancel schedule"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Sent Log ─────────────────────────────────────────────────────────────────

function SentLog({ entries, customers }: { entries: SerializedLogEntry[]; customers: SerializedCustomer[] }) {
  const [search, setSearch] = useState('');
  const customerMap = buildCustomerMap(customers);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.storeName ?? '').toLowerCase().includes(q) ||
      fmtDate(e.sentAt).toLowerCase().includes(q) ||
      e.status.includes(q)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sent log…" />
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: color.muted, fontSize: 13 }}>No emails sent yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: color.navy }}>
                {['Sent', 'Store', 'Recipients', 'Status', 'Error'].map((h, i) => (
                  <th key={h} style={{ color: color.onDark, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 14px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? color.surface : color.bg }}>
                  <td style={tdStyle}>{fmtDate(e.sentAt)}</td>
                  <td style={{ ...tdStyle, color: color.subtext }}>{e.storeName ?? '—'}</td>
                  <td style={tdStyle}>{e.recipientCount}</td>
                  <td style={tdStyle}>
                    <span style={{ color: e.status === 'sent' ? color.success : color.danger, fontWeight: 600 }}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: color.danger, fontSize: 12 }}>{e.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Contact List ──────────────────────────────────────────────────────────────

function ContactList({
  contacts,
  customerId,
  storeName,
  onAdd,
  onRemove,
  isPending,
}: {
  contacts: SerializedContact[];
  customerId: string;
  storeName: string | null;
  onAdd: (email: string, name: string) => void;
  onRemove: (id: string) => void;
  isPending: boolean;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  function handleAdd() {
    setErr('');
    if (!email.trim() || !email.includes('@')) { setErr('Valid email required.'); return; }
    onAdd(email.trim(), name.trim());
    setEmail('');
    setName('');
  }

  return (
    <div>
      {/* Add form */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-start' }}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" style={{ flex: '1 1 140px' }} />
        <TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" style={{ flex: '2 1 200px' }} />
        <Button variant="primary" onClick={handleAdd} disabled={isPending}>Add Contact</Button>
      </div>
      {err && <p style={{ fontSize: 12, color: color.danger, margin: '-8px 0 12px' }}>{err}</p>}

      {contacts.length === 0 ? (
        <p style={{ color: color.muted, fontSize: 13 }}>No contacts yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: color.fillFaint, borderRadius: radius.md, padding: '8px 12px', border: `1px solid ${color.border}` }}>
              <div style={{ flex: 1 }}>
                {c.name && <div style={{ fontSize: 13, fontWeight: 600, color: color.navy }}>{c.name}</div>}
                <div style={{ fontSize: 13, color: color.subtext }}>{c.email}</div>
              </div>
              <button onClick={() => onRemove(c.id)} disabled={isPending} style={{ ...cancelBtnStyle }} title="Remove contact">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── New Schedule Form ─────────────────────────────────────────────────────────

function NewScheduleForm({
  customerId,
  storeName,
  customers,
  contacts,
  defaultTimezone,
  onScheduled,
  isPending,
}: {
  customerId: string | null;
  storeName: string | null;
  customers: SerializedCustomer[];
  contacts: SerializedContact[];
  defaultTimezone: string | null;
  onScheduled: (input: ScheduleInput) => void;
  isPending: boolean;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId ?? customers[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('08:00');
  const [timezone, setTimezone] = useState(defaultTimezone ?? DEFAULT_TZ);
  const [recurrence, setRecurrence] = useState<Recurrence>('once');
  const [err, setErr] = useState('');

  function handleSubmit() {
    setErr('');
    if (!selectedCustomerId) { setErr('Select a dealership group.'); return; }
    if (customerId && contacts.length === 0) {
      setErr('No contacts are configured. Please add at least one contact in the Contacts tab before scheduling.');
      return;
    }
    if (!date) { setErr('Select a send date.'); return; }
    if (!time) { setErr('Select a send time.'); return; }
    const scheduledAt = zonedToUtcIso(date, time, timezone);
    if (new Date(scheduledAt) <= new Date()) { setErr('Send date and time must be in the future. Please select an upcoming date and time.'); return; }
    onScheduled({ customerId: selectedCustomerId, storeName, scheduledAt, recurrence, timezone });
    setDate('');
    setTime('08:00');
    setRecurrence('once');
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {!customerId && (
        <div style={{ flex: '2 1 200px' }}>
          <div style={{ fontSize: 11, color: color.subtext, marginBottom: 4, fontWeight: 600 }}>Group</div>
          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} style={selectStyle}>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div style={{ flex: '1 1 160px' }}>
        <div style={{ fontSize: 11, color: color.subtext, marginBottom: 4, fontWeight: 600 }}>Send Date</div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today()} style={selectStyle} />
      </div>
      <div style={{ flex: '0 1 130px' }}>
        <div style={{ fontSize: 11, color: color.subtext, marginBottom: 4, fontWeight: 600 }}>Send Time</div>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={selectStyle} />
      </div>
      <div style={{ flex: '1 1 160px' }}>
        <div style={{ fontSize: 11, color: color.subtext, marginBottom: 4, fontWeight: 600 }}>Timezone</div>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={selectStyle}>
          {US_TIMEZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
        </select>
      </div>
      <div style={{ flex: '1 1 140px' }}>
        <div style={{ fontSize: 11, color: color.subtext, marginBottom: 4, fontWeight: 600 }}>Recurrence</div>
        <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} style={selectStyle}>
          {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving…' : 'Schedule'}
      </Button>
      {err && <p style={{ width: '100%', fontSize: 12, color: color.danger, margin: 0 }}>{err}</p>}
    </div>
  );
}

// ── Main EmailManager ─────────────────────────────────────────────────────────

export function EmailManager({
  schedules,
  logs,
  contacts,
  customers,
  customerId,
  storeName,
  defaultTimezone,
  readOnly = false,
}: {
  schedules: SerializedSchedule[];
  logs: SerializedLogEntry[];
  contacts: SerializedContact[];
  customers: SerializedCustomer[];
  /** Pre-scoped customer ID (group/store pages). Null = global. */
  customerId: string | null;
  /** Pre-scoped store name (store page). Null = group or global. */
  storeName: string | null;
  /** Customer's saved timezone preference. Null = no preference (global page). */
  defaultTimezone: string | null;
  /** When true, hides the scheduling form — view-only mode for the global dashboard. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'scheduled' | 'log' | 'contacts'>('scheduled');
  const [pendingSchedule, setPendingSchedule] = useState<ScheduleInput | null>(null);

  function handleCancel(id: string, cid: string) {
    if (!confirm('Cancel this scheduled email?')) return;
    startTransition(async () => { await cancelSchedule(id, cid); router.refresh(); });
  }

  function handleAddContact(email: string, name: string) {
    if (!customerId) return;
    startTransition(async () => { await addContact({ customerId, storeName, email, name: name || null }); router.refresh(); });
  }

  function handleRemoveContact(id: string) {
    if (!confirm('Remove this contact?')) return;
    startTransition(async () => { await removeContact(id, customerId!); router.refresh(); });
  }

  function handleScheduled(input: ScheduleInput) {
    setPendingSchedule(input);
  }

  function handleConfirm() {
    if (!pendingSchedule) return;
    const input = pendingSchedule;
    setPendingSchedule(null);
    startTransition(async () => {
      await Promise.all([
        scheduleEmail(input),
        customerId ? saveCustomerTimezone(customerId, input.timezone) : Promise.resolve(),
      ]);
      router.refresh();
    });
  }

  return (
    <div style={{ fontFamily: font.sans }}>
      {/* New Schedule Form / Confirmation */}
      {!readOnly && (
      <div style={{ background: color.surface, borderRadius: radius.xl, boxShadow: shadow.card, padding: '20px 24px', marginBottom: 24, border: `1.5px solid ${color.border}` }}>
        {pendingSchedule ? (
          <>
            {sectionHeader('Confirm Email Schedule')}
            <div style={{ marginBottom: 16, fontSize: 13, color: color.subtext, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: color.navy }}>Send date: </span>
                {new Date(pendingSchedule.scheduledAt).toLocaleString('en-US', {
                  timeZone: pendingSchedule.timezone,
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}{' '}
                <span style={{ color: color.muted }}>({tzAbbr(pendingSchedule.timezone)})</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: color.navy }}>Recurrence: </span>
                {RECURRENCE_LABELS[pendingSchedule.recurrence]}
              </div>
              <div style={{ fontWeight: 600, color: color.navy, marginBottom: 6 }}>Recipients:</div>
              {customerId ? (
                <ContactList
                  contacts={contacts}
                  customerId={customerId}
                  storeName={storeName}
                  onAdd={handleAddContact}
                  onRemove={handleRemoveContact}
                  isPending={isPending}
                />
              ) : contacts.length === 0 ? (
                <p style={{ color: color.muted, fontSize: 13 }}>No contacts.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {contacts.map((c) => (
                    <div key={c.id} style={{ background: color.fillFaint, borderRadius: radius.md, padding: '6px 12px', fontSize: 13, color: color.navy, border: `1px solid ${color.border}` }}>
                      {c.name ? <><span style={{ fontWeight: 600 }}>{c.name}</span> — </> : null}{c.email}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPendingSchedule(null)} disabled={isPending} style={{ ...cancelBtnStyle, color: color.subtext }}>← Go Back</button>
              <button
                onClick={handleConfirm}
                disabled={isPending || contacts.length === 0}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: color.navy, color: color.onDark, fontWeight: 600, fontSize: 13, cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: font.sans }}
              >
                {isPending ? 'Scheduling…' : 'Confirm & Schedule'}
              </button>
            </div>
          </>
        ) : (
          <>
            {sectionHeader('New Email Schedule')}
            <NewScheduleForm customerId={customerId} storeName={storeName} customers={customers} contacts={contacts} defaultTimezone={defaultTimezone} onScheduled={handleScheduled} isPending={isPending} />
          </>
        )}
      </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['scheduled', 'log', ...(customerId ? ['contacts'] : [])] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            style={{
              padding: '7px 18px',
              borderRadius: radius.pill,
              border: 'none',
              background: tab === t ? color.navy : color.fillSubtle,
              color: tab === t ? color.onDark : color.subtext,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: font.sans,
              textTransform: 'capitalize',
            }}
          >
            {t === 'scheduled' ? 'Upcoming' : t === 'log' ? 'Sent Log' : 'Contacts'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: color.surface, borderRadius: radius.xl, boxShadow: shadow.card, padding: '20px 24px', border: `1.5px solid ${color.border}` }}>
        {tab === 'scheduled' && (
          <>
            {sectionHeader('Upcoming Scheduled Emails')}
            <ScheduleList schedules={schedules} customers={customers} onCancel={handleCancel} isPending={isPending} />
          </>
        )}
        {tab === 'log' && (
          <>
            {sectionHeader('Sent Email Log')}
            <SentLog entries={logs} customers={customers} />
          </>
        )}
        {tab === 'contacts' && customerId && (
          <>
            {sectionHeader('Contacts')}
            <ContactList contacts={contacts} customerId={customerId} storeName={storeName} onAdd={handleAddContact} onRemove={handleRemoveContact} isPending={isPending} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const tdStyle: React.CSSProperties = {
  padding: '9px 14px',
  borderBottom: `1px solid ${color.fillSubtle}`,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 6,
  border: `1px solid ${color.border}`,
  background: color.surface,
  color: color.danger,
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: `1.5px solid ${color.border}`,
  fontSize: 13,
  color: color.navy,
  background: color.surface,
  fontFamily: font.sans,
};

function today() {
  return new Date().toISOString().split('T')[0];
}

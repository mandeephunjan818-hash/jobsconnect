'use client';

/**
 * src/app/admin/listings/page.tsx  (jobs listings)
 *
 * Key additions vs previous version:
 *  - "Add Listing" button → /admin/listings/edit
 *  - Edit (pencil) button per row → /admin/listings/edit/[id]?table=[table]
 *  - useRouter imported and wired
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { useRouter } from 'next/navigation';

// ─── Known sites (mirrors sharedListing.ts) ───────────────────
const KNOWN_SITES = [
  'jobs-connect.vercel.app',
  'new-jobs-fawn.vercel.app',
  'jobsrefugee.ca',
  'vulnerableyouthsjobs.ca',
  'accesscareers.ca',
  'indigenouspeoplesjobs.ca',
] as const;

type SiteSlug = (typeof KNOWN_SITES)[number];

const SITE_LABELS: Record<string, string> = {
  'jobs-connect.vercel.app': 'Jobs Connect',
  'new-jobs-fawn.vercel.app': 'New in Canada Jobs',
  'jobsrefugee.ca': 'Jobs for Refugees',
  'vulnerableyouthsjobs.ca': 'Vulnerable Youths Jobs',
  'accesscareers.ca': 'Access Careers',
  'indigenouspeoplesjobs.ca': 'Indigenous Peoples Jobs',
};

const SITE_ID_PREFIXES: Record<string, string> = {
  'jobs-connect.vercel.app': 'JC',
  'new-jobs-fawn.vercel.app': 'NIC',
  'jobsrefugee.ca': 'REF',
  'vulnerableyouthsjobs.ca': 'VYJ',
  'accesscareers.ca': 'AC',
  'indigenouspeoplesjobs.ca': 'IPJ',
};

function deriveJobId(jobId: string | null | undefined, site: string): string {
  if (!jobId) return '—';
  const parts = jobId.split('-');
  // Pattern: PREFIX - YEAR - CODE  (exactly 3 parts)
  if (parts?.length !== 3) return jobId;
  const prefix = SITE_ID_PREFIXES[site] ?? parts[0];
  return `${prefix}-${parts[1]}-${parts[2]}`;
}

// ─── Types aligned with the Mongoose schemas ──────────────────

interface AdminNote {
  message: string;
  type: 'status_change' | 'update_request' | 'update_rejection' | 'general';
  createdAt: string;
  createdBy?: string;
}

interface ShiftItem {
  label: string;
  startTime?: string | null;
  endTime?: string | null;
  days?: string[];
}

interface SlotItem {
  _id?: string;
  location: string;
  province: string;
  city: string;
  jobPay: number;
  jobVacancy?: string | null;
  jobStartingTime?: string | null;
  isActive: boolean;
  shifts: ShiftItem[];
}

interface SiteWindow {
  site: string;
  startAt: string;
  endAt: string;
  durationDays: number;
}

interface CampaignWindow {
  label: string;
  startAt: string;
  endAt: string;
}

interface ListingRow {
  id: string;
  title: string;
  companyName: string;
  overview: string;
  description: string;
  applyEmail: string;
  highlights: string[];
  jobBankId: string;
  benefits: string[];
  categories: string[];
  slug: string;

  // ── Job meta ─────────────────────────────────────────────
  jobMode: string;
  jobType?: string | null;
  jobId?: string | null;

  // ── Slots ─────────────────────────────────────────────────
  slots: SlotItem[];

  // ── Visibility ────────────────────────────────────────────
  visibleOnSites: string[];
  siteWindows: SiteWindow[];

  // ── Ownership / meta ──────────────────────────────────────
  submittedBy: string;
  adminNotes: AdminNote[];
  updateRequested: boolean;
  updateRequestData?: any;
  createdAt: string;
  updatedAt: string;

  // ── Draft-only ────────────────────────────────────────────
  status?: string;
  campaignWindow?: CampaignWindow | null;

  // ── Live-only ─────────────────────────────────────────────
  isActive?: boolean;
}

interface ApiResponse {
  data: ListingRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  table: string;
}

// ─── Per-site window draft (for ApproveModal) ─────────────────
interface SiteWindowDraft {
  site: SiteSlug | string;
  startAt: string;
  endAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function primarySlot(row: ListingRow): SlotItem | null {
  return row.slots?.find(s => s.isActive) ?? row.slots?.[0] ?? null;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3">
          <div style={{
            height: 14, borderRadius: 4,
            background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
            width: i === 1 ? 180 : i === 0 ? 20 : 80,
          }} />
        </td>
      ))}
    </tr>
  );
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  pending: { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
  scheduled: { bg: '#dbeafe', color: '#1e3a8a', dot: '#3b82f6' },
  approved: { bg: '#dcfce7', color: '#14532d', dot: '#22c55e' },
  rejected: { bg: '#fee2e2', color: '#7f1d1d', dot: '#ef4444' },
  active: { bg: '#dcfce7', color: '#14532d', dot: '#22c55e' },
  inactive: { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function formatPay(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function toLocalDatetimeInput(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  // getFullYear/Month/etc. return LOCAL time values, not UTC
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}


function nowPlusMinutes(mins: number) {
  return toLocalDatetimeInput(new Date(Date.now() + mins * 60_000).toISOString());
}

// ─── Site-window mini builder (used inside ApproveModal) ──────

function SiteWindowsBuilder({
  windows, onChange,
}: { windows: SiteWindowDraft[]; onChange: (w: SiteWindowDraft[]) => void }) {
  const usedSites = new Set(windows.map(w => w.site));
  const available = KNOWN_SITES.filter(s => !usedSites.has(s));
  const minDT = nowPlusMinutes(2);

  const add = () => {
    if (!available?.length) return;
    onChange([...windows, { site: available[0], startAt: '', endAt: '' }]);
  };
  const remove = (i: number) => onChange(windows.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<SiteWindowDraft>) =>
    onChange(windows.map((w, idx) => idx === i ? { ...w, ...patch } : w));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {windows?.length === 0 && (
        <p className="small text-muted mb-1">
          No windows — listing will publish immediately to all its current sites.
        </p>
      )}
      {windows.map((w, i) => (
        <div key={i} style={{
          border: '1.5px solid #bfdbfe', borderRadius: 10,
          padding: '.65rem .85rem', background: '#eff6ff',
        }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <select
              className="form-select form-select-sm"
              value={w.site}
              onChange={e => update(i, { site: e.target.value as SiteSlug })}
              style={{ flex: 1 }}
            >
              {w.site && <option value={w.site}>{SITE_LABELS[w.site] ?? w.site}</option>}
              {available.filter(s => s !== w.site).map(s => (
                <option key={s} value={s}>{SITE_LABELS[s]}</option>
              ))}
            </select>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(i)}
              style={{ padding: '2px 8px', borderRadius: 7 }}>×</button>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label" style={{ fontSize: '.72rem', color: '#64748b', marginBottom: 2 }}>Goes live at</label>
              <input type="datetime-local" className="form-control form-control-sm"
                min={minDT} value={toLocalDatetimeInput(w.startAt)}
                onChange={e => update(i, { startAt: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="form-label" style={{ fontSize: '.72rem', color: '#64748b', marginBottom: 2 }}>Expires at</label>
              <input type="datetime-local" className="form-control form-control-sm"
                min={w.startAt || minDT} value={toLocalDatetimeInput(w.endAt)}
                onChange={e => update(i, { endAt: e.target.value })} />
            </div>
          </div>
        </div>
      ))}
      {available?.length > 0 && (
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={add}
          style={{ alignSelf: 'flex-start', fontSize: '.78rem' }}>
          <i className="ti ti-plus me-1" />Add site window
        </button>
      )}
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────

interface ViewModalProps {
  listing: ListingRow;
  table: string;
  onClose: () => void;
  onSaved: () => void;
}

function ViewModal({ listing: initialListing, table, onClose, onSaved }: ViewModalProps) {
  const [currentListing, setCurrentListing] = useState(initialListing);
  const [showPendingUpdate, setShowPendingUpdate] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'slots' | 'schedule' | 'notes'>('details');

  useEffect(() => {
    setCurrentListing(initialListing);
    setShowPendingUpdate(false);
  }, [initialListing]);

  const sendNote = async () => {
    if (!noteText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/listings/${currentListing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, adminNotes: noteText }),
      });
      if (!res.ok) throw new Error('Failed to save note');
      setNoteText('');
      onSaved();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const toggleUpdatePreview = () => {
    if (!initialListing.updateRequestData) return;
    if (!showPendingUpdate) {
      setCurrentListing({ ...initialListing, ...initialListing.updateRequestData });
      setShowPendingUpdate(true);
    } else {
      setCurrentListing(initialListing);
      setShowPendingUpdate(false);
    }
  };

  const slot = primarySlot(currentListing);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.65)',
        backdropFilter: 'blur(4px)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.06)',
          width: '100%', maxWidth: 820, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.4rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '1rem', flexShrink: 0, background: '#fafbfc',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.35rem' }}>
              {currentListing.jobId && (
                <code style={{
                  fontSize: '.7rem', fontWeight: 700, background: '#f1f5f9',
                  color: '#475569', border: '1px solid #e2e8f0',
                  padding: '1px 7px', borderRadius: 5,
                }}>{currentListing.jobId}</code>
              )}
              {currentListing.siteWindows?.map(w => (
                <span key={w.site} style={{
                  fontSize: '.67rem', fontWeight: 700, background: '#eff6ff',
                  color: '#1d4ed8', border: '1px solid #bfdbfe',
                  padding: '1px 7px', borderRadius: 20,
                }}>{SITE_LABELS[w.site] ?? w.site}</span>
              ))}
              {currentListing.status && <StatusBadge status={currentListing.status} />}
              {initialListing.updateRequestData && (
                <button
                  onClick={toggleUpdatePreview}
                  style={{
                    background: showPendingUpdate ? '#22c55e' : '#f59e0b',
                    border: 'none', borderRadius: 20, padding: '2px 9px',
                    fontSize: '.7rem', fontWeight: 700, color: '#fff', cursor: 'pointer',
                  }}
                >
                  {showPendingUpdate ? '← Original' : '⟳ Preview Update'}
                </button>
              )}
            </div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              {currentListing.title}
            </h4>
            {slot && (
              <p style={{ margin: '.2rem 0 0', fontSize: '.78rem', color: '#64748b' }}>
                <i className="ti ti-map-pin me-1" />
                {slot.city}{slot.province ? `, ${slot.province}` : ''}
                {currentListing.slots?.length > 1 && (
                  <span style={{ color: '#2563eb', fontWeight: 600, marginLeft: '.3rem' }}>
                    +{currentListing.slots?.length - 1} more location{currentListing.slots?.length > 2 ? 's' : ''}
                  </span>
                )}
                &ensp;·&ensp;
                <code style={{ fontSize: '.68rem', color: '#94a3b8' }}>{currentListing.slug}</code>
                <span style={{ color: '#94a3b8', fontSize: '.68rem' }}> (Categories: {currentListing.categories?.join(', ') || '—'})</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0, background: '#fafbfc', overflowX: 'auto' }}>
          {([
            ['details', 'ti-layout-grid', 'Details'],
            ['slots', 'ti-map-pin', `Locations (${currentListing.slots?.length ?? 0})`],
            // ['schedule', 'ti-calendar', 'Schedule'],
            // ['notes', 'ti-notes', `Notes (${currentListing.adminNotes?.length || 0})`],
          ] as const).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '.6rem 1rem', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: '.8rem', fontWeight: activeTab === key ? 700 : 500,
                color: activeTab === key ? '#2563eb' : '#64748b',
                borderBottom: `2.5px solid ${activeTab === key ? '#2563eb' : 'transparent'}`,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <i className={`ti ${icon} me-1`} />{label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.4rem' }}>

          {activeTab === 'details' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: '.6rem', marginBottom: '1.25rem' }}>
                {[
                  ['Job Mode', currentListing.jobMode],
                  ['Company Name', currentListing.companyName],
                  ['Job Type', currentListing.jobType || '—'],
                  ['Apply Email', currentListing.applyEmail || '—'],
                  ['Job ID', currentListing.jobId || '—'],
                  ['Submitted By', currentListing.submittedBy],
                  ['Job Bank Id', currentListing.jobBankId || '-'],
                  ...(table === 'live'
                    ? [['Visible', currentListing.isActive ? 'Yes' : 'No']]
                    : [['Status', currentListing.status || '—']]),
                ].map(([label, value]) => (
                  <div key={label} style={{ background: '#f8fafd', borderRadius: 10, padding: '.55rem .8rem', border: '1px solid #e8edf4' }}>
                    <div style={{ fontSize: '.63rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.2rem' }}>{label}</div>
                    <div style={{ fontSize: '.86rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{value as string}</div>
                  </div>
                ))}
              </div>

              {currentListing.overview && (
                <div style={{ marginBottom: '1.1rem' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Overview</p>
                  <p style={{ fontSize: '.88rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, padding: '.85rem 1rem', background: '#f8fafd', borderRadius: 10, border: '1px solid #e8edf4' }} dangerouslySetInnerHTML={{ __html: currentListing.overview }} />
                </div>
              )}

              {currentListing.description && (
                <div style={{ marginBottom: '1.1rem' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Sort Description</p>
                  <p style={{ fontSize: '.88rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, padding: '.85rem 1rem', background: '#f8fafd', borderRadius: 10, border: '1px solid #e8edf4' }} >{currentListing.description}</p>
                </div>
              )}

              {currentListing.highlights?.length > 0 && (
                <div style={{ marginBottom: '1.1rem' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Highlights</p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                    {currentListing.highlights.map((h, i) => (
                      <li key={i} style={{ fontSize: '.88rem', color: '#334155' }}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {currentListing.benefits?.length > 0 && (
                <div style={{ marginBottom: '1.1rem' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Benefits</p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                    {currentListing.benefits.map((b, i) => (
                      <li key={i} style={{ fontSize: '.88rem', color: '#334155' }}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ fontSize: '.72rem', color: '#94a3b8', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <span>Created: {currentListing.createdAt ? new Date(currentListing.createdAt).toLocaleString() : '—'}</span>
                <span>Updated: {currentListing.updatedAt ? new Date(currentListing.updatedAt).toLocaleString() : '—'}</span>
              </div>
            </div>
          )}

          {activeTab === 'slots' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!currentListing.slots?.length && (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '.88rem' }}>No locations defined.</p>
              )}
              {currentListing.slots?.map((s, i) => (
                <div key={i} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.1rem', background: s.isActive ? '#f8fafd' : '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.65rem', flexWrap: 'wrap', gap: '.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '.9rem', color: '#0f172a' }}>
                      <i className="ti ti-map-pin me-1 text-primary" />Location {i + 1}
                    </span>
                    <span style={{
                      fontSize: '.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                      background: s.isActive ? '#dcfce7' : '#f1f5f9',
                      color: s.isActive ? '#14532d' : '#475569',
                    }}>{s.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: '.5rem', marginBottom: '.75rem' }}>
                    {[
                      ['Location', s.location],
                      ['City', s.city],
                      ['Province', s.province],
                      ['Pay', formatPay(s.jobPay)],
                      ['Vacancy', s.jobVacancy || '—'],
                      ['Starting', s.jobStartingTime || '—'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '.45rem .7rem', border: '1px solid #e8edf4' }}>
                        <div style={{ fontSize: '.62rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.15rem' }}>{label}</div>
                        <div style={{ fontSize: '.84rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {s.shifts?.length > 0 && (
                    <div>
                      <p style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Shifts</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                        {s.shifts.map((sh: ShiftItem, j) => (
                          <div key={j} style={{ fontSize: '.82rem', color: '#334155', padding: '.35rem .7rem', background: '#fff', borderRadius: 7, border: '1px solid #e8edf4', display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700 }}>{sh.label}</span>
                            {sh.startTime && sh.endTime && (
                              <span style={{ color: '#64748b' }}>{sh.startTime}–{sh.endTime}</span>
                            )}
                            {sh?.days && sh?.days?.length > 0 && (
                              <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
                                {sh.days.map(d => (
                                  <span key={d} style={{ fontSize: '.68rem', fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 4 }}>{d}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              {table === 'drafts' && currentListing.campaignWindow && (
                <div style={{ marginBottom: '1.25rem', padding: '.85rem 1rem', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #bbf7d0' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#14532d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>
                    Campaign window
                  </p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '.88rem', color: '#0f172a' }}>
                    {currentListing.campaignWindow.label}
                  </p>
                  <p style={{ margin: '.2rem 0 0', fontSize: '.82rem', color: '#334155' }}>
                    {new Date(currentListing.campaignWindow.startAt).toLocaleString()}
                    {' → '}
                    {new Date(currentListing.campaignWindow.endAt).toLocaleString()}
                  </p>
                </div>
              )}
              {currentListing.siteWindows?.length > 0 ? (
                <div>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.65rem' }}>
                    Per-site schedule
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {currentListing.siteWindows.map(w => (
                      <div key={w.site} style={{ padding: '.65rem .9rem', borderRadius: 10, border: '1.5px solid #bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '.84rem', color: '#0f172a' }}>
                          {SITE_LABELS[w.site] ?? w.site}
                        </span>
                        <div style={{ fontSize: '.8rem', color: '#334155' }}>
                          {new Date(w.startAt).toLocaleDateString()} → {new Date(w.endAt).toLocaleDateString()}
                          <span style={{ color: '#2563eb', fontWeight: 700, marginLeft: '.4rem' }}>({w.durationDays}d)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '.88rem' }}>No site windows defined.</p>
              )}
              {currentListing.visibleOnSites?.length > 0 && (
                <div style={{ marginTop: '1.1rem' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>
                    Visible on sites
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                    {currentListing.visibleOnSites.map(s => (
                      <span key={s} style={{ fontSize: '.75rem', fontWeight: 600, background: '#dbeafe', color: '#1e40af', padding: '2px 9px', borderRadius: 20 }}>
                        {SITE_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafd', borderRadius: 12, border: '1px solid #e8edf4' }}>
                <p style={{ fontSize: '.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '.5rem' }}>Add admin note</p>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Internal note visible to admins only…"
                  style={{ marginBottom: '.6rem', borderRadius: 8 }}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={sendNote}
                  disabled={sending || !noteText.trim()}
                >
                  {sending
                    ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                    : <><i className="ti ti-send me-1" />Save note</>
                  }
                </button>
              </div>

              {!currentListing.adminNotes?.length ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '.88rem' }}>No notes yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                  {[...currentListing.adminNotes].reverse().map((n, i) => {
                    const colors: Record<string, [string, string]> = {
                      status_change: ['#dbeafe', '#1e40af'],
                      update_request: ['#d1fae5', '#065f46'],
                      update_rejection: ['#fee2e2', '#991b1b'],
                      general: ['#f1f5f9', '#475569'],
                    };
                    const [bg, color] = colors[n.type] ?? ['#f1f5f9', '#475569'];
                    return (
                      <div key={i} style={{ padding: '.75rem 1rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', borderLeft: `3px solid ${color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: bg, color }}>
                            {n.type.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '.7rem', color: '#94a3b8' }}>
                            {n.createdBy || 'system'} · {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '.88rem', color: '#334155', lineHeight: 1.55 }}>{n.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '.8rem 1.4rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, background: '#fafbfc' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Approve Modal ────────────────────────────────────────────

function ApproveModal({
  listing, onClose, onSaved,
}: { listing: ListingRow; onClose: () => void; onSaved: () => void }) {
  const [campaignLabel, setCampaignLabel] = useState(
    listing.campaignWindow?.label || 'Hiring Campaign',
  );
  const [siteWindows, setSiteWindows] = useState<SiteWindowDraft[]>(
    listing.siteWindows?.map(w => ({
      site: w.site,
      startAt: toLocalDatetimeInput(w.startAt),
      endAt: toLocalDatetimeInput(w.endAt),
    })) ?? [],
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [useSchedule, setUseSchedule] = useState(siteWindows?.length > 0);

  const handleApprove = async () => {
    setSaving(true);
    try {
      const body: any = {
        table: 'drafts',
        action: 'approve',
        adminNotes: note,
      };

      if (useSchedule && siteWindows?.length > 0) {
        const incomplete = siteWindows.find(w => !w.startAt || !w.endAt);
        if (incomplete) throw new Error(`Please fill in start and end dates for "${SITE_LABELS[incomplete.site] ?? incomplete.site}"`);

        body.siteWindows = siteWindows.map(w => ({
          site: w.site,
          startAt: new Date(w.startAt).toISOString(),
          endAt: new Date(w.endAt).toISOString(),
        }));
        body.campaignWindow = { label: campaignLabel };
      }

      const res = await fetch(`/api/admin/listings/${listing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to approve'); }
      onSaved();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,.5)', zIndex: 10000 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
          <div className="modal-header py-2 bg-light border-bottom">
            <h5 className="modal-title small fw-bold">
              <i className="ti ti-check me-2 text-success" />Approve listing
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <p className="small text-muted mb-3">
              Approving: <strong>{listing.title}</strong>
              {listing.jobId && <code className="ms-2" style={{ fontSize: '.72rem' }}>{listing.jobId}</code>}
            </p>

            <div className="form-check mb-3">
              <input type="checkbox" className="form-check-input" id="useSchedule"
                checked={useSchedule} onChange={e => setUseSchedule(e.target.checked)} />
              <label className="form-check-label small fw-medium" htmlFor="useSchedule">
                Schedule with per-site publish windows
              </label>
            </div>

            {useSchedule && (
              <div className="mb-3">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Campaign label</label>
                  <input
                    type="text" className="form-control form-control-sm"
                    placeholder="e.g. Summer Hiring Drive 2025"
                    value={campaignLabel}
                    onChange={e => setCampaignLabel(e.target.value)}
                  />
                </div>
                <label className="form-label small fw-semibold">Site windows</label>
                <SiteWindowsBuilder windows={siteWindows} onChange={setSiteWindows} />
                {siteWindows?.length === 0 && (
                  <p className="small text-warning mt-2 mb-0">
                    <i className="ti ti-alert-triangle me-1" />
                    No windows added — listing will publish immediately.
                  </p>
                )}
              </div>
            )}

            <div className="mb-0">
              <label className="form-label small">Admin note (optional)</label>
              <textarea className="form-control form-control-sm" rows={2}
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Optional note visible in listing history…" />
            </div>
          </div>
          <div className="modal-footer py-2 bg-light border-top">
            <button className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-sm btn-success" onClick={handleApprove} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-1" />Processing…</>
                : useSchedule && siteWindows?.length > 0
                  ? 'Schedule & approve'
                  : 'Publish now'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminListingsPage() {
  const router = useRouter();

  const [table, setTable] = useState<'drafts' | 'live'>('live');

  // ── Filters ───────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [province, setProvince] = useState('');
  const [jobMode, setJobMode] = useState('');
  const [jobType, setJobType] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [updateOnly, setUpdateOnly] = useState(false);
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [updatedFrom, setUpdatedFrom] = useState('');
  const [updatedTo, setUpdatedTo] = useState('');

  // ── Pagination / sort ─────────────────────────────────────
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── Data ──────────────────────────────────────────────────
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Bulk select ───────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // ── Modals ────────────────────────────────────────────────
  const [viewTarget, setViewTarget] = useState<ListingRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<ListingRow | null>(null);

  // ── Import / export ───────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('table', table);
      params.set('page', String(page));
      params.set('perPage', String(perPage));
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortDir);
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (province) params.set('province', province);
      if (jobMode) params.set('jobMode', jobMode);
      if (jobType) params.set('jobType', jobType);
      if (siteFilter) params.set('site', siteFilter);
      if (updateOnly) params.set('updateRequested', 'true');
      if (createdFrom) params.set('createdFrom', createdFrom);
      if (createdTo) params.set('createdTo', createdTo);
      if (updatedFrom) params.set('updatedFrom', updatedFrom);
      if (updatedTo) params.set('updatedTo', updatedTo);

      const res = await fetch(`/api/admin/listings?${params}`);
      // if (!res.ok) throw new Error('Failed to fetch listings');
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error || `Request failed with status ${res.status}`);
      }

      const json: ApiResponse = await res.json();

      if (json && Array.isArray(json.data)) {
        setRows(json.data);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      } else {
        setRows([]);
        setError('Invalid data from server');
      }

      console.log(json);

      // setRows(json.data);
      // setTotal(json.total);
      // setTotalPages(json.totalPages);
      setSelectedIds([]);
      setSelectAll(false);
    } catch (e: any) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [table, page, perPage, sortBy, sortDir, search, status,
    province, jobMode, jobType, siteFilter, updateOnly,
    createdFrom, createdTo, updatedFrom, updatedTo]);

  useEffect(() => {
    const t = setTimeout(fetchListings, 350);
    return () => clearTimeout(t);
  }, [fetchListings]);

  // ── Sort ──────────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortBy !== col
      ? <i className="ti ti-arrows-sort text-muted ms-1" style={{ fontSize: '.75rem' }} />
      : sortDir === 'asc'
        ? <i className="ti ti-arrow-up ms-1" style={{ fontSize: '.75rem' }} />
        : <i className="ti ti-arrow-down ms-1" style={{ fontSize: '.75rem' }} />;

  // ── Select ────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectAll) { setSelectedIds([]); setSelectAll(false); }
    else { setSelectedIds(rows?.map(r => r.id)); setSelectAll(true); }
  };
  const toggleRow = (id: string) =>
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      setSelectAll(next?.length === rows?.length && rows?.length > 0);
      return next;
    });

  // ── Bulk action ───────────────────────────────────────────
  const handleBulkAction = async (action: string) => {
    if (!selectedIds?.length) return alert('No items selected');
    if (action === 'delete' && !confirm(`Delete ${selectedIds?.length} item(s)?`)) return;
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds, table }),
      });
      if (!res.ok) throw new Error('Bulk action failed');
      await fetchListings();
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
        },
        body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/[slug]`] }),
      });
    } catch (e: any) { alert(e.message); }
  };

  // ── Single actions ────────────────────────────────────────
  const handleReject = async (row: ListingRow) => {
    const reason = prompt('Rejection reason (optional):') ?? '';
    try {
      const res = await fetch(`/api/admin/listings/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'drafts', action: 'reject', rejectionNotes: reason }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      await fetchListings();
    } catch (e: any) { alert(e.message); }
  };

  const handleApproveUpdate = async (row: ListingRow) => {
    if (!confirm('Apply the requested updates to this listing?')) return;
    try {
      const res = await fetch(`/api/admin/listings/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, action: 'approve-update' }),
      });
      if (!res.ok) throw new Error('Failed to approve update');
      await fetchListings();
    } catch (e: any) { alert(e.message); }
  };

  const handleRejectUpdate = async (row: ListingRow) => {
    const reason = prompt('Rejection reason for update request:') ?? '';
    try {
      const res = await fetch(`/api/admin/listings/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, action: 'reject-update', rejectionNotes: reason }),
      });
      if (!res.ok) throw new Error('Failed to reject update');
      await fetchListings();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (row: ListingRow) => {
    if (!confirm('Delete this listing permanently?')) return;
    try {
      const res = await fetch(`/api/admin/listings/${row.id}?table=${table}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchListings();
    } catch (e: any) { alert(e.message); }
  };

  const handleToggleActive = async (row: ListingRow) => {
    try {
      const res = await fetch(`/api/admin/listings/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'live', action: 'toggle-active', isActive: !row.isActive }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      await fetchListings();
    } catch (e: any) { alert(e.message); }
  };

  const clearFilters = () => {
    setSearch(''); setStatus(''); setProvince('');
    setJobMode(''); setJobType(''); setSiteFilter('');
    setUpdateOnly(false);
    setCreatedFrom(''); setCreatedTo('');
    setUpdatedFrom(''); setUpdatedTo('');
    setSortBy('createdAt'); setSortDir('desc'); setPage(1);
  };

  const activeFilterCount = [search, status, province, jobMode, jobType, siteFilter, createdFrom, createdTo, updatedFrom, updatedTo]
    .filter(Boolean)?.length + (updateOnly ? 1 : 0);

  // ── Export ────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('table', table); params.set('page', '1'); params.set('perPage', '10000');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (jobMode) params.set('jobMode', jobMode);
      if (jobType) params.set('jobType', jobType);

      const res = await fetch(`/api/admin/listings?${params}`);
      const json: ApiResponse = await res.json();

      if (!json.data || !Array.isArray(json.data)) {
        alert('Export failed: invalid data');
        return;
      }


      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Listings');
      ws.columns = [
        { header: 'ID', key: 'id', width: 28 },
        { header: 'Job ID', key: 'jobId', width: 20 },
        { header: 'Job Bank Id', key: 'jobBankId', width: 20 },
        { header: 'Title', key: 'title', width: 45 },
        { header: 'Company Name', key: 'companyName', width: 45 },
        { header: 'Overview', key: 'overview', width: 50 },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Apply Email', key: 'applyEmail', width: 50 },
        { header: 'Highlights', key: 'highlights', width: 55 },
        { header: 'Benefits', key: 'benefits', width: 55 },
        { header: 'Job Mode', key: 'jobMode', width: 20 },
        { header: 'Job Type', key: 'jobType', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Location', key: 'location', width: 35 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'Province', key: 'province', width: 20 },
        { header: 'Pay', key: 'jobPay', width: 15 },
        { header: 'Vacancy', key: 'jobVacancy', width: 18 },
        { header: 'Starting Time', key: 'jobStartingTime', width: 22 },
        { header: 'All Slots (JSON)', key: 'slotsJson', width: 60 },
        { header: 'Sites', key: 'sites', width: 40 },
        { header: 'Site Windows (JSON)', key: 'siteWindowsJson', width: 80 },
        { header: 'Submitted By', key: 'submittedBy', width: 25 },
        { header: 'Slug', key: 'slug', width: 50 },
        { header: 'Created At', key: 'createdAt', width: 25 },
        { header: 'Updated At', key: 'updatedAt', width: 25 },
      ];

      json.data.forEach(row => {
        const slot = primarySlot(row);
        ws.addRow({
          id: row.id,
          jobId: row.jobId ?? '',
          title: row.title,
          companyName: row.companyName,
          overview: row.overview ?? '',
          description: row.description ?? '',
          applyEmail: row.applyEmail ?? '',
          highlights: (row.highlights ?? []).join(' | '),
          benefits: (row.benefits ?? []).join(' | '),
          jobMode: row.jobMode ?? '',
          jobType: row.jobType ?? '',
          status: row.status ?? (row.isActive ? 'active' : 'inactive'),
          location: slot?.location ?? '',
          city: slot?.city ?? '',
          province: slot?.province ?? '',
          jobPay: slot?.jobPay ?? '',
          jobVacancy: slot?.jobVacancy ?? '',
          jobStartingTime: slot?.jobStartingTime ?? '',
          slotsJson: JSON.stringify(row.slots ?? []),
          sites: (row.visibleOnSites ?? []).join(' | '),
          siteWindowsJson: JSON.stringify(row.siteWindows ?? []),
          submittedBy: row.submittedBy,
          slug: row.slug,
          createdAt: row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '',
        });
      });

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF4' } };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `listings_${table}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ── Import ────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.getWorksheet(1);
      if (!ws) throw new Error('No worksheet found');

      const headers: string[] = [];
      ws.getRow(1).eachCell((cell, col) => {
        headers[col] = String(cell.value ?? '').toLowerCase().trim();
      });

      const fieldMap: Record<string, string> = {
        'id': 'id', 'job id': 'jobId', 'title': 'title', 'company name': 'companyName',
        'overview': 'overview', 'description': 'description', 'apply email': 'applyEmail', 'highlights': 'highlights', 'benefits': 'benefits',
        'job mode': 'jobMode', 'job type': 'jobType', 'status': 'status',
        'slug': 'slug', 'submitted by': 'submittedBy',
        'location': 'location', 'city': 'city', 'province': 'province',
        'pay': 'jobPay', 'job pay': 'jobPay',
        'vacancy': 'jobVacancy', 'job vacancy': 'jobVacancy',
        'starting time': 'jobStartingTime',
        'all slots (json)': 'slotsJson',
        'site windows (json)': 'siteWindowsJson',
        'sites': 'sites',
      };

      const items: any[] = [];
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const item: any = {};
        row.eachCell((cell, col) => {
          const field = fieldMap[headers[col]];
          if (field) item[field] = String(cell.value ?? '').trim();
        });
        if (!item.title) return;

        if (item.slotsJson) {
          try { item.slots = JSON.parse(item.slotsJson); } catch { /**/ }
          delete item.slotsJson;
        } else if (item.location) {
          item.slots = [{
            location: item.location, city: item.city ?? '',
            province: item.province ?? '', jobPay: parseFloat(item.jobPay) || 0,
            jobVacancy: item.jobVacancy || undefined,
            jobStartingTime: item.jobStartingTime || undefined,
            isActive: true, shifts: [],
          }];
        }

        if (item.siteWindowsJson) {
          try { item.siteWindows = JSON.parse(item.siteWindowsJson); } catch { /**/ }
          delete item.siteWindowsJson;
        } else if (item.sites) {
          item.visibleOnSites = item.sites.split('|').map((s: string) => s.trim()).filter(Boolean);
          delete item.sites;
        }

        if (typeof item.highlights === 'string')
          item.highlights = item.highlights.split('|').map((s: string) => s.trim()).filter(Boolean);
        if (typeof item.benefits === 'string')
          item.benefits = item.benefits.split('|').map((s: string) => s.trim()).filter(Boolean);

        items.push(item);
      });

      if (!items?.length) { alert('No valid rows found.'); return; }

      const res = await fetch('/api/admin/listings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, table }),
      });
      const result = await res.json();
      alert(`Import done: ${result.inserted} inserted, ${result.updated} updated, ${result.errors} errors`);
      await fetchListings();
    } catch (e: any) {
      alert(`Import error: ${e.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const draftStatusOptions = ['pending', 'scheduled', 'approved', 'rejected'];
  const liveStatusOptions = ['active', 'inactive'];
  const COL_COUNT = 10; // +1 for the new edit action

  return (
    <div className="container-fluid py-4">
      <style jsx>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0  }
          100% { background-position: -200% 0 }
        }
        thead th {
          background: #f2f6fb !important; color: #334155;
          font-weight: 700; font-size: .75rem;
          text-transform: uppercase; letter-spacing: .04em;
          border-bottom: 2px solid #2563eb !important;
          padding: .75rem .85rem; user-select: none; white-space: nowrap;
        }
        thead th:hover { background: #e8edf4 !important; }
        .action-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid #e2e8f0;
          background: #fff; cursor: pointer; font-size: .82rem; color: #64748b;
          transition: all .15s;
        }
        .action-btn:hover          { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
        .action-btn.danger:hover   { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
        .action-btn.success:hover  { border-color: #22c55e; color: #22c55e; background: #f0fdf4; }
        .action-btn.warning:hover  { border-color: #f59e0b; color: #f59e0b; background: #fffbeb; }
        .filter-pill {
          display: flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 10px; border-radius: 8px;
          border: 1px solid #e2e8f0; background: #fff; font-size: .8rem;
          transition: border-color .15s;
        }
        .filter-pill:focus-within { border-color: #2563eb; }
        .filter-pill input, .filter-pill select {
          border: none; background: transparent; outline: none;
          font-size: .8rem; color: #0f172a; min-width: 0;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '1.2rem 1.5rem',
        border: '1px solid #e8edf4', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        marginBottom: '1.25rem',
      }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="mb-0 fw-bold" style={{ fontSize: '1.05rem', color: '#0f172a' }}>
              <i className="ti ti-layout-list me-2 text-primary" />Listings Management
            </h4>
            <p className="text-muted small mb-0 mt-1">Review, approve and manage job listings</p>
          </div>

          {/* Table switch */}
          <div className="btn-group" style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            <button
              className={`btn btn-sm ${table === 'drafts' ? 'btn-primary' : 'btn-outline-primary'}`}
              style={{ borderRadius: 0, border: 'none', fontWeight: 600 }}
              onClick={() => { setTable('drafts'); setPage(1); setStatus(''); }}
            >
              <i className="ti ti-files me-1" />Drafts
            </button>
            <button
              className={`btn btn-sm ${table === 'live' ? 'btn-primary' : 'btn-outline-primary'}`}
              style={{ borderRadius: 0, border: 'none', fontWeight: 600 }}
              onClick={() => { setTable('live'); setPage(1); setStatus(''); }}
            >
              <i className="ti ti-world me-1" />Live
            </button>
          </div>

          {/* <Link href="/admin/job-bank">
            <button className="btn btn-sm btn-primary rounded-0" style={{ fontWeight: 600 }}>
              <i className="ti ti-building-bank me-1" />Job Bank
            </button>
          </Link> */}

          {/* ── NEW: Add Listing ── */}
          {/* <button
            className="btn btn-sm btn-primary"
            style={{ fontWeight: 600 }}
            onClick={() => router.push('/admin/listings/edit/new')}
          >
            <i className="ti ti-plus me-1" />Add Listing
          </button> */}

          {/* <label className="d-flex align-items-center gap-2 small fw-medium" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" className="form-check-input m-0"
              checked={updateOnly} onChange={e => { setUpdateOnly(e.target.checked); setPage(1); }} />
            Update requests only
          </label> */}

          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="d-none" onChange={handleImport} />
          {/* <button className="btn btn-sm btn-outline-secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <><span className="spinner-border spinner-border-sm me-1" />Importing…</> : <><i className="ti ti-file-import me-1" />Import</>}
          </button> */}

          <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
            {exporting ? <><span className="spinner-border spinner-border-sm me-1" />Exporting…</> : <><i className="ti ti-file-spreadsheet me-1" />Export</>}
          </button>

          {selectedIds?.length > 0 && (
            <div className="dropdown">
              <button className="btn btn-sm btn-primary dropdown-toggle" data-bs-toggle="dropdown">
                Bulk ({selectedIds?.length})
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                {table === 'drafts' ? (
                  <>
                    <li><button className="dropdown-item small" onClick={() => handleBulkAction('approve')}><i className="ti ti-check me-2 text-success" />Approve all</button></li>
                    <li><button className="dropdown-item small" onClick={() => handleBulkAction('reject')}><i className="ti ti-ban me-2 text-danger" />Reject all</button></li>
                    <li><button className="dropdown-item small" onClick={() => handleBulkAction('pending')}><i className="ti ti-clock me-2 text-warning" />Set pending</button></li>
                  </>
                ) : (
                  <>
                    <li><button className="dropdown-item small" onClick={() => handleBulkAction('activate')}><i className="ti ti-eye me-2 text-success" />Activate all</button></li>
                    <li><button className="dropdown-item small" onClick={() => handleBulkAction('deactivate')}><i className="ti ti-eye-off me-2 text-secondary" />Deactivate all</button></li>
                  </>
                )}
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item small text-danger" onClick={() => handleBulkAction('delete')}><i className="ti ti-trash me-2" />Delete selected</button></li>
              </ul>
            </div>
          )}
        </div>

        {/* ── Filters ── */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            className="d-flex d-md-none w-100 btn btn-sm btn-outline-secondary align-items-center justify-content-between mb-2"
            onClick={() => setMobileOpen(o => !o)}
          >
            <span className="d-flex align-items-center gap-2">
              <i className="ti ti-adjustments-horizontal" />
              Filters {activeFilterCount > 0 && <span className="badge bg-primary rounded-pill">{activeFilterCount}</span>}
            </span>
            <i className={`ti ti-chevron-${mobileOpen ? 'up' : 'down'}`} />
          </button>

          {/* Desktop filters */}
          <div className="d-none d-md-flex flex-wrap gap-2 align-items-center">
            <div className="filter-pill">
              <i className="ti ti-search text-muted" style={{ fontSize: '.8rem' }} />
              <input placeholder="Search title, job ID…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 160 }} />
            </div>
            <div className="filter-pill">
              <i className="ti ti-circle-dot text-muted" style={{ fontSize: '.8rem' }} />
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ width: 110 }}>
                <option value="">All statuses</option>
                {(table === 'drafts' ? draftStatusOptions : liveStatusOptions).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="filter-pill">
              <i className="ti ti-map-pin text-muted" style={{ fontSize: '.8rem' }} />
              <input placeholder="Province…" value={province}
                onChange={e => { setProvince(e.target.value); setPage(1); }} style={{ width: 100 }} />
            </div>
            {/* <div className="filter-pill">
              <i className="ti ti-briefcase text-muted" style={{ fontSize: '.8rem' }} />
              <input placeholder="Job mode…" value={jobMode}
                onChange={e => { setJobMode(e.target.value); setPage(1); }} style={{ width: 100 }} />
            </div> */}
            <div className="filter-pill">
              <i className="ti ti-briefcase text-muted" style={{ fontSize: '.8rem' }} />
              <select
                value={jobMode}
                onChange={e => { setJobMode(e.target.value); setPage(1); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  outline: 'none',
                  width: 120,
                  cursor: 'pointer',
                }}
              >
                <option value="">All modes</option>
                <option value="Freelance">Freelance</option>
                <option value="Contract">Contract</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div className="filter-pill">
              <i className="ti ti-world text-muted" style={{ fontSize: '.8rem' }} />
              <select value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1); }} style={{ width: 140 }}>
                <option value="">All sites</option>
                {KNOWN_SITES.map(s => <option key={s} value={s}>{SITE_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="filter-pill">
              <i className="ti ti-calendar text-muted" style={{ fontSize: '.8rem' }} />
              <input type="date" value={createdFrom} onChange={e => { setCreatedFrom(e.target.value); setPage(1); }} style={{ width: 118 }} />
              <span className="text-muted">–</span>
              <input type="date" value={createdTo} onChange={e => { setCreatedTo(e.target.value); setPage(1); }} style={{ width: 118 }} />
            </div>
            {activeFilterCount > 0 && (
              <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                style={{ height: 32, fontSize: '.78rem', borderRadius: 8 }} onClick={clearFilters}>
                <i className="ti ti-x" />Clear
              </button>
            )}
          </div>

          {/* Mobile filters */}
          <div className="d-md-none" style={{ maxHeight: mobileOpen ? 640 : 0, overflow: 'hidden', transition: 'max-height .28s ease' }}>
            <div className="d-flex flex-column gap-2 pt-2">
              {[
                { icon: 'ti-search', placeholder: 'Search…', value: search, onChange: setSearch },
                { icon: 'ti-map-pin', placeholder: 'Province…', value: province, onChange: setProvince },
                { icon: 'ti-briefcase', placeholder: 'Job mode…', value: jobMode, onChange: setJobMode },
              ].map(({ icon, placeholder, value, onChange }) => (
                <div key={placeholder} className="filter-pill" style={{ height: 38, flex: 1 }}>
                  <i className={`ti ${icon} text-muted`} style={{ fontSize: '.85rem' }} />
                  <input placeholder={placeholder} value={value} onChange={e => { onChange(e.target.value); setPage(1); }} style={{ flex: 1 }} />
                </div>
              ))}
              <div className="filter-pill" style={{ height: 38 }}>
                <i className="ti ti-circle-dot text-muted" style={{ fontSize: '.85rem' }} />
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ flex: 1 }}>
                  <option value="">All statuses</option>
                  {(table === 'drafts' ? draftStatusOptions : liveStatusOptions).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="filter-pill" style={{ height: 38 }}>
                <i className="ti ti-world text-muted" style={{ fontSize: '.85rem' }} />
                <select value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1); }} style={{ flex: 1 }}>
                  <option value="">All sites</option>
                  {KNOWN_SITES.map(s => <option key={s} value={s}>{SITE_LABELS[s]}</option>)}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button className="btn btn-sm btn-outline-secondary w-100" onClick={clearFilters}>
                  <i className="ti ti-x me-1" />Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-3 mb-3">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={fetchListings}>Retry</button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8edf4', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" className="form-check-input" checked={selectAll} onChange={toggleSelectAll} />
                </th>
                <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>Title <SortIcon col="title" /></th>
                <th>Company</th>
                <th>Locations</th>
                {/* <th onClick={() => handleSort('jobMode')} style={{ cursor: 'pointer' }}>Mode <SortIcon col="jobMode" /></th> */}
                <th>Pay</th>
                <th>Sites</th>
                <th>Live Period</th>
                {/* <th>Status</th> */}
                {table === 'drafts' && <th>Schedule</th>}
                {table === 'live' && <th>Visible</th>}
                {/* <th>Update</th> */}
                <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>Created <SortIcon col="createdAt" /></th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} cols={COL_COUNT} />)
                : rows?.length === 0
                  ? (
                    <tr>
                      <td colSpan={COL_COUNT} className="text-center py-5">
                        <div style={{ color: '#94a3b8' }}>
                          <i className="ti ti-file-unknown" style={{ fontSize: '2rem', display: 'block', marginBottom: '.5rem' }} />
                          <span style={{ fontSize: '.88rem' }}>No listings found</span>
                        </div>
                      </td>
                    </tr>
                  )
                  : rows.map(row => {
                    const slot = primarySlot(row);
                    const nextPublish = row.siteWindows?.length
                      ? new Date(Math.min(...row.siteWindows.map(w => new Date(w.startAt).getTime())))
                      : null;

                    return (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: row.updateRequested ? '#fffbeb' : undefined,
                        }}
                      >
                        {/* Checkbox */}
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleRow(row.id)}
                          />
                        </td>

                        {/* Title + jobId + slug */}
                        <td style={{ maxWidth: 220 }}>
                          <button
                            className="btn btn-link btn-sm p-0 text-start fw-semibold text-dark"
                            style={{ fontSize: '.85rem', maxWidth: '100%', textDecoration: 'none' }}
                            onClick={() => setViewTarget(row)}
                          >
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                              {row.title}
                            </div>
                          </button>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.18rem', marginTop: '.2rem' }}>
                            {/* Show one derived ID per site window, or fall back to the raw jobId */}
                            {row.siteWindows?.length > 0
                              ? row.siteWindows.map(w => (
                                <div key={w.site} style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                                  <span style={{
                                    fontSize: '.58rem', fontWeight: 700, textTransform: 'uppercase',
                                    color: '#94a3b8', letterSpacing: '.04em', minWidth: 28,
                                  }}>
                                    {SITE_ID_PREFIXES[w.site] ?? '—'}
                                  </span>
                                  <code style={{
                                    fontSize: '.63rem', fontWeight: 700,
                                    background: '#f1f5f9', color: '#475569',
                                    border: '1px solid #e2e8f0',
                                    padding: '1px 5px', borderRadius: 4,
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {deriveJobId(row.jobId, w.site)}
                                  </code>
                                </div>
                              ))
                              : row.jobId && (
                                <code style={{
                                  fontSize: '.63rem', fontWeight: 700,
                                  background: '#f1f5f9', color: '#475569',
                                  border: '1px solid #e2e8f0',
                                  padding: '1px 5px', borderRadius: 4,
                                }}>
                                  {row.jobId}
                                </code>
                              )
                            }
                            {/* Slug stays below */}
                            <code style={{
                              fontSize: '.62rem', color: '#94a3b8',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', maxWidth: 200, display: 'block',
                            }}>
                              {row.slug}
                            </code>
                          </div>
                        </td>

                        {/* ── NEW: Company ── */}
                        <td style={{ fontSize: '.82rem', color: '#334155', whiteSpace: 'nowrap' }}>
                          {row.companyName
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: '.28rem' }}>
                              <i className="ti ti-building" style={{ fontSize: '.82rem', color: '#94a3b8' }} />
                              {row.companyName}
                            </span>
                            : <span style={{ color: '#cbd5e1' }}>—</span>
                          }
                        </td>

                        {/* Location(s) */}
                        <td style={{ fontSize: '.82rem', color: '#334155', maxWidth: 160 }}>
                          {slot ? (
                            <>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {slot.city}{slot.province ? `, ${slot.province}` : ''}
                              </div>
                              {row.slots?.length > 1 && (
                                <span style={{ fontSize: '.72rem', color: '#2563eb', fontWeight: 600 }}>
                                  +{row.slots?.length - 1} more
                                </span>
                              )}
                            </>
                          ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>

                        {/* Mode */}
                        {/* <td style={{ fontSize: '.82rem', color: '#475569', whiteSpace: 'nowrap' }}>
                          {row.jobMode || '—'}
                        </td> */}

                        {/* Pay */}
                        <td style={{ fontSize: '.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {slot ? formatPay(slot.jobPay) : '—'}
                        </td>

                        {/* Sites */}
                        <td style={{ maxWidth: 150 }}>
                          {row.siteWindows?.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
                              {row.siteWindows.slice(0, 2).map(w => (
                                <span key={w.site} style={{ fontSize: '.67rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                  {SITE_LABELS[w.site]?.split(' ')[0] ?? w.site}
                                </span>
                              ))}
                              {row.siteWindows?.length > 2 && (
                                <span style={{ fontSize: '.67rem', color: '#64748b' }}>+{row.siteWindows?.length - 2}</span>
                              )}
                            </div>
                          ) : row.visibleOnSites?.length > 0 ? (
                            <span style={{ fontSize: '.72rem', color: '#94a3b8' }}>{row.visibleOnSites?.length} site(s)</span>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '.82rem' }}>—</span>
                          )}
                        </td>

                        {/* ── NEW: Live Period ── */}
                        <td style={{ fontSize: '.78rem', color: '#334155', whiteSpace: 'nowrap' }}>
                          {row.siteWindows?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                              {row.siteWindows.map(w => {
                                const start = new Date(w.startAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
                                const end = new Date(w.endAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
                                const now = Date.now();
                                const isLive = now >= new Date(w.startAt).getTime() && now <= new Date(w.endAt).getTime();
                                const isUpcoming = now < new Date(w.startAt).getTime();
                                return (
                                  <div key={w.site} style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                                    <span style={{
                                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                      background: isLive ? '#22c55e' : isUpcoming ? '#3b82f6' : '#94a3b8',
                                    }} />
                                    <span style={{ color: '#64748b', fontSize: '.7rem' }}>
                                      {start} → {end}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>

                        {/* Status */}
                        {/* <td>
                          <StatusBadge status={
                            table === 'live'
                              ? (row.isActive ? 'active' : 'inactive')
                              : (row.status || '—')
                          } />
                        </td> */}

                        {/* Draft: schedule */}
                        {table === 'drafts' && (
                          <td style={{ fontSize: '.78rem', whiteSpace: 'nowrap', color: '#64748b' }}>
                            {nextPublish
                              ? <><i className="ti ti-clock text-primary me-1" />{nextPublish.toLocaleDateString()}</>
                              : <span style={{ color: '#cbd5e1' }}>—</span>
                            }
                          </td>
                        )}

                        {/* Live: toggle */}
                        {table === 'live' && (
                          <td>
                            <div className="form-check form-switch m-0">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={!!row.isActive}
                                onChange={() => handleToggleActive(row)}
                                style={{ cursor: 'pointer' }}
                              />
                            </div>
                          </td>
                        )}

                        {/* Update requested */}
                        {/* <td>
                          {row.updateRequested
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.72rem', fontWeight: 700, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 20 }}>
                              <i className="ti ti-refresh" style={{ fontSize: '.75rem' }} />Pending
                            </span>
                            : <span style={{ color: '#cbd5e1', fontSize: '.82rem' }}>—</span>
                          }
                        </td> */}

                        {/* Created */}
                        <td style={{ fontSize: '.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                        </td>

                        {/* Actions */}
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end flex-wrap">

                            {row.updateRequested && (
                              <>
                                <button className="action-btn success" title="Approve update" onClick={() => handleApproveUpdate(row)}>
                                  <i className="ti ti-check" />
                                </button>
                                <button className="action-btn danger" title="Reject update" onClick={() => handleRejectUpdate(row)}>
                                  <i className="ti ti-x" />
                                </button>
                              </>
                            )}

                            <button className="action-btn" title="View details" onClick={() => setViewTarget(row)}>
                              <i className="ti ti-eye" />
                            </button>

                            <button
                              className="action-btn"
                              title="Download report"
                              onClick={() => {
                                const handleDownload = async () => {
                                  try {
                                    const res = await fetch(
                                      `/api/admin/listings/${row.id}/report?table=${table}`
                                    );
                                    if (!res.ok) {
                                      const err = await res.json().catch(() => null);
                                      throw new Error(err?.error || 'Failed to generate report');
                                    }
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `listing-report-${row.id}-${Date.now()}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch (error: any) {
                                    alert(error.message);
                                  }
                                };
                                handleDownload();
                              }}
                            >
                              <i className="ti ti-download" />
                            </button>

                            <button
                              className="action-btn warning"
                              title="Edit listing"
                              onClick={() => router.push(`/admin/listings/edit/${row.id}?table=${table}`)}
                            >
                              <i className="ti ti-pencil" />
                            </button>

                            {/*{table === 'drafts' && row.status !== 'approved' && (
                              <button className="action-btn success" title="Approve & publish" onClick={() => setApproveTarget(row)}>
                                <i className="ti ti-circle-check" />
                              </button>
                            )}*/}

                            {table === 'drafts' && row.status !== 'rejected' && (
                              <button className="action-btn danger" title="Reject" onClick={() => handleReject(row)}>
                                <i className="ti ti-ban" />
                              </button>
                            )}

                            <button className="action-btn danger" title="Delete permanently" onClick={() => handleDelete(row)}>
                              <i className="ti ti-trash" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '.75rem 1.25rem', borderTop: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#fafbfc',
          }}>
            <div className="small text-muted">Showing {rows?.length} of {total} entries</div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
                </li>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1
                    : page <= 3 ? i + 1
                      : page >= totalPages - 2 ? totalPages - 4 + i
                        : page - 2 + i;
                  return (
                    <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                    </li>
                  );
                })}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewTarget && (
        <ViewModal
          listing={viewTarget}
          table={table}
          onClose={() => setViewTarget(null)}
          onSaved={() => { setViewTarget(null); fetchListings(); }}
        />
      )}
      {approveTarget && (
        <ApproveModal
          listing={approveTarget}
          onClose={() => setApproveTarget(null)}
          onSaved={() => { setApproveTarget(null); fetchListings(); }}
        />
      )}
    </div>
  );
}
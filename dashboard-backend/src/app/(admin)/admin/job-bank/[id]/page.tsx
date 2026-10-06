'use client';

/**
 * src/app/admin/job-bank-requests/[id]/page.tsx
 *
 * Admin edit page for a single Job Bank request.
 *
 * Two panels:
 *   LEFT  — request metadata (user info, status, admin note, timeline)
 *   RIGHT — listing creation form; submits multipart FormData to
 *           POST /api/admin/job-bank-requests/[id]/listing
 *
 * FormData contract (mirrors route.ts exactly):
 *   title, overview, description, applyEmail, jobBankId, jobMode,
 *   jobType?, status, highlights (JSON), benefits (JSON),
 *   categories (JSON), slots (JSON), siteWindows (JSON)
 */

import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Editor } from '@tinymce/tinymce-react';
import { SiteSlug } from '@/hooks/useListings';


// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type RequestStatus = 'pending' | 'processing' | 'fulfilled' | 'rejected' | 'duplicate';

/** Valid values come from the route's VALID_STATUSES tuple */
type ListingStatus = 'pending' | 'scheduled' | 'approved' | 'rejected';

interface JobBankRequestDetail {
    id: string;
    userId: string;
    jobBankId: string;
    userNotes?: string;
    status: RequestStatus;
    sites: string[];
    listingId?: string | null;
    listingCollection?: 'Listing' | 'ListingDraft' | null;
    adminNote?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    userName?: string | null;
    userEmail?: string | null;
    userAvatar?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const KNOWN_SITES = [
    'jobs-connect.vercel.app',
    'new-jobs-fawn.vercel.app',
    'jobsrefugee.ca',
    'vulnerableyouthsjobs.ca',
    'accesscareers.ca',
    'indigenouspeoplesjobs.ca',
];

const SITE_LABELS: Record<string, string> = {
    'jobs-connect.vercel.app': 'Jobs Connect',
    'new-jobs-fawn.vercel.app': 'New in Canada',
    'jobsrefugee.ca': 'Jobs for Refugees',
    'vulnerableyouthsjobs.ca': 'Vulnerable Youths',
    'accesscareers.ca': 'Access Careers',
    'indigenouspeoplesjobs.ca': 'Indigenous Peoples',
};

const JOB_MODE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Remote'];
const JOB_TYPE_OPTIONS = ['On-site', 'Remote', 'Hybrid'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Must match VALID_STATUSES in route.ts */
// const LISTING_STATUS_OPTIONS: { value: ListingStatus; label: string; hint: string }[] = [
//     { value: 'pending', label: 'Pending', hint: 'Awaiting review (default)' },
//     { value: 'scheduled', label: 'Scheduled', hint: 'Will go live per site windows' },
//     { value: 'approved', label: 'Approved', hint: 'Live immediately — bypasses review' },
//     { value: 'rejected', label: 'Rejected', hint: 'Rejected before publishing' },
// ];

const STATUS_CONFIG: Record<RequestStatus, { label: string; bg: string; color: string; border: string; icon: string }> = {
    pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e', border: '#fcd34d', icon: '⏳' },
    processing: { label: 'Processing', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', icon: '⚙️' },
    fulfilled: { label: 'Fulfilled', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '✅' },
    rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: '❌' },
    duplicate: { label: 'Duplicate', bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe', icon: '⚠️' },
};

// ─────────────────────────────────────────────────────────────
// Form state — matches FormData keys sent to route.ts
// ─────────────────────────────────────────────────────────────
interface ShiftDraft {
    label: string;
    startTime: string;
    endTime: string;
    days: string[];
}

interface SlotDraft {
    location: string;
    province: string;
    city: string;
    jobPay: string;
    jobVacancy: string;
    jobStartingTime: string;
    isActive: boolean;
    shifts: ShiftDraft[];
}

interface SiteWindowDraft {
    site: string;
    startAt: string; // datetime-local string → converted to ISO on submit
    endAt: string;
}

interface FormState {
    // ── Core fields (all required by route unless noted) ──────
    title: string;
    companyName: string;
    overview: string;       // rich HTML via TinyMCE
    description: string;    // short plain-text meta description
    applyEmail: string;
    jobBankId: string;
    jobMode: string;
    jobType: string;        // optional in route
    // ── Listing status (sent as `status` key) ────────────────
    listingStatus: ListingStatus;
    // ── Array fields (sent as JSON strings) ──────────────────
    highlights: string[];
    benefits: string[];
    categories: string[];
    // ── Complex JSON fields ───────────────────────────────────
    slots: SlotDraft[];
    siteWindows: SiteWindowDraft[];
}

const EMPTY_SHIFT: ShiftDraft = { label: '', startTime: '', endTime: '', days: [] };

const EMPTY_SLOT: SlotDraft = {
    location: '', province: '', city: '', jobPay: '', jobVacancy: '',
    jobStartingTime: '', isActive: true, shifts: [],
};

const makeEmptyForm = (jobBankId = ''): FormState => ({
    title: '',
    companyName: "",
    overview: '',
    description: '',
    applyEmail: '',
    jobBankId,
    jobMode: '',
    jobType: '',
    listingStatus: 'approved',
    highlights: [],
    benefits: [],
    categories: [],
    slots: [{ ...EMPTY_SLOT }],
    siteWindows: [],
});

// ─────────────────────────────────────────────────────────────
// Small reusable UI components
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: RequestStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '.3rem',
            padding: '.22rem .7rem', borderRadius: 20, fontSize: '.72rem',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
            background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`,
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '.55rem .75rem', background: '#f8fafd', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b' }}>{label}</span>
            <span style={{ fontSize: '.85rem', fontWeight: 600, color: '#0f172a' }}>{value}</span>
        </div>
    );
}

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem', paddingBottom: '.75rem', borderBottom: '1.5px solid #f1f5f9' }}>
                <i className={`ti ${icon}`} style={{ color: '#0f4c81', fontSize: '1rem' }} />
                <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
            </div>
            {children}
        </div>
    );
}

// ─── String list builder (highlights / benefits) ────────────
function StringListBuilder({
    label, items, placeholder, onChange,
}: {
    label: string; items: string[]; placeholder: string;
    onChange: (items: string[]) => void;
}) {
    const [input, setInput] = useState('');

    const add = () => {
        if (!input.trim()) return;
        onChange([...items, input.trim()]);
        setInput('');
    };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', minHeight: 36, padding: '.5rem', background: '#f8fafd', border: '1.5px solid #e2e8f0', borderRadius: 8, marginBottom: '.5rem' }}>
                {items.map((h, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', background: '#0f4c81', color: '#fff', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, padding: '.2rem .65rem' }}>
                        {h}
                        <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.8)', cursor: 'pointer', fontSize: '.9rem', lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                ))}
                {items.length === 0 && (
                    <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>No {label.toLowerCase()} added yet</span>
                )}
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={placeholder}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                />
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={add} style={{ whiteSpace: 'nowrap' }}>
                    + Add
                </button>
            </div>
        </div>
    );
}

// ─── Shift builder ──────────────────────────────────────────
function ShiftBuilder({ shifts, onChange }: { shifts: ShiftDraft[]; onChange: (s: ShiftDraft[]) => void }) {
    const addShift = () => onChange([...shifts, { ...EMPTY_SHIFT, label: `Shift ${shifts.length + 1}` }]);
    const removeShift = (i: number) => onChange(shifts.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<ShiftDraft>) =>
        onChange(shifts.map((s, idx) => idx === i ? { ...s, ...patch } : s));
    const toggleDay = (i: number, day: string) => {
        const cur = shifts[i].days;
        update(i, { days: cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day] });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {shifts.map((sh, i) => (
                <div key={i} style={{ border: '1px dashed #e2e8f0', borderRadius: 8, padding: '.75rem', background: '#fff' }}>
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem' }}>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Shift label (e.g. Morning, Night)"
                            value={sh.label}
                            onChange={e => update(i, { label: e.target.value })}
                        />
                        <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => removeShift(i)}>
                            <i className="ti ti-trash" />
                        </button>
                    </div>
                    <div className="row g-2 mb-2">
                        <div className="col-6">
                            <label className="form-label small text-muted mb-1">Start time</label>
                            <input type="time" className="form-control form-control-sm"
                                value={sh.startTime} onChange={e => update(i, { startTime: e.target.value })} />
                        </div>
                        <div className="col-6">
                            <label className="form-label small text-muted mb-1">End time</label>
                            <input type="time" className="form-control form-control-sm"
                                value={sh.endTime} onChange={e => update(i, { endTime: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                        {WEEK_DAYS.map(d => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => toggleDay(i, d)}
                                style={{
                                    padding: '.15rem .45rem', fontSize: '.7rem', fontWeight: 600,
                                    borderRadius: 5, border: '1.5px solid',
                                    borderColor: sh.days.includes(d) ? '#0f4c81' : '#e2e8f0',
                                    background: sh.days.includes(d) ? '#0f4c81' : 'transparent',
                                    color: sh.days.includes(d) ? '#fff' : '#64748b',
                                    cursor: 'pointer',
                                }}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addShift} style={{ fontSize: '.78rem', alignSelf: 'flex-start' }}>
                + Add shift
            </button>
        </div>
    );
}

// ─── Slots builder ──────────────────────────────────────────
function SlotsBuilder({ slots, onChange }: { slots: SlotDraft[]; onChange: (s: SlotDraft[]) => void }) {
    const addSlot = () => onChange([...slots, { ...EMPTY_SLOT }]);
    const removeSlot = (i: number) => onChange(slots.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<SlotDraft>) =>
        onChange(slots.map((s, idx) => idx === i ? { ...s, ...patch } : s));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {slots.map((slot, i) => (
                <div key={i} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '1rem', background: '#fafbfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
                        <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#0f172a' }}>
                            <i className="ti ti-map-pin me-1 text-primary" />Location {i + 1}
                        </span>
                        {slots.length > 1 && (
                            <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => removeSlot(i)}>
                                <i className="ti ti-trash" />
                            </button>
                        )}
                    </div>

                    <div className="row g-2">
                        {/* location – required by route */}
                        <div className="col-12">
                            <label className="form-label small fw-semibold mb-1">Full address *</label>
                            <input type="text" className="form-control form-control-sm" required
                                placeholder="123 King St, Toronto, ON"
                                value={slot.location}
                                onChange={e => update(i, { location: e.target.value })} />
                        </div>
                        {/* city – required by route */}
                        <div className="col-md-6">
                            <label className="form-label small fw-semibold mb-1">City *</label>
                            <input type="text" className="form-control form-control-sm" required
                                placeholder="Toronto"
                                value={slot.city}
                                onChange={e => update(i, { city: e.target.value })} />
                        </div>
                        {/* province – required by route */}
                        <div className="col-md-6">
                            <label className="form-label small fw-semibold mb-1">Province *</label>
                            <input type="text" className="form-control form-control-sm" required
                                placeholder="Ontario"
                                value={slot.province}
                                onChange={e => update(i, { province: e.target.value })} />
                        </div>
                        {/* jobPay */}
                        <div className="col-md-4">
                            <label className="form-label small fw-semibold mb-1">Pay (hour) *</label>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text">$</span>
                                <input type="number" className="form-control" required
                                    placeholder="75" min="0"
                                    value={slot.jobPay}
                                    onChange={e => update(i, { jobPay: e.target.value })} />
                            </div>
                        </div>
                        {/* jobVacancy – optional */}
                        <div className="col-md-4">
                            <label className="form-label small fw-semibold mb-1">Vacancy</label>
                            <input type="text" className="form-control form-control-sm"
                                placeholder="e.g. 2 positions"
                                value={slot.jobVacancy}
                                onChange={e => update(i, { jobVacancy: e.target.value })} />
                        </div>
                        {/* jobStartingTime – optional */}
                        <div className="col-md-4">
                            <label className="form-label small fw-semibold mb-1">Starting time</label>
                            <input type="text" className="form-control form-control-sm"
                                placeholder="e.g. Immediate"
                                value={slot.jobStartingTime}
                                onChange={e => update(i, { jobStartingTime: e.target.value })} />
                        </div>
                        {/* isActive */}
                        <div className="col-12">
                            <div className="form-check form-switch">
                                <input type="checkbox" className="form-check-input"
                                    checked={slot.isActive}
                                    onChange={e => update(i, { isActive: e.target.checked })} />
                                <label className="form-check-label small">Location active</label>
                            </div>
                        </div>
                        {/* shifts */}
                        <div className="col-12">
                            <label className="form-label small fw-semibold mb-1">Shifts</label>
                            <ShiftBuilder shifts={slot.shifts} onChange={sh => update(i, { shifts: sh })} />
                        </div>
                    </div>
                </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addSlot} style={{ alignSelf: 'flex-start' }}>
                + Add another location
            </button>
        </div>
    );
}

// ─── Site windows builder ────────────────────────────────────
// function SiteWindowsBuilder({ windows, onChange }: {
//     windows: SiteWindowDraft[];
//     onChange: (w: SiteWindowDraft[]) => void;
// }) {
//     const usedSites = new Set(windows.map(w => w.site));
//     const available = KNOWN_SITES.filter(s => !usedSites.has(s));

//     const addWindow = () => { if (!available.length) return; onChange([...windows, { site: available[0], startAt: '', endAt: '' }]); };
//     const removeWindow = (i: number) => onChange(windows.filter((_, idx) => idx !== i));
//     const update = (i: number, patch: Partial<SiteWindowDraft>) =>
//         onChange(windows.map((w, idx) => idx === i ? { ...w, ...patch } : w));

//     return (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
//             {windows.length === 0 && (
//                 <p className="small text-muted mb-0">
//                     No site windows — listing will stay <strong>pending</strong> until scheduled.
//                 </p>
//             )}
//             {windows.map((w, i) => (
//                 <div key={i} style={{ border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '.85rem', background: '#eff6ff' }}>
//                     <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem' }}>
//                         <select
//                             className="form-select form-select-sm"
//                             style={{ flex: 1 }}
//                             value={w.site}
//                             onChange={e => update(i, { site: e.target.value })}
//                         >
//                             {/* Always keep current site in the list */}
//                             {w.site && <option value={w.site}>{SITE_LABELS[w.site] ?? w.site}</option>}
//                             {available.filter(s => s !== w.site).map(s => (
//                                 <option key={s} value={s}>{SITE_LABELS[s]}</option>
//                             ))}
//                         </select>
//                         <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => removeWindow(i)}>
//                             <i className="ti ti-x" />
//                         </button>
//                     </div>
//                     <div className="row g-2">
//                         <div className="col-6">
//                             <label className="form-label small text-muted mb-1">Goes live at</label>
//                             <input
//                                 type="datetime-local"
//                                 className="form-control form-control-sm"
//                                 required
//                                 value={w.startAt}
//                                 onChange={e => update(i, { startAt: e.target.value })}
//                             />
//                         </div>
//                         <div className="col-6">
//                             <label className="form-label small text-muted mb-1">Expires at</label>
//                             <input
//                                 type="datetime-local"
//                                 className="form-control form-control-sm"
//                                 required
//                                 min={w.startAt}
//                                 value={w.endAt}
//                                 onChange={e => update(i, { endAt: e.target.value })}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             ))}
//             {available.length > 0 && (
//                 <button type="button" className="btn btn-sm btn-outline-primary" onClick={addWindow} style={{ alignSelf: 'flex-start' }}>
//                     + Add site window
//                 </button>
//             )}
//         </div>
//     );
// }

function toLocalDatetimeInput(isoString: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SiteWindowsBuilder({
    windows, onChange, isUpdate = false,
}: { windows: SiteWindowDraft[]; onChange: (w: SiteWindowDraft[]) => void; isUpdate?: boolean }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getDefaultStartAt = () => {
        // Admin: always go live immediately
        return toLocalDatetimeInput(new Date().toISOString());
    };

    const getDefaultEndAt = () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 6);
        return toLocalDatetimeInput(d.toISOString());
    };

    const selectedSites = new Set(windows.map(w => w.site));

    const toggleSite = (site: string) => {
        if (selectedSites.has(site)) {
            onChange(windows.filter(w => w.site !== site));
        } else {
            onChange([...windows, {
                site: site as SiteSlug,
                startAt: getDefaultStartAt(),
                endAt: getDefaultEndAt(),
            }]);
        }
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const liveDate = new Date();
    const expireDate = new Date();
    expireDate.setMonth(expireDate.getMonth() + 6);
    const fmt = (d: Date) =>
        d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });

    return (
        <div className="ulp-site-ms">
            {/* Schedule info banner */}
            <div className="ulp-site-schedule-banner">
                <div className="ulp-site-schedule-row">
                    <div className="ulp-site-schedule-item">
                        <i className="ti ti-calendar-event"></i>
                        <div>
                            <span className="ulp-site-schedule-label">Goes live</span>
                            <span className="ulp-site-schedule-val">{fmt(liveDate)}</span>
                        </div>
                    </div>
                    <span className="ulp-site-schedule-arrow">→</span>
                    <div className="ulp-site-schedule-item">
                        <i className="ti ti-calendar-x"></i>
                        <div>
                            <span className="ulp-site-schedule-label">Expires</span>
                            <span className="ulp-site-schedule-val">{fmt(expireDate)}</span>
                        </div>
                    </div>
                </div>
                <p className="ulp-hint mb-0 mt-2">
                    Listings go live <strong>immediately</strong> and stay active for <strong>6 months</strong>.
                </p>
            </div>

            {/* Dropdown trigger */}
            <div className="ulp-site-ms-wrap" ref={dropdownRef}>
                <button
                    type="button"
                    className="ulp-site-ms-trigger"
                    onClick={() => setOpen(o => !o)}
                >
                    <i className="ti ti-world"></i>
                    <span>
                        {selectedSites.size === 0
                            ? 'Select sites to publish on…'
                            : `${selectedSites.size} site${selectedSites.size > 1 ? 's' : ''} selected`}
                    </span>
                    <i className={`ti ti-chevron-down ulp-site-ms-chevron${open ? ' open' : ''}`}></i>
                </button>

                {open && (
                    <div className="ulp-site-ms-dropdown">
                        {KNOWN_SITES.map(site => {
                            const selected = selectedSites.has(site);
                            return (
                                <label
                                    key={site}
                                    className={`ulp-site-ms-option${selected ? ' ulp-site-ms-option--active' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => toggleSite(site)}
                                        className="ulp-site-ms-checkbox"
                                    />
                                    <span className="ulp-site-ms-check">
                                        {selected && <i className="ti ti-check"></i>}
                                    </span>
                                    <span className="ulp-site-ms-label">{SITE_LABELS[site] ?? site}</span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selected pills */}
            {selectedSites.size > 0 && (
                <div className="ulp-site-ms-pills">
                    {[...selectedSites].map(site => (
                        <span key={site} className="ulp-site-ms-pill">
                            {SITE_LABELS[site] ?? site}
                            <button type="button" onClick={() => toggleSite(site)} title="Remove">×</button>
                        </span>
                    ))}
                </div>
            )}

            {selectedSites.size === 0 && (
                <p className="ulp-hint mt-2">
                    No sites selected — listing stays <strong>pending</strong> until an admin schedules it.
                </p>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AdminJobBankRequestEditPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    // ── Request (left panel) ──────────────────────────────────
    const [request, setRequest] = useState<JobBankRequestDetail | null>(null);
    const [loadingRequest, setLoadingRequest] = useState(true);
    const [requestError, setRequestError] = useState<string | null>(null);

    // ── Status / note update ──────────────────────────────────
    const [editStatus, setEditStatus] = useState<RequestStatus>('pending');
    const [editAdminNote, setEditAdminNote] = useState('');
    // const [savingMeta, setSavingMeta] = useState(false);
    // const [metaSaveMsg, setMetaSaveMsg] = useState<string | null>(null);

    // ── Listing form (right panel) ────────────────────────────
    const [form, setForm] = useState<FormState>(makeEmptyForm());
    const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    // ── Load request ──────────────────────────────────────────
    const fetchRequest = useCallback(async () => {
        setLoadingRequest(true);
        setRequestError(null);
        try {
            const res = await fetch(`/api/admin/job-bank-requests/${id}`);
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
            const json = await res.json();
            const r: JobBankRequestDetail = json.data;
            // Pre-fill jobBankId AND siteWindows from the request's sites preference
            const defaultStart = toLocalDatetimeInput(new Date(Date.now() + 1 * 60_000).toISOString());
            const defaultEnd = (() => {
                const d = new Date();
                d.setMonth(d.getMonth() + 6);
                return toLocalDatetimeInput(d.toISOString());
            })();

            const preFilled: SiteWindowDraft[] = (r.sites ?? []).map(site => ({
                site,
                startAt: defaultStart,
                endAt: defaultEnd,
            }));

            setForm(f => ({
                ...f,
                jobBankId: r.jobBankId,
                siteWindows: preFilled,
            }));
            setRequest(r);
            setEditStatus(r.status);
            setEditAdminNote(r.adminNote ?? '');
            // Pre-fill jobBankId from the request
            setForm(f => ({ ...f, jobBankId: r.jobBankId }));
        } catch (e: any) {
            setRequestError(e.message);
        } finally {
            setLoadingRequest(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRequest();
        fetch('/api/services?status=published&isActive=true&perPage=100')
            .then(r => r.json())
            .then(json =>
                setCategories((json.data ?? []).map((s: any) => ({ value: s.title, label: s.title })))
            )
            .catch(() => { });
    }, [fetchRequest]);

    // ── Save request status / admin note ─────────────────────
    // const handleSaveMeta = async () => {
    //     setSavingMeta(true);
    //     setMetaSaveMsg(null);
    //     try {
    //         const res = await fetch(`/api/admin/job-bank-requests/${id}`, {
    //             method: 'PUT',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ status: editStatus, adminNote: editAdminNote }),
    //         });
    //         if (!res.ok) throw new Error((await res.json()).error);
    //         const json = await res.json();
    //         setRequest(prev => (prev ? { ...prev, ...json.data } : json.data));
    //         setMetaSaveMsg('Saved ✓');
    //         setTimeout(() => setMetaSaveMsg(null), 2500);
    //     } catch (e: any) {
    //         setMetaSaveMsg(`Error: ${e.message}`);
    //     } finally {
    //         setSavingMeta(false);
    //     }
    // };

    // ── Submit listing creation form ──────────────────────────
    // Sends multipart/form-data to POST /api/admin/job-bank-requests/[id]/listing
    // Field names match exactly what route.ts reads via fd.get(...)
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(null);

        try {
            const fd = new FormData();

            // ── Scalar fields ──────────────────────────────────
            fd.append('title', form.title);
            fd.append('companyName', form.companyName);
            fd.append('overview', form.overview);
            fd.append('description', form.description);
            fd.append('applyEmail', form.applyEmail);
            fd.append('jobBankId', form.jobBankId);
            fd.append('jobMode', form.jobMode);
            if (form.jobType) fd.append('jobType', form.jobType);

            // `status` key — matches what route.ts reads: fd.get('status')
            fd.append('status', form.listingStatus);

            // ── JSON array fields ──────────────────────────────
            fd.append('highlights', JSON.stringify(form.highlights));
            fd.append('benefits', JSON.stringify(form.benefits));
            fd.append('categories', JSON.stringify(form.categories));

            // ── Slots — shape mirrors ISlot / route normalisation ──
            const slotsPayload = form.slots.map(s => ({
                location: s.location,
                province: s.province,
                city: s.city,
                jobPay: parseFloat(s.jobPay) || 0,
                jobVacancy: s.jobVacancy || undefined,
                jobStartingTime: s.jobStartingTime || undefined,
                isActive: s.isActive,
                shifts: s.shifts.map(sh => ({
                    label: sh.label || 'Shift',
                    startTime: sh.startTime || undefined,
                    endTime: sh.endTime || undefined,
                    days: sh.days,
                })),
            }));
            fd.append('slots', JSON.stringify(slotsPayload));

            // ── Site windows — ISO strings; omit key if empty ──
            // Route validates endAt > startAt and parses with new Date()
            if (form.siteWindows.length > 0) {
                const swPayload = form.siteWindows.map(w => ({
                    site: w.site,
                    startAt: new Date(w.startAt).toISOString(),
                    endAt: new Date(w.endAt).toISOString(),
                }));
                fd.append('siteWindows', JSON.stringify(swPayload));
            }

            const res = await fetch(`/api/admin/job-bank-requests/${id}/listing`, {
                method: 'POST',
                body: fd,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Submission failed');

            setSubmitSuccess(
                `✅ Listing created! Job ID: ${json.jobId ?? '—'} · Slug: ${json.slug ?? '—'}. Request marked as fulfilled.`
            );
            // Re-fetch request so the left panel reflects 'fulfilled'
            await fetchRequest();
            // Reset form but preserve pre-filled jobBankId
            setForm(makeEmptyForm(request?.jobBankId ?? ''));
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Loading / error states ────────────────────────────────
    if (loadingRequest) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '1rem', color: '#64748b' }}>
                <div className="spinner-border text-primary" />
                <p>Loading request…</p>
            </div>
        );
    }

    if (requestError || !request) {
        return (
            <div className="container py-4">
                <div className="alert alert-danger">{requestError || 'Request not found'}</div>
                <button className="btn btn-sm btn-secondary" onClick={() => router.back()}>← Back</button>
            </div>
        );
    }

    const isFulfilled = request.status === 'fulfilled';

    return (
        <div className="container-fluid py-3" style={{ maxWidth: 1400 }}>
            <style>{`
                .jb-form-input {
                    border: 1.5px solid #e2e8f0 !important;
                    border-radius: 8px !important;
                    background: #f8fafd !important;
                    font-size: .88rem !important;
                }
                .jb-form-input:focus {
                    border-color: #0f4c81 !important;
                    box-shadow: 0 0 0 3px rgba(15,76,129,.1) !important;
                    background: #fff !important;
                }
                    /* Site multi-select */
.ulp-site-ms { display: flex; flex-direction: column; gap: .85rem; }
.ulp-site-schedule-banner { background: #f8fafd; border: 1.5px solid var(--ulp-border); border-radius: 10px; padding: .9rem 1rem; }
.ulp-site-schedule-row { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
.ulp-site-schedule-item { display: flex; align-items: center; gap: .55rem; }
.ulp-site-schedule-item i { font-size: 1.1rem; color: var(--ulp-accent); }
.ulp-site-schedule-label { font-size: .68rem; color: var(--ulp-muted); display: block; text-transform: uppercase; letter-spacing: .05em; }
.ulp-site-schedule-val { font-size: .88rem; font-weight: 700; color: var(--ulp-text); display: block; }
.ulp-site-schedule-arrow { font-size: 1rem; color: var(--ulp-muted); }

.ulp-site-ms-wrap { position: relative; }
.ulp-site-ms-trigger {
  width: 100%; display: flex; align-items: center; gap: .6rem;
  padding: .65rem 1rem; border-radius: 9px;
  border: 1.5px solid var(--ulp-border); background: #f8fafd;
  font-size: .9rem; font-weight: 500; color: var(--ulp-text);
  cursor: pointer; transition: all .15s; text-align: left;
}
.ulp-site-ms-trigger:hover { border-color: var(--ulp-accent); background: #fff; }
.ulp-site-ms-trigger i:first-child { color: var(--ulp-accent); font-size: 1rem; }
.ulp-site-ms-trigger span { flex: 1; }
.ulp-site-ms-chevron { color: var(--ulp-muted); font-size: .85rem; transition: transform .2s; }
.ulp-site-ms-chevron.open { transform: rotate(180deg); }

.ulp-site-ms-dropdown {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 50;
  background: #fff; border: 1.5px solid var(--ulp-border); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.1); overflow: hidden;
}
.ulp-site-ms-option {
  display: flex; align-items: center; gap: .75rem;
  padding: .7rem 1rem; cursor: pointer; transition: background .12s;
}
.ulp-site-ms-option:hover { background: #f4f7ff; }
.ulp-site-ms-option--active { background: #eff6ff; }
.ulp-site-ms-checkbox { display: none; }
.ulp-site-ms-check {
  width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
  border: 1.5px solid var(--ulp-border); background: #fff;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.ulp-site-ms-option--active .ulp-site-ms-check { background: var(--ulp-accent); border-color: var(--ulp-accent); color: #fff; font-size: .7rem; }
.ulp-site-ms-label { font-size: .88rem; font-weight: 500; color: var(--ulp-text); }

.ulp-site-ms-pills { display: flex; flex-wrap: wrap; gap: .4rem; }
.ulp-site-ms-pill {
  display: inline-flex; align-items: center; gap: .4rem;
  background: #eff6ff; color: #1d4ed8;
  border: 1px solid #bfdbfe; border-radius: 20px;
  font-size: .78rem; font-weight: 400; padding: .25rem .65rem;
}
.ulp-site-ms-pill button { background: none; border: none; color: #93c5fd; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0; }
.ulp-site-ms-pill button:hover { color: #1d4ed8; }
            `}</style>

            {/* ── Breadcrumb ─────────────────────────────────── */}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => router.push('/admin/job-bank')}>
                    <i className="ti ti-arrow-left me-1" />All Requests
                </button>
                <span className="text-muted small">/</span>
                <span className="small fw-semibold text-dark">Job Bank #{request.jobBankId}</span>
                <StatusBadge status={request.status} />
            </div>

            <div className="row g-3">

                {/* ══════════════════════════════════════════════
                    LEFT PANEL — Request metadata
                ══════════════════════════════════════════════ */}
                <div className="col-12 row">

                    {/* Requester info */}
                    <div className=" col-12 col-md-7">
                        <SectionCard icon="ti-user" title="Requester">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem', padding: '.75rem', background: '#f0f7ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%',
                                    background: '#0f4c81', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: '1rem', flexShrink: 0, overflow: 'hidden',
                                }}>
                                    {request.userAvatar
                                        ? <img src={request.userAvatar} alt="" style={{ width: 44, height: 44, objectFit: 'cover' }} />
                                        : (request.userName?.[0] ?? '?').toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#0f172a' }}>{request.userName ?? '—'}</div>
                                    <div style={{ fontSize: '.78rem', color: '#64748b' }}>{request.userEmail ?? '—'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                                <InfoRow label="Job Bank ID" value={
                                    <span style={{ fontFamily: 'monospace', color: '#0f4c81' }}>#{request.jobBankId}</span>
                                } />
                                <InfoRow label="Submitted" value={new Date(request.createdAt).toLocaleDateString()} />
                            </div>
                        </SectionCard>
                    </div>

                    {/* User notes (if any) */}
                    <div className='col-12 col-md-3'>
                        {request.userNotes && (
                            <SectionCard icon="ti-notes" title="User Notes">
                                <p style={{ fontSize: '.85rem', color: '#334155', margin: 0, lineHeight: 1.65 }}>
                                    {request.userNotes}
                                </p>
                            </SectionCard>
                        )}
                    </div>

                    {/* Admin controls */}
                    {/* <SectionCard icon="ti-settings" title="Admin Controls">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                            <div>
                                <label className="form-label small fw-semibold">Request status</label>
                                <select
                                    className="form-select form-select-sm jb-form-input"
                                    value={editStatus}
                                    onChange={e => setEditStatus(e.target.value as RequestStatus)}
                                >
                                    {(Object.keys(STATUS_CONFIG) as RequestStatus[]).map(s => (
                                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label small fw-semibold">Admin note</label>
                                <textarea
                                    className="form-control form-control-sm jb-form-input"
                                    rows={3}
                                    placeholder="Optional note for the user…"
                                    value={editAdminNote}
                                    onChange={e => setEditAdminNote(e.target.value)}
                                    maxLength={2000}
                                />
                                <small className="text-muted">{editAdminNote.length}/2000</small>
                            </div>
                            <button
                                className="btn btn-sm btn-primary w-100"
                                onClick={handleSaveMeta}
                                disabled={savingMeta}
                            >
                                {savingMeta
                                    ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                                    : 'Save status & note'}
                            </button>
                            {metaSaveMsg && (
                                <div className={`alert py-1 px-2 small mb-0 ${metaSaveMsg.startsWith('Error') ? 'alert-danger' : 'alert-success'}`}>
                                    {metaSaveMsg}
                                </div>
                            )}
                        </div>
                    </SectionCard> */}

                    {/* Linked listing — only when fulfilled */}
                    {/* {isFulfilled && request.listingId && (
                        <SectionCard icon="ti-link" title="Linked Listing">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                                <InfoRow label="Collection" value={request.listingCollection ?? '—'} />
                                <InfoRow label="Listing ID" value={
                                    <span style={{ fontFamily: 'monospace', fontSize: '.78rem' }}>{request.listingId}</span>
                                } />
                                <a
                                    href={`/admin/listings/${request.listingId}`}
                                    className="btn btn-sm btn-outline-primary w-100"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <i className="ti ti-external-link me-1" />View listing in admin
                                </a>
                            </div>
                        </SectionCard>
                    )} */}

                    {/* Timeline */}
                    {/* <SectionCard icon="ti-clock" title="Timeline">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                            <InfoRow label="Created" value={new Date(request.createdAt).toLocaleString()} />
                            <InfoRow label="Last updated" value={new Date(request.updatedAt).toLocaleString()} />
                            {request.reviewedAt && (
                                <InfoRow label="Reviewed at" value={new Date(request.reviewedAt).toLocaleString()} />
                            )}
                        </div>
                    </SectionCard> */}
                </div>

                {/* ══════════════════════════════════════════════
                    RIGHT PANEL — Listing creation form
                ══════════════════════════════════════════════ */}
                <div className="col-12">
                    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>

                        {/* Panel header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '.9rem', borderBottom: '2px solid #f1f5f9' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                                    <i className="ti ti-file-plus me-2 text-primary" />
                                    Create Listing
                                </h2>
                                <p style={{ margin: '.25rem 0 0', fontSize: '.8rem', color: '#64748b' }}>
                                    Will be created on behalf of&nbsp;
                                    <strong>{request.userName ?? request.userEmail}</strong>
                                </p>
                            </div>
                            {isFulfilled && (
                                <span style={{ background: '#d1fae5', color: '#065f46', border: '1.5px solid #6ee7b7', borderRadius: 8, padding: '.3rem .75rem', fontSize: '.78rem', fontWeight: 600 }}>
                                    ✅ Already fulfilled
                                </span>
                            )}
                        </div>

                        {/* Alerts */}
                        {submitSuccess && (
                            <div className="alert alert-success mb-3">{submitSuccess}</div>
                        )}
                        {submitError && (
                            <div className="alert alert-danger mb-3">{submitError}</div>
                        )}
                        {isFulfilled && !submitSuccess && (
                            <div className="alert alert-info mb-3" style={{ fontSize: '.85rem' }}>
                                This request is already fulfilled. You can still create another listing if needed.
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>

                            {/* ── Core listing info ─────────────────────── */}
                            <SectionCard icon="ti-file-description" title="Listing Information">
                                <div className="row g-3">

                                    {/* jobBankId — pre-filled, editable */}
                                    <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Job Bank ID *</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm jb-form-input"
                                            required
                                            placeholder="e.g. 123456"
                                            value={form.jobBankId}
                                            disabled
                                            onChange={e => setForm(f => ({ ...f, jobBankId: e.target.value }))}
                                        />
                                    </div>

                                    {/* title */}
                                    <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Job title *</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm jb-form-input"
                                            required
                                            placeholder="e.g. Senior Software Engineer"
                                            value={form.title}
                                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Company Name  *</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm jb-form-input"
                                            required
                                            placeholder="Enter The Company Name"
                                            value={form.companyName}
                                            onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                                        />
                                    </div>

                                    {/* jobMode */}
                                    <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Job mode *</label>
                                        <select
                                            className="form-select form-select-sm jb-form-input"
                                            required
                                            value={form.jobMode}
                                            onChange={e => setForm(f => ({ ...f, jobMode: e.target.value }))}
                                        >
                                            <option value="">Select mode…</option>
                                            {JOB_MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>

                                    {/* jobType – optional */}
                                    <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Job type <span className="text-muted fw-normal">(optional)</span></label>
                                        <select
                                            className="form-select form-select-sm jb-form-input"
                                            value={form.jobType}
                                            onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}
                                        >
                                            <option value="">Select type…</option>
                                            {JOB_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* listingStatus — sent as `status` key; valid: pending|scheduled|approved|rejected */}
                                    {/* <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Initial listing status</label>
                                        <select
                                            className="form-select form-select-sm jb-form-input"
                                            value={form.listingStatus}
                                            onChange={e => setForm(f => ({ ...f, listingStatus: e.target.value as ListingStatus }))}
                                        >
                                            {LISTING_STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <small className="text-muted">
                                            {LISTING_STATUS_OPTIONS.find(o => o.value === form.listingStatus)?.hint}
                                        </small>
                                    </div> */}

                                    {/* applyEmail */}
                                    <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Apply email *</label>
                                        <input
                                            type="email"
                                            className="form-control form-control-sm jb-form-input"
                                            required
                                            placeholder="hr@company.com"
                                            value={form.applyEmail}
                                            onChange={e => setForm(f => ({ ...f, applyEmail: e.target.value }))}
                                        />
                                    </div>

                                    {/* description — short plain-text meta */}
                                    <div className="col-12">
                                        <label className="form-label small fw-semibold">
                                            Short description * <span className="text-muted fw-normal">(plain text, used for meta/search)</span>
                                        </label>
                                        <textarea
                                            className="form-control form-control-sm jb-form-input"
                                            required
                                            rows={2}
                                            placeholder="One or two sentences summarising the role…"
                                            value={form.description}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        />
                                    </div>

                                    {/* overview — rich HTML via TinyMCE */}
                                    <div className="col-12">
                                        <label className="form-label small fw-semibold">Full overview * <span className="text-muted fw-normal">(rich content)</span></label>
                                        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, overflow: 'hidden' }}>
                                            <Editor
                                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                                value={form.overview}
                                                onEditorChange={content => setForm(f => ({ ...f, overview: content }))}
                                                init={{
                                                    height: 340,
                                                    menubar: true,
                                                    branding: false,
                                                    plugins: [
                                                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                                                        'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
                                                        'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount',
                                                    ],
                                                    toolbar:
                                                        'undo redo | blocks | bold italic underline | forecolor backcolor | ' +
                                                        'alignleft aligncenter alignright | bullist numlist outdent indent | ' +
                                                        'link image table | removeformat code | help',
                                                    image_title: true,
                                                    automatic_uploads: true,
                                                    file_picker_types: 'image',
                                                    images_upload_handler: async (blobInfo: any) => {
                                                        const fd = new FormData();
                                                        fd.append('file', blobInfo.blob(), blobInfo.filename());
                                                        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
                                                        const data = await res.json();
                                                        if (res.ok) return data.url;
                                                        throw new Error('Image upload failed');
                                                    },
                                                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.6; }',
                                                }}
                                            />
                                        </div>
                                        {!form.overview && (
                                            <p style={{ margin: '4px 0 0', fontSize: '.75rem', color: '#94a3b8' }}>Required — enter the full job overview above.</p>
                                        )}
                                    </div>

                                    {/* categories */}
                                    {categories.length > 0 && (
                                        <div className="col-12">
                                            <label className="form-label small fw-semibold">Categories</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', padding: '.65rem', background: '#f8fafd', border: '1.5px solid #e2e8f0', borderRadius: 9 }}>
                                                {categories.map(cat => {
                                                    const selected = form.categories.includes(cat.value);
                                                    return (
                                                        <button
                                                            key={cat.value}
                                                            type="button"
                                                            onClick={() => setForm(f => ({
                                                                ...f,
                                                                categories: selected
                                                                    ? f.categories.filter(c => c !== cat.value)
                                                                    : [...f.categories, cat.value],
                                                            }))}
                                                            style={{
                                                                padding: '.2rem .65rem', borderRadius: 20, fontSize: '.75rem',
                                                                fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                                                                borderColor: selected ? '#0f4c81' : '#e2e8f0',
                                                                background: selected ? '#0f4c81' : '#fff',
                                                                color: selected ? '#fff' : '#64748b',
                                                            }}
                                                        >
                                                            {selected && '✓ '}{cat.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* highlights / benefits */}
                                    <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Key highlights</label>
                                        <StringListBuilder
                                            label="Highlights" items={form.highlights}
                                            placeholder="e.g. Competitive salary"
                                            onChange={h => setForm(f => ({ ...f, highlights: h }))}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-semibold">Benefits</label>
                                        <StringListBuilder
                                            label="Benefits" items={form.benefits}
                                            placeholder="e.g. Extended health & dental"
                                            onChange={b => setForm(f => ({ ...f, benefits: b }))}
                                        />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* ── Locations & shifts ────────────────────── */}
                            <SectionCard icon="ti-map-pin" title="Locations & Shifts">
                                <p className="small text-muted mb-3">
                                    At least one location is required. Each location has its own pay, vacancy, and shift schedule.
                                </p>
                                <SlotsBuilder
                                    slots={form.slots}
                                    onChange={slots => setForm(f => ({ ...f, slots }))}
                                />
                            </SectionCard>

                            {/* ── Select Sites To publish Listing ──────────────────────── */}
                            <SectionCard icon="ti-calendar-time" title="Select Sites To publish Listing">
                                <p className="small text-muted mb-3">
                                    Control on which sites this listing appears. The pre-save hook derives
                                    <code className="ms-1">visibleOnSites</code> and <code>durationDays</code> from these windows.
                                    Leave empty to keep the listing as <strong>pending</strong>.
                                </p>
                                <SiteWindowsBuilder
                                    windows={form.siteWindows}
                                    onChange={siteWindows => setForm(f => ({ ...f, siteWindows }))}
                                />
                            </SectionCard>

                            {/* ── Form actions ───────────────────────────── */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem', padding: '1rem 0 .5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    disabled={submitting}
                                    onClick={() => setForm(makeEmptyForm(request.jobBankId))}
                                >
                                    Reset form
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                    style={{ padding: '.55rem 1.5rem', fontWeight: 600 }}
                                >
                                    {submitting
                                        ? <><span className="spinner-border spinner-border-sm me-2" />Creating listing…</>
                                        : <><i className="ti ti-send me-2" />Create listing</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
'use client';

/**
 * src/app/admin/listings/edit/[[...id]]/page.tsx
 *
 * Admin create / edit page for a single Job Listing.
 * - Responsive 3-column → 2-column → 1-column layout
 * - ImageUploader for OG image in SEO panel
 * - Sticky mobile save bar
 */

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Editor } from '@tinymce/tinymce-react';
import {
    SlotItem,
    SiteWindow,
    KNOWN_SITES,
    SiteSlug,
} from '@/hooks/useListings';
import { z } from 'zod';
import toast from 'react-hot-toast';
// import getLocalImageUrl from '@/utils/ChangeImageUrl';

// ─────────────────────────────────────────────────────────────
// ObjectId guard
// ─────────────────────────────────────────────────────────────
function isValidObjectId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
}

const SlotSchema = z.object({
    location: z.string().min(1, 'Location is required'),
    province: z.string().min(1, 'Province is required'),
    city: z.string().min(1, 'City is required'),
    jobPay: z.string().min(1, 'Pay is required'),
    isActive: z.boolean(),
    jobVacancy: z.string().optional(),
    jobStartingTime: z.string().optional(),
    shifts: z.array(z.any()),
});

const ListingFormSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    companyName: z.string().min(1, 'Company name is required'),
    overview: z.string().min(1, 'Overview is required'),
    description: z.string().min(1, 'Description is required'),
    applyEmail: z.string().email('Valid email required'),
    jobMode: z.string().min(1, 'Job mode is required'),
    slots: z.array(SlotSchema).min(1, 'At least one location is required'),
    // rest optional
    jobType: z.string().optional(),
    jobBankId: z.string().optional(),
    highlights: z.array(z.string()),
    benefits: z.array(z.string()),
    categories: z.array(z.string()),
    campaignLabel: z.string(),
    listingStatus: z.string(),
    siteWindows: z.array(z.any()),
});

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
// const KNOWN_SITES = [
//     'jobs-connect.vercel.app',
//     'new-jobs-fawn.vercel.app',
//     'jobsrefugee.ca',
//     'vulnerableyouthsjobs.ca',
//     'accesscareers.ca',
//     'indigenouspeoplesjobs.ca',
// ] as const;

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

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; icon: string }> = {
    pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e', border: '#fcd34d', icon: '⏳' },
    scheduled: { label: 'Scheduled', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', icon: '📅' },
    approved: { label: 'Approved', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '✅' },
    rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: '❌' },
    active: { label: 'Active', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '🟢' },
    inactive: { label: 'Inactive', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: '⚫' },
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface AdminNote { message: string; type: string; createdAt: string; createdBy?: string; }
// interface ShiftItem { label: string; startTime?: string | null; endTime?: string | null; days?: string[]; }
// interface SlotItem {
//     _id?: string; location: string; province: string; city: string; jobPay: number;
//     jobVacancy?: string | null; jobStartingTime?: string | null; isActive: boolean; shifts: ShiftItem[];
// }
// interface SiteWindow { site: string; startAt: string; endAt: string; durationDays?: number; }
interface CampaignWindow { label: string; startAt: string; endAt: string; }

interface ListingDetail {
    id: string; title: string; companyName: string, overview: string; description: string; applyEmail: string;
    highlights: string[]; jobBankId: string; benefits: string[]; categories: string[]; slug: string;
    jobMode: string; jobType?: string | null; jobId?: string | null;
    slots: SlotItem[]; visibleOnSites: string[]; siteWindows: SiteWindow[];
    submittedBy: string; adminNotes: AdminNote[]; updateRequested: boolean;
    createdAt: string; updatedAt: string;
    status?: string; campaignWindow?: CampaignWindow | null; isActive?: boolean;
}

interface ShiftDraft { label: string; startTime: string; endTime: string; days: string[]; }
interface SlotDraft {
    location: string; province: string; city: string; jobPay: string;
    jobVacancy: string; jobStartingTime: string; isActive: boolean; shifts: ShiftDraft[];
}
interface SiteWindowDraft { site: string; startAt: string; endAt: string; }

interface ListingFormState {
    title: string; overview: string; companyName: string; description: string; applyEmail: string;
    jobBankId: string; jobMode: string; jobType: string;
    highlights: string[]; benefits: string[]; categories: string[];
    campaignLabel: string; listingStatus: string;
    slots: SlotDraft[]; siteWindows: SiteWindowDraft[];
}

interface MetaFormState {
    metaId: string; urlPattern: string; siteId: string; title: string; description: string;
    keywords: string; ogTitle: string; ogDescription: string;
    ogImage: string; canonicalUrl: string; robots: string; isActive: boolean;
}

// interface ImageUploaderProps {
//     label?: string;
//     currentImageUrl?: string | null;
//     onFileSelect: (file: File | null) => void;
//     onUrlChange?: (url: string) => void;
//     allowUrl?: boolean;
// }

// ─────────────────────────────────────────────────────────────
// Empty state constants
// ─────────────────────────────────────────────────────────────
const EMPTY_SHIFT: ShiftDraft = { label: '', startTime: '', endTime: '', days: [] };
const EMPTY_SLOT: SlotDraft = {
    location: '', province: '', city: '', jobPay: '', jobVacancy: '',
    jobStartingTime: '', isActive: true, shifts: [],
};
const EMPTY_FORM: ListingFormState = {
    title: '', overview: '', companyName: "", description: '', applyEmail: '', jobBankId: '',
    jobMode: '', jobType: '', highlights: [], benefits: [], categories: [],
    campaignLabel: 'Hiring Campaign', listingStatus: 'approved',
    slots: [{ ...EMPTY_SLOT }], siteWindows: [],
};
const EMPTY_META: MetaFormState = {
    metaId: '', urlPattern: '', siteId: '*', title: '', description: '', keywords: '',
    ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '',
    robots: 'index, follow', isActive: true,
};

function slugFromTitle(title: string) {
    return title.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

// const IS: React.CSSProperties = { borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafd', fontSize: 13 };

// ─────────────────────────────────────────────────────────────
// ImageUploader
// ─────────────────────────────────────────────────────────────
// function ImageUploader({ label, currentImageUrl, onFileSelect, onUrlChange, allowUrl = true }: ImageUploaderProps) {
//     const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
//     const [urlInput, setUrlInput] = useState(currentImageUrl || '');
//     const [useUrl, setUseUrl] = useState(!!currentImageUrl && !currentImageUrl.startsWith('blob:'));
//     const [dragging, setDragging] = useState(false);
//     const fileInputRef = useRef<HTMLInputElement>(null);

//     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const file = e.target.files?.[0] || null;
//         if (file) {
//             const reader = new FileReader();
//             reader.onloadend = () => {
//                 setPreview(reader.result as string);
//                 setUseUrl(false);
//                 onFileSelect(file);
//                 if (onUrlChange) onUrlChange('');
//             };
//             reader.readAsDataURL(file);
//         } else { setPreview(null); onFileSelect(null); }
//     };

//     const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const url = e.target.value;
//         setUrlInput(url); setPreview(url);
//         if (onUrlChange) onUrlChange(url);
//         onFileSelect(null); setUseUrl(true);
//     };

//     const handleRemove = () => {
//         setPreview(null); setUrlInput(''); onFileSelect(null);
//         if (onUrlChange) onUrlChange('');
//         if (fileInputRef.current) fileInputRef.current.value = '';
//     };

//     const handleDrop = (e: React.DragEvent) => {
//         e.preventDefault(); setDragging(false);
//         const file = e.dataTransfer.files?.[0];
//         if (file && file.type.startsWith('image/')) {
//             const reader = new FileReader();
//             reader.onloadend = () => { setPreview(reader.result as string); setUseUrl(false); onFileSelect(file); if (onUrlChange) onUrlChange(''); };
//             reader.readAsDataURL(file);
//         }
//     };

//     return (
//         <div style={{ marginBottom: 8 }}>
//             {label && <label className="form-label small fw-semibold mb-2 d-block">{label}</label>}
//             <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
//                 {/* Thumbnail / drop zone */}
//                 <div
//                     onClick={() => fileInputRef.current?.click()}
//                     onDragOver={e => { e.preventDefault(); setDragging(true); }}
//                     onDragLeave={() => setDragging(false)}
//                     onDrop={handleDrop}
//                     style={{
//                         width: 80, height: 80, flexShrink: 0, cursor: 'pointer',
//                         borderRadius: 12, border: `2px dashed ${dragging ? '#2563eb' : preview ? '#93c5fd' : '#cbd5e1'}`,
//                         background: preview
//                             ? `url(${preview}) center / cover no-repeat`
//                             : dragging ? '#eff6ff' : '#f8fafd',
//                         display: 'flex', alignItems: 'center', justifyContent: 'center',
//                         transition: 'border-color .15s, background .15s',
//                         overflow: 'hidden',
//                         boxShadow: preview ? '0 2px 8px rgba(37,99,235,.15)' : 'none',
//                     }}
//                 >
//                     {!preview && (
//                         <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
//                             <i className="ti ti-cloud-upload" style={{ fontSize: '1.4rem', color: dragging ? '#2563eb' : '#94a3b8', display: 'block' }} />
//                             <span style={{ fontSize: '.6rem', color: '#94a3b8', marginTop: 2, display: 'block' }}>Upload</span>
//                         </div>
//                     )}
//                 </div>

//                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
//                     <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={handleFileChange} />
//                     {allowUrl && (
//                         <div className="input-group input-group-sm">
//                             <span className="input-group-text" style={{ background: '#f8fafd', borderRight: 0 }}>
//                                 <i className="ti ti-link" style={{ color: '#64748b', fontSize: '.8rem' }} />
//                             </span>
//                             <input
//                                 type="url"
//                                 className="form-control form-control-sm jl-input"
//                                 style={{ borderLeft: 0 }}
//                                 placeholder="Paste image URL…"
//                                 value={getLocalImageUrl(urlInput)}
//                                 onChange={handleUrlChange}
//                             />
//                         </div>
//                     )}
//                     <p style={{ margin: 0, fontSize: '.7rem', color: '#94a3b8', lineHeight: 1.4 }}>
//                         Click thumbnail to upload · drag & drop · or paste a URL
//                     </p>
//                     {preview && (
//                         <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2"
//                             style={{ alignSelf: 'flex-start', fontSize: '.73rem', borderRadius: 6 }}
//                             onClick={handleRemove}>
//                             <i className="ti ti-trash me-1" style={{ fontSize: '.72rem' }} />Remove
//                         </button>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.pending;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '.3rem',
            padding: '.22rem .7rem', borderRadius: 20, fontSize: '.72rem',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
            background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`,
            whiteSpace: 'nowrap',
        }}>{cfg.icon} {cfg.label}</span>
    );
}

// function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
//     return (
//         <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, padding: '.6rem .75rem', background: '#f8fafd', borderRadius: 9, border: '1px solid #eef2f8' }}>
//             <span style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#94a3b8' }}>{label}</span>
//             <span style={{ fontSize: '.85rem', fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{value}</span>
//         </div>
//     );
// }

function SectionCard({ icon, title, children, style }: { icon: string; title: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div className="jl-section-card" style={{
            background: '#fff', borderRadius: 14, border: '1px solid #eef2f8',
            padding: '1.25rem', marginBottom: '1.1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03)', ...style,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.9rem', paddingBottom: '.8rem', borderBottom: '1.5px solid #f5f7fa' }}>
                <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <i className={`ti ${icon}`} style={{ color: '#2563eb', fontSize: '.88rem' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: '.9rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
            </div>
            <div style={{ overflowWrap: 'break-word' }}>{children}</div>
        </div>
    );
}

function StringListBuilder({ label, items, placeholder, onChange }: {
    label: string; items: string[]; placeholder: string; onChange: (items: string[]) => void;
}) {
    const [input, setInput] = useState('');
    const add = () => { if (!input.trim()) return; onChange([...items, input.trim()]); setInput(''); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', minHeight: 42, padding: '.75rem', background: '#f8fafd', border: '1.5px solid #e2e8f0', borderRadius: 9, marginBottom: '.5rem' }}>
                {items.map((h, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', background: '#2563eb', color: '#fff', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, padding: '.2rem .65rem' }}>
                        {h}
                        <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.8)', cursor: 'pointer', fontSize: '.95rem', lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                ))}
                {items.length === 0 && <span style={{ fontSize: '.78rem', color: '#94a3b8', alignSelf: 'center' }}>No {label.toLowerCase()} added yet</span>}
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
                <input type="text" className="form-control form-control-sm jl-input" placeholder={placeholder} value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={add} style={{ whiteSpace: 'nowrap', borderRadius: 8, fontSize: '.8rem' }}>+ Add</button>
            </div>
        </div>
    );
}

function ShiftBuilder({ shifts, onChange }: { shifts: ShiftDraft[]; onChange: (s: ShiftDraft[]) => void }) {
    const addShift = () => onChange([...shifts, { ...EMPTY_SHIFT, label: `Shift ${shifts.length + 1}` }]);
    const removeShift = (i: number) => onChange(shifts.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<ShiftDraft>) => onChange(shifts.map((s, idx) => idx === i ? { ...s, ...patch } : s));
    const toggleDay = (i: number, day: string) => {
        const cur = shifts[i].days;
        update(i, { days: cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day] });
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {shifts.map((sh, i) => (
                <div key={i} style={{ border: '1px dashed #e2e8f0', borderRadius: 10, padding: '.75rem', background: '#fafbfc' }}>
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem' }}>
                        <input type="text" className="form-control form-control-sm jl-input" placeholder="Shift label"
                            value={sh.label} onChange={e => update(i, { label: e.target.value })} />
                        <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" style={{ borderRadius: 7 }} onClick={() => removeShift(i)}>
                            <i className="ti ti-trash" />
                        </button>
                    </div>
                    <div className="row g-2 mb-2">
                        <div className="col-6">
                            <label className="form-label small text-muted mb-1">Start</label>
                            <input type="time" className="form-control form-control-sm jl-input" value={sh.startTime} onChange={e => update(i, { startTime: e.target.value })} />
                        </div>
                        <div className="col-6">
                            <label className="form-label small text-muted mb-1">End</label>
                            <input type="time" className="form-control form-control-sm jl-input" value={sh.endTime} onChange={e => update(i, { endTime: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                        {WEEK_DAYS.map(d => (
                            <button key={d} type="button" onClick={() => toggleDay(i, d)} style={{
                                padding: '.18rem .45rem', fontSize: '.7rem', fontWeight: 600,
                                borderRadius: 6, border: '1.5px solid',
                                borderColor: sh.days.includes(d) ? '#2563eb' : '#e2e8f0',
                                background: sh.days.includes(d) ? '#2563eb' : 'transparent',
                                color: sh.days.includes(d) ? '#fff' : '#64748b', cursor: 'pointer',
                                transition: 'all .12s',
                            }}>{d}</button>
                        ))}
                    </div>
                </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addShift} style={{ fontSize: '.78rem', alignSelf: 'flex-start', borderRadius: 8 }}>
                + Add shift
            </button>
        </div>
    );
}

function SlotsBuilder({ slots, onChange }: { slots: SlotDraft[]; onChange: (s: SlotDraft[]) => void }) {
    const addSlot = () => onChange([...slots, { ...EMPTY_SLOT }]);
    const removeSlot = (i: number) => onChange(slots.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<SlotDraft>) => onChange(slots.map((s, idx) => idx === i ? { ...s, ...patch } : s));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {slots.map((slot, i) => (
                <div key={i} style={{ border: '1.5px solid #e8edf4', borderRadius: 12, padding: '1rem', background: '#fafbfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
                        <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="ti ti-map-pin" style={{ color: '#2563eb' }} />Location {i + 1}
                        </span>
                        {slots.length > 1 && (
                            <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" style={{ borderRadius: 7 }} onClick={() => removeSlot(i)}>
                                <i className="ti ti-trash" />
                            </button>
                        )}
                    </div>
                    <div className="row g-2">
                        <div className="col-12">
                            <label className="form-label small fw-semibold mb-1">Full address *</label>
                            <input type="text" className="form-control form-control-sm jl-input" required placeholder="123 King St, Toronto"
                                value={slot.location} onChange={e => update(i, { location: e.target.value })} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small fw-semibold mb-1">City *</label>
                            <input type="text" className="form-control form-control-sm jl-input" required placeholder="Toronto"
                                value={slot.city} onChange={e => update(i, { city: e.target.value })} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small fw-semibold mb-1">Province *</label>
                            <input type="text" className="form-control form-control-sm jl-input" required placeholder="Ontario"
                                value={slot.province} onChange={e => update(i, { province: e.target.value })} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small fw-semibold mb-1">Pay (hour) *</label>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text" style={{ borderRadius: '9px 0 0 9px', background: '#f8fafd', borderColor: '#e2e8f0' }}>$</span>
                                <input type="number" className="form-control jl-input" required placeholder="75" min="0" style={{ borderRadius: '0 9px 9px 0' }}
                                    value={slot.jobPay} onChange={e => update(i, { jobPay: e.target.value })} />
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small fw-semibold mb-1">Vacancy</label>
                            <input type="text" className="form-control form-control-sm jl-input" placeholder="e.g. 2 positions"
                                value={slot.jobVacancy} onChange={e => update(i, { jobVacancy: e.target.value })} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small fw-semibold mb-1">Starting time</label>
                            <input type="text" className="form-control form-control-sm jl-input" placeholder="e.g. Immediate"
                                value={slot.jobStartingTime} onChange={e => update(i, { jobStartingTime: e.target.value })} />
                        </div>
                        <div className="col-12">
                            <div className="form-check form-switch">
                                <input type="checkbox" className="form-check-input" checked={slot.isActive}
                                    onChange={e => update(i, { isActive: e.target.checked })} />
                                <label className="form-check-label small">Location active</label>
                            </div>
                        </div>
                        <div className="col-12">
                            <label className="form-label small fw-semibold mb-1">Shifts</label>
                            <ShiftBuilder shifts={slot.shifts} onChange={sh => update(i, { shifts: sh })} />
                        </div>
                    </div>
                </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addSlot} style={{ alignSelf: 'flex-start', borderRadius: 9 }}>
                + Add another location
            </button>
        </div>
    );
}

function toLocalDatetimeInput(isoString: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// function nowPlusMinutes(mins: number) {
//     return toLocalDatetimeInput(new Date(Date.now() + mins * 60_000).toISOString());
// }

// function SiteWindowsBuilder({ windows, onChange }: { windows: SiteWindowDraft[]; onChange: (w: SiteWindowDraft[]) => void }) {
//     const usedSites = new Set(windows.map(w => w.site));
//     const available = KNOWN_SITES.filter(s => !usedSites.has(s));
//     const minDT = nowPlusMinutes(2);
//     const addWindow = () => { if (!available.length) return; onChange([...windows, { site: available[0], startAt: '', endAt: '' }]); };
//     const removeWindow = (i: number) => onChange(windows.filter((_, idx) => idx !== i));
//     const update = (i: number, patch: Partial<SiteWindowDraft>) => onChange(windows.map((w, idx) => idx === i ? { ...w, ...patch } : w));
//     return (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
//             {windows.length === 0 && <p className="small text-muted mb-0">No site windows — listing will stay <strong>pending</strong> until scheduled.</p>}
//             {windows.map((w, i) => (
//                 <div key={i} style={{ border: '1.5px solid #bfdbfe', borderRadius: 11, padding: '.85rem', background: '#eff6ff' }}>
//                     <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem' }}>
//                         <select className="form-select form-select-sm jl-input" style={{ flex: 1 }} value={w.site} onChange={e => update(i, { site: e.target.value })}>
//                             {w.site && <option value={w.site}>{SITE_LABELS[w.site] ?? w.site}</option>}
//                             {available.filter(s => s !== w.site).map(s => <option key={s} value={s}>{SITE_LABELS[s]}</option>)}
//                         </select>
//                         <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" style={{ borderRadius: 7 }} onClick={() => removeWindow(i)}><i className="ti ti-x" /></button>
//                     </div>
//                     <div className="row g-2">
//                         <div className="col-6">
//                             <label className="form-label small text-muted mb-1">Goes live at</label>
//                             <input type="datetime-local" className="form-control form-control-sm jl-input" min={minDT} value={toLocalDatetimeInput(w.startAt)} onChange={e => update(i, { startAt: e.target.value })} />
//                         </div>
//                         <div className="col-6">
//                             <label className="form-label small text-muted mb-1">Expires at</label>
//                             <input type="datetime-local" className="form-control form-control-sm jl-input" min={w.startAt || minDT} value={toLocalDatetimeInput(w.endAt)} onChange={e => update(i, { endAt: e.target.value })} />
//                         </div>
//                     </div>
//                 </div>
//             ))}
//             {available.length > 0 && (
//                 <button type="button" className="btn btn-sm btn-outline-primary" onClick={addWindow} style={{ alignSelf: 'flex-start', borderRadius: 9 }}>
//                     + Add site window
//                 </button>
//             )}
//         </div>
//     );
// }

// function CharBar({ len, max }: { len: number; max: number }) {
//     const pct = Math.min(100, (len / max) * 100);
//     const color = len > max ? '#dc2626' : len > max * 0.85 ? '#f59e0b' : '#2563eb';
//     return (
//         <div style={{ height: 3, marginTop: 5, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
//             <div style={{ height: '100%', borderRadius: 2, transition: 'width .2s, background .2s', background: color, width: `${pct}%` }} />
//         </div>
//     );
// }

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
            {/* ── Banner: only for NEW listings ── */}
            {!isUpdate && (
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
            )}

            {/* ── Edit‑mode note ── */}
            {isUpdate && windows.length > 0 && (
                <div className="ulp-site-schedule-banner" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <p className="ulp-hint mb-0" style={{ fontSize: '.78rem', color: '#166534' }}>
                        <i className="ti ti-clock me-2" />
                        Existing schedule – dates will <strong>not</strong> auto‑extend when you save.
                    </p>
                </div>
            )}


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

function listingToForm(l: ListingDetail): ListingFormState {
    return {
        title: l.title ?? '', companyName: l.companyName ?? '', overview: l.overview ?? '', description: l.description ?? '',
        applyEmail: l.applyEmail ?? '', jobBankId: l.jobBankId ?? '',
        jobMode: l.jobMode ?? '', jobType: l.jobType ?? '',
        highlights: l.highlights ?? [], benefits: l.benefits ?? [], categories: l.categories ?? [],
        campaignLabel: l.campaignWindow?.label ?? 'Hiring Campaign',
        listingStatus: l.status ?? 'pending',
        slots: (l.slots ?? []).map(s => ({
            location: s.location ?? '', province: s.province ?? '', city: s.city ?? '',
            jobPay: String(s.jobPay ?? ''), jobVacancy: s.jobVacancy ?? '',
            jobStartingTime: s.jobStartingTime ?? '', isActive: s.isActive ?? true,
            shifts: (s.shifts ?? []).map(sh => ({
                label: sh.label ?? '', startTime: sh.startTime ?? '',
                endTime: sh.endTime ?? '', days: sh.days ?? [],
            })),
        })),
        siteWindows: (l.siteWindows ?? []).map(w => ({
            site: w.site,
            startAt: toLocalDatetimeInput(w.startAt),
            endAt: toLocalDatetimeInput(w.endAt),
        })),
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AdminListingEditPage({ params }: any) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const { id: rawId } = params;
    const listingId = rawId && rawId !== 'new' && isValidObjectId(rawId) ? rawId : null;
    const isCreate = !listingId;
    const hasInvalidId = rawId && rawId !== 'new' && !isValidObjectId(rawId);
    const tableParam = (searchParams?.get('table') as 'drafts' | 'live') ?? 'drafts';

    // ── State ─────────────────────────────────────────────────
    const [listing, setListing] = useState<ListingDetail | null>(null);
    const [loadingListing, setLoadingListing] = useState(!isCreate && !hasInvalidId);
    const [listingError, setListingError] = useState<string | null>(
        hasInvalidId ? `Invalid listing ID: "${rawId}". Expected a 24-character MongoDB ObjectId.` : null,
    );

    const [editStatus, setEditStatus] = useState('pending');
    const [editAdminNote, setEditAdminNote] = useState('');
    // const [savingMeta, setSavingMeta] = useState(false);
    // const [metaSaveMsg, setMetaSaveMsg] = useState<string | null>(null);

    const [form, setForm] = useState<ListingFormState>({ ...EMPTY_FORM });
    const [meta, setMeta] = useState<MetaFormState>({ ...EMPTY_META });
    const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
    const [ogImageFile, setOgImageFile] = useState<File | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    // ── Derived slug / url ────────────────────────────────────
    const derivedSlug = isCreate ? slugFromTitle(form.title) : (listing?.slug ?? slugFromTitle(form.title));
    const derivedUrlPattern = derivedSlug ? `/jobs/${derivedSlug}` : '';

    useEffect(() => {
        setMeta(prev => ({ ...prev, urlPattern: derivedUrlPattern, title: prev.title || form.title, ogTitle: prev.ogTitle || form.title }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [derivedUrlPattern]);

    const prevTitle = useRef(form.title);
    useEffect(() => {
        if (prevTitle.current !== form.title) {
            setMeta(prev => ({
                ...prev,
                title: prev.title === prevTitle.current ? form.title : prev.title,
                ogTitle: prev.ogTitle === prevTitle.current ? form.title : prev.ogTitle,
            }));
            prevTitle.current = form.title;
        }
    }, [form.title]);

    // ── Fetch SEO metadata ────────────────────────────────────
    // const metaFetched = useRef(false);
    // const fetchMetadata = useCallback(async () => {
    //     if (!derivedUrlPattern || metaFetched.current) return;
    //     metaFetched.current = true;
    //     try {
    //         const res = await fetch(`/api/admin/metadata?url=${encodeURIComponent(derivedUrlPattern)}&site=${encodeURIComponent(meta.siteId || '*')}`);
    //         if (!res.ok) return;
    //         const json = await res.json();
    //         if (json.data && json.data.urlPattern === derivedUrlPattern) {
    //             setMeta({
    //                 metaId: json.data.id ?? '', urlPattern: json.data.urlPattern,
    //                 siteId: json.data.siteId ?? '*', title: json.data.title ?? '',
    //                 description: json.data.description ?? '', keywords: json.data.keywords ?? '',
    //                 ogTitle: json.data.ogTitle ?? '', ogDescription: json.data.ogDescription ?? '',
    //                 ogImage: json.data.ogImage ?? '', canonicalUrl: json.data.canonicalUrl ?? '',
    //                 robots: json.data.robots ?? 'index, follow', isActive: json.data.isActive !== false,
    //             });
    //         }
    //     } catch { /* metadata is optional */ }
    // }, [derivedUrlPattern]);

    // ── Load listing (edit mode) ──────────────────────────────
    const fetchListing = useCallback(async () => {
        if (!listingId) return;
        setLoadingListing(true); setListingError(null);
        try {
            const res = await fetch(`/api/admin/listings/${listingId}?table=${tableParam}`);
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load listing');
            const json = await res.json();
            const l: ListingDetail = json.data ?? json;
            setListing(l);
            setEditStatus(l.status ?? (l.isActive ? 'active' : 'inactive'));
            setEditAdminNote('');
            setForm(listingToForm(l));
        } catch (e: any) { setListingError(e.message); }
        finally { setLoadingListing(false); }
    }, [listingId, tableParam]);

    useEffect(() => {
        if (!hasInvalidId) fetchListing();
        fetch('/api/services?status=published&isActive=true&perPage=100')
            .then(r => r.json())
            .then(json => setCategories((json.data ?? []).map((s: any) => ({ value: s.title, label: s.title }))))
            .catch(() => { });
    }, [fetchListing, hasInvalidId]);

    // useEffect(() => { if (!isCreate) fetchMetadata(); }, [isCreate, fetchMetadata]);

    // ── Save admin meta (left panel) ──────────────────────────
    // const handleSaveMeta = async () => {
    //     if (!listingId) return;
    //     setSavingMeta(true); setMetaSaveMsg(null);
    //     try {
    //         const res = await fetch(`/api/admin/listings/${listingId}`, {
    //             method: 'PUT', headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 table: tableParam,
    //                 action: editStatus === 'approved' ? 'approve' : editStatus === 'rejected' ? 'reject' : 'update-status',
    //                 adminNotes: editAdminNote || undefined,
    //                 isActive: editStatus === 'active' ? true : editStatus === 'inactive' ? false : undefined,
    //             }),
    //         });
    //         if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
    //         setMetaSaveMsg('Saved ✓');
    //         setTimeout(() => setMetaSaveMsg(null), 2500);
    //         await fetchListing();
    //     } catch (e: any) { setMetaSaveMsg(`Error: ${e.message}`); }
    //     finally { setSavingMeta(false); }
    // };

    // ── Submit listing form ───────────────────────────────────
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Client-side validation
        const parsed = ListingFormSchema.safeParse(form);
        if (!parsed.success) {
            const firstError = (parsed.error as any).errors[0];
            toast.error(firstError.message);
            setSubmitting(false);
            return;
        }

        const toastId = toast.loading(isCreate ? 'Creating listing…' : 'Saving changes…');

        try {
            const slotsPayload = form.slots.map(s => ({
                location: s.location, province: s.province, city: s.city,
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

            const siteWindowsPayload = form.siteWindows.map(w => ({
                site: w.site,
                startAt: new Date(w.startAt).toISOString(),
                endAt: new Date(w.endAt).toISOString(),
            }));

            const body = {
                title: form.title, companyName: form.companyName,
                overview: form.overview, description: form.description,
                applyEmail: form.applyEmail, jobBankId: form.jobBankId,
                jobMode: form.jobMode, jobType: form.jobType || undefined,
                highlights: form.highlights, benefits: form.benefits,
                categories: form.categories, slots: slotsPayload,
                siteWindows: siteWindowsPayload,
                campaignWindow: siteWindowsPayload.length > 0
                    ? { label: form.campaignLabel } : undefined,
                status: form.listingStatus, table: tableParam,
            };

            let res: Response;
            if (isCreate) {
                res = await fetch('/api/admin/listings/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create', ...body }),
                });
            } else {
                res = await fetch(`/api/admin/listings/${listingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', ...body }),
                });
            }

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Submission failed');

            toast.success(
                isCreate
                    ? `Listing created! Job ID: ${json.jobId ?? json.id ?? '—'}`
                    : 'Listing updated successfully.',
                { id: toastId }
            );

            if (isCreate) {
                setForm({ ...EMPTY_FORM });
                setTimeout(() => router.push('/admin/listings'), 1800);
            } else {
                await fetchListing();
            }
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Guards ────────────────────────────────────────────────
    if (!isCreate && loadingListing) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem', color: '#64748b' }}>
                <div className="spinner-border text-primary" />
                <p style={{ margin: 0 }}>Loading listing…</p>
            </div>
        );
    }
    if (!isCreate && (listingError || (!listing && !hasInvalidId))) {
        return (
            <div className="container py-4">
                <div className="alert alert-danger">
                    <i className="ti ti-alert-circle me-2" />{listingError || 'Listing not found'}
                    {hasInvalidId && (
                        <div className="mt-2 small">
                            <strong>Tip:</strong> IDs must be 24-char hex MongoDB ObjectIds.
                            To create a new listing <a href="/admin/listings/edit">click here</a>.
                        </div>
                    )}
                </div>
                <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-sm btn-secondary" onClick={() => router.back()}>← Back</button>
                    <button className="btn btn-sm btn-primary" onClick={() => router.push('/admin/listings/edit')}>+ New Listing</button>
                </div>
            </div>
        );
    }

    const pageTitle = isCreate ? 'New Job Listing' : `Edit: ${listing?.title ?? '…'}`;
    // const statusOptions = tableParam === 'live' ? ['active', 'inactive'] : ['pending', 'scheduled', 'approved', 'rejected'];

    // ── Render ────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>

            {/* ── Global styles ───────────────────────────────── */}
            <style>{`
                /* ─ Inputs ─ */
                .jl-input {
                    border: 1.5px solid #e2e8f0 !important;
                    border-radius: 9px !important;
                    background: #f8fafd !important;
                    font-size: .88rem !important;
                    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease !important;
                }
                .jl-input:focus {
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 3px rgba(37,99,235,.12) !important;
                    background: #fff !important;
                    outline: none !important;
                }
                .tox-tinymce { border-radius: 10px !important; border: 1.5px solid #e2e8f0 !important; }

                /* ─ Section card hover ─ */
                .jl-section-card { transition: box-shadow .2s ease; }

                /* ─ Responsive 3-col grid layout ─ */
                .jl-layout {
                    display: grid;
                    grid-template-columns: 1fr ;
                    gap: 20px;
                    max-width: 1600px;
                    margin: 0 auto;
                    padding: 0 1.25rem 3rem;
                    align-items: start;
                }
                .jl-panel-left   { grid-column: 1; }
                .jl-panel-center { grid-column: 2; }
                .jl-panel-right  { grid-column: 3; position: sticky; top: 16px; }

                /* ─ Tablet: 2-column, right drops below center ─ */
                @media (max-width: 1200px) {
                    .jl-layout {
                        grid-template-columns: 1fr;
                    }
                    .jl-panel-left   { grid-column: 1; grid-row: 1 / 3; }
                    .jl-panel-center { grid-column: 2; grid-row: 1; }
                    .jl-panel-right  { grid-column: 2; grid-row: 2; position: static; }
                }

                /* ─ Mobile: single column ─ */
                @media (max-width: 767px) {
                    .jl-layout {
                        grid-template-columns: 1fr;
                        gap: 14px;
                        padding: 0 .75rem 5.5rem;
                    }
                    .jl-panel-left   { grid-column: 1 !important; grid-row: auto !important; order: 2; }
                    .jl-panel-center { grid-column: 1 !important; grid-row: auto !important; order: 1; }
                    .jl-panel-right  { grid-column: 1 !important; grid-row: auto !important; position: static !important; order: 3; }
                    .jl-header-inner { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
                    .jl-header-right-btns { width: 100%; justify-content: space-between !important; }
                    .jl-cancel-btn   { display: none !important; }
                    .jl-header-sub   { display: none; }
                    .jl-header-title { font-size: 15px !important; }
                }

                /* ─ Mobile sticky save bar ─ */
                .jl-mobile-bar {
                    display: none;
                    position: fixed; bottom: 0; left: 0; right: 0;
                    background: #fff; border-top: 1.5px solid #e2e8f0;
                    padding: .7rem 1rem; z-index: 200;
                    gap: .6rem; align-items: center;
                    box-shadow: 0 -4px 20px rgba(0,0,0,.09);
                }
                @media (max-width: 767px) {
                    .jl-mobile-bar { display: flex !important; }
                    .jl-header-save-btn { display: none !important; }
                }

                /* ─ Image uploader thumbnail hover ─ */
                .jl-img-thumb:hover { border-color: #2563eb !important; background-color: #eff6ff !important; }
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

            {/* ── Page header ─────────────────────────────────── */}
            <div style={{
                background: '#5b50e1',
                padding: '1.2rem 1.75rem', marginBottom: '1.5rem',
                boxShadow: '0 2px 16px rgba(0,0,0,.2)',
            }}>
                <div style={{ maxWidth: 1600, margin: '0 auto' }}>
                    <div className="jl-header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                        {/* Left: back + title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 auto', minWidth: 0 }}>
                            <button onClick={() => router.push('/admin/listings')} style={{
                                background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
                                borderRadius: 9, color: '#fff', padding: '6px 14px', cursor: 'pointer',
                                fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}>
                                <i className="ti ti-arrow-left" /> All Listings
                            </button>
                            <div style={{ minWidth: 0 }}>
                                <h1 className="jl-header-title" style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <i className={`ti ${isCreate ? 'ti-file-plus' : 'ti-pencil'} me-2`} />{pageTitle}
                                </h1>
                                <p className="jl-header-sub" style={{ margin: '3px 0 0', color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
                                    {isCreate ? 'Creates a new draft listing.' : `Table: ${tableParam}`}
                                    {!isCreate && listing?.slug && <span> · <code style={{ color: 'rgba(255,255,255,.55)' }}>{listing.slug}</code></span>}
                                </p>
                            </div>
                            {!isCreate && listing?.status && <StatusBadge status={listing.status} />}
                            {!isCreate && listing?.jobId && (
                                <code style={{ fontSize: '.72rem', background: 'rgba(255,255,255,.12)', padding: '3px 9px', borderRadius: 6, color: 'rgba(255,255,255,.7)', whiteSpace: 'nowrap', display: 'none' }} className="d-md-inline">
                                    {listing.jobId}
                                </code>
                            )}
                        </div>

                        {/* Right: action buttons (hidden on mobile — shown in sticky bar) */}
                        <div className="jl-header-right-btns" style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                            <button className="jl-cancel-btn" onClick={() => router.push('/admin/listings')} style={{
                                background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
                                borderRadius: 9, color: '#fff', padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                            }}>Cancel</button>
                            <button
                                className="jl-header-save-btn"
                                form="listing-form" type="submit" disabled={submitting}
                                style={{
                                    background: submitting ? '#6b7280' : 'linear-gradient(135deg,#16a34a,#22c55e)',
                                    border: 'none', borderRadius: 9, color: '#fff', padding: '8px 22px',
                                    cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    boxShadow: submitting ? 'none' : '0 2px 10px rgba(34,197,94,.4)',
                                }}>
                                {submitting
                                    ? <><span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</>
                                    : <><i className="ti ti-device-floppy" /> {isCreate ? 'Create listing' : 'Save changes'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Responsive 3-column body ────────────────────── */}
            <div className="jl-layout">

                {/* ══ LEFT PANEL ═══════════════════════════════ */}
                {/* <div className="jl-panel-left">
                    {isCreate ? (
                        <SectionCard icon="ti-bulb" title="Quick tips">
                            <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '.4rem', fontSize: '.83rem', color: '#475569' }}>
                                <li>Job ID auto-generates on save.</li>
                                <li>Add at least one location slot.</li>
                                <li>Set site windows to schedule publish.</li>
                                <li>Fill the SEO panel on the right.</li>
                                <li>Leave status <em>pending</em> until ready.</li>
                            </ul>
                        </SectionCard>
                    ) : (
                        <>
                            <SectionCard icon="ti-file-description" title="Listing Info">
                                <div style={{ display: 'grid', gap: '.4rem' }}>
                                    {listing?.jobId && <InfoRow label="Job ID" value={<span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{listing.jobId}</span>} />}
                                    <InfoRow label="Slug" value={<span style={{ fontFamily: 'monospace', fontSize: '.74rem', color: '#64748b' }}>{listing?.slug}</span>} />
                                    <InfoRow label="Submitted by" value={listing?.submittedBy ?? '—'} />
                                    <InfoRow label="Job Bank ID" value={listing?.jobBankId ?? '—'} />
                                    <InfoRow label="Table" value={<span style={{ textTransform: 'capitalize' }}>{tableParam}</span>} />
                                </div>
                            </SectionCard>

                            <SectionCard icon="ti-settings" title="Admin Controls">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
                                    <div>
                                        <label className="form-label small fw-semibold mb-1">Status</label>
                                        <select className="form-select form-select-sm jl-input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                                            {statusOptions.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label small fw-semibold mb-1">Admin note</label>
                                        <textarea className="form-control form-control-sm jl-input" rows={3}
                                            placeholder="Optional note…" value={editAdminNote}
                                            onChange={e => setEditAdminNote(e.target.value)} maxLength={2000} />
                                        <small className="text-muted" style={{ fontSize: '.7rem' }}>{editAdminNote.length}/2000</small>
                                    </div>
                                    <button className="btn btn-sm btn-primary w-100" style={{ borderRadius: 9, fontWeight: 600 }} onClick={handleSaveMeta} disabled={savingMeta}>
                                        {savingMeta ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : 'Save status & note'}
                                    </button>
                                    {metaSaveMsg && (
                                        <div className={`alert py-1 px-2 small mb-0 ${metaSaveMsg.startsWith('Error') ? 'alert-danger' : 'alert-success'}`} style={{ borderRadius: 9 }}>
                                            {metaSaveMsg}
                                        </div>
                                    )}
                                </div>
                            </SectionCard>

                            {(listing?.adminNotes?.length ?? 0) > 0 && (
                                <SectionCard icon="ti-notes" title={`Notes (${listing!.adminNotes.length})`}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', maxHeight: 260, overflowY: 'auto' }}>
                                        {[...listing!.adminNotes].reverse().map((n, i) => {
                                            const c: Record<string, string> = { status_change: '#1e40af', update_request: '#065f46', update_rejection: '#991b1b', general: '#475569' };
                                            return (
                                                <div key={i} style={{ padding: '.55rem .7rem', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', borderLeft: `3px solid ${c[n.type] ?? '#94a3b8'}` }}>
                                                    <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginBottom: '.2rem' }}>
                                                        <span style={{ fontSize: '.65rem', fontWeight: 700, color: c[n.type] ?? '#64748b' }}>{n.type?.replace(/_/g, ' ')}</span>
                                                        <span style={{ fontSize: '.65rem', color: '#94a3b8' }}>{n.createdBy ?? 'system'} · {new Date(n.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '.8rem', color: '#334155' }}>{n.message}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </SectionCard>
                            )}

                            {(listing?.visibleOnSites?.length ?? 0) > 0 && (
                                <SectionCard icon="ti-world" title="Visible on sites">
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                                        {listing!.visibleOnSites.map(s => (
                                            <span key={s} style={{ fontSize: '.72rem', fontWeight: 600, background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: 20, border: '1px solid #bfdbfe' }}>
                                                {SITE_LABELS[s] ?? s}
                                            </span>
                                        ))}
                                    </div>
                                </SectionCard>
                            )}

                            <SectionCard icon="ti-clock" title="Timeline">
                                <div style={{ display: 'grid', gap: '.4rem' }}>
                                    <InfoRow label="Created" value={listing?.createdAt ? new Date(listing.createdAt).toLocaleString() : '—'} />
                                    <InfoRow label="Updated" value={listing?.updatedAt ? new Date(listing.updatedAt).toLocaleString() : '—'} />
                                </div>
                            </SectionCard>
                        </>
                    )}
                </div> */}

                {/* ══ CENTER PANEL ─ Listing form ══════════════ */}
                <div className="jl-panel-center w-100">
                    {/* Section header */}
                    {/* <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.25rem', paddingBottom: '.9rem', borderBottom: '2px solid #e8edf4' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#1e3a6e,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className={`ti ${isCreate ? 'ti-file-plus' : 'ti-pencil'}`} style={{ color: '#fff', fontSize: '1rem' }} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                {isCreate ? 'Create Job Listing' : 'Edit Job Listing'}
                            </h2>
                            <p style={{ margin: '.1rem 0 0', fontSize: '.76rem', color: '#64748b' }}>
                                {isCreate ? 'All fields create a new draft.' : 'Changes overwrite the current record.'}
                            </p>
                        </div>
                    </div> */}

                    {/* {submitSuccess && <div className="alert alert-success mb-3" style={{ borderRadius: 10 }}>{submitSuccess}</div>}
                    {submitError && <div className="alert alert-danger mb-3" style={{ borderRadius: 10 }}>{submitError}</div>} */}

                    <form id="listing-form" onSubmit={handleSubmit}>

                        {/* ── Listing Information ── */}
                        <SectionCard icon="ti-file-description" title="Listing Information">
                            <div className="row g-3">
                                {/* <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Job Bank ID</label>
                                    <input type="text" className="form-control form-control-sm jl-input"
                                        placeholder="Leave blank to auto-assign"
                                        value={form.jobBankId}
                                        disabled
                                        onChange={e => setForm(f => ({ ...f, jobBankId: e.target.value }))} />
                                </div> */}
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Title *</label>
                                    <input type="text" className="form-control form-control-sm jl-input" required
                                        placeholder="e.g. Senior Software Engineer"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Company Name *</label>
                                    <input type="text" className="form-control form-control-sm jl-input" required
                                        placeholder="Enter The Company Name"
                                        value={form.companyName}
                                        onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Job mode *</label>
                                    <select className="form-select form-select-sm jl-input" required
                                        value={form.jobMode} onChange={e => setForm(f => ({ ...f, jobMode: e.target.value }))}>
                                        <option value="">Select mode…</option>
                                        {JOB_MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Job type</label>
                                    <select className="form-select form-select-sm jl-input"
                                        value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}>
                                        <option value="">Select type…</option>
                                        {JOB_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                {/* <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Initial status</label>
                                    <select className="form-select form-select-sm jl-input"
                                        value={form.listingStatus} onChange={e => setForm(f => ({ ...f, listingStatus: e.target.value }))}>
                                        <option value="pending">Pending (default)</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="approved">Approved (live immediately)</option>
                                    </select>
                                    <small className="text-muted" style={{ fontSize: '.72rem' }}>Admin-only: bypasses normal review flow.</small>
                                </div> */}
                                <div className="col-12">
                                    <label className="form-label small fw-semibold">Overview *</label>
                                    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                                        <Editor
                                            apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                            value={form.overview}
                                            onEditorChange={content => setForm(f => ({ ...f, overview: content }))}
                                            init={{
                                                height: 340, menubar: true, branding: false,
                                                plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'],
                                                toolbar: 'undo redo | blocks | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist outdent indent | link image table | removeformat code | help',
                                                image_title: true, automatic_uploads: true, file_picker_types: 'image',
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
                                    {!form.overview && <p style={{ margin: '4px 0 0', fontSize: '.73rem', color: '#94a3b8' }}>Required — enter a full job description above.</p>}
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-semibold">Description *</label>
                                    <input type="text" className="form-control form-control-sm jl-input" required
                                        placeholder="Short one-line description"
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-semibold">Apply Email *</label>
                                    <input type="email" className="form-control form-control-sm jl-input" required
                                        placeholder="applications@company.com"
                                        value={form.applyEmail}
                                        onChange={e => setForm(f => ({ ...f, applyEmail: e.target.value }))} />
                                </div>

                                {categories.length > 0 && (
                                    <div className="col-12">
                                        <label className="form-label small fw-semibold">Categories</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', padding: '.65rem', background: '#f8fafd', border: '1.5px solid #e2e8f0', borderRadius: 10 }}>
                                            {categories.map(cat => {
                                                const selected = form.categories.includes(cat.value);
                                                return (
                                                    <button key={cat.value} type="button"
                                                        onClick={() => setForm(f => ({
                                                            ...f,
                                                            categories: selected ? f.categories.filter(c => c !== cat.value) : [...f.categories, cat.value],
                                                        }))}
                                                        style={{
                                                            padding: '.2rem .65rem', borderRadius: 20, fontSize: '.75rem', fontWeight: 600,
                                                            cursor: 'pointer', border: '1.5px solid', transition: 'all .12s',
                                                            borderColor: selected ? '#2563eb' : '#e2e8f0',
                                                            background: selected ? '#2563eb' : '#fff',
                                                            color: selected ? '#fff' : '#64748b',
                                                        }}>
                                                        {selected && '✓ '}{cat.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="col-12">
                                    <label className="form-label small fw-semibold">Key highlights</label>
                                    <StringListBuilder label="Highlights" items={form.highlights}
                                        placeholder="e.g. Competitive salary"
                                        onChange={h => setForm(f => ({ ...f, highlights: h }))} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-semibold">Benefits</label>
                                    <StringListBuilder label="Benefits" items={form.benefits}
                                        placeholder="e.g. Extended health & dental"
                                        onChange={b => setForm(f => ({ ...f, benefits: b }))} />
                                </div>
                            </div>
                        </SectionCard>

                        {/* ── Locations & Shifts ── */}
                        <SectionCard icon="ti-map-pin" title="Locations & Shifts">
                            <p className="small text-muted mb-3">Each location has its own pay, vacancy, and shift schedule.</p>
                            <SlotsBuilder slots={form.slots} onChange={slots => setForm(f => ({ ...f, slots }))} />
                        </SectionCard>

                        {/* ── Select Sites To publish Listing ── */}
                        <SectionCard icon="ti-calendar-time" title="Select Sites To publish Listing">
                            <p className="small text-muted mb-3">Control on which sites this listing appears. Leave empty to keep as pending.</p>
                            <SiteWindowsBuilder
                                windows={form.siteWindows}
                                onChange={siteWindows => setForm(f => ({ ...f, siteWindows }))}
                                isUpdate={!isCreate}
                            />
                        </SectionCard>

                        {/* ── Form actions ── */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem', paddingTop: '.5rem' }}>
                            <button type="button" className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 9 }}
                                onClick={() => isCreate ? setForm({ ...EMPTY_FORM }) : fetchListing()} disabled={submitting}>
                                {isCreate ? 'Reset form' : 'Discard changes'}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}
                                style={{ padding: '.55rem 1.5rem', fontWeight: 600, borderRadius: 10 }}>
                                {submitting
                                    ? <><span className="spinner-border spinner-border-sm me-2" />{isCreate ? 'Creating…' : 'Saving…'}</>
                                    : <><i className={`ti ${isCreate ? 'ti-send' : 'ti-device-floppy'} me-2`} />{isCreate ? 'Create listing' : 'Save changes'}</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ══ RIGHT PANEL ─ SEO / Metadata ════════════ */}
                {/* <div className="jl-panel-right">

                    
                    <div style={{
                        background: 'linear-gradient(135deg,#1e3a6e,#2563eb)',
                        borderRadius: 13, padding: '13px 16px', marginBottom: 14,
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        boxShadow: '0 4px 16px rgba(37,99,235,.25)',
                    }}>
                        <i className="ti ti-link" style={{ color: 'rgba(255,255,255,.6)', marginTop: 2, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>URL Pattern</p>
                            <p style={{ margin: '3px 0 0', color: '#fff', fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {derivedUrlPattern || <span style={{ color: 'rgba(255,255,255,.3)' }}>Type a title to preview…</span>}
                            </p>
                        </div>
                    </div>

                    
                    <SectionCard icon="ti-seo" title="SEO / Metadata">
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#1e40af', display: 'flex', gap: 7 }}>
                            <i className="ti ti-info-circle" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>
                                All fields optional.
                                {meta.metaId && <strong style={{ color: '#059669' }}> Existing record will update.</strong>}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                            <div>
                                <label className="form-label small fw-semibold">URL pattern</label>
                                <input type="text" className="form-control form-control-sm"
                                    value={meta.urlPattern} readOnly
                                    style={{ ...IS, background: '#f1f5f9', color: '#94a3b8', cursor: 'default' }} />
                            </div>
                            <div>
                                <label className="form-label small fw-semibold">Site</label>
                                <select className="form-select form-select-sm jl-input" value={meta.siteId}
                                    onChange={e => { metaFetched.current = false; setMeta(m => ({ ...m, siteId: e.target.value })); }}>
                                    <option value="*">🌐 All sites (global)</option>
                                    {KNOWN_SITES.map(site => (
                                        <option key={site} value={site}>{SITE_LABELS[site] ?? site}</option>
                                    ))}
                                </select>
                                <small className="text-muted" style={{ fontSize: '.72rem' }}>Pick a site to override global metadata.</small>
                            </div>
                            <div>
                                <label className="form-label small fw-semibold">
                                    Page title <span style={{ color: '#94a3b8', fontWeight: 400 }}>({meta.title.length}/60)</span>
                                </label>
                                <input type="text" className="form-control form-control-sm jl-input"
                                    placeholder="Job title | Site name" value={meta.title}
                                    onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} />
                                <CharBar len={meta.title.length} max={60} />
                            </div>
                            <div>
                                <label className="form-label small fw-semibold">
                                    Meta description <span style={{ color: '#94a3b8', fontWeight: 400 }}>({meta.description.length}/155)</span>
                                </label>
                                <textarea className="form-control form-control-sm jl-input" rows={3}
                                    placeholder="2–3 sentence job summary for search engines…"
                                    value={meta.description}
                                    onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} />
                                <CharBar len={meta.description.length} max={155} />
                            </div>
                            <div>
                                <label className="form-label small fw-semibold">Keywords</label>
                                <input type="text" className="form-control form-control-sm jl-input"
                                    placeholder="software engineer, Toronto, remote" value={meta.keywords}
                                    onChange={e => setMeta(m => ({ ...m, keywords: e.target.value }))} />
                                <small className="text-muted" style={{ fontSize: '.72rem' }}>Comma-separated</small>
                            </div>
                        </div>
                    </SectionCard>

                    
                    <SectionCard icon="ti-brand-meta" title="Open Graph">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                            <div>
                                <label className="form-label small fw-semibold">OG title</label>
                                <input type="text" className="form-control form-control-sm jl-input"
                                    placeholder="Defaults to page title" value={meta.ogTitle}
                                    onChange={e => setMeta(m => ({ ...m, ogTitle: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label small fw-semibold">OG description</label>
                                <textarea className="form-control form-control-sm jl-input" rows={2}
                                    placeholder="Social share description…" value={meta.ogDescription}
                                    onChange={e => setMeta(m => ({ ...m, ogDescription: e.target.value }))} />
                            </div>

                            
                            <div>
                                <label className="form-label small fw-semibold mb-2 d-block">OG Image</label>
                                <div style={{
                                    padding: '.75rem', borderRadius: 10,
                                    background: '#f8fafd', border: '1.5px solid #e2e8f0',
                                }}>
                                    <ImageUploader
                                        currentImageUrl={meta.ogImage || null}
                                        onFileSelect={file => setOgImageFile(file)}
                                        onUrlChange={url => setMeta(m => ({ ...m, ogImage: url }))}
                                        allowUrl
                                    />
                                </div>
                                <small className="text-muted d-block mt-1" style={{ fontSize: '.7rem' }}>
                                    Recommended: 1200×630px. Upload or paste a URL.
                                </small>
                            </div>
                        </div>
                    </SectionCard>

                    
                    <SectionCard icon="ti-settings-2" title="Advanced SEO">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                            <div>
                                <label className="form-label small fw-semibold">Canonical URL</label>
                                <input type="url" className="form-control form-control-sm jl-input"
                                    placeholder="https://yoursite.com/jobs/…" value={getLocalImageUrl(meta.canonicalUrl)}
                                    onChange={e => setMeta(m => ({ ...m, canonicalUrl: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label small fw-semibold">Robots</label>
                                <input type="text" className="form-control form-control-sm jl-input"
                                    placeholder="index, follow" value={meta.robots}
                                    onChange={e => setMeta(m => ({ ...m, robots: e.target.value }))} />
                            </div>
                            <div className="form-check form-switch mt-1">
                                <input type="checkbox" className="form-check-input" checked={meta.isActive}
                                    onChange={e => setMeta(m => ({ ...m, isActive: e.target.checked }))} />
                                <label className="form-check-label small">Metadata record active</label>
                            </div>
                        </div>
                    </SectionCard>

                </div> */}


            </div>

            <div className="jl-mobile-bar">
                <button onClick={() => router.push('/admin/listings')} style={{
                    flex: 1, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10,
                    color: '#475569', padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>Cancel</button>
                <button form="listing-form" type="submit" disabled={submitting} style={{
                    flex: 2, background: submitting ? '#6b7280' : 'linear-gradient(135deg,#16a34a,#22c55e)',
                    border: 'none', borderRadius: 10, color: '#fff', padding: '10px',
                    cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    boxShadow: submitting ? 'none' : '0 2px 10px rgba(34,197,94,.35)',
                }}>
                    {submitting
                        ? <><span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</>
                        : <><i className="ti ti-device-floppy" />{isCreate ? 'Create listing' : 'Save changes'}</>}
                </button>
            </div>

        </div>
    );
}
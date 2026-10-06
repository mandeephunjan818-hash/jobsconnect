'use client';

/**
 * src/app/admin/blog/page.tsx
 *
 * Updated for new BlogPost schema:
 *   • siteWindows[]  — per-site start/end scheduling (replaces single publishAt)
 *   • schedulerRefs  — internal QStash refs (never shown in UI)
 *   • Single-panel create/edit modal (no tabs)
 *   • Elegant per-site window builder in modal
 *   • visibleOnSites derived automatically from siteWindows on the backend
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import ExcelJS from 'exceljs';
import getLocalImageUrl from '@/utils/ChangeImageUrl';

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
] as const;

type KnownSite = (typeof KNOWN_SITES)[number];

const SITE_LABELS: Record<string, string> = {
    'jobs-connect.vercel.app': 'Jobs Connect',
    'new-jobs-fawn.vercel.app': 'New in Canada',
    'jobsrefugee.ca': 'Jobs for Refugees',
    'vulnerableyouthsjobs.ca': 'Vulnerable Youths',
    'accesscareers.ca': 'Access Careers',
    'indigenouspeoplesjobs.ca': 'Indigenous Peoples',
};

// Distinct colour per site for visual identification
const SITE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'jobs-connect.vercel.app': { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
    'new-jobs-fawn.vercel.app': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    'jobsrefugee.ca': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    'vulnerableyouthsjobs.ca': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    'accesscareers.ca': { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
    'indigenouspeoplesjobs.ca': { bg: '#e0f2fe', text: '#0c4a6e', border: '#7dd3fc' },
};

const tinymceConfig = {
    height: 320,
    menubar: false,
    plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
        'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
        'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount',
    ],
    toolbar:
        'undo redo | blocks | bold italic underline strikethrough forecolor backcolor | ' +
        'alignleft aligncenter alignright alignjustify | ' +
        'bullist numlist outdent indent | link image media table | ' +
        'code fullscreen preview | removeformat help',
    content_style:
        'body { font-family: system-ui,-apple-system,sans-serif; font-size:14px; color:#212529; }',
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface AdminNote { message: string; type: string; createdAt: string; createdBy?: string; }

interface SiteWindow {
    site: string;
    startAt: string;
    endAt: string;
    durationDays?: number;
}

interface BlogPostItem {
    id: string;
    title: string;
    excerpt: string;
    imageUrl: string;
    category: string;
    date: string;
    slug: string;
    order: number;
    status: string;
    isActive: boolean;
    /** Derived from earliest siteWindow.startAt — for display only */
    publishAt: string | null;
    visibleOnSites: string[];
    siteWindows: SiteWindow[];
    adminNotes: AdminNote[];
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse {
    data: BlogPostItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function toLocalDatetimeValue(iso: string | null | undefined): string {
    if (!iso) return '';
    // datetime-local input needs "YYYY-MM-DDTHH:mm"
    return iso.slice(0, 16);
}

function nowPlusMinutes(min: number): string {
    return new Date(Date.now() + min * 60_000).toISOString().slice(0, 16);
}

function daysBetween(start: string, end: string): number {
    if (!start || !end) return 0;
    return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        draft: 'bg-warning text-dark',
        scheduled: 'bg-info text-dark',
        published: 'bg-success',
        archived: 'bg-secondary',
    };
    return (
        <span className={`badge px-2 py-1 small ${map[status] || 'bg-light text-dark'}`}>
            {status}
        </span>
    );
}

function SkeletonRow() {
    return (
        <tr>
            {Array.from({ length: 6 }).map((_, i) => (
                <td key={i}>
                    <div style={{ width: i === 1 ? 160 : 80, height: 18, background: '#e2e8f0', borderRadius: 4 }} />
                </td>
            ))}
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────
// SiteWindowBuilder — the per-site scheduler UI in the modal
// ─────────────────────────────────────────────────────────────
function SiteWindowBuilder({
    windows,
    onChange,
}: {
    windows: SiteWindow[];
    onChange: (w: SiteWindow[]) => void;
}) {
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [publishAt, setPublishAt] = useState<string>(nowPlusMinutes(5));

    // Unscheduled sites (not in windows array)
    const availableSites = KNOWN_SITES.filter(site => !windows.some(w => w.site === site));

    const handleActivate = () => {
        if (!selectedSite) return;
        const start = publishAt;
        // End = start + 24 hours
        const end = new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16);
        onChange([...windows, { site: selectedSite, startAt: start, endAt: end }]);
        setSelectedSite(''); // reset selection
        setPublishAt(nowPlusMinutes(5)); // reset to default
    };

    const handleRemove = (site: string) => {
        onChange(windows.filter(w => w.site !== site));
    };

    return (
        <div>
            {/* Explanation */}
            {/* <div className="alert alert-primary py-2 px-3 small d-flex align-items-start gap-2 mb-3" role="alert">
                <i className="ti ti-calendar-clock mt-1" />
                <div>
                    <strong>Per‑site scheduling</strong> — Choose a site and set its publish time.
                    The post will stay live for 24 hours.
                </div>
            </div> */}

            {/* Control area – dropdown + publish time + button */}
            {availableSites.length > 0 && (
                <div className="card border mb-3">
                    <div className="card-body p-3">
                        <label className="form-label small fw-semibold mb-2">Select site to schedule</label>
                        <select
                            className="form-select form-select-sm mb-2 border border-1 "
                            value={selectedSite}
                            onChange={e => setSelectedSite(e.target.value)}
                        >
                            <option value="">-- Choose a site --</option>
                            {availableSites.map(site => (
                                <option key={site} value={site}>{SITE_LABELS[site]}</option>
                            ))}
                        </select>

                        <label className="form-label small fw-semibold mb-2 mt-2">
                            <i className="ti ti-player-play me-1" /> Publish at
                        </label>
                        <input
                            type="datetime-local"
                            className="form-control form-control-sm mb-3"
                            value={publishAt}
                            min={nowPlusMinutes(1)}
                            onChange={e => setPublishAt(e.target.value)}
                        />

                        <button
                            className="btn btn-sm btn-primary w-100"
                            onClick={handleActivate}
                            disabled={!selectedSite}
                        >
                            <i className="ti ti-check me-1" /> Activate schedule
                        </button>
                    </div>
                </div>
            )}

            {/* Scheduled sites list */}
            {windows.length > 0 && (
                <div>
                    <small className="text-muted fw-semibold">Scheduled sites:</small>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                        {windows.map(w => {
                            const startDate = new Date(w.startAt);
                            return (
                                <span
                                    key={w.site}
                                    className="badge d-inline-flex align-items-center gap-2 bg-light text-dark border"
                                    style={{ fontSize: '.78rem', padding: '6px 10px' }}
                                >
                                    <span>{SITE_LABELS[w.site]}</span>
                                    <span className="text-muted" style={{ fontSize: '.7rem' }}>
                                        {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <button
                                        className="btn-close ms-1"
                                        style={{ fontSize: '.5rem', cursor: 'pointer' }}
                                        onClick={() => handleRemove(w.site)}
                                        title="Remove schedule"
                                    />
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Nothing scheduled */}
            {windows.length === 0 && availableSites.length === 0 && (
                <p className="text-muted text-center small py-3">All sites scheduled — edit or remove above.</p>
            )}
            {windows.length === 0 && availableSites.length > 0 && (
                <p className="text-muted text-center small py-3">No sites scheduled yet. Use the controls above to add one.</p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Image uploader
// ─────────────────────────────────────────────────────────────
interface ImageUploaderProps {
    label: string;
    currentImageUrl?: string;
    onFileSelect: (f: File | null) => void;
    onUrlChange?: (url: string) => void;
    allowUrl?: boolean;
}
function ImageUploader({ label, currentImageUrl, onFileSelect, onUrlChange, allowUrl = true }: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const [urlInput, setUrlInput] = useState(currentImageUrl || '');
    const [useUrl, setUseUrl] = useState(!!currentImageUrl && !currentImageUrl.startsWith('blob:'));
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
                setUseUrl(false);
                onFileSelect(file);
                if (onUrlChange) onUrlChange('');
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
            onFileSelect(null);
        }
    };
    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setUrlInput(url);
        setPreview(url);
        if (onUrlChange) onUrlChange(url);
        onFileSelect(null);
    };
    const handleRemove = () => {
        setPreview(null);
        setUrlInput('');
        onFileSelect(null);
        if (onUrlChange) onUrlChange('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="mb-2">
            {label && <label className="form-label small fw-semibold">{label}</label>}
            <div className="d-flex align-items-start gap-2">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border rounded-3 d-flex align-items-center justify-content-center bg-light"
                    style={{ width: 70, height: 70, cursor: 'pointer', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: preview ? `url(${preview})` : 'none', flexShrink: 0 }}
                >
                    {!preview && <i className="ti ti-photo text-muted" style={{ fontSize: '1.5rem' }} />}
                </div>
                <div className="flex-grow-1 d-none ">
                    <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={handleFileChange} />
                    {allowUrl && (
                        <>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white border-end-0"><i className="ti ti-link text-muted" /></span>
                                <input
                                    type="url"
                                    className="form-control form-control-sm border-start-0"
                                    placeholder="Or enter image URL"
                                    value={getLocalImageUrl(urlInput)}
                                    onChange={handleUrlChange}
                                    disabled={!!preview && !useUrl}
                                />
                            </div>
                            <small className="text-muted d-block mt-1">Upload or provide URL</small>
                        </>
                    )}
                    {preview && (
                        <button type="button" className="btn btn-sm btn-outline-danger mt-1 py-0" onClick={handleRemove}>
                            <i className="ti ti-trash me-1" />Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// ViewModal
// ─────────────────────────────────────────────────────────────
function ViewModal({ post, onClose, onRefresh }: { post: BlogPostItem; onClose: () => void; onRefresh: () => void; }) {
    const [activeTab, setActiveTab] = useState<'details' | 'schedule' | 'notes'>('details');
    const [noteText, setNoteText] = useState('');
    const [saving, setSaving] = useState(false);
    const [current, setCurrent] = useState(post);

    const doAction = async (action: string, extra: Record<string, any> = {}) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/blog/${current.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            const json = await res.json();
            setCurrent(json.data);
            onRefresh();
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const sendNote = async () => {
        if (!noteText.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/blog/${current.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminNote: noteText }),
            });
            if (!res.ok) throw new Error('Failed');
            const json = await res.json();
            setCurrent(json.data);
            setNoteText('');
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onClose}
        >
            <div
                style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.25)', width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{current.title}</h4>
                            <StatusBadge status={current.status} />
                            {/* {current.isActive
                                ? <span className="badge bg-success small">Visible</span>
                                : <span className="badge bg-secondary small">Hidden</span>} */}
                        </div>
                        <p style={{ margin: '.2rem 0 0', fontSize: '.8rem', color: '#64748b' }}>
                            <code style={{ fontSize: '.72rem' }}>{current.slug}</code>
                            {/* &nbsp;·&nbsp;{current.category} */}
                        </p>
                    </div>
                    <button style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }} onClick={onClose}>×</button>
                </div>

                {/* Action bar */}
                {/* <div style={{ padding: '.6rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
                    {current.status !== 'published' && (
                        <button className="btn btn-sm btn-success" onClick={() => doAction('publish')} disabled={saving}>
                            <i className="ti ti-world me-1" />Publish now
                        </button>
                    )}
                    {current.status === 'published' && (
                        <button className="btn btn-sm btn-outline-warning" onClick={() => doAction('archive')} disabled={saving}>
                            <i className="ti ti-archive me-1" />Archive
                        </button>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => doAction('toggle-active', { isActive: !current.isActive })} disabled={saving}>
                        <i className={`ti ${current.isActive ? 'ti-eye-off' : 'ti-eye'} me-1`} />
                        {current.isActive ? 'Hide' : 'Show'}
                    </button>
                </div> */}

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                    {(['details', 'schedule', 'notes'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '.75rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '.85rem', fontWeight: activeTab === tab ? 700 : 400,
                            color: activeTab === tab ? '#1a56db' : '#64748b',
                            borderBottom: activeTab === tab ? '2.5px solid #1a56db' : '2.5px solid transparent',
                        }}>
                            {tab === 'details' && <><i className="ti ti-file-description me-1" />Details</>}
                            {tab === 'schedule' && <><i className="ti ti-calendar-clock me-1" />Schedule ({current.siteWindows?.length || 0})</>}
                            {/* {tab === 'notes' && <><i className="ti ti-notes me-1" />Notes ({current.adminNotes?.length || 0})</>} */}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                    {activeTab === 'details' && (
                        <div>
                            {current.imageUrl && (
                                <img src={current.imageUrl} alt={current.title}
                                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, marginBottom: '1.25rem' }} />
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
                                {[
                                    // ['Category', current.category],
                                    // ['Order', String(current.order)],
                                    ['Date', new Date(current.date).toLocaleDateString()],
                                    // ['Created', new Date(current.createdAt).toLocaleString()],
                                    // ['Updated', new Date(current.updatedAt).toLocaleString()],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ background: '#f8fafd', borderRadius: 8, padding: '.6rem .85rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.2rem' }}>{label}</div>
                                        <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.4rem' }}>Description</p>
                            <div style={{ fontSize: '.88rem', color: '#334155', lineHeight: 1.65 }} className='lmx-rich-content' dangerouslySetInnerHTML={{ __html: current.excerpt }} />
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div>
                            {(!current.siteWindows || current.siteWindows.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                                    <i className="ti ti-calendar-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                                    No site windows configured. Post is in draft.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {current.siteWindows.map(w => {
                                        const colors = SITE_COLORS[w.site] ?? { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
                                        const now = new Date().toISOString();
                                        const isLive = w.startAt <= now && w.endAt > now;
                                        const isPast = w.endAt <= now;
                                        return (
                                            <div key={w.site} style={{ border: `1.5px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
                                                <div style={{ background: colors.bg, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#10b981' : isPast ? '#94a3b8' : '#f59e0b' }} />
                                                        <span style={{ fontWeight: 700, fontSize: '.82rem', color: colors.text }}>
                                                            {SITE_LABELS[w.site] ?? w.site}
                                                        </span>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '.65rem', fontWeight: 700,
                                                        background: isLive ? '#d1fae5' : isPast ? '#f1f5f9' : '#fef3c7',
                                                        color: isLive ? '#065f46' : isPast ? '#64748b' : '#92400e',
                                                        padding: '2px 9px', borderRadius: 20,
                                                    }}>
                                                        {isLive ? '● Live' : isPast ? 'Ended' : '◷ Scheduled'}
                                                    </span>
                                                </div>
                                                <div style={{ padding: '8px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                    <div>
                                                        <div style={{ fontSize: '.68rem', color: '#64748b', marginBottom: 2 }}>Publish at</div>
                                                        <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#0f172a' }}>
                                                            {new Date(w.startAt).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '.68rem', color: '#64748b', marginBottom: 2 }}>Hide at</div>
                                                        <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#0f172a' }}>
                                                            {new Date(w.endAt).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                {w.durationDays && (
                                                    <div style={{ padding: '0 14px 8px', fontSize: '.72rem', color: '#64748b' }}>
                                                        {w.durationDays} day window
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div>
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafd', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                                <p style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: '.5rem' }}>Add note</p>
                                <textarea className="form-control form-control-sm" rows={3} value={noteText}
                                    onChange={e => setNoteText(e.target.value)} placeholder="Internal note…" style={{ marginBottom: '.6rem' }} />
                                <button className="btn btn-sm btn-primary" onClick={sendNote} disabled={saving || !noteText.trim()}>
                                    {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : <><i className="ti ti-send me-1" />Save note</>}
                                </button>
                            </div>
                            {!current.adminNotes?.length
                                ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem' }}>No notes yet.</p>
                                : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                                        {[...current.adminNotes].reverse().map((n, i) => (
                                            <div key={i} style={{ padding: '.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', borderLeft: '3px solid #1e40af' }}>
                                                <div style={{ fontSize: '.72rem', color: '#94a3b8', marginBottom: '.25rem' }}>
                                                    {n.createdBy || 'system'} · {new Date(n.createdAt).toLocaleString()}
                                                </div>
                                                <p style={{ margin: 0, fontSize: '.88rem', color: '#334155' }}>{n.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </div>
                    )}
                </div>

                <div style={{ padding: '.9rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
export default function BlogAdminPage() {
    const [posts, setPosts] = useState<BlogPostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<BlogPostItem | null>(null);
    const [modalSubmitting, setModalSubmitting] = useState(false);

    // View modal
    const [viewTarget, setViewTarget] = useState<BlogPostItem | null>(null);
    const [imageView, setImageView] = useState({ open: false, src: '' });

    // ── Form state ────────────────────────────────────────────
    const [formData, setFormData] = useState<Partial<BlogPostItem & { status: string }>>({
        title: '', excerpt: '', imageUrl: '', category: '',
        date: new Date().toISOString().slice(0, 10),
        slug: '', order: 0, status: 'draft',
    });
    const [siteWindows, setSiteWindows] = useState<SiteWindow[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // ── Filters ───────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const perPage = 10;
    const [mobileOpen, setMobileOpen] = useState(false);

    // ── Bulk ──────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    // ── Import / export ───────────────────────────────────────
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    // ── Fetch posts ───────────────────────────────────────────
    const fetchPosts = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('perPage', String(perPage));
            params.set('sortBy', sortBy);
            // params.set('sortOrder', sortDir);
            if (search) params.set('search', search);
            if (categoryFilter) params.set('category', categoryFilter);
            if (statusFilter) params.set('status', statusFilter);
            if (siteFilter) params.set('siteId', siteFilter);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);

            const res = await fetch(`/api/blog?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setPosts(json.data); setTotal(json.total); setTotalPages(json.totalPages);
            setSelectedIds([]); setSelectAll(false);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [page, perPage, sortBy, sortDir, search, categoryFilter, statusFilter, siteFilter, dateFrom, dateTo]);

    useEffect(() => { const t = setTimeout(fetchPosts, 300); return () => clearTimeout(t); }, [fetchPosts]);

    // ── Sorting ───────────────────────────────────────────────
    const handleSort = (col: string) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };
    const SortIcon = ({ col }: { col: string }) =>
        sortBy !== col ? <i className="ti ti-arrows-sort text-muted ms-1" /> :
            sortDir === 'asc' ? <i className="ti ti-arrow-up ms-1" /> : <i className="ti ti-arrow-down ms-1" />;

    // ── Select / bulk ─────────────────────────────────────────
    const toggleSelectAll = () => {
        if (selectAll) { setSelectedIds([]); setSelectAll(false); }
        else { setSelectedIds(posts.map(p => p.id)); setSelectAll(true); }
    };
    const toggleRow = (id: string) => setSelectedIds(prev => {
        const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
        setSelectAll(next.length === posts.length && posts.length > 0);
        return next;
    });

    const handleBulkAction = async (action: string) => {
        if (!selectedIds.length) return alert('Nothing selected');
        if (action === 'delete' && !confirm(`Delete ${selectedIds.length} posts?`)) return;
        try {
            const res = await fetch('/api/blog', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            if (!res.ok) throw new Error('Bulk action failed');
            await fetchPosts();
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this post?')) return;
        try {
            const res = await fetch(`/api/blog/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            await fetchPosts();
        } catch (e: any) { alert(e.message); }
    };

    const handleToggleActive = async (post: BlogPostItem) => {
        try {
            const res = await fetch(`/api/blog/${post.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle-active', isActive: !post.isActive }),
            });
            if (!res.ok) throw new Error('Toggle failed');
            await fetchPosts();
        } catch (e: any) { alert(e.message); }
    };

    const handlePublishNow = async (id: string) => {
        try {
            const res = await fetch(`/api/blog/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'publish' }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            await fetchPosts();
        } catch (e: any) { alert(e.message); }
    };

    // ── Export ────────────────────────────────────────────────
    // const handleExport = async () => {
    //     setExporting(true);
    //     try {
    //         const res = await fetch('/api/blog?page=1&perPage=10000');
    //         const json: ApiResponse = await res.json();
    //         const wb = new ExcelJS.Workbook();
    //         const ws = wb.addWorksheet('Blog Posts');
    //         ws.columns = [
    //             { header: 'ID', key: 'id', width: 28 },
    //             { header: 'Title', key: 'title', width: 50 },
    //             // { header: 'Category', key: 'category', width: 25 },
    //             // { header: 'Slug', key: 'slug', width: 40 },
    //             // { header: 'Status', key: 'status', width: 15 },
    //             { header: 'Is Active', key: 'isActive', width: 12 },
    //             { header: 'Order', key: 'order', width: 10 },
    //             { header: 'Site Windows', key: 'siteWindows', width: 80 },
    //             { header: 'Date', key: 'date', width: 22 },
    //             { header: 'Created At', key: 'createdAt', width: 22 },
    //         ];
    //         json.data.forEach(row => {
    //             // Serialize siteWindows as pipe-separated entries
    //             const windowsStr = (row.siteWindows ?? [])
    //                 .map(w => `${w.site}:${new Date(w.startAt).toLocaleString()}→${new Date(w.endAt).toLocaleString()}`)
    //                 .join(' | ');
    //             ws.addRow({
    //                 ...row,
    //                 siteWindows: windowsStr || '(no windows)',
    //                 date: row.date ? new Date(row.date).toLocaleString() : '',
    //                 createdAt: row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
    //             });
    //         });
    //         ws.getRow(1).font = { bold: true };
    //         ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    //         const buffer = await wb.xlsx.writeBuffer();
    //         const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    //         const a = document.createElement('a');
    //         a.href = URL.createObjectURL(blob);
    //         a.download = `blog_posts_${new Date().toISOString().slice(0, 10)}.xlsx`;
    //         document.body.appendChild(a); a.click(); document.body.removeChild(a);
    //     } catch (e: any) { alert(`Export failed: ${e.message}`); }
    //     finally { setExporting(false); }
    // };

    // ── Import ────────────────────────────────────────────────
    // const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = e.target.files?.[0];
    //     if (!file) return;
    //     setImporting(true);
    //     try {
    //         const buffer = await file.arrayBuffer();
    //         const ExcelJSMod = await import('exceljs');
    //         const wb = new ExcelJSMod.Workbook();
    //         await wb.xlsx.load(buffer);
    //         const ws = wb.getWorksheet(1);
    //         if (!ws) throw new Error('No worksheet');

    //         const headers: string[] = [];
    //         ws.getRow(1).eachCell((cell, col) => { headers[col] = cell.text.toLowerCase().trim(); });

    //         const fieldMap: Record<string, string> = {
    //             'id': 'id', 'title': 'title',
    //             // 'category': 'category',
    //             //  'slug': 'slug',
    //             'status': 'status', 'is active': 'isActive', 'order': 'order', 'date': 'date',
    //         };
    //         const items: any[] = [];
    //         ws.eachRow((row, rowNum) => {
    //             if (rowNum === 1) return;
    //             const item: any = {};
    //             row.eachCell((cell, col) => {
    //                 const f = fieldMap[headers[col]];
    //                 if (f) item[f] = cell.text;
    //             });
    //             if (item.title) items.push(item);
    //         });
    //         if (!items.length) { alert('No valid rows'); return; }

    //         const res = await fetch('/api/blog/import', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ items }),
    //         });
    //         const result = await res.json();
    //         alert(`Import done: ${result.inserted} inserted, ${result.updated} updated, ${result.errors} errors`);
    //         await fetchPosts();
    //     } catch (e: any) { alert(`Import error: ${e.message}`); }
    //     finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    // };

    // ── Modal open/close ──────────────────────────────────────
    const generateSlug = (title: string) =>
        title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const handleOpenModal = (item?: BlogPostItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({ ...item, date: item.date ? item.date.slice(0, 10) : '' });
            // Populate siteWindows, normalising to datetime-local format
            setSiteWindows(
                (item.siteWindows ?? []).map(w => ({
                    site: w.site,
                    startAt: toLocalDatetimeValue(w.startAt),
                    endAt: toLocalDatetimeValue(w.endAt),
                    durationDays: w.durationDays,
                })),
            );
            setSlugManuallyEdited(true);
        } else {
            setEditingItem(null);
            setFormData({
                title: '',
                excerpt: '',
                imageUrl: '',
                category: '',
                slug: '',
                date: new Date().toISOString().slice(0, 10),
                order: posts.length + 1,
                status: 'draft',
            });
            setSiteWindows([]);
            setSlugManuallyEdited(false);
        }
        setImageFile(null);
        setShowModal(true);
    };

    // ── Submit form ───────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (siteWindows.length === 0) {
            alert('Please add at least one site schedule before saving.');
            return;
        }

        // Validate: each window must have startAt < endAt
        for (const w of siteWindows) {
            if (!w.startAt || !w.endAt) {
                alert(`Site "${SITE_LABELS[w.site] ?? w.site}": both start and end times are required.`);
                return;
            }
            if (new Date(w.endAt) <= new Date(w.startAt)) {
                alert(`Site "${SITE_LABELS[w.site] ?? w.site}": end time must be after start time.`);
                return;
            }
        }

        setModalSubmitting(true);
        try {
            const data = new FormData();

            // Scalar fields
            const skip = new Set(['siteWindows', 'visibleOnSites', 'publishAt', 'adminNotes', 'createdAt', 'updatedAt']);
            Object.entries(formData).forEach(([key, value]) => {
                if (skip.has(key)) return;
                if (value !== undefined && value !== null) data.append(key, String(value));
            });

            // siteWindows — convert local datetime strings to ISO
            if (siteWindows.length > 0) {
                const normalized = siteWindows.map(w => ({
                    site: w.site,
                    startAt: new Date(w.startAt).toISOString(),
                    endAt: new Date(w.endAt).toISOString(),
                }));
                data.append('siteWindows', JSON.stringify(normalized));
            }

            if (imageFile) data.append('imageFile', imageFile);

            const url = editingItem ? `/api/blog/${editingItem.id}` : '/api/blog';
            const method = editingItem ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: data });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');

            await fetchPosts();
            setShowModal(false);
        } catch (e: any) { alert(e.message); }
        finally { setModalSubmitting(false); }
    };

    const activeFilterCount = [search, categoryFilter, statusFilter, siteFilter, dateFrom, dateTo].filter(Boolean).length;

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────
    return (
        <div className="container-fluid py-4">

            {/* ── Page header ─────────────────────────────────────── */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3">
                <div>
                    <h4 className="mb-1 fw-semibold">Blog Management</h4>
                    <p className="text-muted small mb-0">Create, schedule, and manage blog posts across all sites</p>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal()}>
                        <i className="ti ti-plus me-1" />Add Blog
                    </button>

                    {/* <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="d-none" onChange={handleImport} />
                    <button className="btn btn-sm btn-outline-info" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                        {importing ? <><span className="spinner-border spinner-border-sm me-1" />Importing…</> : <><i className="ti ti-file-import me-1" />Import</>}
                    </button>

                    <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
                        {exporting ? <><span className="spinner-border spinner-border-sm me-1" />Exporting…</> : <><i className="ti ti-file-spreadsheet me-1" />Export</>}
                    </button> */}

                    {selectedIds.length > 0 && (
                        <div className="dropdown">
                            <button className="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                                Bulk ({selectedIds.length})
                            </button>
                            <ul className="dropdown-menu">
                                <li><button className="dropdown-item text-danger" onClick={() => handleBulkAction('delete')}>Delete selected</button></li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* ── Filter bar ─────────────────────────────────────── */}
                <div className="ulp-filters bg-white rounded-3 p-2 border w-100 mt-2" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <button
                        className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1"
                        style={{ fontSize: 13 }} onClick={() => setMobileOpen(o => !o)}
                    >
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }} />Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {activeFilterCount > 0 && (
                                <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>{activeFilterCount}</span>
                            )}
                            <i className="ti ti-chevron-down" style={{ fontSize: 14, transition: 'transform .2s', transform: mobileOpen ? 'rotate(180deg)' : 'none' }} />
                        </span>
                    </button>

                    <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
                        {[
                            { icon: 'ti-search', value: search, setter: setSearch, placeholder: 'Search posts…', width: 160 },
                            // { icon: 'ti-tag', value: categoryFilter, setter: setCategoryFilter, placeholder: 'Category…', width: 130 },
                        ].map(({ icon, value, setter, placeholder, width }) => (
                            <div key={placeholder} className="d-flex align-items-center rounded-2 px-2 gap-1"
                                style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                                <i className={`ti ${icon} text-secondary`} style={{ fontSize: 13 }} />
                                <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                    style={{ width, fontSize: 12, outline: 'none' }} placeholder={placeholder}
                                    value={value} onChange={e => { setter(e.target.value); setPage(1); }} />
                            </div>
                        ))}

                        {/* Status */}
                        {/* <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-circle-dot text-secondary" style={{ fontSize: 13 }} />
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 110, height: '100%' }}
                                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                                <option value="">All statuses</option>
                                {['draft', 'scheduled', 'published', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div> */}

                        {/* Site filter */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-world text-secondary" style={{ fontSize: 13 }} />
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 130, height: '100%' }}
                                value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1); }}>
                                <option value="">All sites</option>
                                {KNOWN_SITES.map(s => <option key={s} value={s}>{SITE_LABELS[s]}</option>)}
                            </select>
                        </div>

                        {/* Date range */}
                        {/* <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }} />
                            <input type="date" className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, width: 110, outline: 'none' }}
                                value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
                            <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                            <input type="date" className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, width: 110, outline: 'none' }}
                                value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
                        </div> */}

                        {activeFilterCount > 0 && (
                            <button className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setSiteFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
                                <i className="ti ti-x" style={{ fontSize: 12 }} />Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchPosts}>Retry</button>
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────────── */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead style={{ background: '#f2f5f9' }}>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input type="checkbox" className="form-check-input" checked={selectAll} onChange={toggleSelectAll} />
                                    </th>
                                    <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Title <SortIcon col="title" /></th>
                                    {/* <th onClick={() => handleSort('category')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Category <SortIcon col="category" /></th> */}
                                    <th>Image</th>
                                    {/* <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Status <SortIcon col="status" /></th> */}
                                    {/*<th>Visible</th> */}
                                    <th>Site schedule</th>
                                    <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Date <SortIcon col="date" /></th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                    : posts.length === 0
                                        ? (
                                            <tr>
                                                <td colSpan={9} className="text-center py-5 text-muted">
                                                    <i className="ti ti-file-unknown fs-1 d-block mb-2" />No Blog found
                                                </td>
                                            </tr>
                                        )
                                        : posts.map(row => {
                                            const windows = row.siteWindows ?? [];
                                            const now = new Date().toISOString();
                                            // const liveCount = windows.filter(w => w.startAt <= now && w.endAt > now).length;
                                            // const scheduledCount = windows.filter(w => w.startAt > now).length;

                                            return (
                                                <tr key={row.id} className="border-bottom">
                                                    <td><input type="checkbox" className="form-check-input" checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} /></td>

                                                    <td style={{ maxWidth: 300 }}>
                                                        <button className="btn btn-link btn-sm p-0 text-start fw-medium" style={{ fontSize: '.85rem', maxWidth: '100%' }} onClick={() => setViewTarget(row)}>
                                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{row.title}</div>
                                                        </button>
                                                        <code className="small text-muted d-block" style={{ fontSize: '.68rem' }}>
                                                            {row.slug?.slice(0, 30)}{row.slug?.length > 30 ? '…' : ''}
                                                        </code>
                                                    </td>

                                                    {/* <td><span className="badge bg-light text-dark border small">{row.category}</span></td> */}

                                                    <td>
                                                        {row.imageUrl
                                                            ? <img src={row.imageUrl} onClick={() => setImageView({ open: true, src: row.imageUrl })} alt="thumb"
                                                                style={{ width: 32, height: 32, objectFit: 'cover', cursor: 'pointer' }} className="rounded shadow-sm" />
                                                            : '—'}
                                                    </td>

                                                    {/* <td><StatusBadge status={row.status} /></td> */}

                                                    {/* <td>
                                                        <div className="form-check form-switch m-0">
                                                            <input type="checkbox" className="form-check-input" checked={row.isActive} onChange={() => handleToggleActive(row)} style={{ cursor: 'pointer' }} />
                                                        </div>
                                                    </td> */}

                                                    {/* Site schedule summary */}
                                                    <td style={{ minWidth: 140 }}>
                                                        {windows.length === 0 ? (
                                                            <span style={{ fontSize: '.72rem', color: '#94a3b8' }}>No schedule</span>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                                {/* Show up to 2 site pills */}
                                                                {windows.slice(0, 2).map(w => {
                                                                    const colors = SITE_COLORS[w.site] ?? { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
                                                                    const isLive = w.startAt <= now && w.endAt > now;
                                                                    return (
                                                                        <div key={w.site} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                                                                            <span style={{ fontSize: '.65rem', fontWeight: 600, background: colors.bg, color: colors.text, padding: '1px 6px', borderRadius: 20 }}>
                                                                                {SITE_LABELS[w.site] ?? w.site}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {windows.length > 2 && (
                                                                    <span style={{ fontSize: '.65rem', color: '#64748b', paddingLeft: 10 }}>
                                                                        +{windows.length - 2} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="small text-muted text-nowrap">{new Date(row.date).toLocaleDateString()}</td>

                                                    <td className="text-end">
                                                        <button className="action-btn" onClick={() => setViewTarget(row)} title="View"><i className="ti ti-eye" /></button>
                                                        {row.status !== 'published' && (
                                                            <button className="action-btn" onClick={() => handlePublishNow(row.id)} title="Publish now"><i className="ti ti-world" /></button>
                                                        )}
                                                        <button className="action-btn" onClick={() => handleOpenModal(row)} title="Edit"><i className="ti ti-edit" /></button>
                                                        <button className="action-btn" onClick={() => handleDelete(row.id)} title="Delete"><i className="ti ti-trash" /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <div className="small text-muted">Showing {posts.length} of {total} entries</div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
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

            {/* ── Create / Edit modal — single scrollable panel ─────── */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxHeight: '95vh' }}>
                        <div className="modal-content border-0 shadow" style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>

                            {/* Modal header */}
                            <div className="modal-header bg-light border-bottom py-2" style={{ flexShrink: 0 }}>
                                <h5 className="modal-title d-flex align-items-center gap-2">
                                    <i className={`ti ${editingItem ? 'ti-edit' : 'ti-plus'}`} />
                                    {editingItem ? 'Edit post' : 'Create post'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                            </div>

                            {/* Scrollable body */}
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <div className="modal-body p-4" style={{ overflowY: 'auto', flex: 1 }}>
                                    <div className="row g-4">

                                        {/* ── Left column: content fields ─────────── */}
                                        <div className="col-lg-7">

                                            <div className="mb-3">
                                                <label className="form-label small fw-semibold">Title <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    required
                                                    value={formData.title || ''}
                                                    onChange={e => {
                                                        const newTitle = e.target.value;
                                                        setFormData(prev => {
                                                            const currentSlug = prev.slug || '';
                                                            const previousAutoSlug = generateSlug(prev.title || '') || 'untitled';
                                                            const shouldUpdateSlug = currentSlug === previousAutoSlug || currentSlug === '';
                                                            return {
                                                                ...prev,
                                                                title: newTitle,
                                                                slug: shouldUpdateSlug ? (generateSlug(newTitle) || 'untitled') : currentSlug,
                                                            };
                                                        });
                                                    }}
                                                />
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label small fw-semibold">Slug <span className="text-danger">*</span></label>
                                                <input type="text" className="form-control form-control-sm" required
                                                    value={formData.slug || ''}
                                                    onChange={e => {
                                                        setSlugManuallyEdited(true);
                                                        setFormData(p => ({ ...p, slug: e.target.value }));
                                                    }}
                                                />
                                                <small className="text-muted">URL: <code>/blog/{formData.slug || '…'}</code></small>
                                            </div>

                                            {/* <div className="row g-3 mb-3">
                                                <div className="col-5">
                                                    <label className="form-label small fw-semibold">Category <span className="text-danger">*</span></label>
                                                    <input type="text" className="form-control form-control-sm" required
                                                        value={formData.category || ''}
                                                        onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-3">
                                                    <label className="form-label small fw-semibold">Order <span className="text-danger">*</span></label>
                                                    <input type="number" className="form-control form-control-sm" min="1" required
                                                        value={formData.order ?? 0}
                                                        onChange={e => setFormData(p => ({ ...p, order: parseInt(e.target.value) }))}
                                                    />
                                                </div>
                                                <div className="col-4">
                                                    <label className="form-label small fw-semibold">Date</label>
                                                    <input type="date" className="form-control form-control-sm"
                                                        value={formData.date as string || ''}
                                                        onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                                                    />
                                                </div>
                                            </div> */}

                                            <div className="mb-3">
                                                <label className="form-label small fw-semibold">Description <span className="text-danger">*</span></label>
                                                <Editor
                                                    apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                                    init={tinymceConfig}
                                                    value={formData.excerpt || ''}
                                                    onEditorChange={content => setFormData(p => ({ ...p, excerpt: content }))}
                                                />
                                            </div>

                                            <div className="mb-3">
                                                <ImageUploader
                                                    label="Featured image"
                                                    currentImageUrl={formData.imageUrl}
                                                    onFileSelect={setImageFile}
                                                    onUrlChange={url => setFormData(p => ({ ...p, imageUrl: url }))}
                                                />
                                            </div>
                                        </div>

                                        {/* ── Right column: scheduling ─────────────── */}
                                        <div className="col-lg-5">
                                            {/* Site window scheduler */}
                                            <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 12 }}>
                                                {/* Card header with site selector */}
                                                <div className="card-header bg-primary text-white d-flex align-items-center justify-content-between py-2 px-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className="ti ti-calendar-clock" style={{ fontSize: 16 }} />
                                                        <span className="fw-bold" style={{ fontSize: '.88rem' }}>Site schedule</span>
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        {siteWindows.length > 0 ? (
                                                            <>
                                                                {(() => {
                                                                    const now = new Date().toISOString();
                                                                    const live = siteWindows.filter(w => w.startAt <= now && w.endAt > now).length;
                                                                    const sched = siteWindows.filter(w => w.startAt > now).length;
                                                                    return (
                                                                        <>
                                                                            {live > 0 && (
                                                                                <span
                                                                                    className="badge small"
                                                                                    style={{
                                                                                        background: '#dbeafe',
                                                                                        color: '#1e40af',
                                                                                        fontSize: '.65rem',
                                                                                    }}
                                                                                >
                                                                                    ● {live} live
                                                                                </span>
                                                                            )}
                                                                            {sched > 0 && (
                                                                                <span
                                                                                    className="badge small"
                                                                                    style={{
                                                                                        background: '#e5e7eb',
                                                                                        color: '#374151',
                                                                                        fontSize: '.65rem',
                                                                                    }}
                                                                                >
                                                                                    ◷ {sched} scheduled
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </>
                                                        ) : (
                                                            <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.5)' }}>No windows</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Builder */}
                                                <div className="card-body p-3 bg-white">
                                                    <SiteWindowBuilder windows={siteWindows} onChange={setSiteWindows} />
                                                </div>
                                            </div>

                                            {/* Status hint (derived automatically) */}
                                            {/* <div className="p-2 bg-light rounded border small text-muted">
                                                <i className="ti ti-info-circle me-1" />
                                                Status is derived automatically: <br />
                                                <span style={{ color: '#64748b' }}>◷ scheduled</span> if all windows are future &nbsp;·&nbsp;
                                                <span style={{ color: '#1a56db' }}>● published</span> if any window is active &nbsp;·&nbsp;
                                                <span className="text-muted">draft</span> if no windows
                                            </div> */}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal footer */}
                                <div className="modal-footer bg-light border-top py-2" style={{ flexShrink: 0 }}>
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-sm btn-primary" disabled={modalSubmitting}>
                                        {modalSubmitting
                                            ? <><span className="spinner-border spinner-border-sm me-1" />{editingItem ? 'Updating…' : 'Creating…'}</>
                                            : <>{editingItem ? 'Update post' : 'Create post'}</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Other modals ───────────────────────────────────────── */}
            {viewTarget && (
                <ViewModal post={viewTarget} onClose={() => setViewTarget(null)} onRefresh={fetchPosts} />
            )}

            {/* ── Image lightbox ──────────────────────────────────────── */}
            {imageView.open && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setImageView({ open: false, src: '' })}
                >
                    <div style={{ position: 'relative', maxWidth: '80vw', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                        <img src={imageView.src} alt="preview" style={{ maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 10 }} />
                        <button
                            onClick={() => setImageView({ open: false, src: '' })}
                            style={{ position: 'absolute', top: -12, right: -12, background: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}
                        >×</button>
                    </div>
                </div>
            )}

            <style jsx>{`
        thead th {
          background-color: #f2f5f9; color: #1e293b; font-weight: 400;
          font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.3px;
          border-bottom: 2px solid #1a56db !important; padding: 0.75rem; user-select: none;
        }
        thead th:hover { background-color: #e9ecef; }
        .action-btn {
          background: none; border: none; padding: 4px 6px; cursor: pointer;
          color: #64748b; border-radius: 6px; font-size: 15px; transition: all .15s;
        }
        .action-btn:hover { background: #f1f5f9; color: #1a56db; }
      `}</style>
        </div>
    );
}
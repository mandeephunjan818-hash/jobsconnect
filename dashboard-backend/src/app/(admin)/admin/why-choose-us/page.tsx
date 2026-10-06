'use client';

import { Editor } from '@tinymce/tinymce-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import ExcelJS from 'exceljs';
import getLocalImageUrl from '@/utils/ChangeImageUrl';

// ── TinyMCE config (paragraph field only) ─────────────────────
const tinymceConfig = {
    height: 160, menubar: false,
    plugins: ['advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
        'searchreplace', 'visualblocks', 'code', 'fullscreen', 'help', 'wordcount'],
    toolbar: 'undo redo | blocks | bold italic | bullist numlist | removeformat | help',
    content_style: 'body { font-family: system-ui,-apple-system,sans-serif; font-size:14px; color:#212529; }',
};

const KNOWN_SITES = [
    'jobs-connect.vercel.app',
    'new-jobs-fawn.vercel.app',
    'jobsrefugee.ca',
    'vulnerableyouthsjobs.ca',
    'accesscareers.ca',
    'indigenouspeoplesjobs.ca',
];

// ── Types ──────────────────────────────────────────────────────
interface AdminNote { message: string; type: string; createdAt: string; createdBy?: string; }
interface SkillBar { label: string; percentage: number; order: number; }

interface WhyChooseItem {
    id: string; site: string;
    tagline: string; title: string; paragraph: string;
    skillBars: SkillBar[];
    youtubeId: string; thumbnailUrl: string; playButtonImageUrl: string;
    status: string; isActive: boolean; submittedBy: string;
    adminNotes: AdminNote[]; updateRequested: boolean;
    createdAt: string; updatedAt: string;
}
interface ApiResponse {
    data: WhyChooseItem[]; total: number; page: number; perPage: number; totalPages: number;
}

// ── Small helpers ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: 'bg-warning text-dark',
        approved: 'bg-success',
        rejected: 'bg-danger',
        scheduled: 'bg-info text-dark',
    };
    return <span className={`badge px-2 py-1 small ${map[status] || 'bg-secondary'}`}>{status}</span>;
}

function SkeletonRow() {
    return <tr>{Array.from({ length: 9 }).map((_, i) => (
        <td key={i}><div className="skeleton skeleton--text" style={{ width: i === 1 ? 140 : 70, height: 18 }} /></td>
    ))}</tr>;
}

// ── Image uploader (reused from services page) ─────────────────
interface ImageUploaderProps {
    label: string; currentImageUrl?: string;
    onFileSelect: (f: File | null) => void;
    onUrlChange?: (url: string) => void;
}
function ImageUploader({ label, currentImageUrl, onFileSelect, onUrlChange }: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const [urlInput, setUrlInput] = useState(currentImageUrl || '');
    const ref = useRef<HTMLInputElement>(null);

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const r = new FileReader();
            r.onloadend = () => { setPreview(r.result as string); onFileSelect(file); if (onUrlChange) onUrlChange(''); };
            r.readAsDataURL(file);
        } else { setPreview(null); onFileSelect(null); }
    };
    const onUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value; setUrlInput(url); setPreview(url);
        if (onUrlChange) onUrlChange(url); onFileSelect(null);
    };
    const onRemove = () => {
        setPreview(null); setUrlInput(''); onFileSelect(null);
        if (onUrlChange) onUrlChange(''); if (ref.current) ref.current.value = '';
    };

    return (
        <div className="mb-2">
            {label && <label className="form-label small fw-semibold">{label}</label>}
            <div className="d-flex align-items-start gap-2">
                <div onClick={() => ref.current?.click()}
                    className="border rounded-3 d-flex align-items-center justify-content-center bg-light flex-shrink-0"
                    style={{ width: 70, height: 70, cursor: 'pointer', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: preview ? `url(${preview})` : 'none' }}>
                    {!preview && <i className="ti ti-photo text-muted" style={{ fontSize: '1.5rem' }}></i>}
                </div>
                <div className="flex-grow-1">
                    <input type="file" ref={ref} className="d-none" accept="image/*" onChange={onFile} />
                    <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white border-end-0"><i className="ti ti-link text-muted"></i></span>
                        <input type="url" className="form-control form-control-sm border-start-0" placeholder="Or enter image URL"
                            value={getLocalImageUrl(urlInput)} onChange={onUrl} />
                    </div>
                    <small className="text-muted d-block mt-1">Upload file or paste URL</small>
                    {preview && (
                        <button type="button" className="btn btn-sm btn-outline-danger mt-1 py-0" onClick={onRemove}>
                            <i className="ti ti-trash me-1"></i>Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Skill bars editor ──────────────────────────────────────────
function SkillBarsEditor({ value, onChange }: { value: SkillBar[]; onChange: (v: SkillBar[]) => void }) {
    const add = () => onChange([...value, { label: '', percentage: 80, order: value.length + 1 }]);
    const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const update = (i: number, field: keyof SkillBar, val: string | number) => {
        const next = [...value];
        (next[i] as any)[field] = val;
        onChange(next);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label small fw-semibold mb-0">Skill Bars</label>
                <button type="button" className="btn btn-sm btn-outline-primary py-0" onClick={add}>
                    <i className="ti ti-plus me-1"></i>Add bar
                </button>
            </div>
            {value.length === 0 && <p className="text-muted small">No skill bars yet.</p>}
            {value.map((bar, i) => (
                <div key={i} className="d-flex gap-2 align-items-center mb-2">
                    <input type="text" className="form-control form-control-sm" placeholder="Label"
                        value={bar.label} onChange={e => update(i, 'label', e.target.value)} style={{ width: 140 }} />
                    <input type="number" className="form-control form-control-sm" placeholder="%" min={1} max={100}
                        value={bar.percentage} onChange={e => update(i, 'percentage', parseInt(e.target.value))} style={{ width: 70 }} />
                    <span className="small text-muted">%</span>
                    <input type="number" className="form-control form-control-sm" placeholder="Order" min={1}
                        value={bar.order} onChange={e => update(i, 'order', parseInt(e.target.value))} style={{ width: 70 }} />
                    <button type="button" className="btn btn-sm btn-outline-danger py-0" onClick={() => remove(i)}>
                        <i className="ti ti-trash"></i>
                    </button>
                </div>
            ))}
        </div>
    );
}

// ── View modal ─────────────────────────────────────────────────
function ViewModal({ item, onClose, onRefresh }: { item: WhyChooseItem; onClose: () => void; onRefresh: () => void }) {
    const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details');
    const [noteText, setNoteText] = useState('');
    const [saving, setSaving] = useState(false);
    const [current, setCurrent] = useState(item);

    const doAction = async (action: string, extra: Record<string, any> = {}) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/why-choose-us/${current.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setCurrent((await res.json()).data);
            onRefresh();
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    const sendNote = async () => {
        if (!noteText.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/why-choose-us/${current.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminNote: noteText }),
            });
            if (!res.ok) throw new Error('Failed');
            setCurrent((await res.json()).data); setNoteText('');
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.25)', width: '100%', maxWidth: 740, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{current.title}</h4>
                            <StatusBadge status={current.status} />
                            {current.isActive
                                ? <span className="badge bg-success bg-opacity-10 text-white border border-success-subtle small">Live</span>
                                : <span className="badge bg-secondary bg-opacity-10 text-dark border small">Inactive</span>}
                        </div>
                        <p style={{ margin: '.2rem 0 0', fontSize: '.8rem', color: '#64748b' }}>
                            Site: <strong>{current.site}</strong>
                        </p>
                    </div>
                    <button style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }} onClick={onClose}>×</button>
                </div>

                {/* Action bar */}
                <div style={{ padding: '.6rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
                    {current.status === 'pending' && (
                        <button className="btn btn-sm btn-success" onClick={() => doAction('approve')} disabled={saving}>
                            <i className="ti ti-check me-1"></i>Approve
                        </button>
                    )}
                    {current.status === 'pending' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => doAction('reject')} disabled={saving}>
                            <i className="ti ti-x me-1"></i>Reject
                        </button>
                    )}
                    {current.status === 'approved' && !current.isActive && (
                        <button className="btn btn-sm btn-primary" onClick={() => doAction('activate')} disabled={saving}>
                            <i className="ti ti-world me-1"></i>Make Live
                        </button>
                    )}
                    {current.isActive && (
                        <button className="btn btn-sm btn-outline-warning" onClick={() => doAction('deactivate')} disabled={saving}>
                            <i className="ti ti-eye-off me-1"></i>Deactivate
                        </button>
                    )}
                    {(current.status === 'approved' || current.status === 'rejected') && (
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => doAction('pending')} disabled={saving}>
                            <i className="ti ti-rotate-left me-1"></i>Back to Pending
                        </button>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => doAction('toggle-active', { isActive: !current.isActive })} disabled={saving}>
                        <i className={`ti ${current.isActive ? 'ti-eye-off' : 'ti-eye'} me-1`}></i>
                        {current.isActive ? 'Hide' : 'Show'}
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                    {(['details', 'notes'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '.75rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '.85rem', fontWeight: activeTab === tab ? 700 : 400,
                            color: activeTab === tab ? '#1a56db' : '#64748b',
                            borderBottom: activeTab === tab ? '2.5px solid #1a56db' : '2.5px solid transparent',
                        }}>
                            {tab === 'details'
                                ? <><i className="ti ti-file-description me-1"></i>Details</>
                                : <><i className="ti ti-notes me-1"></i>Notes ({current.adminNotes?.length || 0})</>}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                    {activeTab === 'details' && (
                        <div>
                            {/* Thumbnail */}
                            {current.thumbnailUrl && (
                                <div className="mb-3">
                                    <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.4rem' }}>Thumbnail</p>
                                    <img src={current.thumbnailUrl} alt="thumbnail" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
                                </div>
                            )}
                            {/* Meta grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
                                {[
                                    ['Site', current.site],
                                    ['YouTube ID', current.youtubeId],
                                    ['Tagline', current.tagline],
                                    ['Created', new Date(current.createdAt).toLocaleString()],
                                    ['Updated', new Date(current.updatedAt).toLocaleString()],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ background: '#f8fafd', borderRadius: 8, padding: '.6rem .85rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.2rem' }}>{label}</div>
                                        <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>{value}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Title / paragraph */}
                            <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.3rem' }}>Title</p>
                            <p style={{ fontSize: '.9rem', marginBottom: '1rem' }}>{current.title}</p>
                            <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.3rem' }}>Paragraph</p>
                            <div style={{ fontSize: '.88rem', color: '#334155', lineHeight: 1.65, marginBottom: '1rem' }}
                                dangerouslySetInnerHTML={{ __html: current.paragraph }} />
                            {/* Skill bars */}
                            {current.skillBars.length > 0 && (
                                <>
                                    <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.5rem' }}>Skill Bars</p>
                                    {current.skillBars.sort((a, b) => a.order - b.order).map((bar, i) => (
                                        <div key={i} className="mb-2">
                                            <div className="d-flex justify-content-between small mb-1">
                                                <span>{bar.label}</span><span>{bar.percentage}%</span>
                                            </div>
                                            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                                                <div style={{ width: `${bar.percentage}%`, height: '100%', background: '#1a56db', borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    ))}
                                </>
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
                                    {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</> : <><i className="ti ti-send me-1"></i>Save note</>}
                                </button>
                            </div>
                            {!current.adminNotes?.length
                                ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem' }}>No notes yet.</p>
                                : <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                                    {[...current.adminNotes].reverse().map((n, i) => (
                                        <div key={i} style={{ padding: '.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', borderLeft: '3px solid #1e40af' }}>
                                            <div style={{ fontSize: '.72rem', color: '#94a3b8', marginBottom: '.25rem' }}>
                                                {n.createdBy || 'system'} · {new Date(n.createdAt).toLocaleString()}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '.88rem', color: '#334155' }}>{n.message}</p>
                                        </div>
                                    ))}
                                </div>
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

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function WhyChooseUsAdminPage() {
    const [items, setItems] = useState<WhyChooseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<WhyChooseItem | null>(null);
    const [viewTarget, setViewTarget] = useState<WhyChooseItem | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const perPage = 10;

    // Bulk select
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    // Import / Export
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const emptyForm = {
        site: '', tagline: '', title: '', paragraph: '',
        youtubeId: '', thumbnailUrl: '', playButtonImageUrl: '',
        skillBars: [] as SkillBar[], status: 'pending',
    };
    const [formData, setFormData] = useState({ ...emptyForm });
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [playBtnFile, setPlayBtnFile] = useState<File | null>(null);

    // ── Fetch ────────────────────────────────────────────────────
    const fetchItems = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page)); params.set('perPage', String(perPage));
            params.set('sortBy', sortBy); params.set('sortOrder', sortDir);
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (siteFilter) params.set('site', siteFilter);
            const res = await fetch(`/api/admin/why-choose-us?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setItems(json.data); setTotal(json.total); setTotalPages(json.totalPages);
            setSelectedIds([]); setSelectAll(false);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [page, perPage, sortBy, sortDir, search, statusFilter, siteFilter]);

    useEffect(() => { const t = setTimeout(fetchItems, 300); return () => clearTimeout(t); }, [fetchItems]);

    // ── Sort ─────────────────────────────────────────────────────
    const handleSort = (col: string) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };
    const SortIcon = ({ col }: { col: string }) =>
        sortBy !== col ? <i className="ti ti-arrows-sort text-muted ms-1" /> :
            sortDir === 'asc' ? <i className="ti ti-arrow-up ms-1" /> : <i className="ti ti-arrow-down ms-1" />;

    // ── Bulk select ──────────────────────────────────────────────
    const toggleSelectAll = () => {
        if (selectAll) { setSelectedIds([]); setSelectAll(false); }
        else { setSelectedIds(items.map(s => s.id)); setSelectAll(true); }
    };
    const toggleRow = (id: string) => setSelectedIds(prev => {
        const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
        setSelectAll(next.length === items.length && items.length > 0);
        return next;
    });

    // ── Actions ──────────────────────────────────────────────────
    const doAction = async (id: string, action: string, extra: Record<string, any> = {}) => {
        try {
            const res = await fetch(`/api/admin/why-choose-us/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            await fetchItems();
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this document?')) return;
        try {
            const res = await fetch(`/api/admin/why-choose-us/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            await fetchItems();
        } catch (e: any) { alert(e.message); }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return alert('Nothing selected');
        if (!confirm(`Delete ${selectedIds.length} document(s)?`)) return;
        try {
            await fetch('/api/admin/why-choose-us', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            await fetchItems();
        } catch (e: any) { alert(e.message); }
    };

    // ── Export ───────────────────────────────────────────────────
    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch('/api/admin/why-choose-us?page=1&perPage=10000');
            const json: ApiResponse = await res.json();
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('WhyChooseUs');
            ws.columns = [
                { header: 'ID', key: 'id', width: 28 },
                { header: 'Site', key: 'site', width: 30 },
                { header: 'Tagline', key: 'tagline', width: 30 },
                { header: 'Title', key: 'title', width: 40 },
                { header: 'YouTube ID', key: 'youtubeId', width: 18 },
                { header: 'Status', key: 'status', width: 14 },
                { header: 'Is Active', key: 'isActive', width: 12 },
                { header: 'Created At', key: 'createdAt', width: 22 },
            ];
            json.data.forEach(row => ws.addRow({
                ...row,
                createdAt: new Date(row.createdAt).toLocaleString(),
            }));
            ws.getRow(1).font = { bold: true };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `why-choose-us_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch (e: any) { alert(`Export failed: ${e.message}`); }
        finally { setExporting(false); }
    };

    // ── Import ───────────────────────────────────────────────────
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setImporting(true);
        try {
            const buffer = await file.arrayBuffer();
            const EJS = await import('exceljs');
            const wb = new EJS.Workbook(); await wb.xlsx.load(buffer);
            const ws = wb.getWorksheet(1); if (!ws) throw new Error('No worksheet found');

            const headers: string[] = [];
            ws.getRow(1).eachCell((cell, col) => { headers[col] = cell.text.toLowerCase().trim(); });

            const fieldMap: Record<string, string> = {
                'id': 'id', 'site': 'site', 'tagline': 'tagline',
                'title': 'title', 'youtube id': 'youtubeId',
                'status': 'status', 'is active': 'isActive',
            };

            const importItems: any[] = [];
            ws.eachRow((row, rowNum) => {
                if (rowNum === 1) return;
                const item: any = {};
                row.eachCell((cell, col) => {
                    const field = fieldMap[headers[col]];
                    if (field) item[field] = cell.text;
                });
                if (item.site && item.title) importItems.push(item);
            });

            if (!importItems.length) { alert('No valid rows found'); return; }

            const res = await fetch('/api/admin/why-choose-us/import', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: importItems }),
            });
            const result = await res.json();
            alert(`Import done: ${result.inserted} inserted, ${result.updated} updated, ${result.errors} errors`);
            await fetchItems();
        } catch (e: any) { alert(`Import error: ${e.message}`); }
        finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Open modal ───────────────────────────────────────────────
    const handleOpenModal = (item?: WhyChooseItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                site: item.site,
                tagline: item.tagline,
                title: item.title,
                paragraph: item.paragraph,
                youtubeId: item.youtubeId,
                thumbnailUrl: item.thumbnailUrl,
                playButtonImageUrl: item.playButtonImageUrl,
                skillBars: item.skillBars,
                status: item.status,
            });
        } else {
            setEditingItem(null);
            setFormData({ ...emptyForm });
        }
        setThumbnailFile(null); setPlayBtnFile(null);
        setShowModal(true);
    };

    // ── Submit ───────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('site', formData.site);
        fd.append('tagline', formData.tagline);
        fd.append('title', formData.title);
        fd.append('paragraph', formData.paragraph);
        fd.append('youtubeId', formData.youtubeId);
        fd.append('thumbnailUrl', formData.thumbnailUrl);
        fd.append('playButtonImageUrl', formData.playButtonImageUrl);
        fd.append('status', formData.status);
        fd.append('skillBars', JSON.stringify(formData.skillBars));
        if (thumbnailFile) fd.append('thumbnailFile', thumbnailFile);
        if (playBtnFile) fd.append('playButtonFile', playBtnFile);

        try {
            const url = editingItem ? `/api/admin/why-choose-us/${editingItem.id}` : '/api/admin/why-choose-us';
            const method = editingItem ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: fd });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            await fetchItems(); setShowModal(false);
        } catch (e: any) { alert(e.message); }
    };

    const activeFilterCount = [search, statusFilter, siteFilter].filter(Boolean).length;

    return (
        <div className="container-fluid py-4">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3">
                <div>
                    <h4 className="mb-1 fw-semibold">Why Choose Us</h4>
                    <p className="text-muted small mb-0">Manage per-site "Why Choose Us" section content</p>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal()}>
                        <i className="ti ti-plus me-1"></i>Add document
                    </button>
                    <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="d-none" onChange={handleImport} />
                    <button className="btn btn-sm btn-outline-info" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                        {importing ? <><span className="spinner-border spinner-border-sm me-1"></span>Importing…</> : <><i className="ti ti-file-import me-1"></i>Import</>}
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
                        {exporting ? <><span className="spinner-border spinner-border-sm me-1"></span>Exporting…</> : <><i className="ti ti-file-spreadsheet me-1"></i>Export</>}
                    </button>
                    {selectedIds.length > 0 && (
                        <div className="dropdown">
                            <button className="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                                Bulk ({selectedIds.length})
                            </button>
                            <ul className="dropdown-menu">
                                <li><button className="dropdown-item text-danger" onClick={handleBulkDelete}>Delete selected</button></li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Filter bar */}
                <div className="ulp-filters bg-white rounded-3 p-2 border w-100 mt-2" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <button className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1"
                        style={{ fontSize: 13 }} onClick={() => setMobileOpen(o => !o)}>
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }}></i>Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {activeFilterCount > 0 && <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>{activeFilterCount}</span>}
                            <i className="ti ti-chevron-down" style={{ fontSize: 14, transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </span>
                    </button>

                    <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
                        {/* Search */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                            <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 160, fontSize: 12, outline: 'none' }} placeholder="Search…"
                                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>

                        {/* Status */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-circle-dot text-secondary" style={{ fontSize: 13 }}></i>
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 120 }}
                                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                                <option value="">All statuses</option>
                                {['pending', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Site */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-world text-secondary" style={{ fontSize: 13 }}></i>
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 180 }}
                                value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1); }}>
                                <option value="">All sites</option>
                                {KNOWN_SITES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {activeFilterCount > 0 && (
                            <button className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderRadius: 6 }}
                                onClick={() => { setSearch(''); setStatusFilter(''); setSiteFilter(''); setPage(1); }}>
                                <i className="ti ti-x" style={{ fontSize: 12 }}></i>Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchItems}>Retry</button>
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────── */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead style={{ background: '#f2f5f9' }}>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input type="checkbox" className="form-check-input" checked={selectAll} onChange={toggleSelectAll} />
                                    </th>
                                    <th onClick={() => handleSort('site')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Site <SortIcon col="site" />
                                    </th>
                                    <th onClick={() => handleSort('sectionText.title')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Title <SortIcon col="sectionText.title" />
                                    </th>
                                    <th>Thumbnail</th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Status <SortIcon col="status" />
                                    </th>
                                    <th>Live</th>
                                    <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Created <SortIcon col="createdAt" />
                                    </th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                    : items.length === 0
                                        ? <tr><td colSpan={8} className="text-center py-5 text-muted">
                                            <i className="ti ti-file-unknown fs-1 d-block mb-2"></i>No documents found
                                        </td></tr>
                                        : items.map(row => (
                                            <tr key={row.id} className="border-bottom">
                                                <td>
                                                    <input type="checkbox" className="form-check-input"
                                                        checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} />
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border small">{row.site}</span>
                                                </td>
                                                <td style={{ maxWidth: 260 }}>
                                                    <button className="btn btn-link btn-sm p-0 text-start fw-medium"
                                                        style={{ fontSize: '.85rem' }} onClick={() => setViewTarget(row)}>
                                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                                                            {row.title}
                                                        </div>
                                                    </button>
                                                </td>
                                                <td>
                                                    {row.thumbnailUrl
                                                        ? <img src={row.thumbnailUrl} alt="thumb"
                                                            style={{ width: 40, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                                                        : <span className="text-muted">—</span>}
                                                </td>
                                                <td><StatusBadge status={row.status} /></td>
                                                <td>
                                                    <div className="form-check form-switch m-0">
                                                        <input type="checkbox" className="form-check-input"
                                                            checked={row.isActive}
                                                            onChange={() => doAction(row.id, 'toggle-active', { isActive: !row.isActive })}
                                                            style={{ cursor: 'pointer' }} />
                                                    </div>
                                                </td>
                                                <td className="small text-muted text-nowrap">
                                                    {new Date(row.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="text-end">
                                                    <div className="btn-group">
                                                        <button className="btn admin-btn-1 btn-sm btn-outline-primary p-0 m-0 border-top-0 border-bottom-0 border-start-0"
                                                            onClick={() => setViewTarget(row)} title="View">
                                                            <i className="ti ti-eye"></i>
                                                        </button>
                                                        {row.status === 'pending' && (
                                                            <button className="btn admin-btn-1 btn-sm btn-outline-success p-0 m-0 border-top-0 border-bottom-0 border-start-0"
                                                                onClick={() => doAction(row.id, 'approve')} title="Approve">
                                                                <i className="ti ti-check"></i>
                                                            </button>
                                                        )}
                                                        {row.status === 'approved' && !row.isActive && (
                                                            <button className="btn admin-btn-1 btn-sm btn-outline-info p-0 m-0 border-top-0 border-bottom-0 border-start-0"
                                                                onClick={() => doAction(row.id, 'activate')} title="Make live">
                                                                <i className="ti ti-world"></i>
                                                            </button>
                                                        )}
                                                        <button className="btn admin-btn-1 btn-sm btn-outline-secondary p-0 m-0 border-top-0 border-bottom-0 border-start-0"
                                                            onClick={() => handleOpenModal(row)} title="Edit">
                                                            <i className="ti ti-edit"></i>
                                                        </button>
                                                        <button className="btn admin-btn-1 btn-sm btn-outline-danger p-0 m-0 border-top-0 border-bottom-0 border-end-0"
                                                            onClick={() => handleDelete(row.id)} title="Delete">
                                                            <i className="ti ti-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <div className="small text-muted">Showing {items.length} of {total} entries</div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p - 1)}>Prev</button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                    return <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                                    </li>;
                                })}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* ── Create / Edit modal ─────────────────────────────── */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style={{ overflowY: "auto" }}>
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title">
                                    <i className={`ti ${editingItem ? 'ti-edit' : 'ti-plus'} me-2`}></i>
                                    {editingItem ? 'Edit document' : 'Create document'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit} style={{ maxWidth: 800, margin: '0 auto', width: '100%', overflowY: "auto" }}>
                                <div className="modal-body p-3">
                                    <div className="row g-3">

                                        {/* Site + Status */}
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Site <span className="text-danger">*</span></label>
                                            <select className="form-select form-select-sm" value={formData.site}
                                                onChange={e => setFormData(p => ({ ...p, site: e.target.value }))} required>
                                                <option value="">Select site…</option>
                                                {KNOWN_SITES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Status</label>
                                            <select className="form-select form-select-sm" value={formData.status}
                                                onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="pending">Pending</option>
                                                <option value="approved">Approved</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>

                                        {/* Section text */}
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Tagline (h6) <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm" value={formData.tagline}
                                                onChange={e => setFormData(p => ({ ...p, tagline: e.target.value }))}
                                                placeholder="e.g. [What We Deliver]" required />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Title (h2) <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm" value={formData.title}
                                                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Paragraph <span className="text-danger">*</span></label>
                                            <Editor apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY} init={tinymceConfig}
                                                value={formData.paragraph}
                                                onEditorChange={content => setFormData(p => ({ ...p, paragraph: content }))} />
                                        </div>

                                        {/* Skill bars */}
                                        <div className="col-12">
                                            <SkillBarsEditor
                                                value={formData.skillBars}
                                                onChange={bars => setFormData(p => ({ ...p, skillBars: bars }))}
                                            />
                                        </div>

                                        {/* Video */}
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">YouTube ID <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm" value={formData.youtubeId}
                                                onChange={e => setFormData(p => ({ ...p, youtubeId: e.target.value }))}
                                                placeholder="e.g. Q5PG0rMXgvw" required />
                                        </div>
                                        <div className="col-md-6">
                                            <ImageUploader label="Thumbnail image *"
                                                currentImageUrl={formData.thumbnailUrl}
                                                onFileSelect={setThumbnailFile}
                                                onUrlChange={url => setFormData(p => ({ ...p, thumbnailUrl: url }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <ImageUploader label="Play button image *"
                                                currentImageUrl={formData.playButtonImageUrl}
                                                onFileSelect={setPlayBtnFile}
                                                onUrlChange={url => setFormData(p => ({ ...p, playButtonImageUrl: url }))} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-0 py-2">
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-sm btn-primary">
                                        {editingItem ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── View modal ──────────────────────────────────────── */}
            {viewTarget && (
                <ViewModal item={viewTarget} onClose={() => setViewTarget(null)} onRefresh={fetchItems} />
            )}

            <style jsx>{`
                thead th {
                    background-color: #f2f5f9; color: #1e293b; font-weight: 400;
                    font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.3px;
                    border-bottom: 2px solid #1a56db !important; padding: 0.75rem; user-select: none;
                }
                thead th:hover { background-color: #e9ecef; }
            `}</style>
        </div>
    );
}
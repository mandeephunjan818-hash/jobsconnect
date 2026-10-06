// src/app/services/page.tsx (or wherever ServicesAdminPage lives)
'use client';

import { Editor } from '@tinymce/tinymce-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import ExcelJS from 'exceljs';
import getLocalImageUrl from '@/utils/ChangeImageUrl';

const tinymceConfig = {
    height: 200, menubar: false,
    plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
        'searchreplace', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'],
    toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
    content_style: 'body { font-family: system-ui,-apple-system,sans-serif; font-size:14px; color:#212529; }',
};

interface AdminNote { message: string; type: string; createdAt: string; createdBy?: string; }
interface ServiceItem {
    id: string; number: string; title: string; description: string;
    imageUrl: string;
    //  shapeImageUrl: string;
    link: string; order: number;
    status: string; isActive: boolean; publishAt: string | null;
    adminNotes: AdminNote[]; createdAt: string; updatedAt: string;
}
interface ApiResponse {
    data: ServiceItem[]; total: number; page: number; perPage: number; totalPages: number;
}

// function StatusBadge({ status }: { status: string }) {
//     const map: Record<string, string> = {
//         draft: 'bg-warning text-dark', scheduled: 'bg-info text-dark',
//         published: 'bg-success', archived: 'bg-secondary',
//     };
//     return <span className={`badge px-2 py-1 small ${map[status] || 'bg-light text-dark'}`}>{status}</span>;
// }

function SkeletonRow() {
    return <tr>{Array.from({ length: 4 }).map((_, i) => (
        <td key={i}><div className="skeleton skeleton--text" style={{ width: i === 1 ? 140 : 70, height: 18 }} /></td>
    ))}</tr>;
}

interface ImageUploaderProps {
    label: string; currentImageUrl?: string;
    onFileSelect: (f: File | null) => void;
    onUrlChange?: (url: string) => void;
}
function ImageUploader({ label, currentImageUrl, onFileSelect, onUrlChange }: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const [urlInput, setUrlInput] = useState(currentImageUrl || '');
    const [useUrl, setUseUrl] = useState(!!currentImageUrl && !currentImageUrl.startsWith('blob:'));
    const ref = useRef<HTMLInputElement>(null);

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const r = new FileReader();
            r.onloadend = () => { setPreview(r.result as string); setUseUrl(false); onFileSelect(file); if (onUrlChange) onUrlChange(''); };
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
                    className="border rounded-3 d-flex align-items-center justify-content-center bg-light"
                    style={{ width: 70, height: 70, cursor: 'pointer', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: preview ? `url(${preview})` : 'none' }}>
                    {!preview && <i className="ti ti-photo text-muted" style={{ fontSize: '1.5rem' }}></i>}
                </div>
                <div className="flex-grow-1  d-none">
                    <input type="file" ref={ref} className="d-none" accept="image/*" onChange={onFile} />
                    <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white border-end-0"><i className="ti ti-link text-muted"></i></span>
                        <input type="url" className="form-control form-control-sm border-start-0" placeholder="Or enter image URL"
                            value={getLocalImageUrl(urlInput)} onChange={onUrl} disabled={!!preview && !useUrl} />
                    </div>
                    <small className="text-muted d-block mt-1">Upload</small>
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

// ─── View Modal ───────────────────────────────────────────────
function ViewModal({ service, onClose, onRefresh }: { service: ServiceItem; onClose: () => void; onRefresh: () => void }) {
    const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details');
    const [noteText, setNoteText] = useState('');
    const [saving, setSaving] = useState(false);
    const [current, setCurrent] = useState(service);

    const doAction = async (action: string, extra: Record<string, any> = {}) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/services/${current.id}`, {
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
            const res = await fetch(`/api/admin/services/${current.id}`, {
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
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.25)', width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '1.1rem 1.5rem',
                    //  borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0
                }}>
                    <div>
                        <p style={{ margin: '.2rem 0 0', fontSize: '.8rem', color: '#64748b' }}>
                            {/* #{current.number} · */}
                            Order {current.order}
                            {current.publishAt && <>&nbsp;·&nbsp;<i className="ti ti-clock me-1"></i>{new Date(current.publishAt).toLocaleString()}</>}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{current.title}</h4>
                            {/* <StatusBadge status={current.status} />
                            {current.isActive
                                ? <span className="badge bg-success bg-opacity-10 text-white border border-success-subtle small">Visible</span>
                                : <span className="badge bg-secondary bg-opacity-10 text-dark border small">Hidden</span>} */}
                        </div>
                    </div>
                    <button style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }} onClick={onClose}>×</button>
                </div>

                {/* Action bar */}
                {/* <div style={{ padding: '.6rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
                    {current.status !== 'published' && (
                        <button className="btn btn-sm btn-success" onClick={() => doAction('publish')} disabled={saving}>
                            <i className="ti ti-world me-1"></i>Publish now
                        </button>
                    )}
                    {current.status === 'published' && (
                        <button className="btn btn-sm btn-outline-warning" onClick={() => doAction('archive')} disabled={saving}>
                            <i className="ti ti-archive me-1"></i>Archive
                        </button>
                    )}
                    {(current.status === 'archived' || current.status === 'scheduled') && (
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => doAction('draft')} disabled={saving}>
                            <i className="ti ti-file me-1"></i>Back to draft
                        </button>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => doAction('toggle-active', { isActive: !current.isActive })} disabled={saving}>
                        <i className={`ti ${current.isActive ? 'ti-eye-off' : 'ti-eye'} me-1`}></i>
                        {current.isActive ? 'Hide' : 'Show'}
                    </button>
                </div> */}

                {/* Tabs */}
                {/* <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
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
                </div> */}

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                    {activeTab === 'details' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                                {current.imageUrl && (
                                    <div>
                                        <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.4rem' }}>Main image</p>
                                        <img src={current.imageUrl} alt="main" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} />
                                    </div>
                                )}
                                {/* {current.shapeImageUrl && (
                                    <div>
                                        <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.4rem' }}>Shape image</p>
                                        <img src={current.shapeImageUrl} alt="shape" style={{ width: '100%', height: 160, objectFit: 'contain', borderRadius: 8, background: '#f8fafd' }} />
                                    </div>
                                )} */}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
                                {[
                                    // ['Number', current.number], ['Order', String(current.order)],
                                    ['Created', new Date(current.createdAt).toLocaleString()],
                                    ['Updated', new Date(current.updatedAt).toLocaleString()]
                                ].map(([label, value]) => (
                                    <div key={label} style={{ background: '#f8fafd', borderRadius: 8, padding: '.6rem .85rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.2rem' }}>{label}</div>
                                        <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
                                    </div>
                                ))}
                            </div>
                            {/* <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.4rem' }}>Link</p>
                            <a href={current.link} target="_blank" rel="noopener" style={{ fontSize: '.88rem', color: '#1a56db' }}>{current.link}</a>
                            <p style={{ fontSize: '.8rem', fontWeight: 600, margin: '1rem 0 .4rem' }}>Description</p>
                            <div style={{ fontSize: '.88rem', color: '#334155', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: current.description }} /> */}
                        </div>
                    )}

                    {/* {activeTab === 'notes' && (
                        <div>
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafd', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                                <p style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: '.5rem' }}>Add note</p>
                                <textarea className="form-control form-control-sm" rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Internal note…" style={{ marginBottom: '.6rem' }} />
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
                    )} */}
                </div>

                <div style={{ padding: '.9rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ─── Schedule modal ───────────────────────────────────────────
function ScheduleModal({ serviceId, onClose, onSaved }: { serviceId: string; onClose: () => void; onSaved: () => void }) {
    const [publishAt, setPublishAt] = useState('');
    const [saving, setSaving] = useState(false);
    const minDT = new Date(Date.now() + 60_000).toISOString().slice(0, 16);
    const maxDT = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

    const handleSchedule = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/services/${serviceId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'schedule', publishAt: new Date(publishAt).toISOString() }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            onSaved();
        } catch (e: any) { alert(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                    <div className="modal-header py-2 bg-light">
                        <h5 className="modal-title small fw-semibold"><i className="ti ti-clock me-2 text-info"></i>Schedule service</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <label className="form-label small">Publish at (within 24 hours)</label>
                        <input type="datetime-local" className="form-control form-control-sm" value={publishAt} min={minDT} max={maxDT} onChange={e => setPublishAt(e.target.value)} />
                        <small className="text-muted">Must be within the next 24 hours</small>
                    </div>
                    <div className="modal-footer py-2 bg-light">
                        <button className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-sm btn-info text-white" onClick={handleSchedule} disabled={saving || !publishAt}>
                            {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Scheduling…</> : 'Schedule'}
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
export default function ServicesAdminPage() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
    const [viewTarget, setViewTarget] = useState<ServiceItem | null>(null);
    const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);
    const [imageView, setImageView] = useState({
        imageView: false,
        imageSrc: ''
    });

    // Form
    const [formData, setFormData] = useState<Partial<ServiceItem & { status: string }>>({
        number: '', title: '', description: '', imageUrl: '',
        // shapeImageUrl: '',
        link: '', order: 0, status: 'published',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [shapeImageFile, setShapeImageFile] = useState<File | null>(null);
    const [formScheduleAt, setFormScheduleAt] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('order');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const perPage = 10;

    // Bulk
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    // Import / Export
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    const fetchServices = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page)); params.set('perPage', String(perPage));
            params.set('sortBy', sortBy); params.set('sortOrder', sortDir);
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/admin/services?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setServices(json.data); setTotal(json.total); setTotalPages(json.totalPages);
            setSelectedIds([]); setSelectAll(false);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [page, perPage, sortBy, sortDir, search, statusFilter]);

    useEffect(() => { const t = setTimeout(fetchServices, 300); return () => clearTimeout(t); }, [fetchServices]);

    const handleSort = (col: string) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };
    const SortIcon = ({ col }: { col: string }) =>
        sortBy !== col ? <i className="ti ti-arrows-sort text-muted ms-1" /> :
            sortDir === 'asc' ? <i className="ti ti-arrow-up ms-1" /> : <i className="ti ti-arrow-down ms-1" />;

    const toggleSelectAll = () => {
        if (selectAll) { setSelectedIds([]); setSelectAll(false); }
        else { setSelectedIds(services.map(s => s.id)); setSelectAll(true); }
    };
    const toggleRow = (id: string) => setSelectedIds(prev => {
        const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
        setSelectAll(next.length === services.length && services.length > 0);
        return next;
    });

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return alert('Nothing selected');
        if (!confirm(`Delete ${selectedIds.length} service(s)?`)) return;
        try {
            await Promise.all(selectedIds.map(id =>
                fetch(`/api/admin/services/${id}`, { method: 'DELETE' })
            ));
            await fetchServices();
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this service?')) return;
        try {
            const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            await fetchServices();
        } catch (e: any) { alert(e.message); }
    };

    const handleToggleActive = async (service: ServiceItem) => {
        try {
            const res = await fetch(`/api/admin/services/${service.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle-active', isActive: !service.isActive }),
            });
            if (!res.ok) throw new Error('Toggle failed');
            await fetchServices();
        } catch (e: any) { alert(e.message); }
    };

    const handlePublishNow = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/services/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'publish' }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            await fetchServices();
        } catch (e: any) { alert(e.message); }
    };

    // ── Export ──────────────────────────────────────────────────
    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch(`/api/admin/services?page=1&perPage=10000`);
            const json: ApiResponse = await res.json();
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Services');
            ws.columns = [
                { header: 'ID', key: 'id', width: 28 },
                // { header: 'Number', key: 'number', width: 10 },
                { header: 'Title', key: 'title', width: 40 },
                // { header: 'Link', key: 'link', width: 40 },
                { header: 'Order', key: 'order', width: 10 },
                // { header: 'Status', key: 'status', width: 15 },
                { header: 'Is Active', key: 'isActive', width: 12 },
                { header: 'Publish At', key: 'publishAt', width: 22 },
                { header: 'Created At', key: 'createdAt', width: 22 },
            ];
            json.data.forEach(row => ws.addRow({
                ...row,
                publishAt: row.publishAt ? new Date(row.publishAt).toLocaleString() : '',
                createdAt: row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
            }));
            ws.getRow(1).font = { bold: true };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = `services_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch (e: any) { alert(`Export failed: ${e.message}`); }
        finally { setExporting(false); }
    };

    // ── Import ──────────────────────────────────────────────────
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
                'id': 'id',
                // 'number': 'number',
                'title': 'title',
                // 'link': 'link',
                'order': 'order',
                // 'status': 'status',
                'is active': 'isActive',
                'publish at': 'publishAt',
                // 'description': 'description',
            };

            const items: any[] = [];
            ws.eachRow((row, rowNum) => {
                if (rowNum === 1) return;
                const item: any = {};
                row.eachCell((cell, col) => {
                    const field = fieldMap[headers[col]];
                    if (field) item[field] = cell.text;
                });
                if (item.title && item.number) items.push(item);
            });

            if (!items.length) { alert('No valid rows found'); return; }

            const res = await fetch('/api/admin/admin/services/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });
            const result = await res.json();
            alert(`Import done: ${result.inserted} inserted, ${result.updated} updated, ${result.errors} errors`);
            await fetchServices();
        } catch (e: any) {
            alert(`Import error: ${e.message}`);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleOpenModal = (item?: ServiceItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                number: item.number || '00',
                title: item.title,
                description: item.description || '',   // ensure string
                imageUrl: item.imageUrl || '',
                link: item.link || '',
                order: item.order,
                status: 'published',                   // always published
            });
        } else {
            // New service: auto‑number = next number based on existing services
            const maxNum = services.reduce((max, s) => {
                const n = parseInt(s.number, 10);
                return isNaN(n) ? max : Math.max(max, n);
            }, 0);
            const nextNumber = String(maxNum + 1).padStart(2, '0');

            setEditingItem(null);
            setFormData({
                number: nextNumber || "00",
                title: '',
                description: '',
                imageUrl: '',
                link: '',
                order: services.length + 1,
                status: 'published',
            });
        }
        setImageFile(null);
        setShapeImageFile(null);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) data.append(key, String(value));
        });
        if (imageFile) data.append('imageFile', imageFile);
        if (shapeImageFile) data.append('shapeImageFile', shapeImageFile);

        // Status is always published, no need to append publishAt

        try {
            const url = editingItem
                ? `/api/admin/services/${editingItem.id}`
                : '/api/admin/services';
            const method = editingItem ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: data });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            await fetchServices();
            setShowModal(false);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const activeFilterCount = [search, statusFilter].filter(Boolean).length;
    const minDT = new Date(Date.now() + 60_000).toISOString().slice(0, 16);
    const maxDT = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

    const [linkManuallyEdited, setLinkManuallyEdited] = useState(false);

    useEffect(() => {
        setLinkManuallyEdited(false);
    }, [editingItem, showModal]);

    return (
        <div className="container-fluid py-4">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3">
                <div>
                    <h4 className="mb-1 fw-semibold">Category Management</h4>
                    <p className="text-muted small mb-0">Create and manage categories</p>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal()}>
                        <i className="ti ti-plus me-1"></i>Add Category
                    </button>
                    <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="d-none" onChange={handleImport} />
                    {/* <button className="btn btn-sm btn-outline-info" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                        {importing ? <><span className="spinner-border spinner-border-sm me-1"></span>Importing…</> : <><i className="ti ti-file-import me-1"></i>Import</>}
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
                        {exporting ? <><span className="spinner-border spinner-border-sm me-1"></span>Exporting…</> : <><i className="ti ti-file-spreadsheet me-1"></i>Export</>}
                    </button> */}
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
                            <i className="ti ti-chevron-down" style={{ fontSize: 14, transition: 'transform 0.2s', transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </span>
                    </button>

                    <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                            <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 160, fontSize: 12, outline: 'none' }} placeholder="Search services…"
                                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>

                        {/* <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-circle-dot text-secondary" style={{ fontSize: 13 }}></i>
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 120, height: '100%' }}
                                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                                <option value="">All statuses</option>
                                {['draft', 'scheduled', 'published', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div> */}

                        {activeFilterCount > 0 && (
                            <button className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>
                                <i className="ti ti-x" style={{ fontSize: 12 }}></i>Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchServices}>Retry</button>
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────── */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead style={{ background: '#f2f5f9' }}>
                                <tr>
                                    <th style={{ width: 40 }}><input type="checkbox" className="form-check-input" checked={selectAll} onChange={toggleSelectAll} /></th>
                                    {/* <th onClick={() => handleSort('number')} style={{ cursor: 'pointer', textWrap: 'nowrap' }}>#<SortIcon col="number" /></th> */}
                                    <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', textWrap: 'nowrap' }}>Title <SortIcon col="title" /></th>
                                    <th>Images</th>
                                    {/* <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', textWrap: 'nowrap' }}>Status <SortIcon col="status" /></th> */}
                                    {/* <th>Visiblity</th> */}
                                    {/* <th>Publish at</th> */}
                                    <th onClick={() => handleSort('order')} style={{ cursor: 'pointer', textWrap: 'nowrap' }}>Order <SortIcon col="order" /></th>
                                    {/* <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer', textWrap: 'nowrap' }}>Created <SortIcon col="createdAt" /></th> */}
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                    : services.length === 0
                                        ? <tr><td colSpan={10} className="text-center py-5 text-muted"><i className="ti ti-file-unknown fs-1 d-block mb-2"></i>No Category found</td></tr>
                                        : services.map(row => (
                                            <tr key={row.id} className="border-bottom">
                                                <td><input type="checkbox" className="form-check-input" checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} /></td>
                                                {/* <td><code className="bg-light p-1 rounded small">{row.number}</code></td> */}

                                                <td style={{ maxWidth: 280 }}>
                                                    <button className="btn btn-link btn-sm p-0 text-start fw-medium" style={{ fontSize: '.85rem' }} onClick={() => setViewTarget(row)}>
                                                        <div style={{ textWrap: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{row.title}</div>
                                                    </button>
                                                </td>

                                                <td>
                                                    <div className="d-flex gap-1">
                                                        {row.imageUrl ? (
                                                            <img src={row.imageUrl} onClick={() => setImageView({ imageView: imageView.imageView ? false : true, imageSrc: row.imageUrl })} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain' }} className="rounded shadow-sm" />
                                                        ) : '—'}
                                                        {/* {row.shapeImageUrl ? (
                                                            <img src={row.shapeImageUrl} onClick={() => setImageView({ imageView: imageView.imageView ? false : true, imageSrc: row.shapeImageUrl })} alt="shape" style={{ width: 32, height: 32, objectFit: 'contain' }} className="rounded shadow-sm" />
                                                        ) : '—'} */}
                                                    </div>
                                                </td>

                                                {/* <td><StatusBadge status={row.status} /></td> */}

                                                {/* <td>
                                                    <div className="form-check form-switch m-0">
                                                        <input type="checkbox" className="form-check-input" checked={row.isActive} onChange={() => handleToggleActive(row)} style={{ cursor: 'pointer' }} />
                                                    </div>
                                                </td> */}

                                                {/* <td className="small text-nowrap">
                                                    {row.publishAt
                                                        ? <><i className="ti ti-clock text-info me-1"></i>{new Date(row.publishAt).toLocaleString()}</>
                                                        : <span className="text-muted">—</span>}
                                                </td> */}

                                                <td className="small text-muted">{row.order}</td>
                                                {/* <td className="small text-muted text-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td> */}

                                                <td className="text-end">
                                                    {/* <div className="btn-group"> */}
                                                    <button className="action-btn" onClick={() => setViewTarget(row)} title="View"><i className="ti ti-eye"></i></button>
                                                    {/* {row.status !== 'published' && (
                                                        <button className="action-btn" onClick={() => handlePublishNow(row.id)} title="Publish now"><i className="ti ti-world"></i></button>
                                                    )} */}
                                                    {/* <button className="action-btn" onClick={() => setScheduleTarget(row.id)} title="Schedule"><i className="ti ti-clock"></i></button> */}
                                                    <button className="action-btn" onClick={() => handleOpenModal(row)} title="Edit"><i className="ti ti-edit"></i></button>
                                                    <button className="action-btn" onClick={() => handleDelete(row.id)} title="Delete"><i className="ti ti-trash"></i></button>
                                                    {/* </div> */}
                                                </td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                            <div className={`d-${imageView.imageView ? 'flex' : 'none'} bg-transparent`} style={{ position: "fixed", top: 0, right: 0, left: 0, bottom: 0, transitionBehavior: "smooth", transitionDuration: "1s" }} >
                                <div className="my-auto w-50 mx-auto px-5 py-3 rounded d-flex shadow border-white" style={{ background: "#ffffff39", backdropFilter: "blur(3px)" }} >
                                    <div className="h-100 w-100 d-flex bg-transparent">
                                        <img src={imageView.imageSrc} alt="large-logo" className="h-50 w-50 mx-auto my-auto" style={{ objectFit: 'contain' }} />
                                    </div>
                                    <div className="float-end text-dark bg-transparent" onClick={() => setImageView({ imageView: imageView.imageView ? false : true, imageSrc: '' })} style={{ cursor: "pointer" }}>X</div>
                                </div>
                            </div>
                        </table>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <div className="small text-muted">Showing {services.length} of {total} entries</div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                    return <li key={p} className={`page-item ${page === p ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>;
                                })}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* 
    ADD this helper near your other state declarations:
    
    const [linkManuallyEdited, setLinkManuallyEdited] = useState(false);
    
    Also add/replace your title onChange with the one shown in the modal below.
    When editingItem changes (opening edit mode), reset the flag:
    
    useEffect(() => {
        setLinkManuallyEdited(false);
    }, [editingItem, showModal]);
*/}

            {/* ── Create/Edit modal ───────────────────────────────── */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg overflow-auto">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title">
                                    <i className={`ti ${editingItem ? 'ti-edit' : 'ti-plus'} me-2`}></i>
                                    {editingItem ? 'Edit Category' : 'Create Category'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-3">
                                    <div className="row g-3">
                                        {/* <div className="col-md-4">
                                            <label className="form-label small fw-medium">Number <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm" value={formData.number || ''}
                                                onChange={e => setFormData(p => ({ ...p, number: e.target.value }))} placeholder="01, 02…" required />
                                        </div> */}
                                        <div className="col-md-4">
                                            <label className="form-label small fw-medium">Order <span className="text-danger">*</span></label>
                                            <input type="number" className="form-control form-control-sm" value={formData.order ?? 0}
                                                onChange={e => setFormData(p => ({ ...p, order: parseInt(e.target.value) }))} min="1" required />
                                        </div>
                                        {/* <div className="col-md-4">
                                            <label className="form-label small fw-medium">Status</label>
                                            <select className="form-select form-select-sm" value={formData.status || 'draft'}
                                                onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="draft">Draft</option>
                                                <option value="scheduled">Scheduled</option>
                                                <option value="published">Published</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div> */}

                                        {/* {formData.status === 'scheduled' && (
                                            <div className="col-12">
                                                <label className="form-label small fw-medium">Publish at <span className="text-danger">*</span></label>
                                                <input type="datetime-local" className="form-control form-control-sm"
                                                    value={formScheduleAt} min={minDT} max={maxDT}
                                                    onChange={e => setFormScheduleAt(e.target.value)} required />
                                                <small className="text-muted">Must be within the next 24 hours</small>
                                            </div>
                                        )} */}

                                        {/* ── Title — auto-fills link on change ── */}
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Title <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={formData.title || ''}
                                                onChange={e => {
                                                    const newTitle = e.target.value;
                                                    // Build the auto link: /jobs?category=<encoded title>
                                                    const autoLink = newTitle.trim()
                                                        ? `/jobs?category=${encodeURIComponent(newTitle.trim())}`
                                                        : '';
                                                    setFormData(p => ({
                                                        ...p,
                                                        title: newTitle,
                                                        // Only overwrite link if user hasn't manually typed in it
                                                        ...(!linkManuallyEdited && { link: autoLink }),
                                                    }));
                                                }}
                                                required
                                            />
                                        </div>

                                        {/* ── Link — locked to auto-fill unless user edits manually ── */}
                                        {/* <div className="col-12">
                                            <label className="form-label small fw-medium d-flex align-items-center gap-2">
                                                Link <span className="text-danger">*</span>
                                                {linkManuallyEdited ? (
                                                    <span
                                                        className="badge bg-warning text-dark fw-normal"
                                                        style={{ fontSize: '10px', cursor: 'pointer' }}
                                                        title="Click to restore auto-generated link"
                                                        onClick={() => {
                                                            setLinkManuallyEdited(false);
                                                            const autoLink = formData.title?.trim()
                                                                ? `/jobs?category=${encodeURIComponent(formData.title.trim())}`
                                                                : '';
                                                            setFormData(p => ({ ...p, link: autoLink }));
                                                        }}
                                                    >
                                                        ✎ manual — click to reset
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-success fw-normal" style={{ fontSize: '10px' }}>
                                                        ✦ auto-filled
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                type="text"
                                                className={`form-control form-control-sm ${linkManuallyEdited ? 'border-warning' : 'border-success'}`}
                                                value={formData.link || ''}
                                                onChange={e => {
                                                    setLinkManuallyEdited(true);
                                                    setFormData(p => ({ ...p, link: e.target.value }));
                                                }}
                                                placeholder="/listing or https://…"
                                                required
                                            />
                                            <small className="text-muted">
                                                Auto-generated from title. Edit manually to override.
                                            </small>
                                        </div> */}

                                        {/* <div className="col-12">
                                            <label className="form-label small fw-medium">Description <span className="text-danger">*</span></label>
                                            <Editor apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY} init={tinymceConfig}
                                                value={formData.description || ''}
                                                onEditorChange={content => setFormData(p => ({ ...p, description: content }))} />
                                        </div> */}
                                        <div className="col-md-12">
                                            <ImageUploader label="Upload Image" currentImageUrl={formData.imageUrl}
                                                onFileSelect={setImageFile}
                                                onUrlChange={url => setFormData(p => ({ ...p, imageUrl: url }))} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-0 py-2">
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-sm btn-primary">{editingItem ? 'Update' : 'Create'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modals ─────────────────────────────────────────── */}
            {viewTarget && <ViewModal service={viewTarget} onClose={() => setViewTarget(null)} onRefresh={fetchServices} />}
            {scheduleTarget && <ScheduleModal serviceId={scheduleTarget} onClose={() => setScheduleTarget(null)} onSaved={() => { setScheduleTarget(null); fetchServices(); }} />}

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
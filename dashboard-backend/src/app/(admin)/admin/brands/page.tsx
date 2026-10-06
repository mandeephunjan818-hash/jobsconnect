'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ExcelJS from 'exceljs';

const KNOWN_SITES = [
    'jobs-connect.vercel.app',
    'new-jobs-fawn.vercel.app',
    'jobsrefugee.ca',
    'vulnerableyouthsjobs.ca',
    'accesscareers.ca',
    'indigenouspeoplesjobs.ca',
];

// ── Types ──────────────────────────────────────────────────────
interface BrandAddress {
    street?: string;
    city?: string;
    province?: string;
    country?: string;
    postalCode?: string;
}

interface BrandItem {
    id: string;
    name: string;
    companyType: string;
    description: string;
    address: BrandAddress;
    logoUrl: string;
    logoAlt: string;
    websiteUrl?: string;
    order: number;
    visibleOnSites: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse {
    data: BrandItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// ── Skeleton row ───────────────────────────────────────────────
function SkeletonRow() {
    return (
        <tr>
            {Array.from({ length: 8 }).map((_, i) => (
                <td key={i}>
                    <div className="skeleton skeleton--text"
                        style={{ width: i === 1 ? 140 : 80, height: 18 }} />
                </td>
            ))}
        </tr>
    );
}

// ── Sites multi-select pills ───────────────────────────────────
function SitePills({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const toggle = (site: string) =>
        onChange(value.includes(site) ? value.filter(s => s !== site) : [...value, site]);

    return (
        <div className="d-flex flex-wrap gap-1 mt-1">
            {KNOWN_SITES.map(site => (
                <button
                    key={site}
                    type="button"
                    onClick={() => toggle(site)}
                    className={`btn btn-xs border rounded-pill px-2 py-0`}
                    style={{
                        fontSize: 11,
                        background: value.includes(site) ? '#1a56db' : '#f3f4f6',
                        color: value.includes(site) ? '#fff' : '#374151',
                        borderColor: value.includes(site) ? '#1a56db' : '#d1d5db',
                    }}
                >
                    {site}
                </button>
            ))}
        </div>
    );
}

// ── Logo uploader ──────────────────────────────────────────────
interface LogoUploaderProps {
    currentUrl?: string;
    onFileSelect: (f: File | null) => void;
    onUrlChange: (url: string) => void;
}
function LogoUploader({ currentUrl, onFileSelect, onUrlChange }: LogoUploaderProps) {
    const [preview, setPreview] = useState<string | null>(currentUrl || null);
    const [urlInput, setUrlInput] = useState(currentUrl || '');
    const ref = useRef<HTMLInputElement>(null);

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const r = new FileReader();
            r.onloadend = () => {
                setPreview(r.result as string);
                onFileSelect(file);
                onUrlChange('');
            };
            r.readAsDataURL(file);
        } else {
            setPreview(null);
            onFileSelect(null);
        }
    };

    const onUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setUrlInput(url);
        setPreview(url);
        onUrlChange(url);
        onFileSelect(null);
    };

    const onRemove = () => {
        setPreview(null);
        setUrlInput('');
        onFileSelect(null);
        onUrlChange('');
        if (ref.current) ref.current.value = '';
    };

    return (
        <div>
            <label className="form-label small fw-semibold">Logo image <span className="text-danger">*</span></label>
            <div className="d-flex align-items-start gap-2">
                <div
                    onClick={() => ref.current?.click()}
                    className="border rounded-3 d-flex align-items-center justify-content-center bg-light flex-shrink-0"
                    style={{
                        width: 80, height: 60, cursor: 'pointer',
                        backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundImage: preview ? `url(${preview})` : 'none',
                    }}
                >
                    {!preview && <i className="ti ti-photo text-muted" style={{ fontSize: '1.4rem' }} />}
                </div>
                <div className="flex-grow-1">
                    <input type="file" ref={ref} className="d-none" accept="image/*" onChange={onFile} />
                    <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white border-end-0">
                            <i className="ti ti-link text-muted" />
                        </span>
                        <input
                            type="url" className="form-control form-control-sm border-start-0"
                            placeholder="Or paste logo URL" value={urlInput} onChange={onUrl}
                        />
                    </div>
                    <small className="text-muted d-block mt-1">Upload file or paste URL</small>
                    {preview && (
                        <button type="button" className="btn btn-sm btn-outline-danger mt-1 py-0" onClick={onRemove}>
                            <i className="ti ti-trash me-1" />Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── View modal ─────────────────────────────────────────────────
function ViewModal({
    item, onClose, onRefresh,
}: { item: BrandItem; onClose: () => void; onRefresh: () => void }) {
    const [current, setCurrent] = useState(item);
    const [saving, setSaving] = useState(false);

    const doAction = async (action: string, extra: Record<string, any> = {}) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/brands/${current.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setCurrent((await res.json()).data);
            onRefresh();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const hasAddress = Object.values(current.address).some(Boolean);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
                zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff', borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(0,0,0,.25)',
                    width: '100%', maxWidth: 680,
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {current.logoUrl && (
                            <img src={current.logoUrl} alt={current.logoAlt}
                                style={{ width: 56, height: 44, objectFit: 'contain', background: '#f8fafd', borderRadius: 6, padding: 4, border: '1px solid #e2e8f0' }} />
                        )}
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{current.name}</h4>
                            <p style={{ margin: '.2rem 0 0', fontSize: '.8rem', color: '#64748b' }}>{current.companyType}</p>
                        </div>
                    </div>
                    <button style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }} onClick={onClose}>×</button>
                </div>

                {/* Action bar */}
                <div style={{
                    padding: '.6rem 1.5rem', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', gap: '.5rem', flexWrap: 'wrap', flexShrink: 0,
                }}>
                    {!current.isActive ? (
                        <button className="btn btn-sm btn-success" onClick={() => doAction('activate')} disabled={saving}>
                            <i className="ti ti-eye me-1" />Make Active
                        </button>
                    ) : (
                        <button className="btn btn-sm btn-outline-warning" onClick={() => doAction('deactivate')} disabled={saving}>
                            <i className="ti ti-eye-off me-1" />Deactivate
                        </button>
                    )}
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => doAction('toggle-active', { isActive: !current.isActive })}
                        disabled={saving}
                    >
                        <i className={`ti ${current.isActive ? 'ti-eye-off' : 'ti-eye'} me-1`} />
                        {current.isActive ? 'Hide' : 'Show'}
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                    {/* Status pills */}
                    <div className="d-flex gap-2 mb-3">
                        {current.isActive
                            ? <span className="badge bg-success">Active</span>
                            : <span className="badge bg-secondary">Inactive</span>}
                    </div>

                    {/* Logo full-size */}
                    {current.logoUrl && (
                        <div className="mb-3 text-center p-3 bg-light rounded-3 border">
                            <img src={current.logoUrl} alt={current.logoAlt}
                                style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                    )}

                    {/* Meta grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
                        {[
                            ['Display Order', current.order],
                            ['Website', current.websiteUrl || '—'],
                            ['Logo Alt', current.logoAlt],
                            ['Created', new Date(current.createdAt).toLocaleString()],
                            ['Updated', new Date(current.updatedAt).toLocaleString()],
                        ].map(([label, value]) => (
                            <div key={label} style={{ background: '#f8fafd', borderRadius: 8, padding: '.6rem .85rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.2rem' }}>{label}</div>
                                <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>{String(value)}</div>
                            </div>
                        ))}
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.3rem' }}>Description</p>
                    <p style={{ fontSize: '.88rem', color: '#334155', lineHeight: 1.65, marginBottom: '1.25rem' }}>{current.description}</p>

                    {/* Visible on sites */}
                    <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.5rem' }}>Visible on sites</p>
                    <div className="d-flex flex-wrap gap-1 mb-3">
                        {current.visibleOnSites.length
                            ? current.visibleOnSites.map(s => (
                                <span key={s} className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle"
                                    style={{ fontSize: 11 }}>{s}</span>
                            ))
                            : <span className="text-muted small">None assigned</span>}
                    </div>

                    {/* Address */}
                    {hasAddress && (
                        <>
                            <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.5rem' }}>Address</p>
                            <div style={{ fontSize: '.88rem', color: '#334155', lineHeight: 1.8 }}>
                                {current.address.street && <div>{current.address.street}</div>}
                                {(current.address.city || current.address.province) && (
                                    <div>{[current.address.city, current.address.province].filter(Boolean).join(', ')}</div>
                                )}
                                {current.address.country && <div>{current.address.country}{current.address.postalCode ? ` ${current.address.postalCode}` : ''}</div>}
                            </div>
                        </>
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
export default function BrandsAdminPage() {
    const [items, setItems] = useState<BrandItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<BrandItem | null>(null);
    const [viewTarget, setViewTarget] = useState<BrandItem | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [isActiveFilter, setIsActiveFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('order');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
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
        name: '', companyType: '', description: '',
        logoUrl: '', logoAlt: '', websiteUrl: '',
        order: 0, visibleOnSites: [] as string[], isActive: true,
        street: '', city: '', province: '', country: '', postalCode: '',
    };
    const [formData, setFormData] = useState({ ...emptyForm });
    const [logoFile, setLogoFile] = useState<File | null>(null);

    // ── Fetch ──────────────────────────────────────────────────
    const fetchItems = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('perPage', String(perPage));
            params.set('sortBy', sortBy);
            params.set('sortOrder', sortDir);
            if (search) params.set('search', search);
            if (siteFilter) params.set('site', siteFilter);
            if (isActiveFilter) params.set('isActive', isActiveFilter);

            const res = await fetch(`/api/admin/brands?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setItems(json.data); setTotal(json.total); setTotalPages(json.totalPages);
            setSelectedIds([]); setSelectAll(false);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [page, perPage, sortBy, sortDir, search, siteFilter, isActiveFilter]);

    useEffect(() => {
        const t = setTimeout(fetchItems, 300);
        return () => clearTimeout(t);
    }, [fetchItems]);

    // ── Sort ───────────────────────────────────────────────────
    const handleSort = (col: string) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };
    const SortIcon = ({ col }: { col: string }) =>
        sortBy !== col
            ? <i className="ti ti-arrows-sort text-muted ms-1" />
            : sortDir === 'asc'
                ? <i className="ti ti-arrow-up ms-1" />
                : <i className="ti ti-arrow-down ms-1" />;

    // ── Bulk select ────────────────────────────────────────────
    const toggleSelectAll = () => {
        if (selectAll) { setSelectedIds([]); setSelectAll(false); }
        else { setSelectedIds(items.map(i => i.id)); setSelectAll(true); }
    };
    const toggleRow = (id: string) => setSelectedIds(prev => {
        const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
        setSelectAll(next.length === items.length && items.length > 0);
        return next;
    });

    // ── Actions ────────────────────────────────────────────────
    const doAction = async (id: string, action: string, extra: Record<string, any> = {}) => {
        try {
            const res = await fetch(`/api/admin/brands/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            await fetchItems();
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this brand?')) return;
        try {
            const res = await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            await fetchItems();
        } catch (e: any) { alert(e.message); }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return alert('Nothing selected');
        if (!confirm(`Delete ${selectedIds.length} brand(s)?`)) return;
        try {
            await fetch('/api/admin/brands', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            await fetchItems();
        } catch (e: any) { alert(e.message); }
    };

    // ── Export ─────────────────────────────────────────────────
    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch('/api/admin/brands?page=1&perPage=10000');
            const json: ApiResponse = await res.json();
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Brands');
            ws.columns = [
                { header: 'ID', key: 'id', width: 28 },
                { header: 'Name', key: 'name', width: 30 },
                { header: 'Company Type', key: 'companyType', width: 22 },
                { header: 'Description', key: 'description', width: 40 },
                { header: 'Logo URL', key: 'logoUrl', width: 40 },
                { header: 'Logo Alt', key: 'logoAlt', width: 24 },
                { header: 'Website URL', key: 'websiteUrl', width: 32 },
                { header: 'Order', key: 'order', width: 10 },
                { header: 'Visible On Sites', key: 'visibleOnSites', width: 50 },
                { header: 'Is Active', key: 'isActive', width: 12 },
                { header: 'City', key: 'city', width: 18 },
                { header: 'Country', key: 'country', width: 18 },
                { header: 'Created At', key: 'createdAt', width: 22 },
            ];
            json.data.forEach(row =>
                ws.addRow({
                    ...row,
                    visibleOnSites: row.visibleOnSites.join(', '),
                    city: row.address?.city ?? '',
                    country: row.address?.country ?? '',
                    createdAt: new Date(row.createdAt).toLocaleString(),
                })
            );
            ws.getRow(1).font = { bold: true };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `brands_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch (e: any) { alert(`Export failed: ${e.message}`); }
        finally { setExporting(false); }
    };

    // ── Import ─────────────────────────────────────────────────
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
                'id': 'id', 'name': 'name',
                'company type': 'companyType', 'companytype': 'companyType',
                'description': 'description',
                'logo url': 'logoUrl', 'logourl': 'logoUrl',
                'logo alt': 'logoAlt', 'logoalt': 'logoAlt',
                'website url': 'websiteUrl', 'websiteurl': 'websiteUrl',
                'order': 'order',
                'visible on sites': 'visibleOnSites', 'visibleonsites': 'visibleOnSites',
                'is active': 'isActive', 'isactive': 'isActive',
            };

            const importItems: any[] = [];
            ws.eachRow((row, rowNum) => {
                if (rowNum === 1) return;
                const item: any = {};
                row.eachCell((cell, col) => {
                    const field = fieldMap[headers[col]];
                    if (field) item[field] = cell.text;
                });
                if (item.name && item.companyType) importItems.push(item);
            });

            if (!importItems.length) { alert('No valid rows found'); return; }

            const res = await fetch('/api/admin/brands/import', {
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

    // ── Open modal ─────────────────────────────────────────────
    const handleOpenModal = (item?: BrandItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                companyType: item.companyType,
                description: item.description,
                logoUrl: item.logoUrl,
                logoAlt: item.logoAlt,
                websiteUrl: item.websiteUrl ?? '',
                order: item.order,
                visibleOnSites: item.visibleOnSites,
                isActive: item.isActive,
                street: item.address?.street ?? '',
                city: item.address?.city ?? '',
                province: item.address?.province ?? '',
                country: item.address?.country ?? '',
                postalCode: item.address?.postalCode ?? '',
            });
        } else {
            setEditingItem(null);
            setFormData({ ...emptyForm });
        }
        setLogoFile(null);
        setShowModal(true);
    };

    // ── Submit ─────────────────────────────────────────────────
    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        const fd = new FormData();
        fd.append('name', formData.name);
        fd.append('companyType', formData.companyType);
        fd.append('description', formData.description);
        fd.append('logoUrl', formData.logoUrl);
        fd.append('logoAlt', formData.logoAlt || formData.name);
        fd.append('websiteUrl', formData.websiteUrl);
        fd.append('order', String(formData.order));
        fd.append('isActive', String(formData.isActive));
        fd.append('visibleOnSites', JSON.stringify(formData.visibleOnSites));
        fd.append('street', formData.street);
        fd.append('city', formData.city);
        fd.append('province', formData.province);
        fd.append('country', formData.country);
        fd.append('postalCode', formData.postalCode);
        if (logoFile) fd.append('logoFile', logoFile);

        try {
            const url = editingItem ? `/api/admin/brands/${editingItem.id}` : '/api/admin/brands';
            const method = editingItem ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: fd });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            await fetchItems(); setShowModal(false);
        } catch (e: any) { alert(e.message); }
    };

    const activeFilterCount = [search, siteFilter, isActiveFilter].filter(Boolean).length;

    return (
        <div className="container-fluid py-4">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3">
                <div>
                    <h4 className="mb-1 fw-semibold">Partner Brands</h4>
                    <p className="text-muted small mb-0">Manage brand logos displayed in the site slider</p>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal()}>
                        <i className="ti ti-plus me-1" />Add brand
                    </button>
                    <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="d-none" onChange={handleImport} />
                    <button className="btn btn-sm btn-outline-info" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                        {importing
                            ? <><span className="spinner-border spinner-border-sm me-1" />Importing…</>
                            : <><i className="ti ti-file-import me-1" />Import</>}
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
                        {exporting
                            ? <><span className="spinner-border spinner-border-sm me-1" />Exporting…</>
                            : <><i className="ti ti-file-spreadsheet me-1" />Export</>}
                    </button>
                    {selectedIds.length > 0 && (
                        <div className="dropdown">
                            <button className="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                                Bulk ({selectedIds.length})
                            </button>
                            <ul className="dropdown-menu">
                                <li>
                                    <button className="dropdown-item text-danger" onClick={handleBulkDelete}>
                                        Delete selected
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Filter bar */}
                <div className="ulp-filters bg-white rounded-3 p-2 border w-100 mt-2"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <button
                        className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1"
                        style={{ fontSize: 13 }} onClick={() => setMobileOpen(o => !o)}>
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }} />Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {activeFilterCount > 0 && (
                                <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>
                                    {activeFilterCount}
                                </span>
                            )}
                            <i className="ti ti-chevron-down" style={{ fontSize: 14, transform: mobileOpen ? 'rotate(180deg)' : 'none' }} />
                        </span>
                    </button>

                    <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
                        {/* Search */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }} />
                            <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 160, fontSize: 12, outline: 'none' }} placeholder="Search…"
                                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>

                        {/* Site */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-world text-secondary" style={{ fontSize: 13 }} />
                            <select className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 180 }}
                                value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1); }}>
                                <option value="">All sites</option>
                                {KNOWN_SITES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Active */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-toggle-left text-secondary" style={{ fontSize: 13 }} />
                            <select className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 110 }}
                                value={isActiveFilter} onChange={e => { setIsActiveFilter(e.target.value); setPage(1); }}>
                                <option value="">All visibility</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>

                        {activeFilterCount > 0 && (
                            <button className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderRadius: 6 }}
                                onClick={() => { setSearch(''); setSiteFilter(''); setIsActiveFilter(''); setPage(1); }}>
                                <i className="ti ti-x" style={{ fontSize: 12 }} />Clear
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

            {/* ── Table ──────────────────────────────────────── */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead style={{ background: '#f2f5f9' }}>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input type="checkbox" className="form-check-input"
                                            checked={selectAll} onChange={toggleSelectAll} />
                                    </th>
                                    <th style={{ width: 64 }}>Logo</th>
                                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Name <SortIcon col="name" />
                                    </th>
                                    <th onClick={() => handleSort('companyType')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Type <SortIcon col="companyType" />
                                    </th>
                                    <th>Sites</th>
                                    <th onClick={() => handleSort('order')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Order <SortIcon col="order" />
                                    </th>
                                    <th>Active</th>
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
                                        ? (
                                            <tr>
                                                <td colSpan={9} className="text-center py-5 text-muted">
                                                    <i className="ti ti-building fs-1 d-block mb-2" />No brands found
                                                </td>
                                            </tr>
                                        )
                                        : items.map(row => (
                                            <tr key={row.id} className="border-bottom">
                                                <td>
                                                    <input type="checkbox" className="form-check-input"
                                                        checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} />
                                                </td>
                                                <td>
                                                    {row.logoUrl
                                                        ? (
                                                            <img src={row.logoUrl} alt={row.logoAlt}
                                                                style={{ width: 48, height: 36, objectFit: 'contain', background: '#f8fafd', borderRadius: 4, padding: 2, border: '1px solid #e2e8f0' }} />
                                                        )
                                                        : <span className="text-muted">—</span>}
                                                </td>
                                                <td style={{ maxWidth: 220 }}>
                                                    <button className="btn btn-link btn-sm p-0 text-start fw-medium"
                                                        style={{ fontSize: '.85rem' }} onClick={() => setViewTarget(row)}>
                                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                                                            {row.name}
                                                        </div>
                                                    </button>
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border small">{row.companyType}</span>
                                                </td>
                                                <td style={{ maxWidth: 200 }}>
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {row.visibleOnSites.length
                                                            ? row.visibleOnSites.slice(0, 2).map(s => (
                                                                <span key={s} className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle"
                                                                    style={{ fontSize: 10 }}>{s}</span>
                                                            ))
                                                            : <span className="text-muted small">—</span>}
                                                        {row.visibleOnSites.length > 2 && (
                                                            <span className="badge bg-secondary small">+{row.visibleOnSites.length - 2}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-center small fw-semibold">{row.order}</td>
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
                                                    {/* <div className="btn-group"> */}
                                                    <button className="action-btn"
                                                        onClick={() => setViewTarget(row)} title="View">
                                                        <i className="ti ti-eye" />
                                                    </button>
                                                    <button className="action-btn"
                                                        onClick={() => handleOpenModal(row)} title="Edit">
                                                        <i className="ti ti-edit" />
                                                    </button>
                                                    <button className="action-btn"
                                                        onClick={() => handleDelete(row.id)} title="Delete">
                                                        <i className="ti ti-trash" />
                                                    </button>
                                                    {/* </div> */}
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
                                    <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* ── Create / Edit modal ─────────────────────────── */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title">
                                    <i className={`ti ${editingItem ? 'ti-edit' : 'ti-plus'} me-2`} />
                                    {editingItem ? 'Edit brand' : 'Add brand'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-3">
                                    <div className="row g-3">

                                        {/* Name + Type */}
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Company name <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm" required
                                                value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                                placeholder="e.g. Maple Leaf Foods Inc." />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Company type <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm" required
                                                value={formData.companyType} onChange={e => setFormData(p => ({ ...p, companyType: e.target.value }))}
                                                placeholder="e.g. Food & Beverage" />
                                        </div>

                                        {/* Description */}
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Description <span className="text-danger">*</span></label>
                                            <textarea className="form-control form-control-sm" rows={3} required
                                                value={formData.description}
                                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                                placeholder="One-paragraph overview of the company" />
                                        </div>

                                        {/* Logo */}
                                        <div className="col-12">
                                            <LogoUploader
                                                currentUrl={formData.logoUrl}
                                                onFileSelect={setLogoFile}
                                                onUrlChange={url => setFormData(p => ({ ...p, logoUrl: url }))}
                                            />
                                        </div>

                                        {/* Logo alt + Website */}
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Logo alt text</label>
                                            <input type="text" className="form-control form-control-sm"
                                                value={formData.logoAlt} onChange={e => setFormData(p => ({ ...p, logoAlt: e.target.value }))}
                                                placeholder="Defaults to company name" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Website URL</label>
                                            <input type="url" className="form-control form-control-sm"
                                                value={formData.websiteUrl} onChange={e => setFormData(p => ({ ...p, websiteUrl: e.target.value }))}
                                                placeholder="https://example.com" />
                                        </div>

                                        {/* Order + Active */}
                                        <div className="col-md-4">
                                            <label className="form-label small fw-medium">Display order</label>
                                            <input type="number" className="form-control form-control-sm" min={0}
                                                value={formData.order} onChange={e => setFormData(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} />
                                        </div>
                                        <div className="col-md-4 d-flex align-items-end pb-1">
                                            <div className="form-check form-switch">
                                                <input type="checkbox" className="form-check-input" id="isActiveCheck"
                                                    checked={formData.isActive}
                                                    onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} />
                                                <label className="form-check-label small" htmlFor="isActiveCheck">Active</label>
                                            </div>
                                        </div>

                                        {/* Visible on sites */}
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Visible on sites</label>
                                            <SitePills
                                                value={formData.visibleOnSites}
                                                onChange={sites => setFormData(p => ({ ...p, visibleOnSites: sites }))}
                                            />
                                            <small className="text-muted">Click to toggle. Brand appears on selected sites.</small>
                                        </div>

                                        {/* Address */}
                                        <div className="col-12">
                                            <p className="form-label small fw-semibold mb-1">Address <span className="text-muted fw-normal">(optional)</span></p>
                                            <div className="row g-2">
                                                <div className="col-12">
                                                    <input type="text" className="form-control form-control-sm" placeholder="Street"
                                                        value={formData.street} onChange={e => setFormData(p => ({ ...p, street: e.target.value }))} />
                                                </div>
                                                <div className="col-md-4">
                                                    <input type="text" className="form-control form-control-sm" placeholder="City"
                                                        value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} />
                                                </div>
                                                <div className="col-md-4">
                                                    <input type="text" className="form-control form-control-sm" placeholder="Province"
                                                        value={formData.province} onChange={e => setFormData(p => ({ ...p, province: e.target.value }))} />
                                                </div>
                                                <div className="col-md-4">
                                                    <input type="text" className="form-control form-control-sm" placeholder="Postal code"
                                                        value={formData.postalCode} onChange={e => setFormData(p => ({ ...p, postalCode: e.target.value }))} />
                                                </div>
                                                <div className="col-12">
                                                    <input type="text" className="form-control form-control-sm" placeholder="Country"
                                                        value={formData.country} onChange={e => setFormData(p => ({ ...p, country: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer bg-light border-0 py-2">
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-sm btn-primary">
                                        {editingItem ? 'Update brand' : 'Create brand'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── View modal ─────────────────────────────────── */}
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
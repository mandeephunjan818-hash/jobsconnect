'use client';

import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { KNOWN_SITES } from '@/lib/sites';

// ── Types ──────────────────────────────────────────────────────────────────
interface SubscriberItem {
    id: string;
    email: string;
    name?: string;
    siteId: string;
    status: 'active' | 'unsubscribed';
    preferences: { blogs: boolean; jobs: boolean };
    subscribedAt: string;
    unsubscribedAt?: string;
}

interface ApiResponse {
    data: SubscriberItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

interface Stats {
    total: number;
    active: number;
    unsubscribed: number;
    newToday: number;
    newLast30: number;
}

interface BroadcastForm {
    type: 'blog' | 'job';
    title: string;
    url: string;
    siteId: string;
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function SkeletonRow() {
    return (
        <tr>
            {[120, 180, 140, 80, 80, 80, 120, 80].map((w, i) => (
                <td key={i}><div className="skeleton skeleton--text" style={{ width: w, height: 20 }} /></td>
            ))}
        </tr>
    );
}

const tinymceConfig = {
    height: 200, menubar: false,
    plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
        'searchreplace', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount'],
    toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
    content_style: 'body { font-family: system-ui,-apple-system,sans-serif; font-size:14px; color:#212529; }',
};

// ── Main Page ─────────────────────────────────────────────────────────────
export default function SubscribersAdminPage() {
    const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [prefFilter, setPrefFilter] = useState(''); // 'blogs' | 'jobs' | ''
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [siteFilter, setSiteFilter] = useState('');

    // Modals
    const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberItem | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Broadcast form
    const [broadcast, setBroadcast] = useState<BroadcastForm>({ type: 'blog', title: '', url: '', siteId: '' });
    const [broadcasting, setBroadcasting] = useState(false);
    const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

    // Bulk import
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importRows, setImportRows] = useState<string>('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [importSiteId, setImportSiteId] = useState('');

    // Detail actions
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);


    // Add this state near your other useState declarations
    const [mobileOpen, setMobileOpen] = useState(false);



    // Active filters count for badge & clear button visibility
    const activeFiltersCount = (search ? 1 : 0) + (statusFilter ? 1 : 0) + (siteFilter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchSubscribers = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);
            if (siteFilter) params.set('siteId', siteFilter);
            params.set('page', String(page));
            params.set('perPage', String(perPage));

            const res = await fetch(`/api/admin/subscribers?${params}`);
            if (!res.ok) throw new Error('Failed to fetch subscribers');
            const json: ApiResponse = await res.json();
            setSubscribers(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const params = new URLSearchParams();
            if (siteFilter) params.set('siteId', siteFilter)
            const res = await fetch('/api/admin/subscribers/stats');
            if (res.ok) setStats(await res.json());
        } catch { /* non-critical */ }
    };

    useEffect(() => {
        fetchSubscribers();
    }, [page, search, statusFilter, siteFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchStats();
    }, [siteFilter]);

    // ── Filters ────────────────────────────────────────────────────────────
    const applyFilters = () => { setPage(1); fetchSubscribers(); };

    const clearFilters = () => {
        setSearch(''); setStatusFilter(''); setPrefFilter(''); setSiteFilter(''); setDateFrom(''); setDateTo(''); setPage(1);
    };

    // ── CSV Export ─────────────────────────────────────────────────────────
    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (siteFilter) params.set('siteId', siteFilter);
        if (dateTo) params.set('dateTo', dateTo);
        window.open(`/api/admin/subscribers/export?${params}`, '_blank');
    };

    // ── Detail Modal ───────────────────────────────────────────────────────
    const handleOpenDetail = (sub: SubscriberItem) => {
        setSelectedSubscriber(sub);
        setShowDetailModal(true);
    };

    const handleToggleStatus = async () => {
        if (!selectedSubscriber) return;
        setTogglingStatus(true);
        try {
            const newStatus = selectedSubscriber.status === 'active' ? 'unsubscribed' : 'active';
            const res = await fetch(`/api/admin/subscribers/${selectedSubscriber.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update status');
            setSelectedSubscriber((prev) => prev ? { ...prev, status: newStatus } : prev);
            await fetchSubscribers();
            await fetchStats();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setTogglingStatus(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this subscriber?')) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setShowDetailModal(false);
            setSelectedSubscriber(null);
            await fetchSubscribers();
            await fetchStats();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleTogglePref = async (pref: 'blogs' | 'jobs') => {
        if (!selectedSubscriber) return;
        const updated = { ...selectedSubscriber.preferences, [pref]: !selectedSubscriber.preferences[pref] };
        try {
            const res = await fetch(`/api/admin/subscribers/${selectedSubscriber.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences: updated }),
            });
            if (!res.ok) throw new Error('Failed to update preferences');
            setSelectedSubscriber((prev) => prev ? { ...prev, preferences: updated } : prev);
            await fetchSubscribers();
        } catch (err: any) {
            alert(err.message);
        }
    };



    // ── Broadcast ──────────────────────────────────────────────────────────
    const handleBroadcast = async () => {
        if (!broadcast.title || !broadcast.url) {
            alert('Title and URL are required');
            return;
        }
        setBroadcasting(true);
        setBroadcastResult(null);
        try {
            const res = await fetch('/api/admin/subscribers/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(broadcast),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Broadcast failed');
            setBroadcastResult(`✅ Sent to ${json.sent} subscriber${json.sent !== 1 ? 's' : ''}`);
            setBroadcast({ type: 'blog', title: '', url: '', siteId: '' });
        } catch (err: any) {
            setBroadcastResult(`❌ ${err.message}`);
        } finally {
            setBroadcasting(false);
        }
    };

    // ── Bulk Import ────────────────────────────────────────────────────────
    const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setImportRows(ev.target?.result as string ?? '');
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!importRows.trim()) { alert('Paste CSV rows or upload a file'); return; }
        if (!importSiteId) { alert('Please select a site for this import'); return; }
        setImporting(true);
        setImportResult(null);
        try {
            // Parse CSV: skip header if first line has "email" in it
            const lines = importRows.trim().split('\n');
            const startIdx = lines[0].toLowerCase().includes('email') ? 1 : 0;
            const entries = lines.slice(startIdx).map((line) => {
                const [email, name] = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
                return { email, name: name || undefined, siteId: importSiteId };
            }).filter((e) => e.email);

            const res = await fetch('/api/admin/subscribers/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entries),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Import failed');
            setImportResult(json);
            await fetchSubscribers();
            await fetchStats();
        } catch (err: any) {
            setImportResult({ error: err.message });
        } finally {
            setImporting(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="container-fluid py-4">

            {/* Header + Filters */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3">
                <div>
                    <h4 className="mb-1 fw-semibold">Subscribers</h4>
                    <p className="text-muted small mb-0">Manage newsletter subscribers</p>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleExport}>
                        <i className="ti ti-download me-1"></i>Export CSV
                    </button>
                    {/* <button className="btn btn-sm btn-outline-primary" onClick={() => { setShowImportModal(true); setImportResult(null); setImportRows(''); setImportSiteId(''); }}>
                        <i className="ti ti-upload me-1"></i>Bulk Import
                    </button> */}
                    <button className="btn btn-sm btn-primary" onClick={() => { setShowBroadcastModal(true); setBroadcast({ type: 'blog', title: '', url: '', siteId: '' }); }}>
                        <i className="ti ti-send me-1"></i>Broadcast
                    </button>
                </div>

                {/* Filter bar – same design as testimonials */}
                <div className="ulp-filters bg-white rounded-3 p-2 border w-100 mt-2" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <button className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1"
                        style={{ fontSize: 13 }} onClick={() => setMobileOpen(o => !o)}>
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }}></i>Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {activeFiltersCount > 0 && (
                                <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>
                                    {activeFiltersCount}
                                </span>
                            )}
                            <i className="ti ti-chevron-down" style={{ fontSize: 14, transition: 'transform 0.2s', transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </span>
                    </button>

                    <div className={`d-md-flex align-items-center flex-wrap gap-2 ${mobileOpen ? 'd-flex' : 'd-none'}`}>
                        {/* Search */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                            <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 160, fontSize: 12, outline: 'none' }} placeholder="Email or name"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>

                        {/* Status */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-check text-secondary" style={{ fontSize: 13 }}></i>
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 130, height: '100%' }}
                                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="">All status</option>
                                <option value="active">Active</option>
                                <option value="unsubscribed">Unsubscribed</option>
                            </select>
                        </div>

                        {/* Date From */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                            <input type="date" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 130, fontSize: 12, outline: 'none', color: '#212529' }}
                                value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>

                        {/* Date To */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                            <input type="date" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 130, fontSize: 12, outline: 'none', color: '#212529' }}
                                value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>

                        {/* Site */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-world text-secondary" style={{ fontSize: 13 }}></i>
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 160, height: '100%' }}
                                value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
                                <option value="">All sites</option>
                                {KNOWN_SITES.map(site => (
                                    <option key={site} value={site}>{site}</option>
                                ))}
                            </select>
                        </div>

                        {/* Apply */}
                        <button className="btn btn-sm d-flex align-items-center gap-1"
                            style={{ fontSize: 12, height: 32, border: '1px solid #534AB7', borderRadius: 6, background: 'transparent', color: '#534AB7' }}
                            onClick={applyFilters}>
                            <i className="ti ti-filter" style={{ fontSize: 12 }}></i> Apply
                        </button>

                        {/* Clear (only when a filter is active) */}
                        {activeFiltersCount > 0 && (
                            <button className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                onClick={clearFilters}>
                                <i className="ti ti-x" style={{ fontSize: 12 }}></i>Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchSubscribers}>Retry</button>
                </div>
            )}

            {/* Table */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-header-custom">
                                <tr>
                                    <th className="py-3">Email</th>
                                    {/* <th className="py-3">Name</th> */}
                                    <th className="py-3">Status</th>
                                    {/* <th className="py-3">Blogs</th>
                                    <th className="py-3">Jobs</th> */}
                                    <th className="py-3">Site</th>
                                    {/* <th className="py-3">Subscribed At</th> */}
                                    <th className="py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                ) : subscribers.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-5">
                                            <div className="text-muted">
                                                <i className="ti ti-mail-off fs-1 mb-3 d-block"></i>
                                                <h5>No subscribers found</h5>
                                                <p>Try adjusting your filters or import subscribers.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : subscribers.map((sub) => (
                                    <tr key={sub.id} className="border-bottom">
                                        <td className="fw-medium small">{sub.email}</td>
                                        {/* <td className="small text-muted">{sub.name || '—'}</td> */}
                                        <td>
                                            <span className={`badge ${sub.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        {/* <td>
                                            <i className={`ti ${sub.preferences.blogs ? 'ti-check text-success' : 'ti-x text-danger'}`}></i>
                                        </td>
                                        <td>
                                            <i className={`ti ${sub.preferences.jobs ? 'ti-check text-success' : 'ti-x text-danger'}`}></i>
                                        </td> */}
                                        <td className="small text-muted">{sub.siteId}</td>
                                        {/* <td className="small">{new Date(sub.subscribedAt).toLocaleDateString()}</td> */}
                                        <td className="text-end">
                                            {/* <div className="btn-group"> */}
                                            <button
                                                className="action-btn"
                                                onClick={() => handleOpenDetail(sub)}
                                            >
                                                <i className="ti ti-eye"></i>
                                            </button>
                                            <button
                                                className="action-btn"
                                                disabled={deletingId === sub.id}
                                                onClick={() => handleDelete(sub.id)}
                                            >
                                                <i className="ti ti-trash"></i>
                                            </button>
                                            {/* </div> */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <div className="small text-muted">Showing {subscribers.length} of {total} entries</div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;
                                    return (
                                        <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(pageNum)}>{pageNum}</button>
                                        </li>
                                    );
                                })}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* ── Detail Modal ─────────────────────────────────────────────── */}
            {showDetailModal && selectedSubscriber && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title"><i className="ti ti-user me-2"></i>Subscriber Details</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)}></button>
                            </div>
                            <div className="modal-body p-3">
                                <div className="mb-2"><strong>Email:</strong> {selectedSubscriber.email}</div>
                                {/* <div className="mb-2"><strong>Name:</strong> {selectedSubscriber.name || '—'}</div> */}
                                <div className="mb-2">
                                    <strong>Status:</strong>{' '}
                                    <span className={`badge ${selectedSubscriber.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                                        {selectedSubscriber.status}
                                    </span>
                                </div>
                                <div className="mb-2"><strong>Site:</strong> {selectedSubscriber.siteId}</div>
                                <div className="mb-2"><strong>Subscribed:</strong> {new Date(selectedSubscriber.subscribedAt).toLocaleString()}</div>
                                {selectedSubscriber.unsubscribedAt && (
                                    <div className="mb-2"><strong>Unsubscribed:</strong> {new Date(selectedSubscriber.unsubscribedAt).toLocaleString()}</div>
                                )}

                                <hr />
                                <div className="mb-2 fw-medium">Preferences</div>
                                <div className="d-flex gap-3">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="prefBlogs"
                                            checked={selectedSubscriber.preferences.blogs}
                                            onChange={() => handleTogglePref('blogs')}
                                        />
                                        <label className="form-check-label" htmlFor="prefBlogs">Blogs</label>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="prefJobs"
                                            checked={selectedSubscriber.preferences.jobs}
                                            onChange={() => handleTogglePref('jobs')}
                                        />
                                        <label className="form-check-label" htmlFor="prefJobs">Jobs</label>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-0 py-2 gap-2">
                                <button
                                    className={`btn btn-sm ${selectedSubscriber.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                                    onClick={handleToggleStatus}
                                    disabled={togglingStatus}
                                >
                                    {togglingStatus ? 'Updating...' : selectedSubscriber.status === 'active' ? 'Unsubscribe' : 'Re-subscribe'}
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    disabled={deletingId === selectedSubscriber.id}
                                    onClick={() => handleDelete(selectedSubscriber.id)}
                                >
                                    {deletingId === selectedSubscriber.id ? 'Deleting...' : 'Delete'}
                                </button>
                                <button className="btn btn-sm btn-secondary ms-auto" onClick={() => setShowDetailModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Broadcast Modal ──────────────────────────────────────────── */}
            {showBroadcastModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title"><i className="ti ti-send me-2"></i>Broadcast Email</h5>
                                <button type="button" className="btn-close" onClick={() => setShowBroadcastModal(false)}></button>
                            </div>
                            <div className="modal-body p-3">
                                <p className="text-muted small mb-3">
                                    Send an email to all active subscribers who have the matching preference enabled.
                                </p>
                                <div className="mb-3">
                                    <label className="form-label small fw-medium">Type</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={broadcast.type}
                                        onChange={(e) => setBroadcast((p) => ({ ...p, type: e.target.value as 'blog' | 'job' }))}
                                    >
                                        <option value="blog">Blog Post</option>
                                        <option value="job">Job Listing</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-medium">Title</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="e.g. 5 Tips for Remote Work"
                                        value={broadcast.title}
                                        onChange={(e) => setBroadcast((p) => ({ ...p, title: e.target.value }))}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-medium">Site</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={broadcast.siteId}
                                        onChange={(e) => setBroadcast((p) => ({ ...p, siteId: e.target.value }))}
                                    >
                                        <option value="">All sites</option>
                                        {KNOWN_SITES.map(site => (
                                            <option key={site} value={site}>{site}</option>
                                        ))}
                                    </select>
                                    <div className="form-text">Leave as "All sites" to broadcast to every active subscriber.</div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-medium">Message</label>
                                    {/* <input
                                        type="url"
                                        className="form-control form-control-sm"
                                        placeholder="https://yoursite.com/blog/..."
                                        value={broadcast.url}
                                        onChange={(e) => setBroadcast((p) => ({ ...p, url: e.target.value }))}  
                                    /> */}
                                    <Editor apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY} init={tinymceConfig}
                                        value={broadcast.url || ''}
                                        onEditorChange={(content) => setBroadcast((p) => ({ ...p, url: content }))} />
                                </div>
                                {broadcastResult && (
                                    <div className={`alert py-2 small ${broadcastResult.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                                        {broadcastResult}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light border-0 py-2">
                                <button className="btn btn-sm btn-secondary" onClick={() => setShowBroadcastModal(false)}>Cancel</button>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={handleBroadcast}
                                    disabled={broadcasting}
                                >
                                    {broadcasting ? 'Sending...' : 'Send Broadcast'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk Import Modal ────────────────────────────────────────── */}
            {showImportModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title"><i className="ti ti-upload me-2"></i>Bulk Import Subscribers</h5>
                                <button type="button" className="btn-close" onClick={() => setShowImportModal(false)}></button>
                            </div>
                            <div className="modal-body p-3">
                                <div className="mb-3">
                                    <label className="form-label small fw-medium">
                                        Site <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={importSiteId}
                                        onChange={(e) => setImportSiteId(e.target.value)}
                                    >
                                        <option value="">Select site...</option>
                                        {KNOWN_SITES.map(site => (
                                            <option key={site} value={site}>{site}</option>
                                        ))}
                                    </select>
                                    <div className="form-text">All imported subscribers will be assigned to this site.</div>
                                </div>
                                <p className="text-muted small mb-3">
                                    Upload a CSV file or paste rows below. Format: <code>email, name (optional)</code>.<br />
                                    Duplicate emails are automatically skipped. Max 5,000 per import.
                                </p>

                                <div className="mb-3">
                                    <label className="form-label small fw-medium">Upload CSV</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="form-control form-control-sm"
                                        accept=".csv,text/csv"
                                        onChange={handleCSVFile}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-medium">Or paste rows</label>
                                    <textarea
                                        className="form-control form-control-sm font-monospace"
                                        rows={6}
                                        placeholder={"email,name\njohn@example.com,John\njane@example.com"}
                                        value={importRows}
                                        onChange={(e) => setImportRows(e.target.value)}
                                    />
                                </div>

                                {importResult && (
                                    <div className={`alert py-2 small ${importResult.error ? 'alert-danger' : 'alert-success'}`}>
                                        {importResult.error ? (
                                            `❌ ${importResult.error}`
                                        ) : (
                                            <>
                                                ✅ <strong>{importResult.inserted}</strong> imported &nbsp;|&nbsp;
                                                <strong>{importResult.skipped}</strong> skipped (duplicates) &nbsp;|&nbsp;
                                                <strong>{importResult.failed}</strong> failed
                                                {importResult.failedEntries?.length > 0 && (
                                                    <ul className="mt-2 mb-0 ps-3">
                                                        {importResult.failedEntries.map((f: any, i: number) => (
                                                            <li key={i}>{f.email}: {f.reason}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light border-0 py-2">
                                <button className="btn btn-sm btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={handleImport}
                                    disabled={importing}
                                >
                                    {importing ? 'Importing...' : 'Import'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .filter-panel {
                    background: linear-gradient(to right, #f8faff, #ffffff);
                    border-left: 3px solid var(--bs-primary) !important;
                }
                .table-header-custom th {
                    background-color: #f2f5f9;
                    color: #1e293b;
                    font-weight: 400;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    border-bottom: 2px solid var(--bs-primary) !important;
                    padding: 0.75rem;
                }
            `}</style>
        </div>
    );
}
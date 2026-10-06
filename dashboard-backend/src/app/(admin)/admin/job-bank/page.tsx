'use client';

/**
 * src/app/admin/job-bank-requests/page.tsx
 *
 * Admin queue for Job Bank ID requests.
 * Matches the BrandsAdminPage pattern exactly.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ExcelJS from 'exceljs';

// ─── Types ────────────────────────────────────────────────────
type RequestStatus = 'pending' | 'processing' | 'fulfilled' | 'rejected' | 'duplicate';

interface JobBankRequestItem {
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
    // enriched
    userName?: string | null;
    userEmail?: string | null;
    userAvatar?: string | null;
}

interface ApiResponse {
    data: JobBankRequestItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

const SITE_LABELS: Record<string, string> = {
    'jobs-connect.vercel.app': 'Jobs Connect',
    'new-jobs-fawn.vercel.app': 'New in Canada Jobs',
    'jobsrefugee.ca': 'Jobs for Refugees',
    'vulnerableyouthsjobs.ca': 'Vulnerable Youths Jobs',
    'accesscareers.ca': 'Access Careers',
    'indigenouspeoplesjobs.ca': 'Indigenous Peoples Jobs',
};


// ─── Status config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<RequestStatus, { label: string; bg: string; color: string; border: string }> = {
    pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    processing: { label: 'Processing', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    fulfilled: { label: 'Fulfilled', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    duplicate: { label: 'Duplicate', bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe' },
};

// ─── Skeleton row ───────────────────────────────────────────────
function SkeletonRow() {
    return (
        <tr>
            {Array.from({ length: 9 }).map((_, i) => (
                <td key={i}>
                    <div style={{
                        height: 14, borderRadius: 4,
                        width: i === 2 ? 140 : i === 7 ? 90 : 70,
                        background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'jbSkel 1.4s infinite',
                    }} />
                </td>
            ))}
        </tr>
    );
}

// ─── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: RequestStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '.18rem .6rem', borderRadius: 20,
            fontSize: '.7rem', fontWeight: 700, whiteSpace: 'nowrap',
            background: cfg.bg, color: cfg.color,
            border: `1.5px solid ${cfg.border}`,
            textTransform: 'uppercase', letterSpacing: '.04em',
        }}>
            {cfg.label}
        </span>
    );
}

// ─── Quick status select (inline) ─────────────────────────────
// function QuickStatusSelect({
//     value, onChange, disabled,
// }: { value: RequestStatus; onChange: (s: RequestStatus) => void; disabled?: boolean }) {
//     return (
//         <select
//             className="form-select form-select-sm"
//             style={{ fontSize: 11, padding: '.15rem .4rem', width: 120 }}
//             value={value}
//             disabled={disabled}
//             onChange={e => onChange(e.target.value as RequestStatus)}
//         >
//             {(Object.keys(STATUS_CONFIG) as RequestStatus[]).map(s => (
//                 <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
//             ))}
//         </select>
//     );
// }

function SitesPills({ sites }: { sites?: string[] }) {
    if (!sites?.length) {
        return <span className="text-muted" style={{ fontSize: '.73rem' }}>Admin decides</span>;
    }
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
            {sites.map(site => (
                <span key={site} style={{
                    display: 'inline-block',
                    fontSize: '.67rem', fontWeight: 600,
                    padding: '.1rem .45rem', borderRadius: 20,
                    background: '#eff6ff', color: '#1d4ed8',
                    border: '1px solid #bfdbfe', whiteSpace: 'nowrap',
                    maxWidth: 110, overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }} title={SITE_LABELS[site] ?? site}>
                    {SITE_LABELS[site] ?? site}
                </span>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AdminJobBankRequestsPage() {
    const router = useRouter();

    const [items, setItems] = useState<JobBankRequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const perPage = 20;

    // Bulk select
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    // Inline status update tracking
    // const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Export
    const [exporting, setExporting] = useState(false);
    // const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch ────────────────────────────────────────────────────
    const fetchItems = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const sp = new URLSearchParams({
                page: String(page), perPage: String(perPage),
                sortBy, sortOrder: sortDir,
            });
            if (search) sp.set('search', search);
            if (statusFilter) sp.set('status', statusFilter);

            const res = await fetch(`/api/admin/job-bank-requests?${sp}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setItems(json.data); setTotal(json.total); setTotalPages(json.totalPages);
            setSelectedIds([]); setSelectAll(false);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [page, perPage, sortBy, sortDir, search, statusFilter]);

    useEffect(() => {
        const t = setTimeout(fetchItems, 300);
        return () => clearTimeout(t);
    }, [fetchItems]);

    // ── Sort ─────────────────────────────────────────────────────
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

    // ── Bulk select ───────────────────────────────────────────────
    const toggleSelectAll = () => {
        if (selectAll) { setSelectedIds([]); setSelectAll(false); }
        else { setSelectedIds(items.map(i => i.id)); setSelectAll(true); }
    };
    const toggleRow = (id: string) => setSelectedIds(prev => {
        const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
        setSelectAll(next.length === items.length && items.length > 0);
        return next;
    });

    // ── Quick status update ───────────────────────────────────────
    // const handleQuickStatus = async (id: string, status: RequestStatus) => {
    //     setUpdatingId(id);
    //     try {
    //         const res = await fetch(`/api/admin/job-bank-requests/${id}`, {
    //             method: 'PUT',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ status }),
    //         });
    //         if (!res.ok) throw new Error((await res.json()).error);
    //         // Optimistic update
    //         setItems(prev => prev.map(it => it.id === id ? { ...it, status } : it));
    //     } catch (e: any) { alert(e.message); }
    //     finally { setUpdatingId(null); }
    // };

    // ── Single delete ─────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this request?')) return;
        try {
            const res = await fetch(`/api/admin/job-bank-requests/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            await fetchItems();
        } catch (e: any) { alert(e.message); }
    };

    // ── Bulk delete ───────────────────────────────────────────────
    const handleBulkDelete = async () => {
        if (!selectedIds.length) return alert('Nothing selected');
        if (!confirm(`Delete ${selectedIds.length} request(s)?`)) return;
        try {
            await fetch('/api/admin/job-bank-requests', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            await fetchItems();
        } catch (e: any) { alert(e.message); }
    };

    // ── Export ────────────────────────────────────────────────────
    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch('/api/admin/job-bank-requests?page=1&perPage=10000');
            const json: ApiResponse = await res.json();
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Job Bank Requests');
            ws.columns = [
                { header: 'ID', key: 'id', width: 28 },
                { header: 'Job Bank ID', key: 'jobBankId', width: 18 },
                { header: 'User Name', key: 'userName', width: 24 },
                { header: 'User Email', key: 'userEmail', width: 30 },
                { header: 'Status', key: 'status', width: 14 },
                { header: 'Sites', key: 'sites', width: 36 },
                { header: 'Listing ID', key: 'listingId', width: 28 },
                { header: 'User Notes', key: 'userNotes', width: 40 },
                { header: 'Admin Note', key: 'adminNote', width: 40 },
                { header: 'Reviewed At', key: 'reviewedAt', width: 22 },
                { header: 'Created At', key: 'createdAt', width: 22 },
            ];
            json.data.forEach((row: any) =>
                ws.addRow({
                    ...row,
                    sites: Array.isArray(row.sites)                         
                        ? row.sites.map((s: string) => SITE_LABELS[s] ?? s).join(', ')
                        : '',
                    createdAt: new Date(row.createdAt).toLocaleString(),
                    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toLocaleString() : '',
                })
            );
            ws.getRow(1).font = { bold: true };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `job_bank_requests_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch (e: any) { alert(`Export failed: ${e.message}`); }
        finally { setExporting(false); }
    };

    const activeFilterCount = [search, statusFilter].filter(Boolean).length;

    // ── Status summary counts ─────────────────────────────────────
    const pendingCount = items.filter(i => i.status === 'pending').length;
    const processingCount = items.filter(i => i.status === 'processing').length;

    return (
        <div className="container-fluid py-4">
            <style>{`
        @keyframes jbSkel { to { background-position: -200% 0; } }
        thead th {
          background-color: #f2f5f9; color: #1e293b; font-weight: 400;
          font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.4px;
          border-bottom: 2px solid #0f4c81 !important; padding: 0.65rem 0.75rem;
          user-select: none; white-space: nowrap;
        }
        thead th:hover { background-color: #e9ecef; }
        .jb-admin-row:hover { background: #f8faff !important; }
        .jb-user-chip { display: inline-flex; align-items: center; gap: .35rem; }
        .jb-avatar {
          width: 26px; height: 26px; border-radius: 50%;
          background: #0f4c81; color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: .7rem; font-weight: 700; flex-shrink: 0;
        }
      `}</style>

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3 rounded-3">
                <div>
                    <h4 className="mb-1 fw-bold" style={{ color: '#0f172a' }}>
                        <i className="ti ti-building-bank me-2 text-primary" />
                        Job Bank Requests
                    </h4>
                    <p className="text-muted small mb-0">
                        Review user-submitted Job Bank IDs and create listing drafts
                    </p>
                </div>

                {/* Summary pills */}
                <div className="d-flex gap-2 align-items-center flex-wrap">
                    {pendingCount > 0 && (
                        <span style={{ background: '#fef3c7', color: '#92400e', border: '1.5px solid #fcd34d', borderRadius: 20, fontSize: '.75rem', fontWeight: 700, padding: '.25rem .75rem' }}>
                            ⏳ {pendingCount} pending
                        </span>
                    )}
                    {processingCount > 0 && (
                        <span style={{ background: '#dbeafe', color: '#1e40af', border: '1.5px solid #93c5fd', borderRadius: 20, fontSize: '.75rem', fontWeight: 700, padding: '.25rem .75rem' }}>
                            ⚙️ {processingCount} processing
                        </span>
                    )}
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
                        {exporting
                            ? <><span className="spinner-border spinner-border-sm me-1" />Exporting…</>
                            : <><i className="ti ti-file-spreadsheet me-1" />Export</>}
                    </button>
                    {selectedIds.length > 0 && (
                        <button className="btn btn-sm btn-outline-danger" onClick={handleBulkDelete}>
                            <i className="ti ti-trash me-1" />Delete ({selectedIds.length})
                        </button>
                    )}
                </div>

                {/* Filter bar */}
                <div className="bg-white rounded-3 p-2 border w-100 mt-1" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
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
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1" style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }} />
                            <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 200, fontSize: 12, outline: 'none' }}
                                placeholder="Search Job Bank ID, user, notes…"
                                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>

                        {/* Status */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1" style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-circle-dot text-secondary" style={{ fontSize: 13 }} />
                            <select className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 130 }}
                                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                                <option value="">All statuses</option>
                                {(Object.keys(STATUS_CONFIG) as RequestStatus[]).map(s => (
                                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                ))}
                            </select>
                        </div>

                        {activeFilterCount > 0 && (
                            <button className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderRadius: 6 }}
                                onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>
                                <i className="ti ti-x" style={{ fontSize: 12 }} />Clear
                            </button>
                        )}
                    </div>

                    {/* Mobile filters */}
                    <div className="d-md-none w-100 overflow-hidden"
                        style={{ maxHeight: mobileOpen ? 300 : 0, transition: 'max-height .28s ease' }}>
                        <div className="d-flex flex-column gap-2 pt-2 mt-1" style={{ borderTop: '1px solid rgba(0,0,0,.1)' }}>
                            <input type="text" className="form-control form-control-sm"
                                placeholder="Search…" value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }} />
                            <select className="form-select form-select-sm"
                                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                                <option value="">All statuses</option>
                                {(Object.keys(STATUS_CONFIG) as RequestStatus[]).map(s => (
                                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3 mb-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchItems}>Retry</button>
                </div>
            )}

            {/* ── Table ────────────────────────────────────────────────── */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input type="checkbox" className="form-check-input"
                                            checked={selectAll} onChange={toggleSelectAll} />
                                    </th>
                                    <th onClick={() => handleSort('jobBankId')} style={{ cursor: 'pointer' }}>
                                        Job Bank ID <SortIcon col="jobBankId" />
                                    </th>
                                    <th onClick={() => handleSort('userId')} style={{ cursor: 'pointer' }}>
                                        User <SortIcon col="userId" />
                                    </th>
                                    <th>Notes</th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                        Status <SortIcon col="status" />
                                    </th>
                                    <th>Sites</th>
                                    {/* <th>Listing</th> */}
                                    <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>
                                        Submitted <SortIcon col="createdAt" />
                                    </th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                                    : items.length === 0
                                        ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-5 text-muted">
                                                    <i className="ti ti-inbox fs-1 d-block mb-2 opacity-25" />
                                                    No requests found
                                                </td>
                                            </tr>
                                        )
                                        : items.map(row => (
                                            <tr key={row.id} className="jb-admin-row border-bottom">
                                                <td>
                                                    <input type="checkbox" className="form-check-input"
                                                        checked={selectedIds.includes(row.id)}
                                                        onChange={() => toggleRow(row.id)} />
                                                </td>

                                                {/* Job Bank ID */}
                                                <td>
                                                    <span style={{
                                                        fontFamily: 'monospace', fontWeight: 700,
                                                        fontSize: '.88rem', color: '#0f4c81',
                                                        background: '#eff6ff', border: '1px solid #bfdbfe',
                                                        borderRadius: 6, padding: '.15rem .5rem',
                                                    }}>
                                                        #{row.jobBankId}
                                                    </span>
                                                </td>

                                                {/* User */}
                                                <td>
                                                    <div className="jb-user-chip">
                                                        <div className="jb-avatar">
                                                            {row.userAvatar
                                                                ? <img src={row.userAvatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                                                                : (row.userName?.[0] ?? '?').toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '.83rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                                                                {row.userName ?? '—'}
                                                            </div>
                                                            <div style={{ fontSize: '.72rem', color: '#64748b' }}>{row.userEmail ?? '—'}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Notes */}
                                                <td style={{ maxWidth: 200 }}>
                                                    {row.userNotes
                                                        ? (
                                                            <span style={{ fontSize: '.78rem', color: '#475569' }}
                                                                title={row.userNotes}>
                                                                {row.userNotes.length > 50 ? row.userNotes.slice(0, 50) + '…' : row.userNotes}
                                                            </span>
                                                        )
                                                        : <span className="text-muted" style={{ fontSize: '.75rem' }}>—</span>}
                                                </td>

                                                {/* Status — inline quick change */}
                                                <td>
                                                    <div className="d-flex flex-column gap-1">
                                                        <StatusBadge status={row.status} />
                                                        {/* <QuickStatusSelect
                                                            value={row.status}
                                                            disabled={updatingId === row.id}
                                                            onChange={s => handleQuickStatus(row.id, s)}
                                                        /> */}
                                                    </div>
                                                </td>

                                                {/* Sites */}
                                                <td style={{ minWidth: 130 }}>
                                                    <SitesPills sites={row.sites} />
                                                </td>

                                                {/* Listing */}
                                                {/* <td>
                                                    {row.listingId
                                                        ? (
                                                            <a href={`/admin/listings/${row.listingId}`}
                                                                className="btn btn-xs btn-outline-primary py-0 px-2"
                                                                style={{ fontSize: 11 }}
                                                                target="_blank" rel="noopener noreferrer">
                                                                <i className="ti ti-external-link me-1" />View
                                                            </a>
                                                        )
                                                        : <span className="text-muted small">Not linked</span>}
                                                </td> */}

                                                {/* Submitted */}
                                                <td className="small text-muted text-nowrap">
                                                    {new Date(row.createdAt).toLocaleDateString()}
                                                    <div style={{ fontSize: '.68rem' }}>
                                                        {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="text-end">
                                                    {/* <div className="btn-group"> */}
                                                    <button
                                                        className="action-btn"
                                                        style={{ fontSize: 12, padding: '.25rem .55rem' }}
                                                        onClick={() => router.push(`/admin/job-bank/${row.id}`)}
                                                        title="Open & create listing"
                                                    >
                                                        <i className="ti ti-edit" />
                                                    </button>
                                                    <button
                                                        className="action-btn"
                                                        style={{ fontSize: 12, padding: '.25rem .55rem' }}
                                                        onClick={() => handleDelete(row.id)}
                                                        title="Delete"
                                                    >
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <div className="small text-muted">
                            Showing {items.length} of {total} entries
                        </div>
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
        </div>
    );
}
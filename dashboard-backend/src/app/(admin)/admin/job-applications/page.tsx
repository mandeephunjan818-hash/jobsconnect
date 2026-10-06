'use client';

import { useState, useEffect } from 'react';
import { KNOWN_SITES } from '@/lib/sites';

interface ApplicationItem {
    _id: string;
    name: string;
    email: string;
    siteId: string;
    jobId?: string;
    status: 'pending' | 'reviewed' | 'contacted' | 'rejected';
    appliedAt: string;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse {
    data: ApplicationItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

const SkeletonRow = () => (
    <tr>
        {[120, 180, 140, 100, 120, 80].map((w, i) => (
            <td key={i}>
                <div className="skeleton skeleton--text" style={{ width: w, height: 20 }} />
            </td>
        ))}
    </tr>
);

export default function JobApplicationsAdminPage() {
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Detail modal
    const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    // const [updatingStatus, setUpdatingStatus] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Mobile filter toggle
    const [mobileOpen, setMobileOpen] = useState(false);

    const activeFiltersCount =
        (search ? 1 : 0) +
        (siteFilter ? 1 : 0) +
        (statusFilter ? 1 : 0) +
        (dateFrom ? 1 : 0) +
        (dateTo ? 1 : 0);

    const fetchApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (siteFilter) params.set('siteId', siteFilter);
            if (statusFilter) params.set('status', statusFilter);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);
            params.set('page', String(page));
            params.set('perPage', String(perPage));

            const res = await fetch(`/api/admin/job-applications?${params}`);
            if (!res.ok) throw new Error('Failed to fetch applications');
            const json: ApiResponse = await res.json();
            setApplications(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [page, search, siteFilter, statusFilter, dateFrom, dateTo]);

    const applyFilters = () => {
        setPage(1);
        fetchApplications();
    };

    const clearFilters = () => {
        setSearch('');
        setSiteFilter('');
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (siteFilter) params.set('siteId', siteFilter);
        if (statusFilter) params.set('status', statusFilter);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        window.open(`/api/admin/job-applications/export?${params}`, '_blank');
    };

    // Detail modal
    const openDetail = (app: ApplicationItem) => {
        setSelectedApp(app);
        setNewStatus(app.status);
        setShowDetailModal(true);
    };

    // const handleStatusUpdate = async () => {
    //     if (!selectedApp || newStatus === selectedApp.status) return;
    //     setUpdatingStatus(true);
    //     try {
    //         const res = await fetch(`/api/admin/job-applications/${selectedApp._id}`, {
    //             method: 'PATCH',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ status: newStatus }),
    //         });
    //         if (!res.ok) throw new Error('Failed to update status');
    //         setSelectedApp((prev) => (prev ? { ...prev, status: newStatus as any } : prev));
    //         fetchApplications(); // refresh list
    //     } catch (err: any) {
    //         alert(err.message);
    //     } finally {
    //         setUpdatingStatus(false);
    //     }
    // };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this application?')) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/job-applications/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setShowDetailModal(false);
            setSelectedApp(null);
            fetchApplications();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3">
                <div>
                    <h4 className="mb-1 fw-semibold">Job Applications</h4>
                    <p className="text-muted small mb-0">Manage job applications</p>
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleExport}>
                        <i className="ti ti-download me-1" /> Export CSV
                    </button>
                </div>

                {/* Filter bar – same style as subscribers */}
                <div className="ulp-filters bg-white rounded-3 p-2 border w-100 mt-2" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <button
                        className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1"
                        style={{ fontSize: 13 }}
                        onClick={() => setMobileOpen((o) => !o)}
                    >
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }} /> Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {activeFiltersCount > 0 && (
                                <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>
                                    {activeFiltersCount}
                                </span>
                            )}
                            <i
                                className="ti ti-chevron-down"
                                style={{
                                    fontSize: 14,
                                    transition: 'transform 0.2s',
                                    transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                            />
                        </span>
                    </button>

                    <div className={`d-md-flex align-items-center flex-wrap gap-2 ${mobileOpen ? 'd-flex' : 'd-none'}`}>
                        {/* Search */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1" style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }} />
                            <input
                                type="text"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 160, fontSize: 12, outline: 'none' }}
                                placeholder="Name or email"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Status */}
                        {/* <div className="d-flex align-items-center rounded-2 px-2 gap-1" style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-check text-secondary" style={{ fontSize: 13 }} />
                            <select
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 130, height: '100%' }}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All status</option>
                                <option value="pending">Pending</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="contacted">Contacted</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div> */}

                        {/* Date From */}
                        {/* <div className="d-flex align-items-center rounded-2 px-2 gap-1" style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }} />
                            <input
                                type="date"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 130, fontSize: 12, outline: 'none', color: '#212529' }}
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div> */}

                        {/* Date To */}
                        {/* <div className="d-flex align-items-center rounded-2 px-2 gap-1" style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }} />
                            <input
                                type="date"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 130, fontSize: 12, outline: 'none', color: '#212529' }}
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div> */}

                        {/* Site */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1" style={{ height: 32, background: '#f3f3f1' }}>
                            <i className="ti ti-world text-secondary" style={{ fontSize: 13 }} />
                            <select
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 160, height: '100%' }}
                                value={siteFilter}
                                onChange={(e) => setSiteFilter(e.target.value)}
                            >
                                <option value="">All sites</option>
                                {KNOWN_SITES.map((site) => (
                                    <option key={site} value={site}>
                                        {site}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Apply */}
                        <button
                            className="btn btn-sm d-flex align-items-center gap-1"
                            style={{ fontSize: 12, height: 32, border: '1px solid #534AB7', borderRadius: 6, background: 'transparent', color: '#534AB7' }}
                            onClick={applyFilters}
                        >
                            <i className="ti ti-filter" style={{ fontSize: 12 }} /> Apply
                        </button>

                        {/* Clear */}
                        {activeFiltersCount > 0 && (
                            <button
                                className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                onClick={clearFilters}
                            >
                                <i className="ti ti-x" style={{ fontSize: 12 }} /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchApplications}>
                        Retry
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-header-custom">
                                <tr>
                                    <th className="py-3">Name</th>
                                    <th className="py-3">Email</th>
                                    <th className="py-3">Site</th>
                                    {/* <th className="py-3">Status</th> */}
                                    {/* <th className="py-3">Applied At</th> */}
                                    <th className="py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                ) : applications.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5">
                                            <div className="text-muted">
                                                <i className="ti ti-file-off fs-1 mb-3 d-block" />
                                                <h5>No applications found</h5>
                                                <p>Try adjusting your filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    applications.map((app) => (
                                        <tr key={app._id} className="border-bottom">
                                            <td className="fw-medium small">{app.name}</td>
                                            <td className="small text-muted">{app.email}</td>
                                            <td className="small text-muted">{app.siteId}</td>
                                            {/* <td>
                                                <span
                                                    className={`badge ${app.status === 'pending'
                                                            ? 'bg-warning text-dark'
                                                            : app.status === 'reviewed'
                                                                ? 'bg-info'
                                                                : app.status === 'contacted'
                                                                    ? 'bg-success'
                                                                    : 'bg-secondary'
                                                        }`}
                                                >
                                                    {app.status}
                                                </span>
                                            </td> */}
                                            {/* <td className="small">{new Date(app.appliedAt).toLocaleDateString()}</td> */}
                                            <td className="text-end">
                                                <button className="action-btn" onClick={() => openDetail(app)}>
                                                    <i className="ti ti-eye" />
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    disabled={deletingId === app._id}
                                                    onClick={() => handleDelete(app._id)}
                                                >
                                                    <i className="ti ti-trash" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <div className="small text-muted">
                            Showing {applications.length} of {total} entries
                        </div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>
                                        Previous
                                    </button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;
                                    return (
                                        <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(pageNum)}>
                                                {pageNum}
                                            </button>
                                        </li>
                                    );
                                })}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                                        Next
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedApp && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title">
                                    <i className="ti ti-file-text me-2" /> Application Detail
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)} />
                            </div>
                            <div className="modal-body p-3">
                                <div className="mb-2">
                                    <strong>Name:</strong> {selectedApp.name}
                                </div>
                                <div className="mb-2">
                                    <strong>Email:</strong> {selectedApp.email}
                                </div>
                                <div className="mb-2">
                                    <strong>Site:</strong> {selectedApp.siteId}
                                </div>
                                {selectedApp.jobId && (
                                    <div className="mb-2">
                                        <strong>Job ID:</strong> {selectedApp.jobId}
                                    </div>
                                )}
                                <div className="mb-2">
                                    <strong>Applied:</strong>{' '}
                                    {new Date(selectedApp.appliedAt).toLocaleString()}
                                </div>

                                <hr />
                                {/* <div className="mb-2 fw-medium">Status</div>
                                <div className="d-flex align-items-center gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        style={{ width: 'auto' }}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="reviewed">Reviewed</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={handleStatusUpdate}
                                        disabled={updatingStatus || newStatus === selectedApp.status}
                                    >
                                        {updatingStatus ? 'Updating...' : 'Update'}
                                    </button>
                                </div> */}
                            </div>
                            <div className="modal-footer bg-light border-0 py-2">
                                <button
                                    className="btn btn-sm btn-danger"
                                    disabled={deletingId === selectedApp._id}
                                    onClick={() => handleDelete(selectedApp._id)}
                                >
                                    {deletingId === selectedApp._id ? 'Deleting...' : 'Delete'}
                                </button>
                                <button className="btn btn-sm btn-secondary ms-auto" onClick={() => setShowDetailModal(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
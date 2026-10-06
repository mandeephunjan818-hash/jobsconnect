'use client';

import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Editor } from '@tinymce/tinymce-react';
import Link from 'next/link';

type BuyerStatus = 'new' | 'reviewed' | 'rejected';

// Extended interface to match the BuyerRegistration schema
interface BuyerRegistration {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    userId: string;
    status: BuyerStatus;
    adminNotes?: any[]; // array of { message, type, createdAt, createdBy }
    createdAt: string;
    updatedAt: string;
    updateRequested?: boolean;
    updateRequestData?: any;
}

interface ApiResponse {
    data: BuyerRegistration[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

function SkeletonRow() {
    return (
        <tr>
            <td><div className="skeleton skeleton--text" style={{ width: 20, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 36, height: 36 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 120, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 120, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 100, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 140, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 90, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
        </tr>
    );
}

export default function BuyerRegistrationsPage() {
    const [registrations, setRegistrations] = useState<BuyerRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // View modal
    const [showModal, setShowModal] = useState(false);
    const [viewingItem, setViewingItem] = useState<BuyerRegistration | null>(null);

    // Filters & pagination
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | BuyerStatus>('all');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [countryFilter, setCountryFilter] = useState<string>('');
    const [availableCountries, setAvailableCountries] = useState<string[]>([]);

    // Sorting
    const [sortColumn, setSortColumn] = useState<string>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    // Date filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Import
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reject modal for status change
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState('');

    // Update request rejection modal
    const [showUpdateRejectModal, setShowUpdateRejectModal] = useState(false);
    const [updateRejectNotes, setUpdateRejectNotes] = useState('');
    const [pendingUpdateItem, setPendingUpdateItem] = useState<BuyerRegistration | null>(null);

    const [activeSlide, setActiveSlide] = useState(0);

    // Fetch filter options (countries)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const res = await fetch('/api/admin/buyers-registration/filter-options');
                if (!res.ok) throw new Error('Failed to fetch filter options');
                const data = await res.json();
                setAvailableCountries(data.countries || []);
            } catch (err) {
                console.error('Could not load filter options', err);
            }
        };
        fetchFilterOptions();
    }, []);

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (countryFilter) params.set('country', countryFilter);
            if (search) params.set('search', search);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            params.set('page', String(page));
            params.set('perPage', String(perPage));
            if (sortColumn) params.set('sortBy', sortColumn);
            params.set('sortOrder', sortDirection);
            if (fromDate) params.set('fromDate', fromDate);
            if (toDate) params.set('toDate', toDate);

            const res = await fetch(`/api/admin/buyers-registration?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setRegistrations(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
            setSelectedIds([]);
            setSelectAll(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => fetchRegistrations(), 500);
        return () => clearTimeout(t);
    }, [page, search, statusFilter, sortColumn, sortDirection, fromDate, toDate, countryFilter]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds([]);
        } else {
            setSelectedIds(registrations.map(r => r._id));
        }
        setSelectAll(!selectAll);
    };

    const handleSelectRow = (id: string) => {
        setSelectedIds(prev => {
            const newSet = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
            setSelectAll(newSet.length === registrations.length && registrations.length > 0);
            return newSet;
        });
    };

    const handleBulkAction = async (action: 'delete' | 'reviewed' | 'rejected') => {
        if (selectedIds.length === 0) { alert('No items selected'); return; }
        if (action === 'delete' && !confirm(`Delete ${selectedIds.length} item(s)?`)) return;
        try {
            const res = await fetch('/api/admin/buyers-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ids: selectedIds }),
            });
            if (!res.ok) throw new Error('Bulk action failed');
            await fetchRegistrations();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setCountryFilter('');
        setStatusFilter('all');
        setFromDate('');
        setToDate('');
        setSortColumn('createdAt');
        setSortDirection('desc');
        setPage(1);
    };

    const handleOpenModal = (item: BuyerRegistration) => {
        setViewingItem(item);
        setActiveSlide(0);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setViewingItem(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this registration?')) return;
        try {
            const res = await fetch(`/api/admin/buyers-registration/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            await fetchRegistrations();
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Status rejection (change status to 'rejected')
    const handleReject = (id: string) => {
        setRejectId(id);
        setRejectNotes('');
        setShowRejectModal(true);
    };

    const submitRejection = async () => {
        if (!rejectId) return;
        try {
            const res = await fetch(`/api/admin/buyers-registration/${rejectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected', adminNotes: rejectNotes }),
            });
            if (!res.ok) throw new Error('Failed to reject');
            await fetchRegistrations();
            setShowRejectModal(false);
            setRejectId(null);
            setRejectNotes('');
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Update request approval
    const approveUpdate = async (id: string) => {
        if (!confirm('Approve this update request? The changes will be applied.')) return;
        try {
            const res = await fetch(`/api/admin/buyers-registration/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve-update' }),
            });
            if (!res.ok) throw new Error('Approval failed');
            await fetchRegistrations();
            handleCloseModal();
            alert('Update approved and applied.');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openRejectUpdateModal = (item: BuyerRegistration) => {
        setPendingUpdateItem(item);
        setUpdateRejectNotes('');
        setShowUpdateRejectModal(true);
    };

    const submitUpdateRejection = async () => {
        if (!pendingUpdateItem) return;
        try {
            const res = await fetch(`/api/admin/buyers-registration/${pendingUpdateItem._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject-update', rejectionNotes: updateRejectNotes }),
            });
            if (!res.ok) throw new Error('Rejection failed');
            await fetchRegistrations();
            setShowUpdateRejectModal(false);
            setPendingUpdateItem(null);
            handleCloseModal();
            alert('Update request rejected.');
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Export to Excel
    const downloadExcel = async (data: BuyerRegistration[], filename: string) => {
        if (!data || data.length === 0) return;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Buyer Registrations');
        worksheet.columns = [
            { header: 'ID', key: '_id', width: 28 },
            { header: 'First Name', key: 'firstName', width: 18 },
            { header: 'Last Name', key: 'lastName', width: 18 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Country', key: 'country', width: 20 },
            { header: 'User ID', key: 'userId', width: 28 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Admin Notes', key: 'adminNotes', width: 40 },
            { header: 'Created At', key: 'createdAt', width: 22 },
            { header: 'Updated At', key: 'updatedAt', width: 22 },
        ];
        data.forEach(item => {
            let notesStr = '';
            if (item.adminNotes && Array.isArray(item.adminNotes)) {
                notesStr = item.adminNotes.map(n => `${n.type}: ${n.message} (${new Date(n.createdAt).toLocaleString()})`).join('\n');
            }
            worksheet.addRow({
                ...item,
                adminNotes: notesStr,
                createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
                updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '',
            });
        });
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `${filename}.xlsx`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (countryFilter) params.set('country', countryFilter);
            if (search) params.set('search', search);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (sortColumn) params.set('sortBy', sortColumn);
            params.set('sortOrder', sortDirection);
            if (fromDate) params.set('fromDate', fromDate);
            if (toDate) params.set('toDate', toDate);
            params.set('page', '1');
            params.set('perPage', '10000');
            const res = await fetch(`/api/admin/buyers-registration?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch export data');
            const json: ApiResponse = await res.json();
            downloadExcel(json.data, `buyer_registrations_${new Date().toISOString().slice(0, 19)}`);
        } catch (err: any) {
            alert(`Export failed: ${err.message}`);
        } finally {
            setExporting(false);
        }
    };

    // Import from Excel (assumes endpoint exists, similar to business registrations)
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) throw new Error('No worksheet found');
            const headers: string[] = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => { headers[colNumber] = cell.text; });
            const fieldMap: Record<string, string> = {
                'first name': 'firstName', 'last name': 'lastName',
                'email': 'email', 'phone': 'phone', 'country': 'country',
                'user id': 'userId', 'status': 'status',
            };
            const items: any[] = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const item: any = {};
                row.eachCell((cell, colNumber) => {
                    const headerRaw = headers[colNumber]?.trim().toLowerCase();
                    const field = fieldMap[headerRaw];
                    if (field) item[field] = cell.text;
                });
                if (item.email) items.push(item);
            });
            if (items.length === 0) { alert('No valid rows found. Check the file format.'); return; }
            // Note: This endpoint needs to be implemented on the backend
            const res = await fetch('/api/admin/buyers-registration/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Import failed'); }
            const result = await res.json();
            alert(`Import completed: ${result.inserted} inserted, ${result.updated} updated, ${result.errors} errors`);
            await fetchRegistrations();
        } catch (err: any) {
            alert(`Import error: ${err.message}`);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerImport = () => fileInputRef.current?.click();

    const SortIcon = ({ column }: { column: string }) => {
        if (sortColumn !== column) return <i className="ti ti-arrows-sort text-muted ms-1" />;
        return sortDirection === 'asc'
            ? <i className="ti ti-arrow-up ms-1" />
            : <i className="ti ti-arrow-down ms-1" />;
    };

    const statusBadgeClass = (status: BuyerStatus) => {
        switch (status) {
            case 'reviewed': return 'bg-success text-white';
            case 'rejected': return 'bg-danger text-white';
            case 'new': return 'bg-warning text-dark';
            default: return 'bg-secondary text-dark';
        }
    };

    const formatDate = (dateStr: string) =>
        dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const renderAdminNotes = (notes: any[]) => {
        if (!notes || notes.length === 0) return <p className="text-muted">No admin notes.</p>;
        return (
            <div className="timeline" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notes.map((note, idx) => (
                    <div key={idx} className="mb-3 pb-2 border-bottom">
                        <div className="d-flex justify-content-between">
                            <span className="badge bg-light text-dark text-uppercase" style={{ fontSize: '0.7rem' }}>
                                {note.type?.replace(/_/g, ' ')}
                            </span>
                            <small className="text-muted">{new Date(note.createdAt).toLocaleString()}</small>
                        </div>
                        <div className="mt-1 small" dangerouslySetInnerHTML={{ __html: note.message }} />
                        {note.createdBy && <small className="text-muted">— {note.createdBy}</small>}
                    </div>
                ))}
            </div>
        );
    };

    const [mobileOpen, setMobileOpen] = useState<boolean>(false);

    // Helper to count active filters
    const activeFilterCount = [
        search,
        statusFilter !== 'all' ? statusFilter : '',
        fromDate,
        toDate,
        countryFilter,
    ].filter(Boolean).length;

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 p-3 bg-white border-bottom shadow-sm">
                <div>
                    <h4 className="mb-1 fw-semibold">Buyer Registrations</h4>
                    <p className="text-muted small mb-0">Manage buyer registration submissions</p>
                </div>
                <div className="d-flex flex-wrap gap-3">
                    <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Clear Filters</button>
                    <button className="btn btn-sm btn-outline-info" onClick={triggerImport} disabled={importing}>
                        {importing ? <><span className="spinner-border spinner-border-sm me-1"></span>Importing...</> : <><i className="ti ti-file-import me-1"></i> Import</>}
                    </button>
                    <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={handleImport} />
                    <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
                        {exporting ? <><span className="spinner-border spinner-border-sm me-1"></span>Exporting...</> : <><i className="ti ti-file-spreadsheet me-1"></i> Export Sheet</>}
                    </button>
                    {selectedIds.length > 0 && (
                        <div className="dropdown">
                            <button className="btn btn-sm btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                Bulk Actions ({selectedIds.length})
                            </button>
                            <ul className="dropdown-menu">
                                <li><button className="dropdown-item" onClick={() => handleBulkAction('reviewed')}>Mark Reviewed</button></li>
                                <li><button className="dropdown-item" onClick={() => handleBulkAction('rejected')}>Reject</button></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><button className="dropdown-item text-danger" onClick={() => handleBulkAction('delete')}>Delete</button></li>
                            </ul>
                        </div>
                    )}
                </div>
                <div
                    className="ulp-filters bg-white rounded-3 p-2 border ms-md-auto me-md-0 mx-auto mt-3 mt-md-0"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                    {/* ── Mobile toggle header – visible only below md ── */}
                    <button
                        className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1 mb-0"
                        style={{ fontSize: 13 }}
                        onClick={() => setMobileOpen(o => !o)}
                    >
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }}></i>
                            Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {activeFilterCount > 0 && (
                                <span
                                    className="badge rounded-pill"
                                    style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}
                                >
                                    {activeFilterCount}
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

                    {/* ── Desktop row (visible md and up) ── */}
                    <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
                        {/* Search */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                            <input
                                type="text"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 170, fontSize: 12, outline: 'none', color: 'inherit' }}
                                placeholder="Search name/email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Status */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-circle-dot text-secondary" style={{ fontSize: 13 }}></i>
                            <select
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 120, height: '100%', cursor: 'pointer' }}
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                            >
                                <option value="all">All Status</option>
                                <option value="new">New</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        {/* Date range (From – To) */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                            <input
                                type="date"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                            />
                            <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                            <input
                                type="date"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                            />
                        </div>

                        {/* Country */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-flag text-secondary" style={{ fontSize: 13 }}></i>
                            <select
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 130, height: '100%', cursor: 'pointer' }}
                                value={countryFilter}
                                onChange={e => setCountryFilter(e.target.value)}
                            >
                                <option value="">All Countries</option>
                                {availableCountries.map(country => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>

                        {/* Clear button (visible when any filter is active) */}
                        {activeFilterCount > 0 && (
                            <button
                                className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter('all');
                                    setFromDate('');
                                    setToDate('');
                                    setCountryFilter('');
                                }}
                            >
                                <i className="ti ti-x" style={{ fontSize: 12 }}></i>
                                Clear
                            </button>
                        )}
                    </div>

                    {/* ── Mobile panel (visible only below md, expands/collapses) ── */}
                    <div
                        className="d-md-none w-100 overflow-hidden"
                        style={{ maxHeight: mobileOpen ? 450 : 0, transition: 'max-height 0.28s ease' }}
                    >
                        <div
                            className="d-flex flex-column gap-2 pt-2 mt-1"
                            style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)' }}
                        >
                            {/* Search */}
                            <div
                                className="d-flex align-items-center rounded-2 px-2 gap-2 w-100"
                                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                                <input
                                    type="text"
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none' }}
                                    placeholder="Search name/email..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Status */}
                            <div
                                className="d-flex align-items-center rounded-2 px-2 gap-2 w-100"
                                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <i className="ti ti-circle-dot text-secondary" style={{ fontSize: 13 }}></i>
                                <select
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', height: '100%', cursor: 'pointer' }}
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as any)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="new">New</option>
                                    <option value="reviewed">Reviewed</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            {/* Date range (From – To) */}
                            <div
                                className="d-flex align-items-center rounded-2 px-2 gap-1 w-100"
                                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                                <input
                                    type="date"
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', cursor: 'pointer' }}
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                />
                                <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                                <input
                                    type="date"
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', cursor: 'pointer' }}
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                />
                            </div>

                            {/* Country */}
                            <div
                                className="d-flex align-items-center rounded-2 px-2 gap-2 w-100"
                                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <i className="ti ti-flag text-secondary" style={{ fontSize: 13 }}></i>
                                <select
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', height: '100%', cursor: 'pointer' }}
                                    value={countryFilter}
                                    onChange={e => setCountryFilter(e.target.value)}
                                >
                                    <option value="">All Countries</option>
                                    {availableCountries.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Clear button (mobile) */}
                            {activeFilterCount > 0 && (
                                <button
                                    className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-1 text-secondary border"
                                    style={{ fontSize: 13, height: 38, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                    onClick={() => {
                                        setSearch('');
                                        setStatusFilter('all');
                                        setFromDate('');
                                        setToDate('');
                                        setCountryFilter('');
                                    }}
                                >
                                    <i className="ti ti-x" style={{ fontSize: 12 }}></i> Clear filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchRegistrations}>Retry</button>
                </div>
            )}

            {/* Table Card */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-header-custom">
                                <tr>
                                    <th className="py-3" style={{ width: 40 }}><input type="checkbox" className="form-check-input" checked={selectAll} onChange={handleSelectAll} /></th>
                                    <th className="py-3" onClick={() => handleSort('firstName')} style={{ cursor: 'pointer' }}>Name <SortIcon column="firstName" /></th>
                                    <th className="py-3" onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>Email <SortIcon column="email" /></th>
                                    <th className="py-3" onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>Phone <SortIcon column="phone" /></th>
                                    <th className="py-3" onClick={() => handleSort('country')} style={{ cursor: 'pointer' }}>Country <SortIcon column="country" /></th>
                                    <th className="py-3" onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status <SortIcon column="status" /></th>
                                    <th className="py-3" onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>Submitted <SortIcon column="createdAt" /></th>
                                    <th className="py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                ) : registrations.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-5"><div className="text-muted"><i className="ti ti-users fs-1 mb-3 d-block"></i><h5>No buyer registrations found</h5><p>Try adjusting your filters.</p></div></td></tr>
                                ) : (
                                    registrations.map((item) => (
                                        <tr key={item._id} className="border-bottom">
                                            <td><input type="checkbox" className="form-check-input" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                                            <td><div className="fw-medium small">{item.firstName} {item.lastName}</div></td>
                                            <td className="small">{item.email}</td>
                                            <td className="small">{item.phone}</td>
                                            <td className="small">{item.country}</td>
                                            <td><span className={`badge ${statusBadgeClass(item.status)} px-2 py-1 small`}>{item.status}</span></td>
                                            <td className="small text-muted">{formatDate(item.createdAt)}</td>
                                            <td className="text-end position-relative">
                                                {item.updateRequested && (
                                                    <span className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-warning" style={{ marginLeft: '-8px', marginTop: '-4px' }}>
                                                        <i className="ti ti-rotate-clockwise" style={{ fontSize: '10px' }}></i>
                                                    </span>
                                                )}
                                                <div className="btn-group">
                                                    <button className="btn admin-btn-1 btn-sm btn-outline-primary p-0 m-0 border-top-0 border-bottom-0 border-start-0" onClick={() => handleOpenModal(item)} title="View"><i className="ti ti-eye"></i></button>
                                                    <Link href={`/admin/buyers/${item._id}/agreements`} className="btn admin-btn-1 btn-sm btn-outline-info p-0 m-0 border-top-0 border-bottom-0 border-start-0" title="Agreements"><i className="ti ti-file-description"></i></Link>
                                                    <button className="btn admin-btn-1 btn-sm btn-outline-danger p-0 m-0 border-top-0 border-bottom-0 border-start-0" onClick={() => handleReject(item._id)} title="Reject"><i className="ti ti-ban"></i></button>
                                                    <button className="btn admin-btn-1 btn-sm btn-outline-danger p-0 m-0 border-top-0 border-bottom-0 border-end-0" onClick={() => handleDelete(item._id)} title="Delete"><i className="ti ti-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Reject Modal (status change) */}
                {showRejectModal && (
                    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                            <div className="modal-content border-0 shadow">
                                <div className="modal-header bg-light border-bottom">
                                    <h5 className="modal-title"><i className="ti ti-ban me-2 text-danger"></i>Reject Buyer Registration</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowRejectModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <label className="form-label fw-semibold">Admin Notes (optional)</label>
                                    <Editor apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY} init={{ height: 300, menubar: false, plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount', toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help' }} value={rejectNotes} onEditorChange={(content) => setRejectNotes(content)} />
                                </div>
                                <div className="modal-footer bg-light">
                                    <button className="btn btn-sm btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                                    <button className="btn btn-sm btn-danger" onClick={submitRejection}>Confirm Rejection</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Update Request Rejection Modal */}
                {showUpdateRejectModal && pendingUpdateItem && (
                    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                            <div className="modal-content border-0 shadow">
                                <div className="modal-header bg-light border-bottom">
                                    <h5 className="modal-title"><i className="ti ti-ban me-2 text-danger"></i>Reject Update Request</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowUpdateRejectModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <label className="form-label fw-semibold">Reason for rejection (will be stored in admin notes)</label>
                                    <Editor apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY} init={{ height: 300, menubar: false, plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount', toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help' }} value={updateRejectNotes} onEditorChange={(content) => setUpdateRejectNotes(content)} />
                                </div>
                                <div className="modal-footer bg-light">
                                    <button className="btn btn-sm btn-secondary" onClick={() => setShowUpdateRejectModal(false)}>Cancel</button>
                                    <button className="btn btn-sm btn-danger" onClick={submitUpdateRejection}>Confirm Rejection</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <div className="small text-muted">Showing {registrations.length} of {total} entries</div>
                        <nav><ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button></li>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (page <= 3) pageNum = i + 1;
                                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = page - 2 + i;
                                return <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(pageNum)}>{pageNum}</button></li>;
                            })}
                            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next</button></li>
                        </ul></nav>
                    </div>
                )}
            </div>

            {/* View Modal with Sliding Cards */}
            {showModal && viewingItem && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title">
                                    <i className="ti ti-user me-2"></i>
                                    {viewingItem.firstName} {viewingItem.lastName}
                                </h5>
                                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
                            </div>

                            <div className="modal-body p-3">
                                {/* Sliding Card Section */}
                                <div className="card shadow-sm">
                                    <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                                        <span className="fw-semibold">
                                            {viewingItem.updateRequested && viewingItem.updateRequestData
                                                ? `Buyer Information (${activeSlide === 0 ? 'Current' : 'Requested Update'})`
                                                : 'Buyer Information'}
                                        </span>
                                        {viewingItem.updateRequested && viewingItem.updateRequestData && (
                                            <div className="btn-group btn-group-sm">
                                                <button
                                                    className={`btn btn-outline-secondary ${activeSlide === 0 ? 'active' : ''}`}
                                                    onClick={() => setActiveSlide(0)}
                                                >
                                                    Current
                                                </button>
                                                <button
                                                    className={`btn btn-outline-secondary ${activeSlide === 1 ? 'active' : ''}`}
                                                    onClick={() => setActiveSlide(1)}
                                                >
                                                    Update Request
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-body p-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                        {(!viewingItem.updateRequested || !viewingItem.updateRequestData) && (
                                            <div className="row">
                                                <div className="col-md-12">
                                                    <div className="row">
                                                        <div className="col-sm-6">
                                                            <p><strong>First Name:</strong> {viewingItem.firstName}</p>
                                                            <p><strong>Last Name:</strong> {viewingItem.lastName}</p>
                                                            <p><strong>Email:</strong> {viewingItem.email}</p>
                                                            <p><strong>Phone:</strong> {viewingItem.phone}</p>
                                                        </div>
                                                        <div className="col-sm-6">
                                                            <p><strong>Country:</strong> {viewingItem.country}</p>
                                                            <p><strong>User ID:</strong> {viewingItem.userId}</p>
                                                            <p><strong>Status:</strong> <span className={`badge ${statusBadgeClass(viewingItem.status)}`}>{viewingItem.status}</span></p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {viewingItem.updateRequested && viewingItem.updateRequestData && activeSlide === 0 && (
                                            <div className="row">
                                                <div className="col-md-12">
                                                    <div className="row">
                                                        <div className="col-sm-6">
                                                            <p><strong>First Name:</strong> {viewingItem.firstName}</p>
                                                            <p><strong>Last Name:</strong> {viewingItem.lastName}</p>
                                                            <p><strong>Email:</strong> {viewingItem.email}</p>
                                                            <p><strong>Phone:</strong> {viewingItem.phone}</p>
                                                        </div>
                                                        <div className="col-sm-6">
                                                            <p><strong>Country:</strong> {viewingItem.country}</p>
                                                            <p><strong>User ID:</strong> {viewingItem.userId}</p>
                                                            <p><strong>Status:</strong> <span className={`badge ${statusBadgeClass(viewingItem.status)}`}>{viewingItem.status}</span></p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {viewingItem.updateRequested && viewingItem.updateRequestData && activeSlide === 1 && (
                                            <div className="row">
                                                <div className="col-md-12">
                                                    <div className="row">
                                                        <div className="col-sm-6">
                                                            <p><strong>First Name:</strong> {viewingItem.updateRequestData.firstName || viewingItem.firstName}</p>
                                                            <p><strong>Last Name:</strong> {viewingItem.updateRequestData.lastName || viewingItem.lastName}</p>
                                                            <p><strong>Email:</strong> {viewingItem.updateRequestData.email || viewingItem.email}</p>
                                                            <p><strong>Phone:</strong> {viewingItem.updateRequestData.phone || viewingItem.phone}</p>
                                                        </div>
                                                        <div className="col-sm-6">
                                                            <p><strong>Country:</strong> {viewingItem.updateRequestData.country.lable || viewingItem.country}</p>
                                                            <p><strong>User ID:</strong> {viewingItem.updateRequestData.userId || viewingItem.userId}</p>
                                                            <p><strong>{`Status (after update):`}</strong> <span className="badge bg-info text-dark">pending review</span></p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Admin Notes Timeline */}
                                <div className="card shadow-sm mt-3">
                                    <div className="card-header bg-white py-2">
                                        <h6 className="mb-0"><i className="ti ti-notes me-2 text-secondary"></i>Admin Notes</h6>
                                    </div>
                                    <div className="card-body p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {renderAdminNotes(viewingItem.adminNotes || [])}
                                    </div>
                                    <div className="card-footer bg-white py-1 d-flex justify-content-between small text-muted">
                                        <span>Created: {formatDate(viewingItem.createdAt)}</span>
                                        <span>Updated: {formatDate(viewingItem.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer bg-light border-0 py-2">
                                <button type="button" className="btn btn-sm btn-secondary" onClick={handleCloseModal}>
                                    Close
                                </button>
                                {viewingItem.updateRequested && viewingItem.updateRequestData && (
                                    <>
                                        <button className="btn btn-sm btn-danger" onClick={() => openRejectUpdateModal(viewingItem)}>
                                            Reject Update
                                        </button>
                                        <button className="btn btn-sm btn-success" onClick={() => approveUpdate(viewingItem._id)}>
                                            Approve Update
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .table-header-custom th {
                    background-color: #f2f5f9;
                    color: #1e293b;
                    font-weight: 400;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    border-bottom: 2px solid var(--bs-primary) !important;
                    padding: 0.75rem;
                    cursor: pointer;
                    user-select: none;
                }
                .table-header-custom th:hover { background-color: #e9ecef; }
                .btn-group .btn { border-radius: 0; }
                .btn-group .btn:first-child { border-top-left-radius: 0.25rem; border-bottom-left-radius: 0.25rem; }
                .btn-group .btn:last-child { border-top-right-radius: 0.25rem; border-bottom-right-radius: 0.25rem; }
            `}</style>
        </div>
    );
}
'use client';

/**
 * app/admin/credits/page.tsx
 *
 * Lists every employer who has a CreditWallet document.
 * Style mirrors the admin listings page (Bootstrap + scoped CSS).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ExcelJS from 'exceljs';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface WalletRow {
    userId: string;
    stripeCustomerId: string;
    userName: string;
    userEmail: string;
    totalAvailable: number;
    totalPurchased: number;
    totalSpent: number;
    totalExpired: number;
    activeBatchCount: number;
    lastPurchaseAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse {
    data: WalletRow[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="py-3">
                    <div style={{
                        height: 14, borderRadius: 4,
                        background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
                        backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
                        width: i === 1 ? 180 : i === 0 ? 120 : 80,
                    }} />
                </td>
            ))}
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────
// Credit pill
// ─────────────────────────────────────────────────────────────

function CreditPill({ value, type }: { value: number; type: 'available' | 'purchased' | 'spent' | 'expired' }) {
    const configs = {
        available: { bg: '#dcfce7', color: '#14532d' },
        purchased: { bg: '#dbeafe', color: '#1e3a8a' },
        spent: { bg: '#f1f5f9', color: '#334155' },
        expired: { bg: '#fef3c7', color: '#92400e' },
    };
    const c = configs[type];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 36, padding: '2px 10px', borderRadius: 20,
            fontSize: '.78rem', fontWeight: 700,
            background: c.bg, color: c.color,
        }}>
            {value}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function AdminCreditsPage() {
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [minCredits, setMinCredits] = useState('');
    const [sortBy, setSortBy] = useState('updatedAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const perPage = 15;

    const [rows, setRows] = useState<WalletRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('perPage', String(perPage));
            params.set('sortBy', sortBy);
            params.set('sortOrder', sortDir);
            if (search) params.set('search', search);
            if (minCredits) params.set('minCredits', minCredits);

            const res = await fetch(`/api/admin/credits?${params}`);
            if (!res.ok) throw new Error('Failed to fetch credit wallets');
            const json: ApiResponse = await res.json();
            setRows(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page, perPage, sortBy, sortDir, search, minCredits]);

    useEffect(() => {
        const t = setTimeout(fetchData, 300);
        return () => clearTimeout(t);
    }, [fetchData]);

    const handleSort = (col: string) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const SortIcon = ({ col }: { col: string }) =>
        sortBy !== col
            ? <i className="ti ti-arrows-sort text-muted ms-1" style={{ fontSize: '.75rem' }} />
            : sortDir === 'asc'
                ? <i className="ti ti-arrow-up ms-1" style={{ fontSize: '.75rem' }} />
                : <i className="ti ti-arrow-down ms-1" style={{ fontSize: '.75rem' }} />;

    const clearFilters = () => {
        setSearch(''); setMinCredits('');
        setSortBy('updatedAt'); setSortDir('desc'); setPage(1);
    };
    const activeFilterCount = [search, minCredits].filter(Boolean).length;

    // ── Export ────────────────────────────────────────────────
    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ page: '1', perPage: '10000', sortBy, sortOrder: sortDir });
            if (search) params.set('search', search);
            const res = await fetch(`/api/admin/credits?${params}`);
            const json: ApiResponse = await res.json();

            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Credit Wallets');
            ws.columns = [
                { header: 'User ID', key: 'userId', width: 28 },
                { header: 'Name', key: 'userName', width: 28 },
                { header: 'Email', key: 'userEmail', width: 34 },
                { header: 'Stripe Customer', key: 'stripeCustomerId', width: 28 },
                { header: 'Available Credits', key: 'totalAvailable', width: 18 },
                { header: 'Total Purchased', key: 'totalPurchased', width: 18 },
                { header: 'Total Spent', key: 'totalSpent', width: 16 },
                { header: 'Total Expired', key: 'totalExpired', width: 16 },
                { header: 'Active Batches', key: 'activeBatchCount', width: 16 },
                { header: 'Last Purchase', key: 'lastPurchaseAt', width: 22 },
                { header: 'Created At', key: 'createdAt', width: 22 },
            ];
            json.data.forEach(r => ws.addRow({
                ...r,
                lastPurchaseAt: r.lastPurchaseAt ? new Date(r.lastPurchaseAt).toLocaleString() : '',
                createdAt: new Date(r.createdAt).toLocaleString(),
            }));
            ws.getRow(1).font = { bold: true };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF4' } };

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `credit_wallets_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(a.href);
        } catch (e: any) {
            alert(`Export failed: ${e.message}`);
        } finally {
            setExporting(false);
        }
    };

    const COL_COUNT = 9;

    return (
        <div className="container-fluid py-4">
            <style jsx>{`
                @keyframes shimmer {
                    0%   { background-position: 200% 0 }
                    100% { background-position: -200% 0 }
                }
                thead th {
                    background: #f2f6fb !important; color: #334155;
                    font-weight: 700; font-size: .75rem;
                    text-transform: uppercase; letter-spacing: .04em;
                    border-bottom: 2px solid #2563eb !important;
                    padding: .75rem .85rem; user-select: none; white-space: nowrap;
                }
                thead th:hover { background: #e8edf4 !important; }
                .action-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid #e2e8f0;
                    background: #fff; cursor: pointer; font-size: .82rem; color: #64748b;
                    transition: all .15s;
                }
                .action-btn:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
                .filter-pill {
                    display: flex; align-items: center; gap: 6px;
                    height: 32px; padding: 0 10px; border-radius: 8px;
                    border: 1px solid #e2e8f0; background: #fff; font-size: .8rem;
                    transition: border-color .15s;
                }
                .filter-pill:focus-within { border-color: #2563eb; }
                .filter-pill input, .filter-pill select {
                    border: none; background: transparent; outline: none;
                    font-size: .8rem; color: #0f172a; min-width: 0;
                }
            `}</style>

            {/* ── Header ── */}
            <div style={{
                background: '#fff', borderRadius: 16, padding: '1.2rem 1.5rem',
                border: '1px solid #e8edf4', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                marginBottom: '1.25rem',
            }}>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                        <h4 className="mb-0 fw-bold" style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                            <i className="ti ti-credit-card me-2 text-primary" />Credit Wallets
                        </h4>
                        <p className="text-muted small mb-0 mt-1">
                            {total > 0 ? `${total} employer${total !== 1 ? 's' : ''} with credit wallets` : 'All employer credit accounts'}
                        </p>
                    </div>

                    <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
                        {exporting
                            ? <><span className="spinner-border spinner-border-sm me-1" />Exporting…</>
                            : <><i className="ti ti-file-spreadsheet me-1" />Export</>
                        }
                    </button>
                </div>

                {/* ── Filters ── */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                        <div className="filter-pill">
                            <i className="ti ti-search text-muted" style={{ fontSize: '.8rem' }} />
                            <input
                                placeholder="Search name or email…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                style={{ width: 180 }}
                            />
                        </div>
                        <div className="filter-pill">
                            <i className="ti ti-coins text-muted" style={{ fontSize: '.8rem' }} />
                            <input
                                type="number"
                                placeholder="Min credits…"
                                value={minCredits}
                                onChange={e => { setMinCredits(e.target.value); setPage(1); }}
                                style={{ width: 110 }}
                                min={0}
                            />
                        </div>
                        {activeFilterCount > 0 && (
                            <button
                                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                                style={{ height: 32, fontSize: '.78rem', borderRadius: 8 }}
                                onClick={clearFilters}
                            >
                                <i className="ti ti-x" />Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3 mb-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger ms-auto" onClick={fetchData}>Retry</button>
                </div>
            )}

            {/* ── Table ── */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8edf4', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('userName')} style={{ cursor: 'pointer' }}>User <SortIcon col="userName" /></th>
                                <th onClick={() => handleSort('totalAvailable')} style={{ cursor: 'pointer' }}>Available <SortIcon col="totalAvailable" /></th>
                                <th onClick={() => handleSort('totalPurchased')} style={{ cursor: 'pointer' }}>Purchased <SortIcon col="totalPurchased" /></th>
                                <th onClick={() => handleSort('totalSpent')} style={{ cursor: 'pointer' }}>Spent <SortIcon col="totalSpent" /></th>
                                <th onClick={() => handleSort('totalExpired')} style={{ cursor: 'pointer' }}>Expired <SortIcon col="totalExpired" /></th>
                                <th>Batches</th>
                                <th onClick={() => handleSort('lastPurchaseAt')} style={{ cursor: 'pointer' }}>Last Purchase <SortIcon col="lastPurchaseAt" /></th>
                                <th onClick={() => handleSort('updatedAt')} style={{ cursor: 'pointer' }}>Updated <SortIcon col="updatedAt" /></th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} cols={COL_COUNT} />)
                                : rows.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={COL_COUNT} className="text-center py-5">
                                                <div style={{ color: '#94a3b8' }}>
                                                    <i className="ti ti-credit-card-off" style={{ fontSize: '2rem', display: 'block', marginBottom: '.5rem' }} />
                                                    <span style={{ fontSize: '.88rem' }}>No credit wallets found</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                    : rows.map(row => (
                                        <tr key={row.userId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            {/* User */}
                                            <td style={{ maxWidth: 240 }}>
                                                <button
                                                    className="btn btn-link btn-sm p-0 text-start fw-semibold text-dark"
                                                    style={{ textDecoration: 'none', fontSize: '.88rem' }}
                                                    onClick={() => router.push(`/admin/credits/list/${row.userId}`)}
                                                >
                                                    {row.userName || 'Unnamed User'}
                                                </button>
                                                <div style={{ fontSize: '.72rem', color: '#64748b', marginTop: '.1rem' }}>
                                                    {row.userEmail}
                                                </div>
                                                <code style={{ fontSize: '.62rem', color: '#94a3b8' }}>
                                                    {row.stripeCustomerId}
                                                </code>
                                            </td>

                                            {/* Credits */}
                                            <td><CreditPill value={row.totalAvailable} type="available" /></td>
                                            <td><CreditPill value={row.totalPurchased} type="purchased" /></td>
                                            <td><CreditPill value={row.totalSpent} type="spent" /></td>
                                            <td><CreditPill value={row.totalExpired} type="expired" /></td>

                                            {/* Active batches */}
                                            <td>
                                                {row.activeBatchCount > 0
                                                    ? <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#0f172a' }}>
                                                        {row.activeBatchCount} active
                                                    </span>
                                                    : <span style={{ color: '#cbd5e1', fontSize: '.82rem' }}>—</span>
                                                }
                                            </td>

                                            <td style={{ fontSize: '.82rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                {fmtDate(row.lastPurchaseAt)}
                                            </td>

                                            <td style={{ fontSize: '.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                {fmtDate(row.updatedAt)}
                                            </td>

                                            {/* Actions */}
                                            <td className="text-end">
                                                <button
                                                    className="action-btn"
                                                    title="View credit detail"
                                                    onClick={() => router.push(`/admin/credits/list/${row.userId}`)}
                                                >
                                                    <i className="ti ti-eye" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                            }
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '.75rem 1.25rem', borderTop: '1px solid #f1f5f9',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#fafbfc',
                    }}>
                        <div className="small text-muted">Showing {rows.length} of {total} wallets</div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
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
                                    <button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>
        </div>
    );
}
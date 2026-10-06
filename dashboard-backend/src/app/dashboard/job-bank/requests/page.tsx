'use client';

/**
 * src/app/dashboard/job-bank/requests/page.tsx
 *
 * Full paginated list of all the user's Job Bank requests.
 * Linked from /dashboard/job-bank via "View all →".
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    JobBankRequestItem,
    RequestStatus,
    STATUS_CONFIG,
    STATUS_OPTIONS,
    RequestCard,
    EmptyState,
    WithdrawModal,
    JobBankStyles,
} from '../_shared';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

const PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────

function Pagination({
    page,
    totalPages,
    total,
    onChange,
}: {
    page: number;
    totalPages: number;
    total: number;
    onChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    const pages: (number | '...')[] = [];
    const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
    add(1);
    if (page - 2 > 2) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
    if (page + 2 < totalPages - 1) pages.push('...');
    if (totalPages > 1) add(totalPages);

    return (
        <div className="rq-pagination">
            <span className="rq-page-info">
                Showing {from}–{to} of {total} request{total !== 1 ? 's' : ''}
            </span>
            <div className="rq-page-controls">
                <button
                    className="rq-page-btn"
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                >
                    ‹
                </button>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`e-${i}`} className="rq-page-ellipsis">…</span>
                    ) : (
                        <button
                            key={p}
                            className={`rq-page-btn${page === p ? ' rq-page-btn--active' : ''}`}
                            onClick={() => onChange(p as number)}
                            aria-current={page === p ? 'page' : undefined}
                        >
                            {p}
                        </button>
                    ),
                )}
                <button
                    className="rq-page-btn"
                    onClick={() => onChange(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Next page"
                >
                    ›
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function JobBankRequestsPage() {
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();

    // ── List state ────────────────────────────────────────────
    const [requests, setRequests] = useState<JobBankRequestItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);

    // ── Filters ───────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // ── Withdraw state ────────────────────────────────────────
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
    const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);

    // ── Fetch ─────────────────────────────────────────────────
    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setListError(null);
        try {
            const sp = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
            if (search) sp.set('search', search);
            if (filterStatus) sp.set('status', filterStatus);

            const res = await fetch(`/api/job-bank-requests?${sp}`, { cache: 'no-store' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to load requests');

            setRequests(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
        } catch (err: any) {
            setListError(err.message);
        } finally {
            setLoading(false);
        }
    }, [page, search, filterStatus]);

    useEffect(() => {
        if (session?.user) fetchRequests();
    }, [session, fetchRequests]);

    // ── Withdraw ──────────────────────────────────────────────
    const handleWithdraw = async (id: string) => {
        setWithdrawingId(id);
        setConfirmWithdrawId(null);
        try {
            const res = await fetch(`/api/job-bank-requests/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to withdraw');
            await fetchRequests();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setWithdrawingId(null);
        }
    };

    const handlePageChange = (p: number) => {
        setPage(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Guards ────────────────────────────────────────────────
    if (sessionStatus === 'loading') {
        return (
            <div className="jb-loading">
                <div className="jb-spinner" style={{ borderTopColor: '#4f46e5', borderColor: '#e2e8f0' }} />
                <p>Loading…</p>
                <JobBankStyles />
                <RequestsPageStyles />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="jb-gate">
                <div className="jb-gate__icon">🔒</div>
                <h2>Sign in to view your requests</h2>
                <a href="/auth/signin" className="jb-btn jb-btn--primary">Sign in</a>
                <JobBankStyles />
                <RequestsPageStyles />
            </div>
        );
    }

    // ── Derived stats ─────────────────────────────────────────
    const statusCounts = requests.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
    }, {});

    const pending = requests.filter(r => r.status === 'pending').length;
    const fulfilled = requests.filter(r => r.status === 'fulfilled').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;

    const hasFilters = !!(search || filterStatus);

    return (
        <section className="jb">
            {/* ── Page header ── */}
            <div className="rq-page-header">
                <div className="rq-page-header-text">
                    <div className="jb__header-eyebrow" style={{ color: '#64748b' }}>
                        Job Bank Canada
                    </div>
                    <h1 className="rq-title">My Requests</h1>
                    <p className="rq-subtitle">All your Job Bank Canada listing requests and their status.</p>
                </div>
                <div className="rq-page-header-actions">
                    <button
                        className="jb-btn jb-btn--secondary"
                        onClick={() => router.push('/dashboard/job-bank')}
                    >
                        ← Back to dashboard
                    </button>
                    <button
                        className="jb-btn jb-btn--primary"
                        onClick={() => router.push('/dashboard/job-bank')}
                    >
                        + New request
                    </button>
                </div>
            </div>

            {/* ── Hero stats ── */}
            <div className="rq-hero">
                <div className="rq-hero-balance">
                    <span className="rq-hero-label">Total requests</span>
                    <span className="rq-hero-num">{total}</span>
                    <span className="rq-hero-sub">Across all statuses</span>
                </div>
                <div className="rq-hero-stats">
                    <div className="rq-stat-box">
                        <span className="rq-stat-label">Pending</span>
                        <span className="rq-stat-value">{pending}</span>
                    </div>
                    <div className="rq-stat-box">
                        <span className="rq-stat-label">Fulfilled</span>
                        <span className="rq-stat-value">{fulfilled}</span>
                    </div>
                    <div className="rq-stat-box">
                        <span className="rq-stat-label">Rejected</span>
                        <span className="rq-stat-value rq-stat-value--dim">{rejected}</span>
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="jb-filters">
                <div className="jb-filter-input-wrap">
                    <span className="jb-filter-icon">🔍</span>
                    <input
                        type="text"
                        className="jb-filter-input"
                        placeholder="Search by Job Bank ID…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                    {search && (
                        <button
                            className="jb-btn jb-btn--ghost"
                            style={{ padding: '0 .4rem', fontSize: '1rem' }}
                            onClick={() => { setSearch(''); setPage(1); }}
                        >
                            ×
                        </button>
                    )}
                </div>
                <div className="jb-filter-pills">
                    {STATUS_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            className={`jb-pill ${filterStatus === opt.value ? 'jb-pill--active' : ''}`}
                            onClick={() => { setFilterStatus(opt.value); setPage(1); }}
                        >
                            {opt.label}
                            {opt.value && statusCounts[opt.value] !== undefined && (
                                <span className="jb-pill__count">{statusCounts[opt.value]}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Error ── */}
            {listError && (
                <div className="jb-alert jb-alert--error">
                    ❌ {listError}
                    <button className="jb-btn jb-btn--ghost ms-2" onClick={fetchRequests}>
                        Retry
                    </button>
                </div>
            )}

            {/* ── Withdraw modal ── */}
            {confirmWithdrawId && (
                <WithdrawModal
                    onConfirm={() => handleWithdraw(confirmWithdrawId)}
                    onCancel={() => setConfirmWithdrawId(null)}
                />
            )}

            {/* ── Section header ── */}
            <div className="rq-section-header">
                <div>
                    <h2 className="rq-section-title">Requests</h2>
                    <p className="rq-section-sub">
                        Sorted by most recent. Pending requests can be withdrawn.
                    </p>
                </div>
                {totalPages > 1 && (
                    <span className="rq-page-label">Page {page} of {totalPages}</span>
                )}
            </div>

            {/* ── List ── */}
            {loading ? (
                <div className="jb-skeleton-list">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="jb-card jb-card--skeleton">
                            <div className="jb-skel" style={{ height: 16, width: '40%', borderRadius: 6 }} />
                            <div className="jb-skel" style={{ height: 12, width: '60%', borderRadius: 6, marginTop: 8 }} />
                            <div className="jb-skel" style={{ height: 12, width: '30%', borderRadius: 6, marginTop: 8 }} />
                        </div>
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <EmptyState
                    hasFilters={hasFilters}
                    onClear={() => { setSearch(''); setFilterStatus(''); setPage(1); }}
                />
            ) : (
                <>
                    <div className="jb-cards">
                        {requests.map(item => (
                            <RequestCard
                                key={item.id}
                                item={item}
                                onWithdraw={id => setConfirmWithdrawId(id)}
                                withdrawing={withdrawingId === item.id}
                            />
                        ))}
                    </div>

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        total={total}
                        onChange={handlePageChange}
                    />
                </>
            )}

            <JobBankStyles />
            <RequestsPageStyles />
        </section>
    );
}

// ─────────────────────────────────────────────────────────────
// Page-specific styles
// ─────────────────────────────────────────────────────────────

function RequestsPageStyles() {
    return (
        <style jsx global>{`
      /* ── Page header ── */
      .rq-page-header {
        display: flex; align-items: flex-start; justify-content: space-between;
        gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
      }
      .rq-title {
        font-size: clamp(1.4rem, 4vw, 1.9rem); font-weight: 800;
        margin: 0 0 4px; line-height: 1.2; color: var(--jb-text);
      }
      .rq-subtitle { font-size: .85rem; color: var(--jb-muted); margin: 0; }
      .rq-page-header-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; flex-wrap: wrap; }

      /* ── Hero ── */
      .rq-hero {
        background: #5b50e1;
        border-radius: 16px; padding: 22px 24px;
        display: flex; gap: 24px;
        margin-bottom: 24px; color: #fff; flex-wrap: wrap;
      }
      .rq-hero-balance { flex: 1; min-width: 160px; }
      .rq-hero-label {
        font-size: 11px; font-weight: 400; opacity: .75; display: block;
        margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px;
      }
      .rq-hero-num { font-size: clamp(2.5rem, 8vw, 3.5rem); font-weight: 800; line-height: 1; display: block; }
      .rq-hero-sub { font-size: 13px; opacity: .7; margin-top: 6px; display: block; }
      .rq-hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .rq-stat-box {
        background: rgba(255,255,255,.15); border-radius: 10px;
        padding: 10px 14px; display: flex; flex-direction: column; gap: 3px;
      }
      .rq-stat-label { font-size: 10px; font-weight: 400; opacity: .8; text-transform: uppercase; letter-spacing: .4px; }
      .rq-stat-value { font-size: 22px; font-weight: 800; line-height: 1; }
      .rq-stat-value--dim { opacity: .5; }

      /* ── Section header ── */
      .rq-section-header {
        display: flex; align-items: flex-start; justify-content: space-between;
        gap: 12px; margin-bottom: 14px;
      }
      .rq-section-title { font-size: 1rem; font-weight: 700; margin: 0 0 3px; }
      .rq-section-sub { font-size: .78rem; color: var(--jb-muted); margin: 0; line-height: 1.4; }
      .rq-page-label { font-size: .72rem; color: #94a3b8; font-weight: 500; white-space: nowrap; padding-top: 2px; }

      /* ── Pagination ── */
      .rq-pagination {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; flex-wrap: wrap; padding-top: 16px;
        border-top: 1px solid var(--jb-border); margin-top: 1.25rem;
      }
      .rq-page-info { font-size: .78rem; color: var(--jb-muted); white-space: nowrap; }
      .rq-page-controls { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
      .rq-page-btn {
        min-width: 32px; height: 32px; padding: 0 8px;
        border-radius: 8px; border: 1.5px solid var(--jb-border);
        background: var(--jb-surface); color: var(--jb-text); font-size: .83rem;
        font-weight: 500; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background .15s, border-color .15s, color .15s; line-height: 1;
      }
      .rq-page-btn:hover:not(:disabled):not(.rq-page-btn--active) {
        background: #f8fafc; border-color: #c7d2fe; color: #5b50e1;
      }
      .rq-page-btn:disabled { opacity: .4; cursor: not-allowed; }
      .rq-page-btn--active {
        background: #5b50e1; border-color: #5b50e1; color: #fff; cursor: default;
      }
      .rq-page-ellipsis {
        padding: 0 4px; color: #94a3b8; font-size: .83rem;
        line-height: 32px; user-select: none;
      }

      /* ── Responsive ── */
      @media (max-width: 560px) {
        .rq-hero { flex-direction: column; gap: 16px; }
        .rq-hero-stats { width: 100%; }
        .rq-page-header-actions { width: 100%;}
        .rq-pagination { justify-content: center; }
        .rq-page-info { width: 100%; text-align: center; }
        .rq-page-controls { justify-content: center; }
      }
    `}</style>
    );
}
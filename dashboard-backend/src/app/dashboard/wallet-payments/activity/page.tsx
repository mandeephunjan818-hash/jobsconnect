'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type EventType = 'purchase' | 'spend' | 'expired' | 'refund' | 'adjustment';

interface Transaction {
    _id: string;
    eventType: EventType;
    creditsIn: number;
    creditsOut: number;
    balanceAfter: number;
    createdAt: string;
    bundleName?: string;
    bundleKey?: string;
    amountPaid?: number;
    currency?: string;
    stripeSessionId?: string;
    listingTitle?: string;
    listingId?: string;
    expiredBatchIds?: string[];
    affectedBatches?: { batchId: string; creditsConsumed: number; remainingAfter: number }[];
    adjustmentReason?: string;
    adjustedBy?: string;
}

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

interface TabData {
    transactions: Transaction[];
    pagination: PaginationData;
}

type Tab = 'purchase' | 'expired' | 'spend';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmt(pence: number, currency = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
    }).format(pence / 100);
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

async function fetchTransactions(eventType: EventType, page: number, limit = 10): Promise<TabData> {
    const params = new URLSearchParams({
        eventType,
        page: String(page),
        limit: String(limit),
    });
    const res = await fetch(`/api/employer/credits/activity?${params}`);
    if (!res.ok) throw new Error('Failed to load history');
    return res.json();
}

// ─────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-empty">
            <div className="h-empty-icon">📭</div>
            <p className="h-empty-msg">{message}</p>
        </div>
    );
}

function SummaryPill({ label, value, accent, warn }: {
    label: string; value: string; accent?: boolean; warn?: boolean;
}) {
    return (
        <div className={`h-pill${accent ? ' h-pill-accent' : warn ? ' h-pill-warn' : ''}`}>
            <span className="h-pill-label">{label}</span>
            <span className="h-pill-value">{value}</span>
        </div>
    );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="h-inline-err">
            {message} —{' '}
            <button onClick={onRetry}>Retry</button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────

function Pagination({ pagination, onPage }: { pagination: PaginationData; onPage: (p: number) => void }) {
    if (pagination.pages <= 1) return null;

    const { page, pages, total, limit } = pagination;
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    const nums: (number | '...')[] = [];
    const add = (n: number) => { if (!nums.includes(n)) nums.push(n); };
    add(1);
    if (page - 2 > 2) nums.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) add(i);
    if (page + 2 < pages - 1) nums.push('...');
    if (pages > 1) add(pages);

    return (
        <div className="h-pagination">
            <span className="h-page-info">{from}–{to} of {total}</span>
            <div className="h-page-controls">
                <button className="h-page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous">‹</button>
                {nums.map((p, i) =>
                    p === '...'
                        ? <span key={`e${i}`} className="h-page-ellipsis">…</span>
                        : <button
                            key={p}
                            className={`h-page-btn${page === p ? ' h-page-btn--active' : ''}`}
                            onClick={() => onPage(p as number)}
                            aria-current={page === p ? 'page' : undefined}
                        >{p}</button>
                )}
                <button className="h-page-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next">›</button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Skeletons
// ─────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
    return (
        <>
            {[1, 2, 3, 4].map((i) => (
                <tr key={i} className="h-skeleton-row">
                    {Array.from({ length: cols }).map((_, j) => (
                        <td key={j}><div className="h-skeleton-cell" /></td>
                    ))}
                </tr>
            ))}
        </>
    );
}

function SkeletonCards({ count = 3 }: { count?: number }) {
    return (
        <div className="h-card-list">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="h-card h-card--skeleton" />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Purchase tab
// ─────────────────────────────────────────────────────────────

function PurchaseTable() {
    const [data, setData] = useState<TabData | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (p: number) => {
        setLoading(true); setError(null);
        try { setData(await fetchTransactions('purchase', p)); }
        catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(page); }, [load, page]);

    const handlePage = (p: number) => {
        setPage(p); load(p);
        document.getElementById('h-table-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const totals = data?.transactions.reduce(
        (acc, t) => ({ credits: acc.credits + t.creditsIn, spent: acc.spent + (t.amountPaid ?? 0) }),
        { credits: 0, spent: 0 }
    );

    return (
        <div className="h-table-wrap">
            {data && data.transactions.length > 0 && (
                <div className="h-summary-strip">
                    <SummaryPill label="Total purchases" value={String(data.pagination.total)} />
                    <SummaryPill label="Credits acquired" value={String(totals?.credits ?? 0)} accent />
                    <SummaryPill label="Total spent" value={fmt(totals?.spent ?? 0, data.transactions[0]?.currency ?? 'usd')} />
                </div>
            )}

            {error && <InlineError message={error} onRetry={() => load(page)} />}

            {/* Desktop table */}
            <div className="h-table-scroll h-desktop-only">
                <table className="h-table">
                    <thead>
                        <tr>
                            <th>Bundle</th>
                            <th>Credits</th>
                            <th>Amount paid</th>
                            <th>Balance after</th>
                            <th>Date</th>
                            <th>Ref</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <SkeletonRows cols={6} />}
                        {!loading && data?.transactions.length === 0 && (
                            <tr><td colSpan={6}><EmptyState message="No bundle purchases yet." /></td></tr>
                        )}
                        {!loading && data?.transactions.map((t) => (
                            <tr key={t._id}>
                                <td>
                                    <span className="h-badge h-badge-green">Purchase</span>
                                    <span className="h-cell-main">{t.bundleName ?? t.bundleKey ?? '—'}</span>
                                </td>
                                <td><span className="h-credit-in">+{t.creditsIn}</span></td>
                                <td>{t.amountPaid != null ? fmt(t.amountPaid, t.currency ?? 'usd') : '—'}</td>
                                <td className="h-balance">{t.balanceAfter}</td>
                                <td className="h-date">{fmtDate(t.createdAt)}</td>
                                <td>
                                    {t.stripeSessionId
                                        ? <span className="h-ref">{t.stripeSessionId.slice(-8)}</span>
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="h-mobile-only">
                {loading && <SkeletonCards />}
                {!loading && data?.transactions.length === 0 && <EmptyState message="No bundle purchases yet." />}
                {!loading && data?.transactions.map((t) => (
                    <div key={t._id} className="h-card">
                        <div className="h-card-row h-card-row--top">
                            <span className="h-badge h-badge-green">Purchase</span>
                            <span className="h-credit-in">+{t.creditsIn} credits</span>
                        </div>
                        <div className="h-card-name">{t.bundleName ?? t.bundleKey ?? '—'}</div>
                        <div className="h-card-grid">
                            <div className="h-card-field">
                                <span className="h-card-label">Paid</span>
                                <span className="h-card-val">
                                    {t.amountPaid != null ? fmt(t.amountPaid, t.currency ?? 'usd') : '—'}
                                </span>
                            </div>
                            <div className="h-card-field">
                                <span className="h-card-label">Balance after</span>
                                <span className="h-card-val h-balance">{t.balanceAfter}</span>
                            </div>
                            <div className="h-card-field">
                                <span className="h-card-label">Date</span>
                                <span className="h-card-val h-date">{fmtDate(t.createdAt)}</span>
                            </div>
                            {t.stripeSessionId && (
                                <div className="h-card-field">
                                    <span className="h-card-label">Ref</span>
                                    <span className="h-ref">{t.stripeSessionId.slice(-8)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {data && <Pagination pagination={data.pagination} onPage={handlePage} />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Expiry tab
// ─────────────────────────────────────────────────────────────

function ExpiryTable() {
    const [data, setData] = useState<TabData | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (p: number) => {
        setLoading(true); setError(null);
        try { setData(await fetchTransactions('expired', p)); }
        catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(page); }, [load, page]);

    const handlePage = (p: number) => {
        setPage(p); load(p);
        document.getElementById('h-table-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const totalExpired = data?.transactions.reduce((s, t) => s + t.creditsOut, 0) ?? 0;

    return (
        <div className="h-table-wrap">
            {data && data.transactions.length > 0 && (
                <div className="h-summary-strip">
                    <SummaryPill label="Expiry events" value={String(data.pagination.total)} />
                    <SummaryPill label="Credits expired" value={String(totalExpired)} warn />
                    <SummaryPill label="Batches affected" value={
                        String(data.transactions.reduce((s, t) => s + (t.expiredBatchIds?.length ?? 0), 0))
                    } />
                </div>
            )}

            {error && <InlineError message={error} onRetry={() => load(page)} />}

            {/* Desktop */}
            <div className="h-table-scroll h-desktop-only">
                <table className="h-table">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Credits expired</th>
                            <th>Batches swept</th>
                            <th>Balance after</th>
                            <th>Date &amp; time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <SkeletonRows cols={5} />}
                        {!loading && data?.transactions.length === 0 && (
                            <tr><td colSpan={5}><EmptyState message="No credits have expired — well done!" /></td></tr>
                        )}
                        {!loading && data?.transactions.map((t) => (
                            <tr key={t._id}>
                                <td><span className="h-badge h-badge-amber">Expired</span></td>
                                <td><span className="h-credit-out">−{t.creditsOut}</span></td>
                                <td>
                                    <div className="h-batch-list">
                                        {t.expiredBatchIds?.length
                                            ? t.expiredBatchIds.map(id => <span key={id} className="h-ref">{id}</span>)
                                            : <span className="h-muted">—</span>}
                                    </div>
                                </td>
                                <td className="h-balance">{t.balanceAfter}</td>
                                <td className="h-date">{fmtDateTime(t.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile */}
            <div className="h-mobile-only">
                {loading && <SkeletonCards />}
                {!loading && data?.transactions.length === 0 && <EmptyState message="No credits have expired — well done!" />}
                {!loading && data?.transactions.map((t) => (
                    <div key={t._id} className="h-card">
                        <div className="h-card-row h-card-row--top">
                            <span className="h-badge h-badge-amber">Expired</span>
                            <span className="h-credit-out">−{t.creditsOut} credits</span>
                        </div>
                        <div className="h-card-grid">
                            <div className="h-card-field">
                                <span className="h-card-label">Balance after</span>
                                <span className="h-card-val h-balance">{t.balanceAfter}</span>
                            </div>
                            <div className="h-card-field">
                                <span className="h-card-label">Date</span>
                                <span className="h-card-val h-date">{fmtDateTime(t.createdAt)}</span>
                            </div>
                            {t.expiredBatchIds && t.expiredBatchIds.length > 0 && (
                                <div className="h-card-field h-card-field--full">
                                    <span className="h-card-label">Batches swept</span>
                                    <div className="h-batch-list">
                                        {t.expiredBatchIds.map(id => <span key={id} className="h-ref">{id}</span>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {data && <Pagination pagination={data.pagination} onPage={handlePage} />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Usage tab
// ─────────────────────────────────────────────────────────────

function UsageTable() {
    const [data, setData] = useState<TabData | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (p: number) => {
        setLoading(true); setError(null);
        try { setData(await fetchTransactions('spend', p)); }
        catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(page); }, [load, page]);

    const handlePage = (p: number) => {
        setPage(p); load(p);
        document.getElementById('h-table-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const totalSpent = data?.transactions.reduce((s, t) => s + t.creditsOut, 0) ?? 0;

    return (
        <div className="h-table-wrap">
            {data && data.transactions.length > 0 && (
                <div className="h-summary-strip">
                    <SummaryPill label="Listings posted" value={String(data.pagination.total)} />
                    <SummaryPill label="Credits used" value={String(totalSpent)} />
                </div>
            )}

            {error && <InlineError message={error} onRetry={() => load(page)} />}

            {/* Desktop */}
            <div className="h-table-scroll h-desktop-only">
                <table className="h-table">
                    <thead>
                        <tr>
                            <th>Listing</th>
                            <th>Credits used</th>
                            <th>Batches drawn from</th>
                            <th>Balance after</th>
                            <th>Date &amp; time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <SkeletonRows cols={5} />}
                        {!loading && data?.transactions.length === 0 && (
                            <tr><td colSpan={5}><EmptyState message="No credits used yet. Post a listing to get started." /></td></tr>
                        )}
                        {!loading && data?.transactions.map((t) => (
                            <tr key={t._id}>
                                <td>
                                    <span className="h-badge h-badge-indigo">Spend</span>
                                    <span className="h-cell-main">{t.listingTitle ?? t.listingId ?? 'Untitled listing'}</span>
                                    {t.listingId && <span className="h-cell-sub">{t.listingId}</span>}
                                </td>
                                <td><span className="h-credit-out">−{t.creditsOut}</span></td>
                                <td>
                                    <div className="h-batch-list">
                                        {t.affectedBatches?.length
                                            ? t.affectedBatches.map(b => (
                                                <span key={b.batchId} className="h-ref">
                                                    {b.batchId} <span className="h-muted">−{b.creditsConsumed}</span>
                                                </span>
                                            ))
                                            : <span className="h-muted">—</span>}
                                    </div>
                                </td>
                                <td className="h-balance">{t.balanceAfter}</td>
                                <td className="h-date">{fmtDateTime(t.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile */}
            <div className="h-mobile-only">
                {loading && <SkeletonCards />}
                {!loading && data?.transactions.length === 0 && <EmptyState message="No credits used yet. Post a listing to get started." />}
                {!loading && data?.transactions.map((t) => (
                    <div key={t._id} className="h-card">
                        <div className="h-card-row h-card-row--top">
                            <span className="h-badge h-badge-indigo">Spend</span>
                            <span className="h-credit-out">−{t.creditsOut} credits</span>
                        </div>
                        <div className="h-card-name">
                            {t.listingTitle ?? t.listingId ?? 'Untitled listing'}
                        </div>
                        {t.listingId && <div className="h-cell-sub" style={{ marginBottom: 2 }}>{t.listingId}</div>}
                        <div className="h-card-grid">
                            <div className="h-card-field">
                                <span className="h-card-label">Balance after</span>
                                <span className="h-card-val h-balance">{t.balanceAfter}</span>
                            </div>
                            <div className="h-card-field">
                                <span className="h-card-label">Date</span>
                                <span className="h-card-val h-date">{fmtDateTime(t.createdAt)}</span>
                            </div>
                            {t.affectedBatches && t.affectedBatches.length > 0 && (
                                <div className="h-card-field h-card-field--full">
                                    <span className="h-card-label">Batches drawn from</span>
                                    <div className="h-batch-list">
                                        {t.affectedBatches.map(b => (
                                            <span key={b.batchId} className="h-ref">
                                                {b.batchId} <span className="h-muted">−{b.creditsConsumed}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {data && <Pagination pagination={data.pagination} onPage={handlePage} />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; shortLabel: string; description: string; dot: string }[] = [
    {
        key: 'purchase',
        label: 'Bundle purchases',
        shortLabel: 'Purchases',
        description: 'Every credit bundle you have bought, with payment amounts and Stripe references.',
        dot: '#22c55e',
    },
    {
        key: 'expired',
        label: 'Token expiry',
        shortLabel: 'Expiry',
        description: 'Credits that were swept away when their batch passed its expiry date.',
        dot: '#f59e0b',
    },
    {
        key: 'spend',
        label: 'Usage history',
        shortLabel: 'Usage',
        description: 'Credits consumed each time you posted a job listing.',
        dot: '#5b50e1',
    },
];

export default function HistoryPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('purchase');

    const current = TABS.find(t => t.key === activeTab)!;

    return (
        <>
            <style>{STYLES}</style>
            <div className="h-page">

                {/* Header */}
                <div className="h-header">
                    <div className="h-header-text">
                        <h1 className="h-title">Credit history</h1>
                        <p className="h-subtitle">Full audit trail of every credit movement on your account.</p>
                    </div>
                    <div className="h-header-actions">
                        <button className="h-btn-ghost" onClick={() => router.push('/dashboard/wallet-payments/wallet')}>
                            ← Wallet
                        </button>
                        <button className="h-btn-primary" onClick={() => router.push('/dashboard/wallet-payments/credits')}>
                            + Buy credits
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="h-tabs" role="tablist">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            className={`h-tab${activeTab === tab.key ? ' h-tab-active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span className="h-tab-dot" style={{ background: tab.dot }} />
                            <span className="h-tab-long">{tab.label}</span>
                            <span className="h-tab-short">{tab.shortLabel}</span>
                        </button>
                    ))}
                </div>

                {/* Description */}
                <p className="h-tab-desc">{current.description}</p>

                {/* Scroll anchor */}
                <div id="h-table-anchor" style={{ scrollMarginTop: '80px' }} />

                {/* Panel */}
                <div className="h-panel">
                    {activeTab === 'purchase' && <PurchaseTable key="purchase" />}
                    {activeTab === 'expired' && <ExpiryTable key="expired" />}
                    {activeTab === 'spend' && <UsageTable key="spend" />}
                </div>

            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const STYLES = `
*, *::before, *::after { box-sizing: border-box; }

/* ── Page ── */
.h-page {
  margin: 0 auto;
  padding: 0 0 60px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
  min-width: 0;
}

/* ── Header ── */
.h-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.h-header-text { flex: 1; min-width: 0; }
.h-title {
  font-size: clamp(16px, 5vw, 24px);
  font-weight: 800;
  margin: 0 0 4px;
  line-height: 1.2;
  white-space: nowrap;
}
.h-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}
.h-header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

/* ── Tabs ── */
.h-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 14px;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  /* Ensure tabs never wrap — scroll instead */
  flex-wrap: nowrap;
}
.h-tabs::-webkit-scrollbar { display: none; }

.h-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  /* Equal-width tabs on mobile: divide space evenly */
  flex: 1;
  justify-content: center;
  min-width: 0;
  padding: 10px 10px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  border-bottom: 2px solid transparent;
  margin-bottom: 1px;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
/* On wider screens, tabs auto-size to content */
@media (min-width: 480px) {
  .h-tab {
    flex: none;
    padding: 10px 16px;
    font-size: 13px;
  }
}
.h-tab:hover { color: #0f172a; }
.h-tab-active { color: #5b50e1; border-bottom-color: #5b50e1; }

.h-tab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Label switching: short on narrow, long on wide */
.h-tab-long  { display: none; }
.h-tab-short { display: inline; }
@media (min-width: 480px) {
  .h-tab-long  { display: inline; }
  .h-tab-short { display: none; }
}

.h-tab-desc {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 16px;
  line-height: 1.5;
}

/* ── Panel ── */
.h-panel {
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
}

/* ── Summary strip ── */
.h-summary-strip {
  display: grid;
  /* Always equal columns — no wrapping/squishing */
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafafa;
}
.h-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  min-width: 0;
}
.h-pill-accent { border-color: #c7d2fe; background: #eef2ff; }
.h-pill-warn   { border-color: #fde68a; background: #fffbeb; }
.h-pill-label  {
  font-size: 9px;
  font-weight: 400;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.3;
  word-break: break-word;
}
.h-pill-value {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}   
.h-pill-accent .h-pill-value { color: #5b50e1; }
.h-pill-warn   .h-pill-value { color: #b45309; }

/* ── Responsive visibility ── */
.h-desktop-only { display: none; }
.h-mobile-only  { display: block; }
@media (min-width: 700px) {
  .h-desktop-only { display: block; }
  .h-mobile-only  { display: none; }
}

@media (max-width: 700px) {
  .h-header { flex-direction: column; }
}

/* ── Table ── */
.h-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.h-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 540px;
}
.h-table thead th {
  text-align: left;
  padding: 11px 14px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
  background: #fafafa;
}
.h-table tbody td {
  padding: 12px 14px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: top;
}
.h-table tbody tr:last-child td { border-bottom: none; }
.h-table tbody tr:hover td { background: #fafeff; }

/* ── Mobile cards ── */
.h-card-list { display: flex; flex-direction: column; }
.h-card {
  padding: 13px 14px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.h-card:last-child { border-bottom: none; }
.h-card--skeleton {
  height: 90px;
  background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size: 200% 100%;
  animation: h-shimmer 1.4s infinite;
  border-radius: 0;
  border-bottom: 1px solid #f1f5f9;
}
.h-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.h-card-row--top {
  justify-content: space-between;
}
.h-card-name {
  font-size: 14px;
  font-weight: 400;
  color: #0f172a;
  line-height: 1.3;
  /* Allow wrapping on very small screens */
  overflow-wrap: break-word;
  word-break: break-word;
}
.h-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}
.h-card-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.h-card-field--full { grid-column: 1 / -1; }
.h-card-label {
  font-size: 10px;
  font-weight: 400;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.h-card-val {
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  overflow-wrap: break-word;
}

/* ── Cell helpers ── */
.h-cell-main {
  display: block;
  font-weight: 400;
  color: #0f172a;
  font-size: 13px;
  overflow-wrap: break-word;
}
.h-cell-sub {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
  margin-top: 2px;
  word-break: break-all;
}
.h-muted { color: #cbd5e1; font-size: 12px; }
.h-date  { color: #64748b; white-space: nowrap; font-size: 12px; }
.h-balance { font-weight: 700; font-size: 14px; color: #0f172a; }
.h-ref {
  display: inline-block;
  font-family: monospace;
  font-size: 11px;
  background: #f1f5f9;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
  margin: 1px 2px 1px 0;
  word-break: break-all;
}

/* ── Badges ── */
.h-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 5px;
  margin-bottom: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}
.h-badge-green  { background: #dcfce7; color: #166534; }
.h-badge-amber  { background: #fef3c7; color: #92400e; }
.h-badge-indigo { background: #e0e7ff; color: #3730a3; }

/* ── Credit numbers ── */
.h-credit-in  { font-size: 14px; font-weight: 800; color: #16a34a; white-space: nowrap; }
.h-credit-out { font-size: 14px; font-weight: 800; color: #dc2626; white-space: nowrap; }

/* ── Batch list ── */
.h-batch-list { display: flex; flex-direction: column; gap: 3px; }

/* ── Skeleton ── */
.h-skeleton-row td { padding: 12px 14px; }
.h-skeleton-cell {
  height: 13px;
  border-radius: 5px;
  background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size: 200% 100%;
  animation: h-shimmer 1.4s infinite;
  min-width: 50px;
}
@keyframes h-shimmer { to { background-position: -200% 0; } }

/* ── Empty ── */
.h-empty {
  text-align: center;
  padding: 32px 20px;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.h-empty-icon { font-size: 28px; }
.h-empty-msg  { font-size: 13px; margin: 0; }

/* ── Pagination ── */
.h-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
  flex-wrap: wrap;
}
.h-page-info { font-size: 12px; color: #64748b; white-space: nowrap; }
.h-page-controls { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
.h-page-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 7px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  line-height: 1;
}
.h-page-btn:hover:not(:disabled):not(.h-page-btn--active) {
  background: #f8fafc; border-color: #c7d2fe; color: #5b50e1;
}
.h-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.h-page-btn--active {
  background: #5b50e1; border-color: #5b50e1; color: #fff; cursor: default;
}
.h-page-ellipsis {
  padding: 0 3px; color: #94a3b8; font-size: 13px;
  line-height: 30px; user-select: none;
}
@media (max-width: 380px) {
  .h-pagination { justify-content: center; }
  .h-page-info  { width: 100%; text-align: center; }
  .h-page-controls { justify-content: center; }
  .h-page-btn { min-width: 26px; height: 26px; font-size: 12px; }
}

/* ── Error ── */
.h-inline-err {
  padding: 11px 14px;
  background: #fef2f2;
  border-bottom: 1px solid #fca5a5;
  color: #991b1b;
  font-size: 13px;
}
.h-inline-err button {
  background: none; border: none; color: #dc2626;
  cursor: pointer; text-decoration: underline;
  padding: 0; font-size: inherit;
}

/* ── Buttons ── */
.h-btn-primary {
  background: #5b50e1;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.h-btn-primary:hover { background: #5b50e1; }

.h-btn-ghost {
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #475569;
  cursor: pointer;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 8px;
  white-space: nowrap;
  transition: background 0.15s;
}
.h-btn-ghost:hover { background: #f8fafc; }

/* Compact buttons on very small screens */
@media (max-width: 360px) {
  .h-btn-primary,
  .h-btn-ghost {
    font-size: 12px;
    padding: 7px 10px;
  }
}
`;
'use client';

/**
 * app/admin/credits/[userId]/page.tsx
 *
 * Full credit detail for one employer:
 *   – Wallet summary cards
 *   – Active batch list
 *   – Tabbed transaction log (All / Purchases / Spend / Expired / Adjustments)
 *   – Admin adjust panel (grant or deduct credits)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UserInfo {
    userId: string;
    userName: string;
    userEmail: string;
    stripeCustomerId: string;
}

interface Batch {
    batchId: string;
    bundleKey: string;
    bundleName: string;
    creditsPurchased: number;
    creditsRemaining: number;
    listingsPerCredit: number;
    purchasedAt: string;
    expiresAt: string;
    status: 'active' | 'exhausted' | 'expired';
    amountPaid: number;
    currency: string;
}

interface WalletSummary {
    totalAvailable: number;
    totalPurchased: number;
    totalSpent: number;
    totalExpired: number;
    batches: Batch[];
}

type EventType = 'purchase' | 'spend' | 'expired' | 'refund' | 'adjustment';

interface AffectedBatch {
    batchId: string;
    creditsConsumed: number;
    remainingAfter: number;
}

interface Transaction {
    _id: string;
    eventType: EventType;
    creditsIn: number;
    creditsOut: number;
    balanceAfter: number;
    createdAt: string;
    // purchase
    bundleName?: string;
    bundleKey?: string;
    amountPaid?: number;
    currency?: string;
    stripeSessionId?: string;
    // spend
    listingTitle?: string;
    listingId?: string;
    // expiry
    expiredBatchIds?: string[];
    // adjustment
    adjustmentReason?: string;
    adjustedBy?: string;
    // shared
    affectedBatches?: AffectedBatch[];
    stripeBalanceTxId?: string;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmt(pence: number, currency = 'usd'): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2 }).format(pence / 100);
}
function daysUntil(iso: string): number {
    return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

const EVENT_BADGE: Record<EventType, { bg: string; color: string; label: string }> = {
    purchase: { bg: '#dcfce7', color: '#14532d', label: 'Purchase' },
    spend: { bg: '#dbeafe', color: '#1e3a8a', label: 'Spend' },
    expired: { bg: '#fef3c7', color: '#92400e', label: 'Expired' },
    refund: { bg: '#fce7f3', color: '#831843', label: 'Refund' },
    adjustment: { bg: '#ede9fe', color: '#4c1d95', label: 'Adjustment' },
};

function EventBadge({ type }: { type: EventType }) {
    const c = EVENT_BADGE[type] ?? { bg: '#f1f5f9', color: '#475569', label: type };
    return (
        <span style={{
            display: 'inline-block', fontSize: '.68rem', fontWeight: 700,
            padding: '2px 8px', borderRadius: 20,
            background: c.bg, color: c.color, textTransform: 'capitalize', whiteSpace: 'nowrap',
        }}>
            {c.label}
        </span>
    );
}

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="py-3">
                    <div style={{
                        height: 13, borderRadius: 4,
                        background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
                        backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
                        width: i === 0 ? 120 : i === 1 ? 80 : 60,
                    }} />
                </td>
            ))}
        </tr>
    );
}

const TABS: { key: EventType | 'all'; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'ti-list' },
    { key: 'purchase', label: 'Purchases', icon: 'ti-shopping-cart' },
    { key: 'spend', label: 'Spend', icon: 'ti-arrow-up-right' },
    { key: 'expired', label: 'Expired', icon: 'ti-clock-off' },
    { key: 'adjustment', label: 'Adjustments', icon: 'ti-adjustments-horizontal' },
];

// ─────────────────────────────────────────────────────────────
// Summary stat card
// ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
    return (
        <div style={{
            background: '#fff', border: '1px solid #e8edf4', borderRadius: 14,
            padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color,
            }}>
                <i className={`ti ${icon}`} style={{ fontSize: '1.3rem' }} />
            </div>
            <div>
                <div style={{ fontSize: '.73rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{value}</div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Adjust modal
// ─────────────────────────────────────────────────────────────

function AdjustModal({
    userId, stripeCustomerId, onDone, onClose,
}: { userId: string; stripeCustomerId: string; onDone: () => void; onClose: () => void }) {
    const [delta, setDelta] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const isGrant = Number(delta) > 0;
    const isDeduct = Number(delta) < 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!delta || delta === '0') { setErr('Enter a non-zero amount'); return; }
        if (!reason.trim()) { setErr('Reason is required'); return; }
        setErr(null);
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/credits/${userId}/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creditDelta: Number(delta), reason: reason.trim() }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Adjustment failed');
            onDone();
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)',
                zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 80px rgba(0,0,0,.22)', overflow: 'hidden' }}
            >
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Manual credit adjustment</h5>
                        <p style={{ margin: 0, fontSize: '.78rem', color: '#64748b' }}>Positive = grant, negative = deduct</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Delta input */}
                        <div>
                            <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '.35rem' }}>
                                Credit amount
                            </label>
                            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem' }}>
                                {[5, 10, 25, 50].map(n => (
                                    <button key={n} type="button"
                                        onClick={() => setDelta(String(n))}
                                        style={{
                                            padding: '4px 12px', borderRadius: 8, fontSize: '.78rem', fontWeight: 600,
                                            border: '1.5px solid #e2e8f0', cursor: 'pointer',
                                            background: delta === String(n) ? '#eff6ff' : '#fff',
                                            color: delta === String(n) ? '#2563eb' : '#475569',
                                            borderColor: delta === String(n) ? '#2563eb' : '#e2e8f0',
                                        }}>
                                        +{n}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="e.g. 10 to grant, -5 to deduct"
                                value={delta}
                                onChange={e => setDelta(e.target.value)}
                            />
                            {(isGrant || isDeduct) && (
                                <div style={{
                                    marginTop: '.5rem', padding: '6px 12px', borderRadius: 8, fontSize: '.78rem', fontWeight: 600,
                                    background: isGrant ? '#dcfce7' : '#fee2e2',
                                    color: isGrant ? '#14532d' : '#991b1b',
                                }}>
                                    {isGrant ? `✓ Grant ${delta} credits to this user` : `✗ Deduct ${Math.abs(Number(delta))} credits from this user`}
                                </div>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '.35rem' }}>
                                Reason <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                className="form-control form-control-sm"
                                rows={3}
                                placeholder="e.g. Goodwill credit for support ticket #1234"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>

                        {err && (
                            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: '.82rem', color: '#991b1b' }}>
                                {err}
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '.9rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '.5rem', background: '#fafbfc' }}>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                        <button
                            type="submit" className="btn btn-sm"
                            disabled={saving}
                            style={{ background: isDeduct ? '#dc2626' : '#2563eb', color: '#fff', fontWeight: 600, border: 'none' }}
                        >
                            {saving
                                ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                                : isDeduct ? 'Deduct credits' : 'Grant credits'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Transaction table (shared across tabs)
// ─────────────────────────────────────────────────────────────

function TransactionTable({ userId, eventType }: { userId: string; eventType: EventType | 'all' }) {
    const [data, setData] = useState<{ transactions: Transaction[]; pagination: Pagination } | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (p: number) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(p), limit: '20' });
            if (eventType !== 'all') params.set('eventType', eventType);
            const res = await fetch(`/api/admin/credits/${userId}/transactions?${params}`);
            if (!res.ok) throw new Error('Failed to load transactions');
            setData(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [userId, eventType]);

    useEffect(() => { setPage(1); }, [eventType]);
    useEffect(() => { load(page); }, [load, page]);

    const COL_COUNT = 6;

    return (
        <div>
            {error && (
                <div style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: '.82rem', marginBottom: '1rem' }}>
                    {error} <button style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit' }} onClick={() => load(page)}>Retry</button>
                </div>
            )}

            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '.82rem' }}>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Description</th>
                            <th>In</th>
                            <th>Out</th>
                            <th>Balance after</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading
                            ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={COL_COUNT} />)
                            : !data?.transactions.length
                                ? (
                                    <tr>
                                        <td colSpan={COL_COUNT} className="text-center py-4">
                                            <span style={{ color: '#94a3b8', fontSize: '.88rem' }}>No transactions found.</span>
                                        </td>
                                    </tr>
                                )
                                : data.transactions.map(tx => (
                                    <tr key={tx._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        {/* Type */}
                                        <td><EventBadge type={tx.eventType} /></td>

                                        {/* Description */}
                                        <td style={{ maxWidth: 280 }}>
                                            {tx.eventType === 'purchase' && (
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{tx.bundleName ?? tx.bundleKey ?? 'Bundle purchase'}</div>
                                                    {tx.amountPaid != null && (
                                                        <div style={{ fontSize: '.72rem', color: '#64748b' }}>{fmt(tx.amountPaid, tx.currency)}</div>
                                                    )}
                                                    {tx.stripeSessionId && (
                                                        <code style={{ fontSize: '.62rem', color: '#94a3b8' }}>{tx.stripeSessionId.slice(-10)}</code>
                                                    )}
                                                </div>
                                            )}
                                            {tx.eventType === 'spend' && (
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                                                        {tx.listingTitle ?? 'Listing'}
                                                    </div>
                                                    {tx.listingId && (
                                                        <code style={{ fontSize: '.62rem', color: '#94a3b8' }}>{tx.listingId}</code>
                                                    )}
                                                    {tx.affectedBatches && tx.affectedBatches.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem', marginTop: '.2rem' }}>
                                                            {tx.affectedBatches.map(b => (
                                                                <span key={b.batchId} style={{ fontSize: '.62rem', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>
                                                                    {b.batchId.slice(-6)} −{b.creditsConsumed}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {tx.eventType === 'expired' && (
                                                <div>
                                                    <div style={{ color: '#92400e', fontWeight: 600 }}>
                                                        {tx.expiredBatchIds?.length ?? 0} batch{(tx.expiredBatchIds?.length ?? 0) !== 1 ? 'es' : ''} swept
                                                    </div>
                                                    {tx.expiredBatchIds && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem', marginTop: '.2rem' }}>
                                                            {tx.expiredBatchIds.map(id => (
                                                                <code key={id} style={{ fontSize: '.62rem', color: '#94a3b8' }}>{id.slice(-6)}</code>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {tx.eventType === 'adjustment' && (
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{tx.adjustmentReason ?? 'Manual adjustment'}</div>
                                                    {tx.adjustedBy && (
                                                        <div style={{ fontSize: '.72rem', color: '#64748b' }}>by {tx.adjustedBy}</div>
                                                    )}
                                                </div>
                                            )}
                                            {tx.eventType === 'refund' && (
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>Refund</div>
                                            )}
                                        </td>

                                        {/* In */}
                                        <td>
                                            {tx.creditsIn > 0
                                                ? <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '.9rem' }}>+{tx.creditsIn}</span>
                                                : <span style={{ color: '#cbd5e1' }}>—</span>
                                            }
                                        </td>

                                        {/* Out */}
                                        <td>
                                            {tx.creditsOut > 0
                                                ? <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '.9rem' }}>−{tx.creditsOut}</span>
                                                : <span style={{ color: '#cbd5e1' }}>—</span>
                                            }
                                        </td>

                                        {/* Balance */}
                                        <td>
                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{tx.balanceAfter}</span>
                                        </td>

                                        {/* Date */}
                                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {fmtDateTime(tx.createdAt)}
                                        </td>
                                    </tr>
                                ))
                        }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data && data.pagination.pages > 1 && (
                <div style={{
                    padding: '.6rem 1.25rem', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#fafbfc',
                }}>
                    <div className="small text-muted">{data.pagination.total} transactions</div>
                    <nav>
                        <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
                            </li>
                            {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                                const p = data.pagination.pages <= 5 ? i + 1
                                    : page <= 3 ? i + 1
                                        : page >= data.pagination.pages - 2 ? data.pagination.pages - 4 + i
                                            : page - 2 + i;
                                return (
                                    <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                                    </li>
                                );
                            })}
                            <li className={`page-item ${page === data.pagination.pages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page === data.pagination.pages}>Next</button>
                            </li>
                        </ul>
                    </nav>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main detail page
// ─────────────────────────────────────────────────────────────

export default function AdminCreditDetailPage() {
    const { userId } = useParams<{ userId: string }>();
    const router = useRouter();

    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [wallet, setWallet] = useState<WalletSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<EventType | 'all'>('all');
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
    const [txKey, setTxKey] = useState(0); // bump to force TransactionTable remount after adjustment

    const loadWallet = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/credits/${userId}`);
            if (!res.ok) throw new Error('Failed to load wallet');
            const json = await res.json();
            setUserInfo(json.user);
            setWallet(json.wallet);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { loadWallet(); }, [loadWallet]);

    function showToast(msg: string, type: 'ok' | 'err') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    function handleAdjustDone() {
        setAdjustOpen(false);
        showToast('Credit adjustment applied successfully.', 'ok');
        loadWallet();
        setTxKey(k => k + 1);
    }

    const now = new Date();
    const activeBatches = wallet?.batches.filter(b => b.status === 'active' && new Date(b.expiresAt) > now) ?? [];

    return (
        <div className="container-fluid py-4">
            <style jsx>{`
                @keyframes shimmer {
                    0%   { background-position: 200% 0 }
                    100% { background-position: -200% 0 }
                }
                thead th {
                    background: #f2f6fb !important; color: #334155;
                    font-weight: 700; font-size: .72rem;
                    text-transform: uppercase; letter-spacing: .04em;
                    border-bottom: 2px solid #2563eb !important;
                    padding: .65rem .85rem; user-select: none; white-space: nowrap;
                }
                .tab-btn {
                    display: flex; align-items: center; gap: 6px;
                    padding: .55rem 1rem; border: none; background: none;
                    cursor: pointer; font-size: .8rem; font-weight: 500; color: #64748b;
                    border-bottom: 2.5px solid transparent; margin-bottom: -1px;
                    transition: color .15s, border-color .15s; white-space: nowrap;
                }
                .tab-btn:hover { color: #0f172a; }
                .tab-btn.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 700; }
                .batch-bar-wrap { height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden; margin-top: .5rem; }
                .batch-bar { height: 100%; border-radius: 2px; transition: width .3s; }
            `}</style>

            {/* ── Back + header ── */}
            <div style={{
                background: '#fff', borderRadius: 16, padding: '1.1rem 1.5rem',
                border: '1px solid #e8edf4', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                marginBottom: '1.25rem',
            }}>
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            style={{ borderRadius: 8 }}
                            onClick={() => router.push('/admin/credits/list')}
                        >
                            <i className="ti ti-arrow-left me-1" />Back
                        </button>
                        <div>
                            {loading
                                ? <div style={{ height: 18, width: 200, borderRadius: 4, background: '#f1f5f9' }} />
                                : (
                                    <>
                                        <h4 className="mb-0 fw-bold" style={{ fontSize: '1rem', color: '#0f172a' }}>
                                            <i className="ti ti-credit-card me-2 text-primary" />
                                            {userInfo?.userName || 'Unknown User'}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginTop: '.2rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '.78rem', color: '#64748b' }}>{userInfo?.userEmail}</span>
                                            {userInfo?.stripeCustomerId && (
                                                <code style={{ fontSize: '.68rem', color: '#94a3b8', background: '#f8fafc', padding: '1px 6px', borderRadius: 4 }}>
                                                    {userInfo.stripeCustomerId}
                                                </code>
                                            )}
                                        </div>
                                    </>
                                )
                            }
                        </div>
                    </div>

                    <button
                        className="btn btn-sm btn-primary"
                        style={{ fontWeight: 600 }}
                        onClick={() => setAdjustOpen(true)}
                        disabled={loading || !wallet}
                    >
                        <i className="ti ti-adjustments-horizontal me-1" />Adjust credits
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3 mb-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger ms-auto" onClick={loadWallet}>Retry</button>
                </div>
            )}

            {/* ── Summary cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ height: 88, borderRadius: 14, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                    ))
                    : wallet && (
                        <>
                            <StatCard label="Available credits" value={wallet.totalAvailable} icon="ti-coins" color="#2563eb" />
                            <StatCard label="Total purchased" value={wallet.totalPurchased} icon="ti-shopping-cart" color="#16a34a" />
                            <StatCard label="Total spent" value={wallet.totalSpent} icon="ti-arrow-up-right" color="#6366f1" />
                            <StatCard label="Total expired" value={wallet.totalExpired} icon="ti-clock-off" color="#d97706" />
                        </>
                    )
                }
            </div>

            {/* ── Active batches ── */}
            {!loading && activeBatches.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e8edf4', borderRadius: 16, padding: '1.1rem 1.5rem', marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <h5 style={{ margin: 0, fontWeight: 700, fontSize: '.9rem', color: '#0f172a' }}>
                                <i className="ti ti-stack me-2 text-primary" />Active credit batches
                            </h5>
                            <p style={{ margin: 0, fontSize: '.75rem', color: '#64748b' }}>Used in nearest-expiry-first order</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                        {activeBatches.map((b, idx) => {
                            const days = daysUntil(b.expiresAt);
                            const isNear = days <= 30;
                            const pct = (b.creditsRemaining / b.creditsPurchased) * 100;

                            return (
                                <div key={b.batchId} style={{
                                    border: `1.5px solid ${isNear ? '#fde68a' : '#e2e8f0'}`,
                                    borderRadius: 12, padding: '1rem 1.1rem',
                                    background: isNear ? '#fffbeb' : '#fafbfc',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                                        <span style={{
                                            fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                            background: idx === 0 ? '#eff6ff' : '#f1f5f9',
                                            color: idx === 0 ? '#1d4ed8' : '#64748b',
                                        }}>
                                            {idx === 0 ? 'Used next' : `#${idx + 1}`}
                                        </span>
                                        <code style={{ fontSize: '.62rem', color: '#94a3b8' }}>{b.batchId.slice(-8)}</code>
                                    </div>

                                    <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#0f172a', marginBottom: '.2rem' }}>{b.bundleName}</div>
                                    <div style={{ fontSize: '.72rem', color: '#64748b', marginBottom: '.6rem' }}>
                                        Bought {fmtDate(b.purchasedAt)} · {fmt(b.amountPaid, b.currency)}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '.3rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#0f172a' }}>{b.creditsRemaining}</span>
                                        <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>/ {b.creditsPurchased}</span>
                                    </div>

                                    <div className="batch-bar-wrap">
                                        <div className="batch-bar" style={{ width: `${pct}%`, background: isNear ? '#f59e0b' : '#2563eb' }} />
                                    </div>

                                    <div style={{ fontSize: '.72rem', marginTop: '.5rem', color: isNear ? '#b45309' : '#64748b', fontWeight: isNear ? 600 : 400 }}>
                                        {isNear && '⚠ '}Expires {fmtDate(b.expiresAt)} ({days}d)
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Transaction log ── */}
            <div style={{ background: '#fff', border: '1px solid #e8edf4', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                {/* Tab bar */}
                <div style={{ borderBottom: '1px solid #e2e8f0', padding: '0 1.25rem', display: 'flex', overflowX: 'auto', gap: '0' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <i className={`ti ${tab.icon}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <TransactionTable key={`${activeTab}-${txKey}`} userId={userId} eventType={activeTab} />
            </div>

            {/* Adjust modal */}
            {adjustOpen && userInfo && (
                <AdjustModal
                    userId={userId}
                    stripeCustomerId={userInfo.stripeCustomerId}
                    onDone={handleAdjustDone}
                    onClose={() => setAdjustOpen(false)}
                />
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 28, right: 28,
                    padding: '12px 20px', borderRadius: 10,
                    background: toast.type === 'ok' ? '#065f46' : '#991b1b',
                    color: '#fff', fontSize: '.88rem', fontWeight: 500,
                    boxShadow: '0 8px 24px rgba(0,0,0,.18)', zIndex: 2000,
                    animation: 'slideUp .2s ease',
                }}>
                    {toast.type === 'ok' ? '✓' : '✕'} {toast.msg}
                </div>
            )}

            <style>{`@keyframes slideUp { from { transform: translateY(12px); opacity: 0; } }`}</style>
        </div>
    );
}
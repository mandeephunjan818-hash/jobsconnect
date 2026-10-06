'use client';

import React, { useState, useEffect, useCallback, useRef} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWalletStream } from '@/hooks/useWalletStream';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Batch {
    batchId: string;
    bundleKey: string;
    bundleName: string;
    creditsRemaining: number;
    creditsPurchased: number;
    listingsPerCredit: number;
    purchasedAt: string;
    expiresAt: string;
    amountPaid: number;
    currency: string;
    isNearExpiry: boolean;
}

interface WalletData {
    totalAvailable: number;
    batches: Batch[];
    totalPurchased: number;
    totalSpent: number;
    totalExpired: number;
    nearExpiryWarning: { credits: number; expiresAt: string } | null;
}

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

function daysUntil(iso: string): number {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────

function Pagination({
    page,
    totalPages,
    total,
    pageSize,
    onChange,
}: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    const pages: (number | '...')[] = [];
    const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };

    add(1);
    if (page - 2 > 2) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
    if (page + 2 < totalPages - 1) pages.push('...');
    if (totalPages > 1) add(totalPages);

    return (
        <div className="wl-pagination">
            <span className="wl-page-info">
                Showing {from}–{to} of {total} batch{total !== 1 ? 'es' : ''}
            </span>
            <div className="wl-page-controls">
                <button
                    className="wl-page-btn"
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                >‹</button>

                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`e-${i}`} className="wl-page-ellipsis">…</span>
                    ) : (
                        <button
                            key={p}
                            className={`wl-page-btn${page === p ? ' wl-page-btn--active' : ''}`}
                            onClick={() => onChange(p as number)}
                            aria-current={page === p ? 'page' : undefined}
                        >{p}</button>
                    )
                )}

                <button
                    className="wl-page-btn"
                    onClick={() => onChange(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Next page"
                >›</button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// StatBox
// ─────────────────────────────────────────────────────────────

function StatBox({ label, value, dim }: { label: string; value: number; dim?: boolean }) {
    return (
        <div className="wl-stat-box">
            <span className="wl-stat-label">{label}</span>
            <span className={`wl-stat-value${dim ? ' dim' : ''}`}>{value}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function WalletPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const justPurchased = searchParams.get('purchased') === 'true'; // FIX: was 'success'
    const sessionId = searchParams.get('session_id');

    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(justPurchased);
    const [isConfirming, setIsConfirming] = useState(justPurchased);
    const [page, setPage] = useState(1);
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async (isRetry = false) => {
        // Cancel any in-flight request before starting a new one —
        // this is what stops stale responses from racing each other.
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/employer/credits/wallet', {
                signal: controller.signal,
            });

            if (!res.ok) {
                const ct = res.headers.get('content-type') ?? '';
                const isAuthIssue = res.status === 401 || ct.includes('text/html');

                // Right after a hard refresh the session cookie can lag by a
                // few hundred ms. If this is our first attempt and it looks
                // like an auth hiccup, retry once automatically instead of
                // showing a dead page.
                if (isAuthIssue && !isRetry) {
                    await new Promise(r => setTimeout(r, 400));
                    return load(true);
                }

                throw new Error(
                    isAuthIssue
                        ? 'Session expired — please sign in again.'
                        : `Failed to load wallet (${res.status})`
                );
            }

            const data = await res.json();
            setWallet(data);
            setPage(1);
        } catch (e: any) {
            if (e.name === 'AbortError') return; // superseded by a newer call, ignore
            setError(e.message);
        } finally {
            if (abortRef.current === controller) {
                setLoading(false);
            }
        }
    }, []);

    // Single source of truth for "load on mount". No duplicate effects.
    useEffect(() => {
        load();
        return () => abortRef.current?.abort();
    }, [load]);

    // justPurchased banner timeout — kept separate since it's unrelated to loading
    useEffect(() => {
        if (!justPurchased) return;
        const t = setTimeout(() => setShowSuccess(false), 8000);
        return () => clearTimeout(t);
    }, [justPurchased]);

    useWalletStream(justPurchased, useCallback(() => {
        setIsConfirming(false);
        load();
    }, [load]));

    const refetchWallet = useCallback(() => { load(); }, [load]);

    // SSE effect stays as-is, but calls the same de-duped `load` via refetchWallet
    useEffect(() => {
        const purchased = searchParams.get('purchased');
        if (purchased !== 'true') return;

        let es: EventSource | null = null;
        fetch('/api/employer/wallet-stream-token')
            .then(r => r.json())
            .then(({ token }) => {
                es = new EventSource(`/api/employer/wallet-stream?token=${token}`);
                es.addEventListener('wallet-updated', () => {
                    setIsConfirming(false);
                    refetchWallet();
                    es?.close();
                });
                es.addEventListener('timeout', () => {
                    setIsConfirming(false);
                    refetchWallet();
                    es?.close();
                });
                es.onerror = () => es?.close();
            });

        return () => es?.close();
    }, [searchParams, refetchWallet]);

    const allBatches = wallet?.batches ?? [];
    const totalBatches = allBatches.length;
    const totalPages = Math.ceil(totalBatches / PAGE_SIZE);
    const pageBatches = allBatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handlePageChange = (p: number) => {
        setPage(p);
        document.getElementById('wl-batches-anchor')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <>
            <style>{STYLES}</style>
            <div className="wl-page">

                {/* ── Header ── */}
                <div className="wl-header">
                    <div className="wl-header-text">
                        <h1 className="wl-title">Credit Wallet</h1>
                        <p className="wl-subtitle">Your available credits and purchase history.</p>
                    </div>
                    <div className="wl-header-actions">
                        <button
                            className="btn-ghost-sm"
                            onClick={() => router.push('/dashboard/wallet-payments/activity')}
                        >
                            Activity log
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => router.push('/dashboard/wallet-payments/credits')}
                        >
                            + Buy credits
                        </button>
                    </div>
                </div>

                {/* ── Success banner ── */}
                {showSuccess && (
                    <div className="wl-banner wl-banner-ok">
                        <span className="wl-banner-icon">✓</span>
                        <div className="wl-banner-body">
                            <strong>Purchase successful!</strong> Your credits have been added to your wallet.
                            {sessionId && (
                                <span className="wl-session-ref"> Ref: {sessionId.slice(-8)}</span>
                            )}
                        </div>
                        <button className="wl-banner-close" onClick={() => setShowSuccess(false)}>×</button>
                    </div>
                )}

                {/* {isConfirming && !showSuccess && (
                    <div className="wl-banner wl-banner-ok">
                        <span className="wl-banner-icon">
                            <span className="wl-inline-spinner" />
                        </span>
                        <div className="wl-banner-body">
                            Confirming your payment… this usually takes a few seconds.
                        </div>
                    </div>
                )} */}

                {/* ── Near-expiry warning ── */}
                {!loading && wallet?.nearExpiryWarning && (
                    <div className="wl-banner wl-banner-warn">
                        <span className="wl-banner-icon">⚠</span>
                        <div className="wl-banner-body">
                            <strong>{wallet.nearExpiryWarning.credits} credits</strong> expire on{' '}
                            {fmtDate(wallet.nearExpiryWarning.expiresAt)} —{' '}
                            {daysUntil(wallet.nearExpiryWarning.expiresAt)} days left.
                            Use them before they expire.
                        </div>
                    </div>
                )}

                {/* ── Error ── */}
                {error && (
                    <div className="wl-banner wl-banner-err">
                        <span className="wl-banner-icon">✕</span>
                        <div className="wl-banner-body">
                            {error} — <button className="link-btn" onClick={() => load()}>Retry</button>
                        </div>
                    </div>
                )}

                {/* ── Skeletons ── */}
                {loading && (
                    <div className="wl-skeleton-wrap">
                        <div className="wl-skeleton-hero" />
                        <div className="wl-skeleton-list">
                            {[1, 2, 3].map(i => <div key={i} className="wl-skeleton-row" />)}
                        </div>
                    </div>
                )}

                {/* ── Loaded ── */}
                {!loading && wallet && (
                    <>
                        {/* Balance hero */}
                        <div className="wl-hero">
                            <div className="wl-balance-block">
                                <span className="wl-balance-label">Available credits</span>
                                <span className="wl-balance-num">{wallet.totalAvailable}</span>
                                <span className="wl-balance-sub">
                                    {wallet.totalAvailable === 0
                                        ? 'No credits — buy a bundle to start posting'
                                        : `Unlocks up to ${wallet.batches[0]?.listingsPerCredit
                                            ? wallet.totalAvailable * wallet.batches[0].listingsPerCredit
                                            : wallet.totalAvailable} listings`}
                                </span>
                            </div>

                            <div className="wl-stats">
                                <StatBox label="Total purchased" value={wallet.totalPurchased} />
                                <StatBox label="Total spent" value={wallet.totalSpent} />
                                <StatBox label="Total expired" value={wallet.totalExpired} dim />
                            </div>
                        </div>

                        {/* Empty wallet */}
                        {wallet.batches.length === 0 && (
                            <div className="wl-empty">
                                <div className="wl-empty-icon">💳</div>
                                <p className="wl-empty-title">No active credits</p>
                                <p className="wl-empty-sub">Buy a bundle to start posting listings.</p>
                                <button
                                    className="btn-primary"
                                    onClick={() => router.push('/dashboard/wallet-payments/credits')}
                                >
                                    Buy credits
                                </button>
                            </div>
                        )}

                        {/* Credit batches */}
                        {wallet.batches.length > 0 && (
                            <div className="wl-section">
                                <div
                                    id="wl-batches-anchor"
                                    style={{ scrollMarginTop: '80px' }}
                                />
                                <div className="wl-section-header">
                                    <div>
                                        <h2 className="wl-section-title">Active credit batches</h2>
                                        <p className="wl-section-sub">
                                            Credits are used in expiry order — nearest-expiry batch consumed first.
                                        </p>
                                    </div>
                                    {totalPages > 1 && (
                                        <span className="wl-page-label">
                                            Page {page} of {totalPages}
                                        </span>
                                    )}
                                </div>

                                <div className="wl-batch-list">
                                    {pageBatches.map((batch, idx) => {
                                        const globalIdx = (page - 1) * PAGE_SIZE + idx;
                                        const pct = (batch.creditsRemaining / batch.creditsPurchased) * 100;

                                        return (
                                            <div
                                                key={batch.batchId}
                                                className={`wl-batch${batch.isNearExpiry ? ' wl-batch-expiring' : ''}`}
                                            >
                                                {/* Top row */}
                                                <div className="wl-batch-top">
                                                    <div className="wl-batch-left">
                                                        <span className="wl-batch-order">
                                                            {globalIdx === 0 ? 'Used next' : `#${globalIdx + 1}`}
                                                        </span>
                                                        <div className="wl-batch-info">
                                                            <div className="wl-batch-name">{batch.bundleName}</div>
                                                            <div className="wl-batch-meta">
                                                                Bought {fmtDate(batch.purchasedAt)} · {fmt(batch.amountPaid, batch.currency)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="wl-batch-right">
                                                        <div className="wl-batch-credits">
                                                            {batch.creditsRemaining}
                                                            <span className="wl-batch-of">
                                                                /{batch.creditsPurchased}
                                                            </span>
                                                        </div>
                                                        <div className={`wl-batch-expiry${batch.isNearExpiry ? ' expiry-warn' : ''}`}>
                                                            {batch.isNearExpiry && '⚠ '}
                                                            Expires {fmtDate(batch.expiresAt)}
                                                            {' '}({daysUntil(batch.expiresAt)}d)
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="wl-batch-bar-wrap">
                                                    <div
                                                        className="wl-batch-bar"
                                                        style={{
                                                            width: `${pct}%`,
                                                            background: batch.isNearExpiry ? '#f59e0b' : '#4f46e5',
                                                        }}
                                                    />
                                                </div>

                                                {/* Footer */}
                                                <div className="wl-batch-footer">
                                                    <span className="wl-pct-label">{Math.round(pct)}% remaining</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    total={totalBatches}
                                    pageSize={PAGE_SIZE}
                                    onChange={handlePageChange}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const STYLES = `
/* ── Reset & Base ── */
*, *::before, *::after { box-sizing: border-box; }

/* ── Page ── */
.wl-page {
  margin: 0 auto;
  padding: 0 0 60px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
  min-width: 0;
}

.wl-inline-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #86efac;
  border-top-color: #166534;
  border-radius: 50%;
  animation: wl-spin 0.7s linear infinite;
  vertical-align: middle;
}
@keyframes wl-spin { to { transform: rotate(360deg); } }

/* ── Header ── */
.wl-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.wl-header-text {
  flex: 1;
  min-width: 0;
}
.wl-title {
  font-size: clamp(16px, 5vw, 24px);
  font-weight: 800;
  margin: 0 0 4px;
  line-height: 1.2;
  white-space: nowrap;
}
.wl-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}
.wl-header-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}

/* ── Banners ── */
.wl-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.5;
}
.wl-banner-ok   { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
.wl-banner-warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.wl-banner-err  { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
.wl-banner-icon { flex-shrink: 0; font-size: 15px; margin-top: 1px; }
.wl-banner-body { flex: 1; min-width: 0; }
.wl-banner-close {
  margin-left: auto; background: none; border: none; cursor: pointer;
  font-size: 18px; opacity: 0.6; line-height: 1; padding: 0;
  color: inherit; flex-shrink: 0;
}
.wl-session-ref { font-family: monospace; font-size: 11px; opacity: 0.7; margin-left: 6px; }

/* ── Hero ── */
.wl-hero {
  background: #5b50e1;
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 28px;
  color: #fff;
}
@media (min-width: 560px) {
  .wl-hero {
    flex-direction: row;
    align-items: center;
    padding: 28px 28px;
    gap: 24px;
  }
}

.wl-balance-block {
  flex: 1;
  min-width: 0;
}
.wl-balance-label {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
  display: block;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.wl-balance-num {
  font-size: clamp(40px, 12vw, 56px);
  font-weight: 900;
  line-height: 1;
  display: block;
}
.wl-balance-sub {
  font-size: 13px;
  opacity: 0.75;
  margin-top: 6px;
  display: block;
}

/* Stats: 3 equal columns always */
.wl-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
}
@media (min-width: 560px) {
  .wl-stats {
    width: auto;
    grid-template-columns: 1fr;
    min-width: 140px;
    gap: 8px;
  }
}
@media (min-width: 768px) {
  .wl-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .wl-header {
    display: flex;
    flex-direction: column;
  }
}

.wl-stat-box {
  background: rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.wl-stat-label {
  font-size: 9px;
  font-weight: 400;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.3;
  word-break: break-word;
}
.wl-stat-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}
.wl-stat-value.dim { opacity: 0.5; }

/* ── Skeletons ── */
.wl-skeleton-wrap { display: flex; flex-direction: column; gap: 14px; }
.wl-skeleton-hero {
  height: 130px; border-radius: 16px;
  background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size: 200% 100%; animation: wl-shimmer 1.4s infinite;
}
.wl-skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.wl-skeleton-row {
  height: 80px; border-radius: 12px;
  background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size: 200% 100%; animation: wl-shimmer 1.4s infinite;
}
@keyframes wl-shimmer { to { background-position: -200% 0; } }

/* ── Section ── */
.wl-section { margin-bottom: 32px; }
.wl-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.wl-section-title { font-size: 15px; font-weight: 700; margin: 0 0 3px; }
.wl-section-sub { font-size: 12px; color: #64748b; margin: 0; line-height: 1.4; }
.wl-page-label {
  font-size: 11px; color: #94a3b8; font-weight: 500;
  white-space: nowrap; padding-top: 2px; flex-shrink: 0;
}

/* ── Batch list ── */
.wl-batch-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }

.wl-batch {
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
  min-width: 0;
}
.wl-batch:hover {
  border-color: #c7d2fe;
  box-shadow: 0 2px 12px rgba(99,102,241,0.08);
}
.wl-batch-expiring {
  border-color: #fde68a;
  background: #fffbeb;
}

/* batch top row */
.wl-batch-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}
.wl-batch-left {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.wl-batch-order {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #5b50e1;
  background: #eef2ff;
  padding: 3px 6px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 2px;
}
.wl-batch-info {
  flex: 1;
  min-width: 0;
}
.wl-batch-name {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wl-batch-meta {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  line-height: 1.4;
  /* Allow wrap on very narrow screens */
  overflow-wrap: break-word;
}

/* Right side: credits + expiry */
.wl-batch-right {
  text-align: right;
  flex-shrink: 0;
  min-width: 0;
}
.wl-batch-credits {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  white-space: nowrap;
}
.wl-batch-of {
  font-size: 13px;
  font-weight: 400;
  color: #94a3b8;
}
.wl-batch-expiry {
  font-size: 11px;
  color: #64748b;
  margin-top: 3px;
  white-space: nowrap;
}
.expiry-warn { color: #b45309; font-weight: 400; }

/* progress bar */
.wl-batch-bar-wrap {
  height: 5px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}
.wl-batch-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* footer */
.wl-batch-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.wl-pct-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

/* ── Batch responsive: very narrow (<380px) ──
   Stack right side below the left info block */
@media (max-width: 379px) {
  .wl-batch-top {
    flex-direction: column;
    gap: 8px;
  }
  .wl-batch-right {
    text-align: left;
    display: flex;
    align-items: center;
    gap: 10px;
    padding-left: 0;
  }
  .wl-batch-expiry {
    margin-top: 0;
    font-size: 11px;
  }
  .wl-batch-name {
    white-space: normal;
  }
}

/* ── Empty ── */
.wl-empty {
  text-align: center;
  padding: 56px 24px;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.wl-empty-icon { font-size: 38px; }
.wl-empty-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0; }
.wl-empty-sub { font-size: 13px; margin: 0; }

/* ── Buttons ── */
.btn-primary {
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
.btn-primary:hover { background: #5b50e1; }

.btn-ghost-sm {
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #475569;
  cursor: pointer;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 8px;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.btn-ghost-sm:hover { background: #f8fafc; border-color: #cbd5e1; }

/* Compact buttons on very small screens */
@media (max-width: 360px) {
  .btn-primary,
  .btn-ghost-sm {
    font-size: 12px;
    padding: 7px 10px;
  }
}

.link-btn {
  background: none; border: none; color: #5b50e1;
  cursor: pointer; text-decoration: underline;
  padding: 0; font-size: inherit;
}

/* ── Pagination ── */
.wl-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}
.wl-page-info { font-size: 12px; color: #64748b; white-space: nowrap; }
.wl-page-controls { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

.wl-page-btn {
  min-width: 32px; height: 32px; padding: 0 8px;
  border-radius: 8px; border: 1px solid #e2e8f0;
  background: #fff; color: #374151; font-size: 13px;
  font-weight: 500; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  line-height: 1;
}
.wl-page-btn:hover:not(:disabled):not(.wl-page-btn--active) {
  background: #f8fafc; border-color: #c7d2fe; color: #5b50e1;
}
.wl-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.wl-page-btn--active {
  background: #5b50e1; border-color: #5b50e1;
  color: #fff; cursor: default;
}
.wl-page-ellipsis {
  padding: 0 4px; color: #94a3b8; font-size: 13px;
  line-height: 32px; user-select: none;
}

@media (max-width: 400px) {
  .wl-pagination { justify-content: center; }
  .wl-page-info { width: 100%; text-align: center; }
  .wl-page-controls { justify-content: center; }
  .wl-page-btn { min-width: 28px; height: 28px; font-size: 12px; }
}
`;
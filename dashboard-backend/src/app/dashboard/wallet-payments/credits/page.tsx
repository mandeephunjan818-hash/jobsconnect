'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Bundle {
    _id: string;
    key: string;
    name: string;
    credits: number;
    price: number;
    currency: string;
    popular?: boolean;
}

interface PageData {
    bundles: Bundle[];
    listingsPerCredit: number;
    creditExpiryDays: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmt(pence: number, currency = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
    }).format(pence / 100);
}

function fmtFull(pence: number, currency = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
    }).format(pence / 100);
}

// Icons paired to bundle index (cycles if more than 5 bundles)
const BUNDLE_ICONS = ['📦', '🚀', '⭐', '🏢', '👑'];

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
        <div className="bc-pagination">
            <span className="bc-page-info">
                Showing {from}–{to} of {total} bundle{total !== 1 ? 's' : ''}
            </span>
            <div className="bc-page-controls">
                <button className="bc-page-btn" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`ellipsis-${i}`} className="bc-page-ellipsis">…</span>
                    ) : (
                        <button
                            key={p}
                            className={`bc-page-btn${page === p ? ' bc-page-btn--active' : ''}`}
                            onClick={() => onChange(p as number)}
                            aria-current={page === p ? 'page' : undefined}
                        >
                            {p}
                        </button>
                    )
                )}
                <button className="bc-page-btn" onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Next page">›</button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Bundle Card
// ─────────────────────────────────────────────────────────────

function BundleCard({
    bundle,
    listingsPerCredit,
    creditExpiryDays,
    isPopular,
    isBuying,
    anyBuying,
    onBuy,
    iconEmoji,
}: {
    bundle: Bundle;
    listingsPerCredit: number;
    creditExpiryDays: number;
    isPopular: boolean;
    isBuying: boolean;
    anyBuying: boolean;
    onBuy: (id: string) => void;
    iconEmoji: string;
}) {
    const totalListings = bundle.credits * listingsPerCredit;
    const pricePerListing = bundle.price / totalListings;

    return (
        <div className={`bc-card${isPopular ? ' bc-card--popular' : ''}`}>
            {isPopular && <span className="bc-popular-badge">Most popular</span>}

            {/* Icon */}
            <div className="bc-card-icon" aria-hidden="true">{iconEmoji}</div>

            {/* Header */}
            <div className="bc-card-header">
                <p className="bc-card-credit-label">{bundle.credits} credits</p>
                <h3 className="bc-card-name">{bundle.name}</h3>
            </div>

            {/* Price */}
            <div className="bc-card-price-block">
                <span className="bc-card-price">{fmt(bundle.price, bundle.currency)}</span>
                <span className="bc-card-price-note"> one-time</span>
            </div>
            <p className="bc-card-per-listing">{fmtFull(pricePerListing, bundle.currency)} per listing</p>

            {/* Divider */}
            <div className="bc-card-divider" />

            {/* Features */}
            <ul className="bc-feature-list" aria-label="What's included">
                <li><span className="bc-check" aria-hidden="true">✓</span>{totalListings} listing{totalListings !== 1 ? 's' : ''} unlocked</li>
                <li><span className="bc-check" aria-hidden="true">✓</span>Valid for {creditExpiryDays} days</li>
                <li><span className="bc-check" aria-hidden="true">✓</span>Nearest-expiry used first</li>
                <li><span className="bc-check" aria-hidden="true">✓</span>No subscription needed</li>
            </ul>

            {/* CTA */}
            <button
                className={`bc-buy-btn${isPopular ? ' bc-buy-btn--primary' : ' bc-buy-btn--ghost'}`}
                onClick={() => onBuy(bundle._id)}
                disabled={isBuying || anyBuying}
                aria-busy={isBuying}
            >
                {isBuying
                    ? <span className="bc-spinner" aria-label="Processing…" />
                    : `Get quote for ${fmt(bundle.price, bundle.currency)}`
                }
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function BuyCreditsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const wasCancelled = searchParams.get('cancelled') === 'true';
    const needsAccount = searchParams.get('needAccount') === 'true';

    const [data, setData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/employer/credit-bundles');
            if (!res.ok) throw new Error('Failed to load bundles');
            setData(await res.json());
            setPage(1);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleBuy(bundleId: string) {
        setBuyingId(bundleId);
        try {
            const res = await fetch('/api/employer/credits/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bundleId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Checkout failed');
            window.location.href = json.url;
        } catch (e: any) {
            setError(e.message);
            setBuyingId(null);
        }
    }

    const allBundles = data?.bundles ?? [];
    const totalBundles = allBundles.length;
    const totalPages = Math.ceil(totalBundles / PAGE_SIZE);
    const pageBundles = allBundles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Mark the middle bundle as popular if none is flagged in data
    const popularIndex = pageBundles.findIndex(b => b.popular);
    const autoPopularIndex = popularIndex >= 0 ? popularIndex : Math.floor(pageBundles.length / 2);

    const handlePageChange = (p: number) => {
        setPage(p);
        document.getElementById('bc-grid-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <>
            <style>{STYLES}</style>
            <div className="bc-page">

                {/* Header */}
                <div className="bc-header">
                    <div className="bc-header-text">
                        <h1 className="bc-title">Buy credits</h1>
                        <p className="bc-subtitle">
                            Credits let you post job listings. Buy a bundle and use them any time.
                        </p>
                    </div>
                    <button className="btn-ghost" onClick={() => router.push('/dashboard/wallet-payments/wallet')}>
                        ← My wallet
                    </button>
                </div>

                {/* Cancelled banner */}
                {wasCancelled && (
                    <div className="bc-banner bc-banner-warn">
                        Payment cancelled — no charge was made. Choose a bundle when you're ready.
                    </div>
                )}

                {needsAccount && (
                    <div className="bc-banner bc-banner-info">
                        You'll need to purchase a credit bundle before you can use the rest of the dashboard. Pick a bundle below to get started.
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bc-banner bc-banner-err">
                        {error} —{' '}
                        <button className="link-btn" onClick={load}>Retry</button>
                    </div>
                )}

                {/* Loading skeletons */}
                {loading && (
                    <div className="bc-grid">
                        {[1, 2, 3].map(i => <div key={i} className="bc-card bc-card--skeleton" />)}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && totalBundles === 0 && (
                    <div className="bc-empty">
                        <div className="bc-empty-icon">📦</div>
                        <p className="bc-empty-title">No bundles available</p>
                        <p className="bc-empty-sub">Check back soon — new credit bundles are added regularly.</p>
                    </div>
                )}

                {/* Bundles */}
                {!loading && data && totalBundles > 0 && (
                    <>
                        {/* Rate bar */}
                        <div className="bc-rate-bar">
                            <span className="bc-rate-pill">
                                1 credit = {data.listingsPerCredit} listing{data.listingsPerCredit !== 1 ? 's' : ''}
                            </span>
                            <span className="bc-rate-note">
                                Credits expire {data.creditExpiryDays} days after purchase · nearest-expiry used first
                            </span>
                        </div>

                        <div id="bc-grid-anchor" style={{ scrollMarginTop: '80px' }} />

                        {totalPages > 1 && (
                            <p className="bc-page-label">Page {page} of {totalPages}</p>
                        )}

                        {/* Cards */}
                        <div className="bc-grid">
                            {pageBundles.map((bundle, i) => (
                                <BundleCard
                                    key={bundle._id}
                                    bundle={bundle}
                                    listingsPerCredit={data.listingsPerCredit}
                                    creditExpiryDays={data.creditExpiryDays}
                                    isPopular={i === autoPopularIndex}
                                    isBuying={buyingId === bundle._id}
                                    anyBuying={!!buyingId}
                                    onBuy={handleBuy}
                                    iconEmoji={BUNDLE_ICONS[i % BUNDLE_ICONS.length]}
                                />
                            ))}
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            total={totalBundles}
                            pageSize={PAGE_SIZE}
                            onChange={handlePageChange}
                        />
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
/* ── Page ── */
.bc-page {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
}

/* ── Header ── */
.bc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.bc-header-text { flex: 1; min-width: 0; }
.bc-title {
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 800;
  margin: 0 0 4px;
  line-height: 1.2;
}
.bc-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* ── Banners ── */
.bc-banner {
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
}
.bc-banner-warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.bc-banner-err  { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }

/* ── Rate bar ── */
.bc-rate-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.bc-rate-pill {
  background: #eef2ff;
  color: #5b50e1;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  white-space: nowrap;
}
.bc-rate-note { font-size: 12px; color: #64748b; }

.bc-page-label { font-size: 12px; color: #94a3b8; margin: 0 0 12px; font-weight: 500; }

/* ── Grid ── */
.bc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
  align-items: stretch;
}

.bc-banner-info { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; }

/* ── Card ── */
.bc-card {
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  padding: 22px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
}
.bc-card:hover {
  box-shadow: 0 8px 28px rgba(0,0,0,0.09);
  transform: translateY(-3px);
  border-color: #c7d2fe;
}
.bc-card--popular {
  border: 2px solid #5b50e1;
  padding-top: 30px;
}

/* ── Popular badge ── */
.bc-popular-badge {
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  background: #5b50e1;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 14px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 1px;
}

/* ── Card icon ── */
.bc-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 14px;
  flex-shrink: 0;
}

/* ── Card header ── */
.bc-card-header { margin-bottom: 10px; }
.bc-card-credit-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 3px;
}
.bc-card-name {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.2;
}

/* ── Price ── */
.bc-card-price-block { display: flex; align-items: baseline; gap: 2px; margin-bottom: 3px; }
.bc-card-price {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}
.bc-card-price-note { font-size: 12px; font-weight: 400; color: #94a3b8; }
.bc-card-per-listing {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 14px;
}

/* ── Divider ── */
.bc-card-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 0 0 14px;
}

/* ── Feature list ── */
.bc-feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  margin: 0 0 18px;
  padding: 0;
}
.bc-feature-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  line-height: 1.4;
}
.bc-check {
  color: #22c55e;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Buy button ── */
.bc-buy-btn {
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  width: 100%;
  margin-top: auto;
  border: 1.5px solid transparent;
}
.bc-buy-btn--primary {
  background: #5b50e1;
  color: #fff;
  border-color: #5b50e1;
}
.bc-buy-btn--primary:hover:not(:disabled) {
  background: #7c4dff;
  border-color: #5b50e1;
  transform: translateY(-1px);
}
.bc-buy-btn--ghost {
  background: transparent;
  color: #5b50e1;
  border-color: #c7d2fe;
}
.bc-buy-btn--ghost:hover:not(:disabled) {
  background: #eef2ff;
  border-color: #a5b4fc;
  transform: translateY(-1px);
}
.bc-buy-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Spinner ── */
.bc-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: bc-spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes bc-spin { to { transform: rotate(360deg); } }

/* ── Skeleton ── */
.bc-card--skeleton {
  height: 340px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  pointer-events: none;
}
@keyframes shimmer { to { background-position: -200% 0; } }

/* ── Empty state ── */
.bc-empty {
  text-align: center;
  padding: 56px 24px;
  color: #64748b;
}
.bc-empty-icon { font-size: 40px; margin-bottom: 12px; }
.bc-empty-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
.bc-empty-sub { font-size: 14px; margin: 0; }

/* ── Ghost / link buttons ── */
.btn-ghost {
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #475569;
  cursor: pointer;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 8px;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.btn-ghost:hover { background: #f8fafc; border-color: #cbd5e1; }
.link-btn {
  background: none; border: none; color: #dc2626;
  cursor: pointer; text-decoration: underline;
  padding: 0; font-size: inherit;
}

/* ── Pagination ── */
.bc-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}
.bc-page-info { font-size: 13px; color: #64748b; white-space: nowrap; }
.bc-page-controls { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.bc-page-btn {
  min-width: 34px; height: 34px; padding: 0 8px;
  border-radius: 8px; border: 1px solid #e2e8f0;
  background: #fff; color: #374151; font-size: 13px; font-weight: 500;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, border-color 0.15s, color 0.15s; line-height: 1;
}
.bc-page-btn:hover:not(:disabled):not(.bc-page-btn--active) {
  background: #f8fafc; border-color: #c7d2fe; color: #5b50e1;
}
.bc-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.bc-page-btn--active { background: #5b50e1; border-color: #5b50e1; color: #fff; cursor: default; }
.bc-page-ellipsis { padding: 0 4px; color: #94a3b8; font-size: 13px; line-height: 34px; user-select: none; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .bc-header { flex-direction: column; }
  .bc-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
}
@media (max-width: 480px) {
  .bc-grid { grid-template-columns: 1fr; }
  .bc-card { padding: 18px 14px 14px; text-align: center; }
  .bc-card--popular { padding-top: 28px; }
  .bc-card-price { font-size: 22px; }
  .bc-card-name { font-size: 15px; }
  .bc-card-icon { margin-left: auto; margin-right: auto; }
  .bc-card-price-block { text-align:center;  margin-left: auto; margin-right: auto;}
}
@media (max-width: 360px) {
  .bc-grid { grid-template-columns: 1fr; }
}
@media (max-width: 400px) {
  .bc-pagination { justify-content: center; }
  .bc-page-info { width: 100%; text-align: center; }
  .bc-page-controls { justify-content: center; }
  .bc-page-btn { min-width: 30px; height: 30px; font-size: 12px; }
}
`;
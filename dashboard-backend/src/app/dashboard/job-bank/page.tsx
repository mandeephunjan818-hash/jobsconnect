'use client';

/**
 * src/app/dashboard/job-bank/page.tsx
 *
 * Job Bank dashboard — submit requests and see the 2 most recent.
 * Full list lives at /dashboard/job-bank/requests
 */

import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    JobBankRequestItem,
    RequestCard,
    EmptyState,
    WithdrawModal,
    JobBankStyles,
} from './_shared';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SITE_LABELS: Record<string, string> = {
    'jobs-connect.vercel.app': 'Jobs Connect',
    'new-jobs-fawn.vercel.app': 'New in Canada Jobs',
    'jobsrefugee.ca': 'Jobs for Refugees',
    'vulnerableyouthsjobs.ca': 'Vulnerable Youths Jobs',
    'accesscareers.ca': 'Access Careers',
    'indigenouspeoplesjobs.ca': 'Indigenous Peoples Jobs',
};
const KNOWN_SITES = Object.keys(SITE_LABELS);

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function JobBankDashboard() {
    const { data: session, status: sessionStatus } = useSession();

    // ── Requests list state ───────────────────────────────────
    const [requests, setRequests] = useState<JobBankRequestItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);

    // ── Submit form state ─────────────────────────────────────
    const [jobBankId, setJobBankId] = useState('');
    const [userNotes, setUserNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
    const [selectedSites, setSelectedSites] = useState<string[]>([]);
    const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
    const siteDropdownRef = useRef<HTMLDivElement>(null);

    const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
    const [availableCredits, setAvailableCredits] = useState<number | null>(null);
    const [checkingCredits, setCheckingCredits] = useState(true);

    // ── Withdraw state ────────────────────────────────────────
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
    const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);

    // ── Fetch — always fetch page 1, we only display 2 ───────
    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setListError(null);
        try {
            const res = await fetch('/api/job-bank-requests?page=1&perPage=2', { cache: 'no-store' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to load requests');
            setRequests(json.data);
            setTotal(json.total);
        } catch (err: any) {
            setListError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const checkCredits = useCallback(async () => {
        setCheckingCredits(true);
        try {
            const res = await fetch('/api/employer/credits/wallet', { cache: 'no-store' });
            const data = await res.json();
            const available = data.availableCredits ?? Math.max(
                (data.totalPurchased ?? 0) - (data.totalSpent ?? 0) - (data.totalExpired ?? 0),
                0
            );
            setAvailableCredits(available);
            if (available < 1) setShowNoCreditsModal(true);
        } catch {
            // Fail open — the server-side check in POST /api/job-bank-requests
            // is still the source of truth.
        } finally {
            setCheckingCredits(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user) {
            fetchRequests();
            checkCredits();
        }
    }, [session, fetchRequests, checkCredits]);

    useEffect(() => {
        if (session?.user) fetchRequests();
    }, [session, fetchRequests]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (siteDropdownRef.current && !siteDropdownRef.current.contains(e.target as Node)) {
                setSiteDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Submit ────────────────────────────────────────────────
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!jobBankId.trim()) return;

        if (availableCredits !== null && availableCredits < 1) {
            setShowNoCreditsModal(true);
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(null);

        try {
            const res = await fetch('/api/job-bank-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobBankId: jobBankId.trim(),
                    userNotes: userNotes.trim(),
                    sites: selectedSites,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Submission failed');

            setSubmitSuccess(
                `Request submitted! Job Bank ID "${jobBankId.trim()}" is now pending review. Your listing will go live within 24 hours.`,
            );
            setJobBankId('');
            setUserNotes('');
            setSelectedSites([]);
            await fetchRequests();
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

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

    // ── Guards ────────────────────────────────────────────────
    if (sessionStatus === 'loading') {
        return (
            <div className="jb-loading">
                <div className="jb-spinner" />
                <p>Loading…</p>
                <JobBankStyles />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="jb-gate">
                <div className="jb-gate__icon">🔒</div>
                <h2>Sign in to access Job Bank submissions</h2>
                <a href="/auth/signin" className="jb-btn jb-btn--primary">
                    Sign in
                </a>
                <JobBankStyles />
            </div>
        );
    }

    // Stats for header (from the 2 fetched items — lightweight indicators only)
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const fulfilledCount = requests.filter(r => r.status === 'fulfilled').length;

    return (
        <section className="jb">
            {/* ── Page header ── */}
            <div className="jb__header">
                <div className="jb__header-inner">
                    <div>
                        <div className="jb__header-eyebrow">Job Bank Canada</div>
                        <h1 className="jb__heading">Listing Requests</h1>
                        <p className="jb__subtext">
                            Submit a Job Bank ID and our team will create your listing within&nbsp;
                            <strong>24 hours</strong>.
                        </p>
                    </div>
                    <div className="jb__header-stats">
                        <div className="jb__stat">
                            <span className="jb__stat-value">{total}</span>
                            <span className="jb__stat-label">Total</span>
                        </div>
                        <div className="jb__stat">
                            <span className="jb__stat-value" style={{ color: '#fbbf24' }}>
                                {pendingCount}
                            </span>
                            <span className="jb__stat-label">Pending</span>
                        </div>
                        <div className="jb__stat">
                            <span className="jb__stat-value" style={{ color: '#34d399' }}>
                                {fulfilledCount}
                            </span>
                            <span className="jb__stat-label">Fulfilled</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="jb__body d-flex align-items-start justify-content-between flex-md-nowrap flex-wrap gap-4">
                {/* ── Left column: how it works + form ── */}
                <div>
                    {/* How it works */}
                    <div className="jb-how">
                        <div className="jb-how__step">
                            <div className="jb-how__num">1</div>
                            <div>
                                <strong>Submit your Job Bank ID</strong>
                                <p>Paste the ID from your Job Bank Canada posting below.</p>
                            </div>
                        </div>
                        <div className="jb-how__arrow">→</div>
                        <div className="jb-how__step">
                            <div className="jb-how__num">2</div>
                            <div>
                                <strong>Admin creates listing</strong>
                                <p>Our team fetches details and builds your listing.</p>
                            </div>
                        </div>
                        <div className="jb-how__arrow">→</div>
                        <div className="jb-how__step">
                            <div className="jb-how__num">3</div>
                            <div>
                                <strong>Goes live in 24 hrs</strong>
                                <p>Your listing is published across our partner sites.</p>
                            </div>
                        </div>
                    </div>

                    {/* Submit form */}
                    <div className="jb-form-card">
                        <div className="jb-form-card__header">
                            <span className="jb-form-card__icon">🏦</span>
                            <h2>Submit a Job Bank ID</h2>
                        </div>

                        {submitSuccess && (
                            <div className="jb-alert jb-alert--success">✅ {submitSuccess}</div>
                        )}
                        {submitError && (
                            <div className="jb-alert jb-alert--error">❌ {submitError}</div>
                        )}

                        <form onSubmit={handleSubmit} className="jb-form">
                            <div className="jb-form__row">
                                <div className="jb-form__group jb-form__group--main">
                                    <label className="jb-label" htmlFor="jobBankId">
                                        Job Bank Canada ID <span className="jb-label__req">*</span>
                                    </label>
                                    <div className="jb-input-wrap">
                                        <span className="jb-input-prefix">#</span>
                                        <input
                                            id="jobBankId"
                                            type="text"
                                            className="jb-input"
                                            placeholder="e.g. 3213456"
                                            value={jobBankId}
                                            onChange={e => setJobBankId(e.target.value)}
                                            required
                                            disabled={submitting}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="jb-form__group">
                                <label className="jb-label">
                                    Publish on sites{' '}
                                    <span className="jb-label__optional">(optional)</span>
                                </label>
                                <div className="jb-site-ms-wrap" ref={siteDropdownRef}>
                                    <button
                                        type="button"
                                        className="jb-site-ms-trigger"
                                        onClick={() => setSiteDropdownOpen(o => !o)}
                                    >
                                        <span>
                                            {selectedSites.length === 0
                                                ? 'Select sites to publish on…'
                                                : `${selectedSites.length} site${selectedSites.length > 1 ? 's' : ''} selected`}
                                        </span>
                                        <span className={`jb-site-ms-chevron${siteDropdownOpen ? ' open' : ''}`}>
                                            ▾
                                        </span>
                                    </button>

                                    {siteDropdownOpen && (
                                        <div className="jb-site-ms-dropdown">
                                            {KNOWN_SITES.map(site => {
                                                const checked = selectedSites.includes(site);
                                                return (
                                                    <label
                                                        key={site}
                                                        className={`jb-site-ms-option${checked ? ' jb-site-ms-option--active' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() =>
                                                                setSelectedSites(prev =>
                                                                    checked
                                                                        ? prev.filter(s => s !== site)
                                                                        : [...prev, site],
                                                                )
                                                            }
                                                            className="jb-site-ms-checkbox"
                                                        />
                                                        <span className="jb-site-ms-check">
                                                            {checked && '✓'}
                                                        </span>
                                                        <span className="jb-site-ms-label">
                                                            {SITE_LABELS[site]}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {selectedSites.length > 0 && (
                                    <div className="jb-site-ms-pills">
                                        {selectedSites.map(site => (
                                            <span key={site} className="jb-site-ms-pill">
                                                {SITE_LABELS[site]}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedSites(prev =>
                                                            prev.filter(s => s !== site),
                                                        )
                                                    }
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <p className="jb-hint">
                                    Leave empty and the admin will decide. Listings go live within 24 hours.
                                </p>
                            </div>

                            <div className="jb-form__group">
                                <label className="jb-label" htmlFor="userNotes">
                                    Notes <span className="jb-label__optional">(optional)</span>
                                </label>
                                <textarea
                                    id="userNotes"
                                    className="jb-input jb-textarea"
                                    placeholder="e.g. Preferred sites, urgency, special requirements…"
                                    rows={3}
                                    value={userNotes}
                                    onChange={e => setUserNotes(e.target.value)}
                                    disabled={submitting}
                                    maxLength={1000}
                                />
                                <p className="jb-hint">{userNotes.length}/1000 characters</p>
                            </div>

                            <div className="jb-form__footer">
                                <button
                                    type="submit"
                                    className="jb-btn jb-btn--primary jb-btn--lg"
                                    disabled={submitting || !jobBankId.trim() || (availableCredits !== null && availableCredits < 1)}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="jb-spinner jb-spinner--sm" />
                                            Submitting…
                                        </>
                                    ) : (
                                        '📤 Submit Request'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* ── Right column: 2 most recent requests ── */}
                <div className="jb-list-section" style={{ minWidth: "300px" }}>
                    <div className="jb-list-section__header">
                        <h2>Recent Requests</h2>
                        <Link href="/dashboard/job-bank/requests" className="jb-btn jb-btn--ghost">
                            View all →
                        </Link>
                    </div>

                    {listError && (
                        <div className="jb-alert jb-alert--error">
                            ❌ {listError}
                            <button className="jb-btn jb-btn--ghost ms-2" onClick={fetchRequests}>
                                Retry
                            </button>
                        </div>
                    )}

                    {confirmWithdrawId && (
                        <WithdrawModal
                            onConfirm={() => handleWithdraw(confirmWithdrawId)}
                            onCancel={() => setConfirmWithdrawId(null)}
                        />
                    )}

                    {loading ? (
                        <div className="jb-skeleton-list">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="jb-card jb-card--skeleton">
                                    <div className="jb-skel" style={{ height: 16, width: '40%', borderRadius: 6 }} />
                                    <div className="jb-skel" style={{ height: 12, width: '60%', borderRadius: 6, marginTop: 8 }} />
                                    <div className="jb-skel" style={{ height: 12, width: '30%', borderRadius: 6, marginTop: 8 }} />
                                </div>
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <EmptyState hasFilters={false} onClear={() => { }} />
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

                            {total > 2 && (
                                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                    <Link
                                        href="/dashboard/job-bank/requests"
                                        className="jb-btn jb-btn--secondary"
                                    >
                                        View all {total} requests →
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <JobBankStyles />
            {showNoCreditsModal && (
                <div className="jb-modal-overlay" onClick={() => setShowNoCreditsModal(false)}>
                    <div className="jb-modal" onClick={e => e.stopPropagation()}>
                        <h3>⚠️ No credits available</h3>
                        <p>
                            You need at least 1 credit to submit a Job Bank request, and your account currently has{' '}
                            <strong>{availableCredits ?? 0}</strong> available. Buy a credit bundle to continue.
                        </p>
                        <div className="jb-modal__actions">
                            <button className="jb-btn jb-btn--secondary" onClick={() => setShowNoCreditsModal(false)}>
                                Cancel
                            </button>
                            <a href="/dashboard/wallet-payments/credits" className="jb-btn jb-btn--primary">
                                Buy credits
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
// ─────────────────────────────────────────────────────────────
// src/app/dashboard/job-bank/_shared.tsx
// Shared types, config, and components used by both pages.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type RequestStatus = 'pending' | 'processing' | 'fulfilled' | 'rejected' | 'duplicate';

export interface JobBankRequestItem {
    id: string;
    jobBankId: string;
    userNotes?: string;
    status: RequestStatus;
    listingId?: string | null;
    listingCollection?: 'Listing' | 'ListingDraft' | null;
    adminNote?: string | null;
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
    RequestStatus,
    { label: string; color: string; bg: string; border: string; icon: string; description: string }
> = {
    pending: {
        label: 'Pending',
        color: '#92400e',
        bg: '#fef3c7',
        border: '#fcd34d',
        icon: '⏳',
        description: 'Awaiting admin review',
    },
    processing: {
        label: 'Processing',
        color: '#1e40af',
        bg: '#dbeafe',
        border: '#93c5fd',
        icon: '⚙️',
        description: 'Admin is creating your listing',
    },
    fulfilled: {
        label: 'Fulfilled',
        color: '#065f46',
        bg: '#d1fae5',
        border: '#6ee7b7',
        icon: '✅',
        description: 'Listing created — goes live within 24 hrs',
    },
    rejected: {
        label: 'Rejected',
        color: '#991b1b',
        bg: '#fee2e2',
        border: '#fca5a5',
        icon: '❌',
        description: 'Request was rejected',
    },
    duplicate: {
        label: 'Duplicate',
        color: '#6b21a8',
        bg: '#f3e8ff',
        border: '#d8b4fe',
        icon: '⚠️',
        description: 'This Job Bank ID already exists',
    },
};

export const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All statuses' },
    ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

// ─────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: RequestStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.65rem',
                borderRadius: 20,
                fontSize: '0.72rem',
                fontWeight: 700,
                background: cfg.bg,
                color: cfg.color,
                border: `1.5px solid ${cfg.border}`,
                whiteSpace: 'nowrap',
                fontFamily: 'var(--jb-mono)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
            }}
        >
            {cfg.icon} {cfg.label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────
// RequestCard
// ─────────────────────────────────────────────────────────────

export function RequestCard({
    item,
    onWithdraw,
    withdrawing,
}: {
    item: JobBankRequestItem;
    onWithdraw: (id: string) => void;
    withdrawing: boolean;
}) {
    const cfg = STATUS_CONFIG[item.status];
    const canWithdraw = item.status === 'pending';

    const [listingSlug, setListingSlug] = useState<string | null>(null);
    const [fetchingSlug, setFetchingSlug] = useState(false);

    useEffect(() => {
        if (item.status === 'fulfilled' && item.jobBankId) {
            setFetchingSlug(true);
            fetch(`/api/listings?jobId=${encodeURIComponent(item.jobBankId)}&perPage=1`)
                .then(res => res.json())
                .then(data => {
                    setListingSlug(data.data?.length > 0 ? data.data[0].slug : null);
                })
                .catch(() => setListingSlug(null))
                .finally(() => setFetchingSlug(false));
        }
    }, [item.status, item.jobBankId]);

    return (
        <div className="jb-card" style={{ borderLeftColor: cfg.border }}>
            <div className="jb-card__top">
                <div className="jb-card__id-wrap">
                    <span className="jb-card__id-label">Job Bank ID</span>
                    <span className="jb-card__id-value">{item.jobBankId}</span>
                </div>
                <StatusBadge status={item.status} />
            </div>

            <p className="jb-card__status-desc">{cfg.description}</p>

            {item.userNotes && (
                <div className="jb-card__notes">
                    <span className="jb-card__notes-label">Your notes</span>
                    <p className="jb-card__notes-text">{item.userNotes}</p>
                </div>
            )}

            {item.adminNote && (
                <div className="jb-card__admin-note">
                    <span className="jb-card__admin-note-label">📋 Admin note</span>
                    <p className="jb-card__admin-note-text">{item.adminNote}</p>
                </div>
            )}

            {item.status === 'fulfilled' && (
                <div className="jb-card__listing-link">
                    <span>🎉 Listing created</span>
                    {fetchingSlug ? (
                        <span className="jb-link jb-link--loading">Loading link…</span>
                    ) : listingSlug ? (
                        <a
                            href={`/jobs/${listingSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jb-link"
                        >
                            View listing →
                        </a>
                    ) : (
                        <span className="jb-link jb-link--missing">
                            {/* Link unavailable */}
                        </span>
                    )}
                </div>
            )}

            <div className="jb-card__footer">
                <span className="jb-card__time" title={new Date(item.createdAt).toLocaleString()}>
                    Submitted {timeAgo(item.createdAt)}
                </span>
                {canWithdraw && (
                    <button
                        className="jb-btn jb-btn--danger-ghost"
                        onClick={() => onWithdraw(item.id)}
                        disabled={withdrawing}
                    >
                        {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────

export function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
    return (
        <div className="jb-empty">
            <div className="jb-empty__icon">📭</div>
            <h3 className="jb-empty__title">
                {hasFilters ? 'No requests match your filters' : 'No requests yet'}
            </h3>
            <p className="jb-empty__body">
                {hasFilters
                    ? 'Try clearing your filters to see all requests.'
                    : 'Submit a Job Bank Canada ID and our team will create your listing within 24 hours.'}
            </p>
            {hasFilters && (
                <button className="jb-btn jb-btn--secondary" onClick={onClear}>
                    Clear filters
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// WithdrawModal
// ─────────────────────────────────────────────────────────────

export function WithdrawModal({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="jb-modal-overlay" onClick={onCancel}>
            <div className="jb-modal" onClick={e => e.stopPropagation()}>
                <h3>Withdraw request?</h3>
                <p>This will remove your pending request. You can submit it again later.</p>
                <div className="jb-modal__actions">
                    <button className="jb-btn jb-btn--secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="jb-btn jb-btn--danger" onClick={onConfirm}>
                        Withdraw
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Shared styles (used by both pages via <JobBankStyles />)
// ─────────────────────────────────────────────────────────────

export function JobBankStyles() {
    return (
        <style jsx global>{`
      :root {
        --jb-bg:       #f0f4f8;
        --jb-surface:  #ffffff;
        --jb-border:   #e2e8f0;
        --jb-accent:   #5b50e1;
        --jb-accent-l: #7c4dff;
        --jb-danger:   #dc2626;
        --jb-text:     #0f172a;
        --jb-muted:    #64748b;
        --jb-radius:   14px;
        --jb-shadow:   0 1px 3px rgba(0,0,0,.07), 0 4px 16px rgba(0,0,0,.05);
        --jb-mono:     'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
      }

      .jb { min-height: 100vh; padding-bottom: 4rem;padding-top: 1rem; }

      /* ── Header ── */
      .jb__header {
        background: #5b50e1;
        padding: 2.5rem 1.5rem 2rem; color: #fff; border-radius: 1rem;
      }
      .jb__header-inner {
        max-width: 900px; margin: 0 auto;
        display: flex; justify-content: space-between; align-items: flex-end;
        gap: 1.5rem; flex-wrap: wrap;
      }
      .jb__header-eyebrow {
        font-size: .72rem; font-weight: 700; letter-spacing: .12em;
        text-transform: uppercase; color: rgba(255,255,255,.55); margin-bottom: .4rem;
      }
      .jb__heading {
        font-size: clamp(1.7rem, 4vw, 2.4rem); font-weight: 800; margin: 0; color: #fff;
        letter-spacing: -1px;
      }
      .jb__subtext { font-size: .92rem; color: rgba(255,255,255,.7); margin: .4rem 0 0; }
      .jb__header-stats {
        display: flex; gap: 1.5rem; background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.15); border-radius: 12px; padding: .75rem 1.25rem;
      }
      .jb__stat { display: flex; flex-direction: column; align-items: center; gap: .15rem; }
      .jb__stat-value { font-size: 1.5rem; font-weight: 800; color: #fff; line-height: 1; }
      .jb__stat-label { font-size: .68rem; color: rgba(255,255,255,.55); text-transform: uppercase; letter-spacing: .06em; }

      /* ── Body ── */
      .jb__body { margin: 0 auto; padding: 2rem 0; }

      /* ── How it works ── */
      .jb-how {
        display: flex; align-items: flex-start; gap: .75rem; flex-wrap: wrap;
        background: var(--jb-surface); border-radius: var(--jb-radius);
        padding: 1.25rem 1.5rem; margin-bottom: 1.75rem;
        box-shadow: var(--jb-shadow); border: 1.5px solid var(--jb-border);
      }
      .jb-how__step { display: flex; align-items: flex-start; gap: .75rem; flex: 1; min-width: 160px; }
      .jb-how__num {
        width: 28px; height: 28px; border-radius: 50%; background: var(--jb-accent); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: .8rem; font-weight: 800; flex-shrink: 0; margin-top: .1rem;
      }
      .jb-how__step strong { font-size: .88rem; color: var(--jb-text); display: block; margin-bottom: .2rem; }
      .jb-how__step p { font-size: .78rem; color: var(--jb-muted); margin: 0; }
      .jb-how__arrow { font-size: 1.2rem; color: var(--jb-muted); align-self: center; flex-shrink: 0; }

      /* ── Form card ── */
      .jb-form-card {
        background: var(--jb-surface); border-radius: var(--jb-radius);
        box-shadow: var(--jb-shadow); border: 1.5px solid var(--jb-border);
        padding: 1.75rem; margin-bottom: 2rem;
      }
      .jb-form-card__header {
        display: flex; align-items: center; gap: .6rem; margin-bottom: 1.25rem;
        padding-bottom: .9rem; border-bottom: 1.5px solid var(--jb-border);
      }
      .jb-form-card__icon { font-size: 1.4rem; }
      .jb-form-card__header h2 { font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--jb-text); }

      /* ── Form elements ── */
      .jb-form { display: flex; flex-direction: column; gap: 1.1rem; }
      .jb-form__row { display: flex; gap: 1rem; flex-wrap: wrap; }
      .jb-form__group { display: flex; flex-direction: column; gap: .35rem; flex: 1; }
      .jb-form__group--main { flex: 1; min-width: 220px; }
      .jb-label { font-size: .83rem; font-weight: 400; color: var(--jb-text); }
      .jb-label__req { color: var(--jb-danger); margin-left: .15rem; }
      .jb-label__optional { color: var(--jb-muted); font-weight: 400; font-size: .78rem; margin-left: .25rem; }
      .jb-input-wrap { display: flex; align-items: stretch; }
      .jb-input-prefix {
        display: flex; align-items: center; padding: 0 .75rem;
        background: #f1f5f9; border: 1.5px solid var(--jb-border);
        border-right: none; border-radius: 9px 0 0 9px;
        font-size: .9rem; color: var(--jb-muted); font-family: var(--jb-mono); font-weight: 700;
      }
      .jb-input {
        width: 100%; padding: .6rem .85rem;
        border: 1.5px solid var(--jb-border); border-radius: 9px;
        font-size: .9rem; background: #f8fafd; color: var(--jb-text);
        transition: border-color .15s, box-shadow .15s;
        outline: none; font-family: inherit;
      }
      .jb-input-wrap .jb-input { border-radius: 0 9px 9px 0; }
      .jb-input:focus { border-color: var(--jb-accent); box-shadow: 0 0 0 3px rgba(15,76,129,.12); background: #fff; }
      .jb-input:disabled { opacity: .6; cursor: not-allowed; }
      .jb-textarea { resize: vertical; min-height: 80px; }
      .jb-hint { font-size: .77rem; color: var(--jb-muted); margin: 0; }
      .jb-code {
        display: inline-block; background: #f1f5f9; border: 1px solid var(--jb-border);
        border-radius: 4px; padding: .1rem .45rem; font-family: var(--jb-mono);
        font-size: .72rem; color: var(--jb-accent); margin-left: .35rem;
      }
      .jb-form__footer { display: flex; justify-content: flex-end; padding-top: .5rem; }

      /* ── Buttons ── */
      .jb-btn {
        display: inline-flex; align-items: center; gap: .4rem;
        padding: .5rem 1.1rem; border-radius: 9px;
        font-weight: 400; font-size: .88rem; border: 2px solid transparent;
        cursor: pointer; transition: all .15s; text-decoration: none; white-space: nowrap;
      }
      .jb-btn--primary { background: var(--jb-accent); color: #fff; border-color: var(--jb-accent); }
      .jb-btn--primary:hover:not(:disabled) { background: var(--jb-accent-l); }
      .jb-btn--secondary { background: transparent; color: var(--jb-text); border-color: var(--jb-border); }
      .jb-btn--secondary:hover:not(:disabled) { background: #f1f5f9; }
      .jb-btn--danger { background: var(--jb-danger); color: #fff; border-color: var(--jb-danger); }
      .jb-btn--danger:hover:not(:disabled) { background: #b91c1c; }
      .jb-btn--danger-ghost { background: transparent; color: var(--jb-danger); border-color: #fca5a5; font-size: .8rem; padding: .3rem .7rem; }
      .jb-btn--danger-ghost:hover:not(:disabled) { background: #fee2e2; }
      .jb-btn--ghost { background: none; border: none; color: var(--jb-accent); padding: .25rem .5rem; font-size: .85rem; }
      .jb-btn--lg { padding: .7rem 1.6rem; font-size: .95rem; }
      .jb-btn--icon { padding: .4rem .7rem; min-width: 36px; justify-content: center; }
      .jb-btn:disabled { opacity: .5; cursor: not-allowed; }

      /* ── Alerts ── */
      .jb-alert {
        display: flex; align-items: flex-start; gap: .5rem;
        padding: .85rem 1.1rem; border-radius: 10px;
        font-size: .88rem; font-weight: 500; margin-bottom: 1rem;
      }
      .jb-alert--success { background: #ecfdf5; color: #065f46; border: 1.5px solid #a7f3d0; }
      .jb-alert--error   { background: #fef2f2; color: #991b1b; border: 1.5px solid #fca5a5; }

      /* ── List section ── */
      .jb-list-section__header {
        display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem;
      }
      .jb-list-section__header h2 { font-size: 1.1rem; font-weight: 700; margin: 0; }
      .jb-count {
        font-size: .75rem; font-weight: 700; background: #f1f5f9;
        color: var(--jb-muted); padding: .15rem .55rem; border-radius: 20px;
        border: 1px solid var(--jb-border);
      }

      /* ── Filters ── */
      .jb-filters { display: flex; flex-direction: column; gap: .75rem; margin-bottom: 1.25rem; }
      .jb-filter-input-wrap {
        display: flex; align-items: center; gap: .5rem;
        background: var(--jb-surface); border: 1.5px solid var(--jb-border);
        border-radius: 9px; padding: .5rem .85rem; transition: border-color .15s;
      }
      .jb-filter-input-wrap:focus-within { border-color: var(--jb-accent); }
      .jb-filter-icon { font-size: .88rem; flex-shrink: 0; }
      .jb-filter-input { border: none; outline: none; background: transparent; font-size: .88rem; flex: 1; color: var(--jb-text); }
      .jb-filter-pills { display: flex; flex-wrap: wrap; gap: .4rem; }
      .jb-pill {
        padding: .25rem .75rem; border-radius: 20px; font-size: .75rem; font-weight: 400;
        border: 1.5px solid var(--jb-border); background: var(--jb-surface); color: var(--jb-muted);
        cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: .35rem;
      }
      .jb-pill:hover { border-color: var(--jb-accent); color: var(--jb-accent); }
      .jb-pill--active { background: var(--jb-accent); color: #fff; border-color: var(--jb-accent); }
      .jb-pill__count {
        background: rgba(255,255,255,.25); color: inherit; border-radius: 10px;
        padding: 0 .4rem; font-size: .68rem;
      }
      .jb-pill--active .jb-pill__count { background: rgba(255,255,255,.3); }

      /* ── Cards ── */
      .jb-cards { display: flex; flex-direction: column; gap: 1rem; }
      .jb-card {
        background: var(--jb-surface); border-radius: var(--jb-radius);
        box-shadow: var(--jb-shadow); border: 1.5px solid var(--jb-border);
        padding: 1.1rem 1.25rem; display: flex; flex-direction: column; gap: .65rem;
        transition: box-shadow .2s;
      }
      .jb-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.1); }
      .jb-card--skeleton { opacity: .6; }
      .jb-skel {
        background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
        background-size: 200% 100%; animation: jb-shimmer 1.4s infinite;
      }
      @keyframes jb-shimmer { to { background-position: -200% 0; } }

      .jb-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: .75rem; flex-wrap: wrap; }
      .jb-card__id-wrap { display: flex; flex-direction: column; gap: .15rem; }
      .jb-card__id-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--jb-muted); }
      .jb-card__id-value { font-size: 1.1rem; font-weight: 800; color: var(--jb-text); font-family: var(--jb-mono); }
      .jb-card__status-desc { font-size: .8rem; color: var(--jb-muted); margin: 0; }

      .jb-card__notes { background: #f8fafd; border: 1px solid var(--jb-border); border-radius: 8px; padding: .6rem .85rem; }
      .jb-card__notes-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--jb-muted); display: block; margin-bottom: .25rem; }
      .jb-card__notes-text { font-size: .83rem; color: var(--jb-text); margin: 0; }

      .jb-card__admin-note { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: .6rem .85rem; }
      .jb-card__admin-note-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #92400e; display: block; margin-bottom: .25rem; }
      .jb-card__admin-note-text { font-size: .83rem; color: #78350f; margin: 0; }

      .jb-card__listing-link {
        display: flex; align-items: center; gap: .5rem; font-size: .83rem;
        padding: .5rem .85rem; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;
        color: #065f46;
      }
      .jb-link { color: var(--jb-accent); font-weight: 400; text-decoration: none; }
      .jb-link:hover { text-decoration: underline; }

      .jb-card__footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; margin-top: .25rem; padding-top: .5rem; border-top: 1px solid var(--jb-border); }
      .jb-card__time { font-size: .75rem; color: var(--jb-muted); }

      /* ── Empty state ── */
      .jb-empty { text-align: center; padding: 3.5rem 2rem; color: var(--jb-muted); }
      .jb-empty__icon { font-size: 3.5rem; margin-bottom: 1rem; }
      .jb-empty__title { font-size: 1.15rem; font-weight: 700; color: var(--jb-text); margin: 0 0 .5rem; }
      .jb-empty__body { font-size: .88rem; margin: 0 0 1.25rem; max-width: 400px; margin-left: auto; margin-right: auto; }

      /* ── Pagination ── */
      .jb-pagination { display: flex; align-items: center; justify-content: center; gap: .4rem; margin-top: 1.5rem; flex-wrap: wrap; }
      .jb-pagination__info { font-size: .78rem; color: var(--jb-muted); margin-left: .5rem; }

      /* ── Loading & gate ── */
      .jb-loading, .jb-gate { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 1rem; text-align: center; color: var(--jb-muted); }
      .jb-gate__icon { font-size: 3rem; }
      .jb-gate h2 { color: var(--jb-text); font-size: 1.3rem; }

      /* ── Modal ── */
      .jb-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
      .jb-modal { background: #fff; border-radius: 14px; padding: 1.75rem; max-width: 380px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
      .jb-modal h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 .5rem; }
      .jb-modal p { font-size: .88rem; color: var(--jb-muted); margin: 0 0 1.25rem; }
      .jb-modal__actions { display: flex; gap: .75rem; justify-content: flex-end; }

      /* ── Spinner ── */
      .jb-spinner { display: inline-block; width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: jb-spin .7s linear infinite; }
      .jb-spinner--sm { width: 14px; height: 14px; border-width: 2px; }
      @keyframes jb-spin { to { transform: rotate(360deg); } }

      /* ── Site multi-select ── */
      .jb-site-ms-wrap { position: relative; }
      .jb-site-ms-trigger {
        width: 100%; display: flex; align-items: center; justify-content: space-between;
        padding: .6rem .85rem; border-radius: 9px;
        border: 1.5px solid var(--jb-border); background: #f8fafd;
        font-size: .9rem; color: var(--jb-text); cursor: pointer;
        transition: all .15s; text-align: left; font-family: inherit;
      }
      .jb-site-ms-trigger:hover { border-color: var(--jb-accent); background: #fff; }
      .jb-site-ms-chevron { font-size: .85rem; color: var(--jb-muted); transition: transform .2s; display: inline-block; }
      .jb-site-ms-chevron.open { transform: rotate(180deg); }
      .jb-site-ms-dropdown {
        position: absolute; top: calc(100% + 5px); left: 0; right: 0; z-index: 50;
        background: #fff; border: 1.5px solid var(--jb-border); border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,.1); overflow: hidden;
      }
      .jb-site-ms-option {
        display: flex; align-items: center; gap: .65rem;
        padding: .65rem 1rem; cursor: pointer; transition: background .12s;
      }
      .jb-site-ms-option:hover { background: #f4f7ff; }
      .jb-site-ms-option--active { background: #eff6ff; }
      .jb-site-ms-checkbox { display: none; }
      .jb-site-ms-check {
        width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
        border: 1.5px solid var(--jb-border); background: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: .7rem; color: #fff; transition: all .15s;
      }
      .jb-site-ms-option--active .jb-site-ms-check { background: var(--jb-accent); border-color: var(--jb-accent); }
      .jb-site-ms-label { font-size: .88rem; font-weight: 500; color: var(--jb-text); }
      .jb-site-ms-pills { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .5rem; }
      .jb-site-ms-pill {
        display: inline-flex; align-items: center; gap: .35rem;
        background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;
        border-radius: 20px; font-size: .78rem; font-weight: 400; padding: .22rem .65rem;
      }
      .jb-site-ms-pill button { background: none; border: none; color: #93c5fd; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0; }
      .jb-site-ms-pill button:hover { color: #1d4ed8; }

      @media (max-width: 640px) {
        .jb__header { padding: 1.75rem 1rem 1.5rem; }
        .jb__body { padding: 1.25rem 0; }
        .jb-how { flex-direction: column; gap: 1rem; }
        .jb-how__arrow { display: none; }
        .jb__header-stats { display: none; }
      }
    `}</style>
    );
}
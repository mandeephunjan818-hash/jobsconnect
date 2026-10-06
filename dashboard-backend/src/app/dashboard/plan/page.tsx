'use client';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    useState, useEffect, useMemo, useCallback,
    useRef, Suspense, type ReactNode,
} from 'react';
import {
    BriefcaseBusiness, Users, Pencil, Wand2, Eye,
    CreditCard, Sparkles, Flag, Rocket, Gem,
    CheckCircle2, XCircle, AlertTriangle, Info,
    ArrowUpRight, CalendarClock, Loader2, ArrowLeftRight,
    Receipt, RefreshCw, ChevronRight, ShieldCheck,
    Wallet, X, ExternalLink, TrendingUp, Activity,
    Package, FileText, ToggleLeft, ToggleRight, Bell, BellOff,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
    _id: string; key: string; name: string; price: number;
    listingQuota: number; applicantLimit: number;
    manualPostLimit: number; autoPostLimit: number;
    jobBankRequestLimit?: number;
    postVisibilityDays: number; stripePriceId?: string; isActive: boolean;
}

interface UsageData {
    listingsUsed: number; manualPostsUsed: number; autoPostsUsed: number;
    jobBankRequestsUsed: number; applicantsUsed: number;
    periodStart?: string; periodEnd?: string;
}

interface UsageEvent {
    _id: string; resourceType: string; change: number;
    metadata?: Record<string, any>; timestamp: string;
}

interface BillingEvent {
    _id: string; eventType: 'invoice' | 'plan_change' | 'cancellation';
    amountPaid: number; currency: string;
    status?: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
    previousPlanKey?: string; newPlanKey?: string;
    periodStart?: string; periodEnd?: string;
    createdAt: string; invoiceUrl?: string;
}

interface PaymentMethodInfo {
    brand: string; last4: string; expMonth: number; expYear: number;
}

interface UpcomingInvoiceInfo {
    amountDue: number; currency: string; nextPaymentAttempt: number | null;
}

type PlanMetricKey =
    | 'listingQuota' | 'applicantLimit' | 'manualPostLimit'
    | 'autoPostLimit' | 'jobBankRequestLimit' | 'postVisibilityDays';
type NoticeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// ─── Constants ────────────────────────────────────────────────────────────────
const FREE_PLAN: Plan = {
    _id: 'free', key: 'free', name: 'Free', price: 0,
    listingQuota: 1, applicantLimit: 0, manualPostLimit: 0,
    autoPostLimit: 0, jobBankRequestLimit: 0, postVisibilityDays: 30, isActive: true,
};

const METRICS: { key: PlanMetricKey; label: string; icon: ReactNode; unit?: string }[] = [
    { key: 'listingQuota', label: 'Listings', icon: <BriefcaseBusiness size={13} /> },
    { key: 'applicantLimit', label: 'Applicants', icon: <Users size={13} /> },
    { key: 'manualPostLimit', label: 'Manual', icon: <Pencil size={13} /> },
    { key: 'autoPostLimit', label: 'Auto Post', icon: <Wand2 size={13} /> },
    { key: 'jobBankRequestLimit', label: 'Job Bank', icon: <Package size={13} /> },
    { key: 'postVisibilityDays', label: 'Visibility', icon: <Eye size={13} />, unit: 'd' },
];

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
    active: { color: '#1ba672', bg: 'rgba(27,166,114,0.12)', label: 'Active' },
    trialing: { color: '#5b5fef', bg: 'rgba(91,95,239,0.12)', label: 'Trial' },
    past_due: { color: '#c2780c', bg: 'rgba(194,120,12,0.12)', label: 'Payment due' },
    canceled: { color: '#94a3b8', bg: 'rgba(148,163,184,0.14)', label: 'Canceled' },
};

const RESOURCE_LABELS: Record<string, string> = {
    listing: 'Listing created', manual_post: 'Manual post', auto_post: 'Auto post',
    job_bank_request: 'Job bank request', applicant: 'Applicant received',
};

const RESOURCE_ICONS: Record<string, ReactNode> = {
    listing: <BriefcaseBusiness size={13} />, manual_post: <Pencil size={13} />,
    auto_post: <Wand2 size={13} />, job_bank_request: <Package size={13} />,
    applicant: <Users size={13} />,
};

const TIER_ICONS = [Flag, Rocket, Sparkles, Gem];
const TIER_COLORS = ['#5b5fef', '#0ea5b7', '#c2780c', '#1ba672'];
const CARD_BRAND_LABEL: Record<string, string> = {
    visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex',
    discover: 'Discover', diners: 'Diners', jcb: 'JCB', unionpay: 'UnionPay',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(cents: number) {
    return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`;
}
function formatMoney(cents: number, currency = 'usd') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: currency.toUpperCase(),
    }).format(cents / 100);
}
function toDate(val: unknown): Date | null {
    if (!val) return null;
    const d = new Date(String(val));
    return isNaN(d.getTime()) ? null : d;
}
function shortDate(d: Date | null) {
    if (!d) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function shortDateTime(s: string) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function usePeriodCountdown(start: Date | null, end: Date | null) {
    const endTime = end ? end.getTime() : null;
    const startTime = start ? start.getTime() : null;

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!endTime) return;
        setNow(Date.now()); // resync immediately when the period changes
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [endTime]); // ← primitive number, not a Date object reference

    if (!endTime) return null;
    const totalMs = startTime ? endTime - startTime : null;
    const remainMs = endTime - now;
    const expired = remainMs <= 0;
    const clamped = Math.max(0, remainMs);
    const days = Math.floor(clamped / 86_400_000);
    const hours = Math.floor((clamped / 3_600_000) % 24);
    const minutes = Math.floor((clamped / 60_000) % 60);
    const seconds = Math.floor((clamped / 1000) % 60);
    const pctElapsed = totalMs && totalMs > 0
        ? Math.min(100, Math.max(0, ((totalMs - clamped) / totalMs) * 100))
        : 0;
    return { days, hours, minutes, seconds, expired, pctElapsed };
}

// ─── Small components ─────────────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="bp-shell">
            <div className="bp-skel bp-skel-top" />
            <div className="bp-layout">
                <div className="bp-main">
                    <div className="bp-skel" style={{ height: 280, borderRadius: 24 }} />
                    <div className="bp-skel" style={{ height: 200, borderRadius: 20, marginTop: 20 }} />
                </div>
                <div className="bp-side">
                    <div className="bp-skel" style={{ height: 420, borderRadius: 20 }} />
                </div>
            </div>
        </div>
    );
}

function Notice({ tone, icon, onDismiss, action, children }: {
    tone: NoticeTone; icon: ReactNode; onDismiss?: () => void;
    action?: ReactNode; children: ReactNode;
}) {
    return (
        <div className={`bp-notice bp-notice--${tone}`}>
            <span className="bp-notice-icon">{icon}</span>
            <div className="bp-notice-text">{children}</div>
            {action}
            {onDismiss && (
                <button className="bp-notice-close" onClick={onDismiss} aria-label="Dismiss">
                    <X size={13} />
                </button>
            )}
        </div>
    );
}

function StatusDot({ status }: { status: string }) {
    const cfg = STATUS_CFG[status] ?? STATUS_CFG.active;
    return (
        <span className="bp-status" style={{ background: cfg.bg, color: cfg.color }}>
            <span className="bp-status-dot" style={{ background: cfg.color }} />
            {cfg.label}
        </span>
    );
}

function PeriodOrbit({
    countdown, color, size = 168,
}: {
    countdown: ReturnType<typeof usePeriodCountdown>;
    color: string; size?: number;
}) {
    const stroke = 8;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = countdown?.pctElapsed ?? 0;
    const offset = c - (pct / 100) * c;

    return (
        <div className="bp-orbit" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bp-orbit-svg">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke="rgba(15,23,42,0.06)" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    className="bp-orbit-progress"
                />
            </svg>
            <div className="bp-orbit-center">
                {countdown && !countdown.expired ? (
                    <>
                        <span className="bp-orbit-num">{countdown.days}</span>
                        <span className="bp-orbit-unit">days left</span>
                    </>
                ) : countdown?.expired ? (
                    <span className="bp-orbit-expired">Renewing…</span>
                ) : (
                    <span className="bp-orbit-unit" style={{ textAlign: 'center', padding: '0 12px' }}>
                        No active<br />billing cycle
                    </span>
                )}
            </div>
        </div>
    );
}

function FlipDigit({ value, label }: { value: number; label: string }) {
    const padded = String(value).padStart(2, '0');
    const [digits, setDigits] = useState(padded);
    const prevRef = useRef(padded);
    const [flipping, setFlipping] = useState(false);

    useEffect(() => {
        if (prevRef.current !== padded) {
            setFlipping(true);
            const t = setTimeout(() => {
                setDigits(padded);
                setFlipping(false);
                prevRef.current = padded;
            }, 180);
            return () => clearTimeout(t);
        }
    }, [padded]);

    return (
        <div className="bp-flip">
            <div className={`bp-flip-card ${flipping ? 'bp-flip-card--flipping' : ''}`}>
                <span>{digits}</span>
            </div>
            <span className="bp-flip-label">{label}</span>
        </div>
    );
}

function CountdownStrip({ countdown }: { countdown: ReturnType<typeof usePeriodCountdown> }) {
    if (!countdown || countdown.expired) return null;
    return (
        <div className="bp-flip-row">
            <FlipDigit value={countdown.days} label="days" />
            <span className="bp-flip-colon">:</span>
            <FlipDigit value={countdown.hours} label="hrs" />
            <span className="bp-flip-colon">:</span>
            <FlipDigit value={countdown.minutes} label="min" />
            <span className="bp-flip-colon">:</span>
            <FlipDigit value={countdown.seconds} label="sec" />
        </div>
    );
}

function UsageRow({
    metric, used, limit, color,
}: { metric: typeof METRICS[number]; used: number | null; limit: number; color: string }) {
    const hasUsage = used !== null;
    const pct = hasUsage && limit > 0 ? Math.min(100, (used / limit) * 100) : hasUsage ? 0 : null;
    const barColor = pct === null ? color : pct >= 90 ? '#ef4444' : pct >= 70 ? '#c2780c' : color;
    return (
        <div className="bp-usage-row">
            <div className="bp-usage-row-head">
                <span className="bp-usage-icon" style={{ color }}>{metric.icon}</span>
                <span className="bp-usage-label">{metric.label}</span>
                <span className="bp-usage-value">
                    {hasUsage
                        ? `${used} / ${limit === 0 ? '0' : limit}${metric.unit ?? ''}`
                        : `${limit}${metric.unit ?? ''}`}
                </span>
            </div>
            {pct !== null && (
                <div className="bp-bar">
                    <div className="bp-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                </div>
            )}
        </div>
    );
}

// ─── Usage History Panel ──────────────────────────────────────────────────────
function UsageHistoryPanel() {
    const [events, setEvents] = useState<UsageEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchEvents = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const r = await fetch(`/api/subscription/usage-history?page=${p}&perPage=15`);
            const d = await r.json();
            setEvents(d.events ?? []);
            setTotalPages(d.totalPages ?? 1);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEvents(page); }, [fetchEvents, page]);

    return (
        <div className="bp-side-card bp-usage-hist-card">
            <div className="bp-side-card-head">
                <Activity size={14} /> <span>Resource Usage History</span>
            </div>
            {loading ? (
                <div className="bp-side-loading"><Loader2 size={16} className="bp-spin" /></div>
            ) : events.length === 0 ? (
                <p className="bp-side-empty">
                    No usage events yet — resources you consume will appear here.
                </p>
            ) : (
                <>
                    <div className="bp-uhist-list">
                        {events.map((ev) => (
                            <div key={ev._id} className="bp-uhist-row">
                                <span className="bp-uhist-icon">
                                    {RESOURCE_ICONS[ev.resourceType] ?? <FileText size={13} />}
                                </span>
                                <div className="bp-uhist-body">
                                    <span className="bp-uhist-label">
                                        {RESOURCE_LABELS[ev.resourceType] ?? ev.resourceType}
                                    </span>
                                    <span className="bp-uhist-meta">
                                        {shortDateTime(ev.timestamp)}
                                        {ev.metadata?.listingId && (
                                            <span className="bp-uhist-id"> · #{String(ev.metadata.listingId).slice(-6)}</span>
                                        )}
                                    </span>
                                </div>
                                <span className={`bp-uhist-change ${ev.change > 0 ? 'up' : 'down'}`}>
                                    {ev.change > 0 ? `+${ev.change}` : ev.change}
                                </span>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="bp-uhist-pager">
                            <button
                                className="bp-btn bp-btn-ghost bp-btn-sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                Prev
                            </button>
                            <span className="bp-uhist-page">{page} / {totalPages}</span>
                            <button
                                className="bp-btn bp-btn-ghost bp-btn-sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Auto-billing toggle ──────────────────────────────────────────────────────
// FIX #3: Replaces the hidden cancel button with a visible, labelled toggle
// that shows the current auto-renew state and lets the user flip it.
// onResume/onCancel are called from the parent which already has the handlers.
function AutoBillingToggle({
    cancelAtPeriodEnd,
    periodEnd,
    onEnable,
    onDisable,
    loading,
    color,
}: {
    cancelAtPeriodEnd: boolean;
    periodEnd: Date | null;
    onEnable: () => void;   // resume → sets cancelAtPeriodEnd=false
    onDisable: () => void;  // cancel → sets cancelAtPeriodEnd=true
    loading: boolean;
    color: string;
}) {
    const isOn = !cancelAtPeriodEnd; // auto-billing ON means it WILL renew

    return (
        <div className="bp-autobill">
            <div className="bp-autobill-info">
                <div className="bp-autobill-label">
                    {isOn ? <Bell size={13} /> : <BellOff size={13} />}
                    <span>Auto-renewal</span>
                </div>
                <p className="bp-autobill-sub">
                    {isOn
                        ? `Renews automatically on ${shortDate(periodEnd)}`
                        : `Access ends ${shortDate(periodEnd)} — won't renew`}
                </p>
            </div>
            <button
                className={`bp-toggle-btn ${isOn ? 'bp-toggle-btn--on' : 'bp-toggle-btn--off'}`}
                style={isOn ? { '--toggle-color': color } as React.CSSProperties : undefined}
                onClick={isOn ? onDisable : onEnable}
                disabled={loading}
                aria-label={isOn ? 'Turn off auto-renewal' : 'Turn on auto-renewal'}
            >
                {loading
                    ? <Loader2 size={14} className="bp-spin" />
                    : isOn
                        ? <ToggleRight size={22} />
                        : <ToggleLeft size={22} />}
                <span>{isOn ? 'On' : 'Off'}</span>
            </button>
        </div>
    );
}

// ─── Current plan hero ────────────────────────────────────────────────────────
function CurrentPlanHero({
    plan, tierIdx, status, periodStart, periodEnd, cancelAtPeriodEnd,
    usage, usageLoading, onPortal, portalLoading,
    onCancelAutoBilling, onResumeAutoBilling, autoBillingLoading,
    isFreePlan, recommendedPlan, onSubscribe, subscribingKey,
    extrasActive, extrasExpiresAt,
}: {
    plan: Plan; tierIdx: number; status: string;
    periodStart: Date | null; periodEnd: Date | null; cancelAtPeriodEnd: boolean;
    usage: UsageData | null; usageLoading: boolean;
    onPortal: () => void; portalLoading: boolean;
    onCancelAutoBilling: () => void;
    onResumeAutoBilling: () => void;
    autoBillingLoading: boolean;
    isFreePlan: boolean; recommendedPlan: Plan | null;
    onSubscribe: (p: Plan) => void; subscribingKey: string | null;
    extrasActive?: boolean; extrasExpiresAt?: string | null;
}) {
    const safeIdx = Math.max(0, tierIdx);
    const color = TIER_COLORS[safeIdx] ?? TIER_COLORS[0];
    const TierIcon = TIER_ICONS[safeIdx] ?? TIER_ICONS[0];

    const hasPeriod = !isFreePlan && periodEnd !== null;
    const countdown = usePeriodCountdown(
        hasPeriod ? periodStart : null,
        hasPeriod ? periodEnd : null
    );

    const usageFieldMap: Partial<Record<PlanMetricKey, keyof UsageData>> = {
        applicantLimit: 'applicantsUsed',
        manualPostLimit: 'manualPostsUsed',
        autoPostLimit: 'autoPostsUsed',
        jobBankRequestLimit: 'jobBankRequestsUsed',
        listingQuota: 'listingsUsed',
    };

    return (
        <div className="bp-hero" style={{ '--accent': color } as React.CSSProperties}>
            <div className="bp-hero-glow" style={{ background: color }} />

            <div className="bp-hero-top">
                <div className="bp-hero-id">
                    <div className="bp-hero-icon" style={{ background: `${color}1c`, color }}>
                        <TierIcon size={20} />
                    </div>
                    <div>
                        <div className="bp-hero-name-row">
                            <h1 className="bp-hero-name">{plan.name}</h1>
                            <StatusDot status={isFreePlan ? 'active' : status} />
                        </div>
                        <p className="bp-hero-price">
                            {formatPrice(plan.price)}{plan.price > 0 && <span>/mo</span>}
                        </p>
                    </div>
                </div>

                <div className="bp-hero-actions">
                    {!isFreePlan && (
                        <button className="bp-btn bp-btn-ghost" onClick={onPortal} disabled={portalLoading}>
                            {portalLoading ? <Loader2 size={14} className="bp-spin" /> : <CreditCard size={14} />}
                            Payment
                        </button>
                    )}
                    {isFreePlan && recommendedPlan && (
                        <button
                            className="bp-btn bp-btn-primary"
                            style={{ background: color }}
                            onClick={() => onSubscribe(recommendedPlan)}
                            disabled={subscribingKey !== null}
                        >
                            {subscribingKey === recommendedPlan.key
                                ? <><Loader2 size={14} className="bp-spin" /> Starting…</>
                                : <><ArrowUpRight size={14} /> Upgrade</>}
                        </button>
                    )}
                </div>
            </div>

            <div className="bp-hero-body">
                <div className="bp-hero-clock">
                    <PeriodOrbit countdown={countdown} color={color} />
                    <div className="bp-hero-clock-meta">
                        {hasPeriod ? (
                            <>
                                <p className="bp-hero-clock-label">
                                    {cancelAtPeriodEnd ? 'Access ends' : 'Renews'}
                                </p>
                                <p className="bp-hero-clock-date">{shortDate(periodEnd)}</p>
                                <CountdownStrip countdown={countdown} />

                                {/* FIX #3: Auto-billing toggle replaces the old cancel-only button */}
                                <div style={{ marginTop: '1rem' }}>
                                    <AutoBillingToggle
                                        cancelAtPeriodEnd={cancelAtPeriodEnd}
                                        periodEnd={periodEnd}
                                        onEnable={onResumeAutoBilling}
                                        onDisable={onCancelAutoBilling}
                                        loading={autoBillingLoading}
                                        color={color}
                                    />
                                </div>
                            </>
                        ) : isFreePlan ? (
                            <>
                                <p className="bp-hero-clock-label">No billing cycle</p>
                                <p className="bp-hero-clock-date bp-muted">Upgrade to start one</p>
                            </>
                        ) : (
                            <>
                                <p className="bp-hero-clock-label">Activating…</p>
                                <p className="bp-hero-clock-date bp-muted">
                                    <Loader2 size={12} className="bp-spin" style={{ marginRight: 6 }} />
                                    Syncing from Stripe
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <div className="bp-hero-usage">
                    <div className="bp-hero-usage-head">
                        <TrendingUp size={13} />
                        <span>Usage this period</span>
                        {usageLoading && <Loader2 size={12} className="bp-spin" />}
                    </div>
                    <div className="bp-usage-list">
                        {METRICS.map((m) => {
                            const key = usageFieldMap[m.key];
                            return (
                                <UsageRow
                                    key={m.key}
                                    metric={m}
                                    used={key ? (usage ? (usage[key] as number) : 0) : null}
                                    limit={(plan as any)[m.key] ?? 0}
                                    color={color}
                                />
                            );
                        })}
                    </div>

                    {extrasActive && extrasExpiresAt && (
                        <div className="bp-extras-banner">
                            <Sparkles size={12} />
                            <span>
                                Bonus quota active until {shortDate(new Date(extrasExpiresAt))}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Plan tile ────────────────────────────────────────────────────────────────
function PlanTile({
    plan, idx, isCurrent, isRecommended, isProcessing, unavailable,
    anyProcessing, currentPlan, isFreePlan, onAction,
}: {
    plan: Plan; idx: number; isCurrent: boolean; isRecommended: boolean;
    isProcessing: boolean; unavailable: boolean; anyProcessing: boolean;
    currentPlan: Plan; isFreePlan: boolean; onAction: (p: Plan) => void;
}) {
    const color = TIER_COLORS[idx] ?? TIER_COLORS[0];
    const TierIcon = TIER_ICONS[idx] ?? TIER_ICONS[0];
    const isUpgrade = plan.price > currentPlan.price;
    const tileMetrics = METRICS.filter(m => m.key !== 'jobBankRequestLimit');

    return (
        <div
            className={`bp-tile ${isCurrent ? 'bp-tile--current' : ''} ${isRecommended && !isCurrent ? 'bp-tile--rec' : ''}`}
            style={{ '--tile-accent': color } as React.CSSProperties}
        >
            {isRecommended && !isCurrent && <span className="bp-tile-badge">Recommended</span>}
            {isCurrent && <span className="bp-tile-badge bp-tile-badge--current">Current</span>}

            <div className="bp-tile-icon" style={{ background: `${color}15`, color }}>
                <TierIcon size={16} />
            </div>
            <h3 className="bp-tile-name">{plan.name}</h3>
            <div className="bp-tile-price">
                {formatPrice(plan.price)}{plan.price > 0 && <span>/mo</span>}
            </div>

            <ul className="bp-tile-features">
                {tileMetrics.map((m) => {
                    const val = (plan as any)[m.key] ?? 0;
                    const diff = !isCurrent ? val - ((currentPlan as any)[m.key] ?? 0) : 0;
                    return (
                        <li key={m.key}>
                            <span className="bp-tile-feature-icon">{m.icon}</span>
                            <span>{val}{m.unit ?? ''} {m.label.toLowerCase()}</span>
                            {diff !== 0 && (
                                <span className={`bp-tile-diff ${diff > 0 ? 'up' : 'down'}`}>
                                    {diff > 0 ? `+${diff}` : diff}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>

            {isCurrent ? (
                <button className="bp-btn bp-btn-flat" disabled>
                    <CheckCircle2 size={13} /> Current plan
                </button>
            ) : unavailable ? (
                <button className="bp-btn bp-btn-flat" disabled>Contact us</button>
            ) : (
                <button
                    className={`bp-btn ${isRecommended ? 'bp-btn-primary' : 'bp-btn-outline'}`}
                    style={isRecommended ? { background: color } : { color, borderColor: `${color}55` }}
                    onClick={() => onAction(plan)}
                    disabled={anyProcessing}
                >
                    {isProcessing ? (
                        <><Loader2 size={13} className="bp-spin" /> Working…</>
                    ) : isFreePlan ? (
                        <>Get started</>
                    ) : (
                        <><ArrowLeftRight size={13} /> {isUpgrade ? 'Upgrade' : 'Switch'}</>
                    )}
                </button>
            )}
        </div>
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function HistoryRow({ event }: { event: BillingEvent }) {
    const date = new Date(event.createdAt);
    const isInvoice = event.eventType === 'invoice';
    const isCancel = event.eventType === 'cancellation';
    const icon = isInvoice ? <Receipt size={13} /> : isCancel ? <XCircle size={13} /> : <ArrowLeftRight size={13} />;
    const tint = isInvoice
        ? (event.status === 'paid' ? '#1ba672' : '#c2780c')
        : isCancel ? '#ef4444' : '#5b5fef';
    const desc = isInvoice
        ? `Invoice ${event.status ?? ''}`
        : isCancel ? `Canceled ${event.previousPlanKey ?? ''}`
            : `${event.previousPlanKey ?? '—'} → ${event.newPlanKey ?? '—'}`;

    return (
        <div className="bp-hist-row">
            <span className="bp-hist-icon" style={{ background: `${tint}16`, color: tint }}>{icon}</span>
            <div className="bp-hist-body">
                <div className="bp-hist-line1">
                    <span className="bp-hist-desc">{desc}</span>
                    {event.amountPaid > 0 && (
                        <span className="bp-hist-amount">{formatMoney(event.amountPaid, event.currency)}</span>
                    )}
                </div>
                <div className="bp-hist-line2">
                    <span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    {event.invoiceUrl && (
                        <a href={event.invoiceUrl} target="_blank" rel="noopener noreferrer" className="bp-hist-link">
                            View <ExternalLink size={10} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function OutstandingBalanceCard({ isFreePlan }: { isFreePlan: boolean }) {
    const [data, setData] = useState<{
        totalDue: number; currency: string;
        invoiceCount: number;
        invoices: { id: string; amountDue: number; currency: string; hostedUrl: string | null }[];
    } | null>(null);
    const [paying, setPaying] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    useEffect(() => {
        if (isFreePlan) return;
        let cancelled = false;
        fetch('/api/billing/outstanding')
            .then(r => r.json())
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [isFreePlan]);

    if (isFreePlan || !data || data.totalDue === 0) return null;

    const handlePay = async () => {
        setPaying(true);
        setResult(null);
        try {
            const res = await fetch('/api/billing/pay-balance', { method: 'POST' });
            const d = await res.json();
            if (d.success) {
                setResult(d.message);
                const r = await fetch('/api/billing/outstanding');
                setData(await r.json());
            } else {
                setResult(d.error ?? 'Payment failed.');
            }
        } catch {
            setResult('Something went wrong. Please try again.');
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="bp-side-card bp-outstanding-card">
            <div className="bp-side-card-head">
                <Receipt size={14} style={{ color: '#c2780c' }} />
                <span style={{ color: '#c2780c' }}>Outstanding Balance</span>
            </div>
            <div className="bp-outstanding-amount">
                <span className="bp-outstanding-label">Total due</span>
                <span className="bp-outstanding-value">
                    {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: (data.currency ?? 'usd').toUpperCase(),
                    }).format(data.totalDue / 100)}
                </span>
            </div>
            <p className="bp-side-empty" style={{ textAlign: 'left', paddingTop: 0 }}>
                {data.invoiceCount} unpaid invoice{data.invoiceCount !== 1 ? 's' : ''} from plan
                changes. Pay now to avoid service interruption.
            </p>
            {data.invoices.map(inv => (
                <div key={inv.id} className="bp-outstanding-inv-row">
                    <span className="bp-outstanding-inv-amount">
                        {new Intl.NumberFormat('en-US', {
                            style: 'currency', currency: inv.currency.toUpperCase(),
                        }).format(inv.amountDue / 100)}
                    </span>
                    {inv.hostedUrl && (
                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" className="bp-hist-link">
                            View <ExternalLink size={10} />
                        </a>
                    )}
                </div>
            ))}
            {result && (
                <p style={{
                    fontSize: '0.76rem', marginTop: '0.5rem',
                    color: result.includes('fail') || result.includes('declin') ? '#b91c1c' : '#0d6b48',
                }}>
                    {result}
                </p>
            )}
            <button
                className="bp-btn bp-btn-block"
                style={{ background: '#c2780c', color: '#fff', marginTop: '0.75rem', border: 'none' }}
                onClick={handlePay}
                disabled={paying}
            >
                {paying
                    ? <><Loader2 size={13} className="bp-spin" /> Processing…</>
                    : <>Pay {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: (data.currency ?? 'usd').toUpperCase(),
                    }).format(data.totalDue / 100)} now</>
                }
            </button>
        </div>
    );
}

// FIX #1: WalletBalanceCard now always renders when walletBalance > 0.
// Changed guard from `if (!balance)` (which fails for 0) to `if (balance <= 0)`.
// Also added a more informative display showing where the credit came from.
function WalletBalanceCard({ balance, currency = 'usd' }: { balance: number; currency?: string }) {
    if (balance <= 0) return null;
    return (
        <div className="bp-side-card bp-wallet-card">
            <div className="bp-side-card-head">
                <Wallet size={14} style={{ color: '#1ba672' }} />
                <span style={{ color: '#1ba672' }}>Wallet Balance</span>
            </div>
            <div className="bp-wallet-amount">
                {formatMoney(balance, currency)}
            </div>
            <p className="bp-wallet-sub">
                Credit from your previous plan — automatically applied to your next bill.
            </p>
            <div className="bp-wallet-tag">
                <CheckCircle2 size={11} />
                Will offset your next renewal
            </div>
        </div>
    );
}

function Sidebar({
    history, historyLoading, paymentMethod, upcomingInvoice, accountLoading,
    isFreePlan, onPortal, portalLoading, walletBalance,
}: {
    history: BillingEvent[]; historyLoading: boolean;
    paymentMethod: PaymentMethodInfo | null; upcomingInvoice: UpcomingInvoiceInfo | null;
    accountLoading: boolean; isFreePlan: boolean;
    onPortal: () => void; portalLoading: boolean;
    walletBalance?: number;
}) {
    return (
        <aside className="bp-side py-3" style={{ position: 'sticky', top: '8%' }}>
            <OutstandingBalanceCard isFreePlan={isFreePlan} />

            {/* FIX #1: Wallet card always visible when balance > 0, free plan OR paid */}
            <WalletBalanceCard balance={walletBalance ?? 0} />

            {!isFreePlan && (
                <div className="bp-side-card">
                    <div className="bp-side-card-head">
                        <Wallet size={14} /> <span>Payment method</span>
                    </div>
                    {accountLoading ? (
                        <div className="bp-side-loading"><Loader2 size={14} className="bp-spin" /></div>
                    ) : paymentMethod ? (
                        <div className="bp-pm">
                            <div className="bp-pm-card">
                                <span className="bp-pm-brand">{CARD_BRAND_LABEL[paymentMethod.brand] ?? paymentMethod.brand}</span>
                                <span className="bp-pm-dots">•••• {paymentMethod.last4}</span>
                            </div>
                            <span className="bp-pm-exp">
                                Exp {String(paymentMethod.expMonth).padStart(2, '0')}/{String(paymentMethod.expYear).slice(-2)}
                            </span>
                        </div>
                    ) : (
                        <p className="bp-side-empty">No card on file</p>
                    )}
                    {upcomingInvoice && upcomingInvoice.amountDue > 0 && (
                        <div className="bp-pm-upcoming">
                            <span>Next charge</span>
                            <strong>{formatMoney(upcomingInvoice.amountDue, upcomingInvoice.currency)}</strong>
                        </div>
                    )}
                    <button className="bp-btn bp-btn-outline bp-btn-block" onClick={onPortal} disabled={portalLoading}>
                        {portalLoading ? <Loader2 size={13} className="bp-spin" /> : <ShieldCheck size={13} />}
                        Manage in Stripe
                    </button>
                </div>
            )}

            <div className="bp-side-card bp-side-card--grow">
                <div className="bp-side-card-head">
                    <Receipt size={14} /> <span>Billing History</span>
                </div>
                <div className="bp-hist-list">
                    {historyLoading ? (
                        <div className="bp-side-loading"><Loader2 size={16} className="bp-spin" /></div>
                    ) : history.length === 0 ? (
                        <p className="bp-side-empty">
                            Nothing yet — your invoices and<br />plan changes will show up here.
                        </p>
                    ) : (
                        history.map((e) => <HistoryRow key={e._id} event={e} />)
                    )}
                </div>
            </div>

            <UsageHistoryPanel />
        </aside>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SubscriptionManagementPage() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <SubscriptionDashboard />
        </Suspense>
    );
}

function SubscriptionDashboard() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [usageLoading, setUsageLoading] = useState(false);
    const [usageError, setUsageError] = useState(false);
    const [billingHistory, setBillingHistory] = useState<BillingEvent[]>([]);
    const [billingHistoryLoading, setBillingHistoryLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);
    const [upcomingInvoice, setUpcomingInvoice] = useState<UpcomingInvoiceInfo | null>(null);
    const [accountLoading, setAccountLoading] = useState(false);

    const [subState, setSubState] = useState<{
        planKey: string; status: string; cancelAtPeriodEnd: boolean;
        currentPeriodStart: string | null; currentPeriodEnd: string | null;
        stripeCustomerId: string | null; stripeSubscriptionId: string | null;
        listingQuota: number; applicantLimit: number;
        manualPostLimit: number; autoPostLimit: number; postVisibilityDays: number;
        jobBankRequestLimit?: number;
        effectiveLimits?: {
            listingQuota: number; applicantLimit: number; manualPostLimit: number;
            autoPostLimit: number; jobBankRequestLimit: number;
        };
        extrasExpiresAt?: string | null;
        extrasActive?: boolean;
        walletBalance?: number;
    } | null>(null);
    const [subLoading, setSubLoading] = useState(true);
    const [subError, setSubError] = useState(false);

    const [subscribingKey, setSubscribingKey] = useState<string | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    // FIX #3: single loading state for the auto-billing toggle (covers both cancel and resume)
    const [autoBillingLoading, setAutoBillingLoading] = useState(false);
    const [switchTarget, setSwitchTarget] = useState<Plan | null>(null);
    const [error, setError] = useState('');
    const [checkoutNotice, setCheckoutNotice] = useState<{ tone: NoticeTone; icon: ReactNode; text: string } | null>(null);
    const [manualRefresh, setManualRefresh] = useState(false);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // FIX #4: periodic background sync to catch Stripe portal changes
    const bgSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (bgSyncRef.current) clearInterval(bgSyncRef.current);
        };
    }, []);

    const currentPlanKey = subState?.planKey ?? 'free';
    const currentStatus = subState?.status ?? 'active';
    const currentPeriodStart = toDate(subState?.currentPeriodStart);
    const currentPeriodEnd = toDate(subState?.currentPeriodEnd);
    const cancelAtPeriodEnd = subState?.cancelAtPeriodEnd ?? false;

    const fetchSubscription = useCallback(async (silent = false) => {
        if (!silent) setSubLoading(true);
        try {
            const r = await fetch('/api/subscription/me');
            if (!r.ok) throw new Error();
            const d = await r.json();
            setSubState(prev => {
                // FIX #4: Only update if something actually changed to avoid
                // unnecessary re-renders from the background polling.
                const incoming = d.subscription;
                if (prev &&
                    prev.planKey === incoming.planKey &&
                    prev.status === incoming.status &&
                    prev.cancelAtPeriodEnd === incoming.cancelAtPeriodEnd &&
                    prev.currentPeriodEnd === incoming.currentPeriodEnd
                ) {
                    return prev;
                }
                return incoming;
            });
            setSubError(false);
        } catch {
            if (!silent) setSubError(true);
        } finally {
            if (!silent) setSubLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/auth/sign-in');
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetchSubscription();
    }, [status, fetchSubscription]);

    // FIX #4: Poll every 30s in the background so Stripe portal cancellations
    // (and any other webhook-driven changes) surface without a manual refresh.
    useEffect(() => {
        if (status !== 'authenticated') return;
        if (bgSyncRef.current) clearInterval(bgSyncRef.current);
        bgSyncRef.current = setInterval(() => {
            fetchSubscription(true); // silent — no loading spinner
        }, 30_000);
        return () => {
            if (bgSyncRef.current) clearInterval(bgSyncRef.current);
        };
    }, [status, fetchSubscription]);

    const fetchUsage = useCallback(async () => {
        setUsageLoading(true);
        try {
            const r = await fetch('/api/subscription/usage');
            const d = await r.json();
            setUsage(d.usage ?? null);
            setUsageError(false);
        } catch {
            setUsageError(true);
        } finally {
            setUsageLoading(false);
        }
    }, []);

    const fetchBillingHistory = useCallback(async () => {
        setBillingHistoryLoading(true);
        try {
            const r = await fetch('/api/billing/history');
            const d = await r.json();
            setBillingHistory(d.history ?? []);
        } catch { }
        finally { setBillingHistoryLoading(false); }
    }, []);

    const fetchAccount = useCallback(async () => {
        setAccountLoading(true);
        try {
            const r = await fetch('/api/billing/account');
            const d = await r.json();
            setPaymentMethod(d.paymentMethod ?? null);
            setUpcomingInvoice(d.upcomingInvoice ?? null);
        } catch { }
        finally { setAccountLoading(false); }
    }, []);

    useEffect(() => {
        if (status !== 'authenticated') return;
        let cancelled = false;
        setLoading(true);
        setLoadError(false);
        fetch('/api/plans')
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(d => { if (!cancelled) setPlans(d.plans ?? []); })
            .catch(() => { if (!cancelled) setLoadError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [status]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetchUsage();
    }, [status, currentPlanKey, fetchUsage]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetchBillingHistory();
        fetchAccount();
    }, [status, currentPlanKey, fetchBillingHistory, fetchAccount]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        const isSuccess = searchParams.get('success');
        const isCanceled = searchParams.get('canceled');

        if (isSuccess || isCanceled) {
            const sessionId = searchParams.get('session_id') || '';
            const redirectStatus = isSuccess === 'true' ? 'success' : 'canceled';
            const pendingPlanKey = sessionStorage.getItem('pendingPlanKey') || undefined;
            fetch('/api/billing/checkout-redirect-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checkoutSessionId: sessionId,
                    status: redirectStatus,
                    queryParams: Object.fromEntries(searchParams.entries()),
                    pendingPlanKey,
                    userAgent: navigator.userAgent,
                }),
            }).catch(console.error);
        }

        router.replace(window.location.pathname, { scroll: false });

        if (isCanceled === 'true') {
            sessionStorage.removeItem('pendingPlanKey');
            setCheckoutNotice({ tone: 'neutral', icon: <Info size={15} />, text: "Checkout canceled — you weren't charged." });
            return;
        }
        if (isSuccess === 'true') {
            const targetPlan = sessionStorage.getItem('pendingPlanKey') || undefined;
            sessionStorage.removeItem('pendingPlanKey');
            setCheckoutNotice({ tone: 'success', icon: <CheckCircle2 size={15} />, text: 'Payment received — activating your plan…' });
            update();
            fetchUsage();
            fetchBillingHistory();
            fetchAccount();

            let attempts = 0;
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = setInterval(async () => {
                attempts += 1;
                const r = await fetch('/api/subscription/me').catch(() => null);
                if (r?.ok) {
                    const d = await r.json();
                    setSubState(d.subscription);
                    const hasPeriodDates = d.subscription.currentPeriodStart && d.subscription.currentPeriodEnd;
                    const planMatches = !targetPlan || d.subscription.planKey === targetPlan;
                    if ((hasPeriodDates && planMatches) || attempts >= 8) {
                        if (pollRef.current) clearInterval(pollRef.current);
                        pollRef.current = null;
                        setSubLoading(false);
                        if (hasPeriodDates && planMatches) {
                            setCheckoutNotice({
                                tone: 'success',
                                icon: <CheckCircle2 size={15} />,
                                text: 'Payment received — your plan is now active.',
                            });
                        } else {
                            setCheckoutNotice({
                                tone: 'warning',
                                icon: <AlertTriangle size={15} />,
                                text: "Payment received, but it's taking longer than usual to activate. Try Refresh in a moment, or check Billing History below.",
                            });
                        }
                    }
                } else if (attempts >= 8) {
                    if (pollRef.current) clearInterval(pollRef.current);
                    pollRef.current = null;
                    setSubLoading(false);
                }
            }, 1500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const sortedPlans = useMemo(
        () => plans.filter(p => p.isActive).sort((a, b) => a.price - b.price),
        [plans]
    );
    const isFreePlan = currentPlanKey === 'free';

    const currentPlanFromDB: Plan | undefined = subState && !isFreePlan ? {
        _id: currentPlanKey,
        key: currentPlanKey,
        name: sortedPlans.find(p => p.key === currentPlanKey)?.name ?? currentPlanKey,
        price: sortedPlans.find(p => p.key === currentPlanKey)?.price ?? 0,
        listingQuota: subState.effectiveLimits?.listingQuota ?? subState.listingQuota,
        applicantLimit: subState.effectiveLimits?.applicantLimit ?? subState.applicantLimit,
        manualPostLimit: subState.effectiveLimits?.manualPostLimit ?? subState.manualPostLimit,
        autoPostLimit: subState.effectiveLimits?.autoPostLimit ?? subState.autoPostLimit,
        jobBankRequestLimit: subState.effectiveLimits?.jobBankRequestLimit ?? subState.jobBankRequestLimit ?? 0,
        postVisibilityDays: subState.postVisibilityDays,
        stripePriceId: sortedPlans.find(p => p.key === currentPlanKey)?.stripePriceId,
        isActive: true,
    } : undefined;

    const currentPlan = currentPlanFromDB ?? sortedPlans.find(p => p.key === currentPlanKey) ?? FREE_PLAN;
    const currentTierIdx = sortedPlans.findIndex(p => p.key === currentPlanKey);

    const recommendedKey = useMemo(() => {
        if (isFreePlan) return sortedPlans.find(p => p.price > 0)?.key ?? null;
        const above = sortedPlans.filter(p => p.price > currentPlan.price);
        return above.length ? above[0].key : null;
    }, [sortedPlans, currentPlan, isFreePlan]);
    const recommendedPlan = sortedPlans.find(p => p.key === recommendedKey) ?? null;

    const handleSubscribe = async (plan: Plan) => {
        if (!plan.stripePriceId || subscribingKey) return;
        setSubscribingKey(plan.key);
        setError('');
        try {
            sessionStorage.setItem('pendingPlanKey', plan.key);
            const res = await fetch('/api/billing/checkout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planKey: plan.key }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Checkout failed.');
            window.location.href = data.url;
        } catch (err: any) {
            setError(err.message);
            setSubscribingKey(null);
            sessionStorage.removeItem('pendingPlanKey');
        }
    };

    const handlePlanAction = (plan: Plan) => {
        if (isFreePlan) handleSubscribe(plan);
        else setSwitchTarget(plan);
    };

    const [autoRenewalConfirmPending, setAutoRenewalConfirmPending] = useState(false);

    const confirmSwitch = async (resumeAutoBilling = false) => {
        if (!switchTarget) return;
        setSubscribingKey(switchTarget.key);
        setError('');
        try {
            const res = await fetch('/api/billing/switch', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planKey: switchTarget.key, resumeAutoBilling }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === 'REQUIRES_ACTION' && data.portalUrl) {
                    setError(data.error || 'Your bank requires additional verification.');
                    window.location.href = data.portalUrl;
                    return;
                }
                if (data.code === 'AUTO_RENEWAL_OFF') {
                    // Don't fail silently — ask the user to explicitly confirm
                    // turning auto-renewal back on before retrying. We reuse
                    // the existing switchTarget state and just flag this in a
                    // dedicated confirm step rather than auto-retrying.
                    setAutoRenewalConfirmPending(true);
                    setSubscribingKey(null);
                    return;
                }
                throw new Error(data.error || 'Could not switch plans.');
            }
            await update();
            await fetchSubscription();
            fetchUsage(); fetchBillingHistory(); fetchAccount();
            const isUpgrade = switchTarget.price > currentPlan.price;
            setCheckoutNotice({
                tone: 'success', icon: <CheckCircle2 size={15} />,
                text: isUpgrade
                    ? `Upgraded to ${switchTarget.name}. Your saved card was charged the full price and your billing cycle has restarted.`
                    : `Switched to ${switchTarget.name}. Unused credit from your previous plan has been added to your wallet.`,
            });
            setSwitchTarget(null);
            setAutoRenewalConfirmPending(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubscribingKey(null);
        }
    };

    const handlePortal = async () => {
        setPortalLoading(true); setError('');
        try {
            const res = await fetch('/api/billing/portal', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not open billing portal.');
            window.location.href = data.url;
        } catch (err: any) {
            setError(err.message);
            setPortalLoading(false);
        }
    };

    // FIX #3: Renamed from confirmCancel, now used by the toggle
    const handleDisableAutoBilling = async () => {
        setAutoBillingLoading(true); setError('');
        try {
            const res = await fetch('/api/billing/cancel', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not cancel subscription.');
            await update();
            await fetchSubscription();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAutoBillingLoading(false);
        }
    };

    const handleResume = async () => {
        setAutoBillingLoading(true); setError('');
        try {
            const res = await fetch('/api/billing/resume', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to resume subscription.');
            await update();
            await fetchSubscription();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAutoBillingLoading(false);
        }
    };

    const refreshData = async () => {
        setManualRefresh(true);
        await Promise.all([update(), fetchSubscription(), fetchUsage(), fetchBillingHistory(), fetchAccount()]);
        setManualRefresh(false);
    };

    if (status === 'loading' || loading || subLoading) return <PageSkeleton />;
    if (!session) return null;

    const isUpgradeSwitch = switchTarget ? switchTarget.price > currentPlan.price : false;

    return (
        <div className="bp-shell">
            <div className="bp-topbar">
                <div className="bp-topbar-id">
                    <span className="bp-topbar-icon"><CreditCard size={16} /></span>
                    <div>
                        <h1>Subscription</h1>
                        <p>Plan, usage and billing in one place</p>
                    </div>
                </div>
                <button className="bp-btn bp-btn-ghost" onClick={refreshData} disabled={manualRefresh}>
                    {manualRefresh ? <Loader2 size={14} className="bp-spin" /> : <RefreshCw size={14} />}
                    Refresh
                </button>
            </div>

            <div className="bp-notices">
                {checkoutNotice && (
                    <Notice tone={checkoutNotice.tone} icon={checkoutNotice.icon} onDismiss={() => setCheckoutNotice(null)}>
                        {checkoutNotice.text}
                    </Notice>
                )}
                {error && <Notice tone="danger" icon={<AlertTriangle size={15} />} onDismiss={() => setError('')}>{error}</Notice>}
                {currentStatus === 'past_due' && (
                    <Notice
                        tone="warning" icon={<AlertTriangle size={15} />}
                        action={
                            <button className="bp-btn bp-btn-sm" onClick={handlePortal} disabled={portalLoading}>
                                {portalLoading ? 'Opening…' : 'Update payment'}
                            </button>
                        }
                    >
                        Your last payment didn't go through.
                    </Notice>
                )}
                {/* FIX #4: The resume/cancel banner is now informational only;
                    the actual toggle lives in CurrentPlanHero's clock section. */}
                {cancelAtPeriodEnd && !isFreePlan && (
                    <Notice tone="neutral" icon={<Info size={15} />}>
                        Auto-renewal is off — your access ends <strong>{shortDate(currentPeriodEnd)}</strong>.
                        Use the toggle below to re-enable it.
                    </Notice>
                )}
                {loadError && (
                    <Notice tone="warning" icon={<AlertTriangle size={15} />}
                        action={<button className="bp-btn bp-btn-sm" onClick={() => router.refresh()}>Retry</button>}
                    >
                        Couldn't load plan details.
                    </Notice>
                )}
                {usageError && <Notice tone="warning" icon={<AlertTriangle size={15} />} onDismiss={() => setUsageError(false)}>Couldn't load usage data.</Notice>}
                {subError && (
                    <Notice tone="danger" icon={<AlertTriangle size={15} />}
                        action={<button className="bp-btn bp-btn-sm" onClick={() => fetchSubscription()}>Retry</button>}
                    >
                        Couldn't load your live subscription status.
                    </Notice>
                )}
            </div>

            <div className="bp-layout">
                <main className="bp-main">
                    <CurrentPlanHero
                        plan={currentPlan}
                        tierIdx={currentTierIdx}
                        status={currentStatus}
                        periodStart={currentPeriodStart}
                        periodEnd={currentPeriodEnd}
                        cancelAtPeriodEnd={cancelAtPeriodEnd}
                        usage={usage}
                        usageLoading={usageLoading}
                        onPortal={handlePortal}
                        portalLoading={portalLoading}
                        onCancelAutoBilling={handleDisableAutoBilling}
                        onResumeAutoBilling={handleResume}
                        autoBillingLoading={autoBillingLoading}
                        isFreePlan={isFreePlan}
                        recommendedPlan={recommendedPlan}
                        onSubscribe={handleSubscribe}
                        subscribingKey={subscribingKey}
                        extrasActive={subState?.extrasActive}
                        extrasExpiresAt={subState?.extrasExpiresAt}
                    />

                    <section className="bp-section">
                        <div className="bp-section-head">
                            <h2>{isFreePlan ? 'Choose a plan' : 'Switch plan'}</h2>
                            <p>
                                {isFreePlan
                                    ? '30-day money-back guarantee'
                                    : 'Upgrades charge your saved card immediately and restart your billing cycle. Downgrades credit unused time to your wallet.'}
                            </p>
                        </div>
                        {sortedPlans.length === 0 && !loadError ? (
                            <div className="bp-empty"><Receipt size={28} /><p>No plans available.</p></div>
                        ) : (
                            <div className="bp-tile-grid">
                                {sortedPlans.map((plan, idx) => (
                                    <PlanTile
                                        key={plan._id}
                                        plan={plan}
                                        idx={idx}
                                        isCurrent={plan.key === currentPlanKey}
                                        isRecommended={plan.key === recommendedKey}
                                        isProcessing={subscribingKey === plan.key}
                                        unavailable={plan.price > 0 && !plan.stripePriceId}
                                        anyProcessing={subscribingKey !== null}
                                        currentPlan={currentPlan}
                                        isFreePlan={isFreePlan}
                                        onAction={handlePlanAction}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </main>

                <Sidebar
                    history={billingHistory}
                    historyLoading={billingHistoryLoading}
                    paymentMethod={paymentMethod}
                    upcomingInvoice={upcomingInvoice}
                    accountLoading={accountLoading}
                    isFreePlan={isFreePlan}
                    onPortal={handlePortal}
                    portalLoading={portalLoading}
                    walletBalance={subState?.walletBalance}
                />
            </div>

            {/* FIX #3: No more cancel modal — the toggle handles it inline */}

            {switchTarget && (
                <div className="bp-modal-overlay" onClick={() => subscribingKey === null && setSwitchTarget(null)}>
                    <div className="bp-modal" onClick={e => e.stopPropagation()}>
                        {autoRenewalConfirmPending ? (
                            <>
                                <div className="bp-modal-icon bp-modal-icon--info"><Bell size={20} /></div>
                                <h3>Turn auto-renewal back on?</h3>
                                <p>
                                    Auto-renewal is currently off, so your account is set to expire at the end of
                                    this billing period. Switching to <strong>{switchTarget.name}</strong> will turn
                                    auto-renewal back on{switchTarget.price > currentPlan.price
                                        ? <> and charge your saved card <strong>{formatPrice(switchTarget.price)} immediately</strong></>
                                        : <></>}. Continue?
                                </p>
                                <div className="bp-modal-actions">
                                    <button
                                        className="bp-btn bp-btn-ghost"
                                        onClick={() => { setAutoRenewalConfirmPending(false); setSwitchTarget(null); }}
                                        disabled={subscribingKey !== null}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="bp-btn bp-btn-primary" style={{ background: '#5b5fef' }}
                                        onClick={() => confirmSwitch(true)}
                                        disabled={subscribingKey !== null}
                                    >
                                        {subscribingKey !== null
                                            ? <><Loader2 size={13} className="bp-spin" /> Switching…</>
                                            : <>Turn on & switch <ChevronRight size={13} /></>}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bp-modal-icon bp-modal-icon--info"><ArrowLeftRight size={20} /></div>
                                <h3>Switch to {switchTarget.name}?</h3>
                                <p>
                                    {isUpgradeSwitch ? (
                                        <>
                                            You'll move from <strong>{currentPlan.name}</strong> to <strong>{switchTarget.name}</strong> right now.
                                            Your saved card will be charged the <strong>full price immediately</strong> and your billing cycle will restart today.
                                        </>
                                    ) : (
                                        <>
                                            You'll move from <strong>{currentPlan.name}</strong> to <strong>{switchTarget.name}</strong>.
                                            Your plan changes immediately, and any unused credit will be added to your wallet for future bills.
                                            {' '}<strong>Resource limits will be reduced to the new plan's quotas</strong> — unless you've
                                            already used more than the new plan allows this period, in which case you keep access to what
                                            you've already used until your next renewal.
                                        </>
                                    )}
                                </p>
                                <div className="bp-modal-actions">
                                    <button className="bp-btn bp-btn-ghost" onClick={() => setSwitchTarget(null)} disabled={subscribingKey !== null}>Keep current</button>
                                    <button
                                        className="bp-btn bp-btn-primary" style={{ background: '#5b5fef' }}
                                        onClick={() => confirmSwitch(false)} disabled={subscribingKey !== null}
                                    >
                                        {subscribingKey !== null
                                            ? <><Loader2 size={13} className="bp-spin" /> Switching…</>
                                            : <>Confirm switch <ChevronRight size={13} /></>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style jsx global>{`
        :root {
          --bp-ink: #11131a;
          --bp-muted: #6b7280;
          --bp-faint: #9aa1ae;
          --bp-line: #e7e9f0;
          --bp-canvas: #f5f6fb;
          --bp-card: #ffffff;
          --bp-accent: #5b5fef;
          --bp-radius-lg: 22px;
          --bp-radius-md: 14px;
          --bp-radius-sm: 10px;
          --bp-font-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --bp-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
        }

        .bp-shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 1.75rem 1.25rem 4rem;
          font-family: var(--bp-font-display);
          color: var(--bp-ink);
          background: var(--bp-canvas);
        }

        .bp-topbar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.25rem; gap: 1rem;
        }
        .bp-topbar-id { display: flex; align-items: center; gap: 0.7rem; }
        .bp-topbar-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--bp-ink); color: #fff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .bp-topbar-id h1 { font-size: 1.05rem; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
        .bp-topbar-id p { font-size: 0.76rem; color: var(--bp-muted); margin: 1px 0 0; }

        .bp-notices { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; }
        .bp-notice {
          display: flex; align-items: flex-start; gap: 9px;
          padding: 0.65rem 0.9rem; border-radius: var(--bp-radius-sm);
          font-size: 0.8rem; line-height: 1.4; border: 1px solid transparent;
          animation: bp-slide-in 0.25s ease;
        }
        @keyframes bp-slide-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .bp-notice--success { background: #f0fbf6; border-color: #c8ecda; color: #0d6b48; }
        .bp-notice--warning { background: #fef9ec; border-color: #f7e3ad; color: #8a5c08; }
        .bp-notice--danger  { background: #fef2f2; border-color: #fad1d1; color: #a31c1c; }
        .bp-notice--info    { background: #eef0fe; border-color: #cdd1fa; color: #2f33b8; }
        .bp-notice--neutral { background: #fff; border-color: var(--bp-line); color: #374151; }
        .bp-notice-icon { margin-top: 1px; flex-shrink: 0; }
        .bp-notice-text { flex: 1; }
        .bp-notice-close { background: none; border: none; color: inherit; opacity: 0.45; cursor: pointer; padding: 2px; flex-shrink: 0; transition: opacity 0.15s; }
        .bp-notice-close:hover { opacity: 0.9; }

        .bp-layout { display: grid; grid-template-columns: 1fr 300px; gap: 1.25rem; align-items: start; }
        @media (max-width: 880px) { .bp-layout { grid-template-columns: 1fr; } }
        .bp-main { min-width: 0; }

        .bp-hero {
          position: relative; overflow: hidden;
          background: var(--bp-card); border: 1px solid var(--bp-line);
          border-radius: var(--bp-radius-lg); padding: 1.5rem 1.6rem;
          animation: bp-rise 0.4s cubic-bezier(.16,1,.3,1);
        }
        @keyframes bp-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .bp-hero-glow {
          position: absolute; top: -60%; right: -15%; width: 320px; height: 320px;
          border-radius: 50%; filter: blur(90px); opacity: 0.10; pointer-events: none;
        }
        .bp-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; position: relative; flex-wrap: wrap; }
        .bp-hero-id { display: flex; align-items: center; gap: 0.85rem; }
        .bp-hero-icon { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .bp-hero-name-row { display: flex; align-items: center; gap: 0.55rem; }
        .bp-hero-name { font-size: 1.2rem; font-weight: 700; margin: 0; letter-spacing: -0.015em; }
        .bp-hero-price { font-size: 0.8rem; color: var(--bp-muted); margin: 2px 0 0; font-family: var(--bp-font-mono); }
        .bp-hero-price span { opacity: 0.6; }
        .bp-hero-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

        .bp-status {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 2px 9px; border-radius: 20px; font-size: 0.66rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .bp-status-dot { width: 5px; height: 5px; border-radius: 50%; animation: bp-pulse 2s infinite; }
        @keyframes bp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .bp-hero-body {
          display: grid; grid-template-columns: auto 1fr; gap: 1.75rem;
          margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--bp-line);
          position: relative;
        }
        @media (max-width: 620px) { .bp-hero-body { grid-template-columns: 1fr; } }

        .bp-hero-clock { display: flex; align-items: flex-start; gap: 1.1rem; flex-wrap: wrap; }
        .bp-orbit { position: relative; flex-shrink: 0; }
        .bp-orbit-svg { transform: rotate(0deg); }
        .bp-orbit-progress { transition: stroke-dashoffset 0.6s cubic-bezier(.16,1,.3,1); }
        .bp-orbit-center {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .bp-orbit-num { font-family: var(--bp-font-mono); font-size: 1.9rem; font-weight: 700; line-height: 1; letter-spacing: -1px; }
        .bp-orbit-unit { font-size: 0.66rem; color: var(--bp-muted); margin-top: 3px; text-align: center; }
        .bp-orbit-expired { font-size: 0.78rem; font-weight: 400; color: var(--bp-accent); }
        .bp-hero-clock-meta { min-width: 0; padding-top: 4px; }
        .bp-hero-clock-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--bp-faint); margin: 0; font-weight: 700; }
        .bp-hero-clock-date { font-size: 1.05rem; font-weight: 700; margin: 2px 0 0.6rem; }
        .bp-muted { color: var(--bp-faint); font-weight: 500; font-size: 0.85rem; }

        .bp-flip-row { display: flex; align-items: center; gap: 5px; }
        .bp-flip { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .bp-flip-card {
          background: var(--bp-ink); color: #fff; border-radius: 7px;
          padding: 4px 7px; min-width: 30px; text-align: center;
          font-family: var(--bp-font-mono); font-size: 0.85rem; font-weight: 700;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }
        .bp-flip-card--flipping { transform: scaleY(0.4); opacity: 0.5; }
        .bp-flip-label { font-size: 0.55rem; color: var(--bp-faint); text-transform: uppercase; letter-spacing: 1px; }
        .bp-flip-colon { color: var(--bp-faint); font-weight: 700; margin-bottom: 14px; }

        /* ── Auto-billing toggle ──────────────────────────────── */
        .bp-autobill {
          display: flex; align-items: center; justify-content: space-between;
          gap: 0.75rem; background: var(--bp-canvas);
          border: 1px solid var(--bp-line); border-radius: 10px;
          padding: 0.55rem 0.75rem; margin-top: 0.25rem;
        }
        .bp-autobill-info { min-width: 0; }
        .bp-autobill-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.74rem; font-weight: 700; color: var(--bp-ink);
        }
        .bp-autobill-sub {
          font-size: 0.67rem; color: var(--bp-faint);
          margin: 2px 0 0; line-height: 1.3;
        }
        .bp-toggle-btn {
          display: flex; align-items: center; gap: 4px;
          background: none; border: none; cursor: pointer;
          font-size: 0.7rem; font-weight: 700; border-radius: 8px;
          padding: 4px 8px; transition: background 0.15s ease, color 0.15s ease;
          white-space: nowrap; flex-shrink: 0;
        }
        .bp-toggle-btn--on { color: var(--toggle-color, #1ba672); }
        .bp-toggle-btn--on:hover:not(:disabled) { background: rgba(27,166,114,0.08); }
        .bp-toggle-btn--off { color: var(--bp-faint); }
        .bp-toggle-btn--off:hover:not(:disabled) { background: var(--bp-line); color: var(--bp-muted); }
        .bp-toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .bp-hero-usage-head {
          display: flex; align-items: center; gap: 6px; font-size: 0.72rem;
          font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--bp-faint); margin-bottom: 0.85rem;
        }
        .bp-usage-list { display: flex; flex-direction: column; gap: 0.65rem; }
        .bp-usage-row-head { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; margin-bottom: 4px; }
        .bp-usage-label { font-weight: 500; }
        .bp-usage-value { margin-left: auto; font-family: var(--bp-font-mono); font-size: 0.74rem; color: var(--bp-muted); }
        .bp-bar { height: 5px; background: var(--bp-line); border-radius: 3px; overflow: hidden; }
        .bp-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s cubic-bezier(.16,1,.3,1); }

        .bp-extras-banner {
          display: flex; align-items: center; gap: 0.4rem;
          margin-top: 0.75rem; padding: 0.4rem 0.6rem;
          background: rgba(91,95,239,0.06); border-radius: 8px;
          font-size: 0.72rem; color: var(--bp-accent); font-weight: 400;
        }

        .bp-section { margin-top: 1.6rem; }
        .bp-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 0.85rem; flex-wrap: wrap; }
        .bp-section-head h2 { font-size: 1rem; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
        .bp-section-head p { font-size: 0.76rem; color: var(--bp-muted); margin: 0; }

        .bp-tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.85rem; }
        .bp-tile {
          position: relative; background: var(--bp-card); border: 1px solid var(--bp-line);
          border-radius: var(--bp-radius-md); padding: 1.1rem;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .bp-tile:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(15,23,42,0.07); }
        .bp-tile--current { border-color: var(--tile-accent); box-shadow: 0 0 0 1px var(--tile-accent); }
        .bp-tile--rec { border-color: color-mix(in srgb, var(--tile-accent) 45%, var(--bp-line)); }
        .bp-tile-badge {
          position: absolute; top: -1px; right: 12px; background: var(--tile-accent); color: #fff;
          font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
          padding: 3px 8px; border-radius: 0 0 7px 7px;
        }
        .bp-tile-badge--current { background: var(--bp-ink); }
        .bp-tile-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.6rem; }
        .bp-tile-name { font-size: 0.88rem; font-weight: 700; margin: 0; }
        .bp-tile-price { font-size: 1.35rem; font-weight: 800; margin: 0.2rem 0 0.75rem; letter-spacing: -1px; }
        .bp-tile-price span { font-size: 0.7rem; font-weight: 500; color: var(--bp-muted); }
        .bp-tile-features { list-style: none; margin: 0 0 0.9rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
        .bp-tile-features li { display: flex; align-items: center; gap: 6px; font-size: 0.73rem; color: #374151; }
        .bp-tile-feature-icon { color: var(--bp-faint); display: flex; }
        .bp-tile-diff { margin-left: auto; font-size: 0.6rem; font-weight: 800; padding: 1px 5px; border-radius: 5px; }
        .bp-tile-diff.up { background: #e8f8f0; color: #0d6b48; }
        .bp-tile-diff.down { background: #f1f2f6; color: #6b7280; }

        .bp-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 0.5rem 0.9rem; border-radius: 9px; font-size: 0.78rem; font-weight: 400;
          border: 1px solid transparent; cursor: pointer; white-space: nowrap;
          transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease, opacity 0.15s ease;
          font-family: inherit;
        }
        .bp-btn:active:not(:disabled) { transform: scale(0.97); }
        .bp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .bp-btn-primary { background: var(--bp-accent); color: #fff; }
        .bp-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
        .bp-btn-outline { background: #fff; border-color: var(--bp-line); color: var(--bp-ink); }
        .bp-btn-outline:hover:not(:disabled) { background: var(--bp-canvas); }
        .bp-btn-ghost { background: transparent; color: #475569; border-color: var(--bp-line); }
        .bp-btn-ghost:hover:not(:disabled) { background: #fff; }
        .bp-btn-danger-ghost { background: transparent; color: #b91c1c; border-color: #fad1d1; }
        .bp-btn-danger-ghost:hover:not(:disabled) { background: #fef2f2; }
        .bp-btn-danger { background: #dc2626; color: #fff; }
        .bp-btn-danger:hover:not(:disabled) { background: #b91c1c; }
        .bp-btn-flat { background: var(--bp-canvas); color: var(--bp-faint); border-color: var(--bp-line); width: 100%; }
        .bp-btn-sm { padding: 0.35rem 0.7rem; font-size: 0.72rem; }
        .bp-btn-block { width: 100%; margin-top: 0.6rem; }
        .bp-tile .bp-btn { width: 100%; }

        /* ── Wallet card ─────────────────────────────────────── */
        .bp-wallet-card {
          border-color: rgba(27,166,114,0.35) !important;
          background: linear-gradient(135deg, #f0fbf6 0%, #f5fefa 100%) !important;
        }
        .bp-wallet-amount {
          font-size: 1.5rem; font-weight: 800; font-family: var(--bp-font-mono);
          color: #1ba672; letter-spacing: -1px; margin-bottom: 0.25rem;
        }
        .bp-wallet-sub {
          font-size: 0.73rem; color: #2d7a56; line-height: 1.4; margin: 0 0 0.5rem;
        }
        .bp-wallet-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(27,166,114,0.12); color: #1ba672;
          font-size: 0.65rem; font-weight: 700; padding: 3px 8px;
          border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;
        }

        .bp-side { display: flex; flex-direction: column; gap: 1rem; position: sticky; top: 1.25rem; }
        .bp-side-card {
          background: var(--bp-card); border: 1px solid var(--bp-line);
          border-radius: var(--bp-radius-md); padding: 1.1rem;
          animation: bp-rise 0.4s cubic-bezier(.16,1,.3,1);
        }
        .bp-side-card--grow { max-height: 560px; display: flex; flex-direction: column; }
        .bp-side-card-head {
          display: flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em; color: var(--bp-faint); margin-bottom: 0.8rem; flex-shrink: 0;
        }
        .bp-side-loading { display: flex; justify-content: center; padding: 1.5rem 0; color: var(--bp-faint); }
        .bp-side-empty { font-size: 0.76rem; color: var(--bp-faint); text-align: center; padding: 1rem 0; line-height: 1.5; }

        .bp-pm { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; }
        .bp-pm-card { display: flex; flex-direction: column; gap: 1px; }
        .bp-pm-brand { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--bp-muted); }
        .bp-pm-dots { font-family: var(--bp-font-mono); font-size: 0.85rem; font-weight: 400; }
        .bp-pm-exp { font-size: 0.7rem; color: var(--bp-faint); font-family: var(--bp-font-mono); }
        .bp-pm-upcoming {
          display: flex; justify-content: space-between; align-items: center;
          background: var(--bp-canvas); border-radius: 8px; padding: 0.5rem 0.65rem;
          font-size: 0.74rem; color: var(--bp-muted); margin-bottom: 0.7rem;
        }
        .bp-pm-upcoming strong { color: var(--bp-ink); font-family: var(--bp-font-mono); }

        .bp-hist-list { overflow-y: auto; display: flex; flex-direction: column; gap: 0.7rem; padding-right: 2px; }
        .bp-hist-list::-webkit-scrollbar { width: 5px; }
        .bp-hist-list::-webkit-scrollbar-thumb { background: var(--bp-line); border-radius: 3px; }
        .bp-hist-row { display: flex; gap: 0.6rem; align-items: flex-start; }
        .bp-hist-icon { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .bp-hist-body { min-width: 0; flex: 1; }
        .bp-hist-line1 { display: flex; justify-content: space-between; gap: 6px; align-items: baseline; }
        .bp-hist-desc { font-size: 0.78rem; font-weight: 400; text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bp-hist-amount { font-family: var(--bp-font-mono); font-size: 0.74rem; color: var(--bp-muted); flex-shrink: 0; }
        .bp-hist-line2 { display: flex; gap: 8px; align-items: center; font-size: 0.68rem; color: var(--bp-faint); margin-top: 1px; }
        .bp-hist-link { display: inline-flex; align-items: center; gap: 2px; color: var(--bp-accent); text-decoration: none; font-weight: 400; }
        .bp-hist-link:hover { text-decoration: underline; }

        .bp-modal-overlay {
          position: fixed; inset: 0; background: rgba(15,17,26,0.45); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000;
          animation: bp-fade-in 0.18s ease;
        }
        @keyframes bp-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .bp-modal {
          background: #fff; border-radius: 18px; padding: 1.75rem; max-width: 380px; width: 100%;
          text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.22);
          animation: bp-pop-in 0.22s cubic-bezier(.16,1,.3,1);
        }
        @keyframes bp-pop-in { from { opacity: 0; transform: scale(0.94) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .bp-modal-icon { width: 46px; height: 46px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.6rem; }
        .bp-modal-icon--danger { background: #fef2f2; color: #dc2626; }
        .bp-modal-icon--info { background: #eef0fe; color: #5b5fef; }
        .bp-modal h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.5rem; }
        .bp-modal p { font-size: 0.84rem; color: var(--bp-muted); line-height: 1.5; margin: 0; }
        .bp-modal-actions { display: flex; justify-content: center; gap: 0.6rem; margin-top: 1.4rem; }

        .bp-spin { animation: bp-spin 0.8s linear infinite; }
        @keyframes bp-spin { to { transform: rotate(360deg); } }
        .bp-empty { text-align: center; padding: 2.5rem 1rem; color: var(--bp-faint); }
        .bp-empty p { font-size: 0.82rem; margin-top: 0.5rem; }

        .bp-skel {
          background: linear-gradient(90deg, #e9ebf2 25%, #f4f5f9 50%, #e9ebf2 75%);
          background-size: 200% 100%; animation: bp-shimmer 1.4s infinite; border-radius: 16px;
        }
        .bp-skel-top { height: 48px; border-radius: 12px; margin-bottom: 1.25rem; }
        @keyframes bp-shimmer { to { background-position: -200% 0; } }

        @media (max-width: 640px) {
          .bp-shell { padding: 1.25rem 0.85rem 3rem; }
          .bp-hero { padding: 1.25rem; }
          .bp-hero-top { flex-direction: column; align-items: stretch; }
          .bp-hero-actions { width: 100%; }
          .bp-hero-actions .bp-btn { flex: 1; }
        }
        .bp-usage-hist-card { margin-top: 0; }

        .bp-uhist-list {
          display: flex; flex-direction: column; gap: 0.6rem;
          max-height: 320px; overflow-y: auto; padding-right: 2px;
        }
        .bp-uhist-list::-webkit-scrollbar { width: 4px; }
        .bp-uhist-list::-webkit-scrollbar-thumb { background: var(--bp-line); border-radius: 3px; }

        .bp-uhist-row {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.45rem 0; border-bottom: 1px solid var(--bp-line);
        }
        .bp-uhist-row:last-child { border-bottom: none; }

        .bp-uhist-icon {
          width: 26px; height: 26px; border-radius: 7px;
          background: rgba(91,95,239,0.08); color: #5b5fef;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .bp-uhist-body {
          flex: 1; min-width: 0; display: flex;
          flex-direction: column; gap: 1px;
        }
        .bp-uhist-label {
          font-size: 0.78rem; font-weight: 400; color: var(--bp-ink);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .bp-uhist-meta { font-size: 0.67rem; color: var(--bp-faint); }
        .bp-uhist-id { font-family: var(--bp-font-mono); }

        .bp-uhist-change {
          font-size: 0.72rem; font-weight: 800; padding: 2px 6px;
          border-radius: 5px; flex-shrink: 0;
        }
        .bp-uhist-change.up { background: #e8f8f0; color: #0d6b48; }
        .bp-uhist-change.down { background: #fef2f2; color: #b91c1c; }

        .bp-uhist-pager {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 0.75rem; padding-top: 0.6rem;
          border-top: 1px solid var(--bp-line);
        }
        .bp-uhist-page { font-size: 0.72rem; color: var(--bp-faint); }

        /* Outstanding card */
        .bp-outstanding-card {
          border-color: rgba(194,120,12,0.3) !important;
          background: #fffbf0 !important;
        }
        .bp-outstanding-amount {
          display: flex; justify-content: space-between;
          align-items: baseline; margin-bottom: 0.4rem;
        }
        .bp-outstanding-label {
          font-size: 0.72rem; text-transform: uppercase;
          letter-spacing: 0.05em; color: #8a5c08; font-weight: 700;
        }
        .bp-outstanding-value {
          font-size: 1.4rem; font-weight: 800;
          color: #c2780c; font-family: var(--bp-font-mono);
        }
        .bp-outstanding-inv-row {
          display: flex; justify-content: space-between;
          align-items: center; font-size: 0.74rem;
          color: var(--bp-muted); padding: 3px 0;
          border-bottom: 1px solid rgba(194,120,12,0.12);
        }
        .bp-outstanding-inv-amount { font-family: var(--bp-font-mono); font-weight: 400; }
      `}</style>
        </div>
    );
}
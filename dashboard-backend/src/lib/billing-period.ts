/**
 * lib/billing-period.ts
 *
 * SINGLE SOURCE OF TRUTH for resolving the "current usage period" for a user.
 *
 * Why this file exists:
 * Previously, period bounds were independently re-derived in:
 *   - lib/subscription-usage.ts (incrementUsage)
 *   - api/listings/submit (quota check)
 *   - api/job-bank-requests (quota check)
 *   - api/subscription/usage (GET, dashboard display)
 *
 * Each one computed `periodEnd` fallback as `new Date(Date.now() - ...)` or
 * similar at CALL TIME. For free-tier users (who have no Stripe period at
 * all), this meant every call could compute a *slightly different* periodEnd
 * depending on the exact millisecond it ran, and depending on whether it was
 * "before" or "after" a month boundary. Combined with the unique index
 * { userId, periodStart, periodEnd } on SubscriptionUsage, this risked:
 *   - duplicate usage documents for the same logical period
 *   - quota checks reading a different (often empty) document than the one
 *     incrementUsage just wrote to
 *
 * Fix: periods are now deterministic, computed from CALENDAR MONTH boundaries
 * for free-tier/no-Stripe users, and from the exact Stripe period for paid
 * users. Every caller MUST go through resolveBillingPeriod() instead of
 * inlining this logic.
 */

export interface ResolvedPeriod {
    periodStart: Date;
    periodEnd: Date;
    /** true if this period came from an active Stripe subscription, false if synthesized (free tier) */
    isStripePeriod: boolean;
}

interface ProfileSubscriptionLike {
    currentPeriodStart?: Date | string | null;
    currentPeriodEnd?: Date | string | null;
}

/**
 * Returns the UTC calendar-month boundaries containing `at`.
 * Deterministic for a given input — does NOT depend on Date.now() drifting
 * between calls within the same request lifecycle.
 */
function calendarMonthBounds(at: Date): { start: Date; end: Date } {
    const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return { start, end };
}

/**
 * Resolve the billing period a usage event/check should be attributed to.
 *
 * @param subscription  profile.subscription (or equivalent) — may be undefined
 * @param at             the "as of" timestamp; defaults to now. Pass an explicit
 *                        Date in tests or when re-processing historical events.
 */
export function resolveBillingPeriod(
    subscription: ProfileSubscriptionLike | undefined | null,
    at: Date = new Date()
): ResolvedPeriod {
    const rawStart = subscription?.currentPeriodStart;
    const rawEnd = subscription?.currentPeriodEnd;

    if (rawStart && rawEnd) {
        const periodStart = new Date(rawStart);
        const periodEnd = new Date(rawEnd);
        if (!isNaN(periodStart.getTime()) && !isNaN(periodEnd.getTime()) && periodEnd > periodStart) {
            return { periodStart, periodEnd, isStripePeriod: true };
        }
        // Fall through to calendar-month if Stripe dates are somehow malformed —
        // better to degrade gracefully than to throw mid-request.
    }

    const { start, end } = calendarMonthBounds(at);
    return { periodStart: start, periodEnd: end, isStripePeriod: false };
}

/**
 * Build the exact Mongo query fragment for finding the usage doc for a period.
 * Use this for BOTH reads and writes so they always agree.
 */
export function periodQuery(period: ResolvedPeriod) {
    return {
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
    };
}
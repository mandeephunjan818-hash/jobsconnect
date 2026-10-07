/**
 * lib/stripe-period.ts
 *
 * WHY THIS FILE EXISTS:
 *
 * Stripe moved `current_period_start` / `current_period_end` off the
 * top-level Subscription object onto each subscription ITEM as part of
 * the multi-item-subscription-dates change. Depending on API version,
 * either or both locations may be populated:
 *
 *   - Older API versions: subscription.current_period_start/end (top-level)
 *   - Newer API versions (incl. 2026-08-26.dahlia, used in this codebase):
 *     subscription.items.data[0].current_period_start/end
 *
 * The previous code in webhooks/stripe and billing/switch read ONLY the
 * top-level field. On the pinned API version here, that field comes back
 * `undefined`, which silently failed the `typeof rawStart === 'number'`
 * check and persisted `currentPeriodStart`/`currentPeriodEnd` as `null`
 * forever — even for fully active, paid subscriptions. That's what
 * produced the permanent "Activating… Syncing from Stripe" / "No active
 * billing cycle" state in the dashboard despite status: 'active'.
 *
 * This helper checks BOTH locations (item-level first, since that's
 * correct for the pinned API version, then top-level as a fallback for
 * safety if Stripe changes shape again or the account is on an older
 * pinned version), so the fix is correct regardless of which field
 * Stripe actually populates.
 */

import type Stripe from 'stripe';

export interface ResolvedStripePeriod {
    start: Date | null;
    end: Date | null;
}

/**
 * Pull current_period_start/end off a Stripe Subscription, checking the
 * subscription item first (current API shape) and falling back to the
 * top-level subscription fields (older API shape / extra safety).
 */
export function resolveStripeSubscriptionPeriod(
    sub: Stripe.Subscription
): ResolvedStripePeriod {
    const item = sub.items?.data?.[0] as
        | (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number })
        | undefined;

    const rawStart =
        item?.current_period_start ??
        (sub as unknown as { current_period_start?: number }).current_period_start;

    const rawEnd =
        item?.current_period_end ??
        (sub as unknown as { current_period_end?: number }).current_period_end;

    const start =
        typeof rawStart === 'number' && !isNaN(rawStart) ? new Date(rawStart * 1000) : null;
    const end =
        typeof rawEnd === 'number' && !isNaN(rawEnd) ? new Date(rawEnd * 1000) : null;

    return { start, end };
}
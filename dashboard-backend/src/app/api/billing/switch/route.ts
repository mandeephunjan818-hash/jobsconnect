/**
 * app/api/billing/switch/route.ts
 *
 * CHANGES IN THIS PASS:
 *
 * 1. AUTO-RENEWAL CONSENT GUARD (NEW):
 *    If the user has previously turned auto-renewal off
 *    (subscription.cancelAtPeriodEnd === true), switching plans is now
 *    BLOCKED with a clear error unless the request explicitly opts back in
 *    via `resumeAutoBilling: true` in the body. Previously the route
 *    unconditionally passed `cancel_at_period_end: false` to Stripe on
 *    every switch, silently re-enabling auto-renewal (and, on upgrade,
 *    charging the card) even for users who had explicitly cancelled.
 *
 * 2. DOWNGRADE OVERAGE GUARD (CHANGED):
 *    Previously, downgrade always zeroed `extras`. Now: if the user has
 *    already used MORE of a resource this period than the new plan's base
 *    limit allows, extras absorb exactly that overage — so their
 *    effective limit never drops below what they've already legitimately
 *    used. This prevents permanent quota lockout (effectiveLimit < used,
 *    which made incrementUsageWithLimitCheck's atomic $lt guard
 *    unsatisfiable forever). If usage is already within the new plan's
 *    base limit, extras stay 0, same as before. These overage-guard
 *    extras expire at the end of the CURRENT period — next period the
 *    user is fully on the new plan's limits with usage reset to 0.
 *    Upgrade behavior (carry over unused headroom as a bonus) is
 *    unchanged.
 *
 * 3. FRESH-PERIOD-ON-UPGRADE FIX (NEW):
 *    billing_cycle_anchor: 'now' can momentarily echo the OLD item period
 *    in the synchronous update() response. On upgrade, we now re-fetch
 *    the subscription once after the update to read settled period data
 *    before persisting it, so the dashboard countdown actually resets
 *    instead of continuing to show time left on the previous cycle.
 *
 * 4. lastWebhookEventAt now stamped on every switch-route write (NEW),
 *    so subsequent webhook events (e.g. a cancellation from the Stripe
 *    Dashboard arriving shortly after an in-app switch) are compared
 *    against the most recent write regardless of which code path
 *    produced it, instead of only ever being compared against the last
 *    WEBHOOK write.
 *
 * 5. Same current_period_start/end fix as the webhook — uses the shared
 *    resolveStripeSubscriptionPeriod() helper (unchanged from before).
 *
 * 6. 'listing' included in EXTRAS_RESOURCE_MAP (unchanged from before).
 *
 * 7. 3DS/SCA recovery path (unchanged from before).
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile, ISubscriptionExtras } from '@/modal/User';
import { SubscriptionPlan } from '@/modal/SubscriptionPlan';
import { BillingHistory } from '@/modal/BillingHistory';
import { getCurrentUsage, getEffectiveLimit } from '@/lib/subscription-usage';
import { resolveStripeSubscriptionPeriod } from '@/lib/stripe-period';
import { ResourceType } from '@/modal/SubscriptionUsageEvent';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

const EXTRAS_RESOURCE_MAP: {
    extrasField: keyof ISubscriptionExtras;
    resourceType: ResourceType;
    usageField: 'listingsUsed' | 'applicantsUsed' | 'manualPostsUsed' | 'autoPostsUsed' | 'jobBankRequestsUsed';
    /** Plan document field that holds this resource's BASE limit */
    planLimitField: 'listingQuota' | 'applicantLimit' | 'manualPostLimit' | 'autoPostLimit' | 'jobBankRequestLimit';
}[] = [
        { extrasField: 'listingQuota', resourceType: 'listing', usageField: 'listingsUsed', planLimitField: 'listingQuota' },
        { extrasField: 'applicantLimit', resourceType: 'applicant', usageField: 'applicantsUsed', planLimitField: 'applicantLimit' },
        { extrasField: 'manualPostLimit', resourceType: 'manual_post', usageField: 'manualPostsUsed', planLimitField: 'manualPostLimit' },
        { extrasField: 'autoPostLimit', resourceType: 'auto_post', usageField: 'autoPostsUsed', planLimitField: 'autoPostLimit' },
        { extrasField: 'jobBankRequestLimit', resourceType: 'job_bank_request', usageField: 'jobBankRequestsUsed', planLimitField: 'jobBankRequestLimit' },
    ];

const ZERO_EXTRAS: ISubscriptionExtras = {
    listingQuota: 0, applicantLimit: 0, manualPostLimit: 0,
    autoPostLimit: 0, jobBankRequestLimit: 0,
};

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let planKey: string;
    let resumeAutoBilling = false;
    try {
        const body = await req.json();
        planKey = body.planKey;
        resumeAutoBilling = body.resumeAutoBilling === true;
        if (!planKey || typeof planKey !== 'string') throw new Error();
    } catch {
        return NextResponse.json({ error: 'planKey is required' }, { status: 400 });
    }

    await connectToDatabase();

    const plan = await SubscriptionPlan.findOne({ key: planKey, isActive: true }).lean();
    if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    if (!plan.stripePriceId) {
        return NextResponse.json({ error: 'This plan has no payment price attached' }, { status: 400 });
    }

    const profile = await UserProfile.findOne({
        userId: new mongoose.Types.ObjectId(token.id),
    }).lean();

    if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const subscriptionId = profile.subscription?.stripeSubscriptionId;
    const currentStatus = profile.subscription?.status ?? '';
    const previousPlanKey = profile.subscription?.planKey ?? 'free';

    if (!subscriptionId || !ACTIVE_STATUSES.has(currentStatus)) {
        return NextResponse.json(
            {
                error: 'No active subscription to switch. Subscribe to a plan first.',
                code: 'NO_ACTIVE_SUBSCRIPTION',
            },
            { status: 409 }
        );
    }

    if (previousPlanKey === planKey) {
        return NextResponse.json(
            { error: `You're already on the ${plan.name} plan.` },
            { status: 409 }
        );
    }

    // ── NEW: auto-renewal consent guard ────────────────────────────────────
    // If the user already turned auto-renewal off, switching plans would
    // previously silently turn it back on (and, on upgrade, charge the
    // card) with no fresh consent. Block unless explicitly confirmed.
    if (profile.subscription?.cancelAtPeriodEnd && !resumeAutoBilling) {
        return NextResponse.json(
            {
                error:
                    "Auto-renewal is currently off for your account, so we won't change your plan " +
                    "or charge your card automatically. Turn auto-renewal back on if you'd like to " +
                    'switch plans now — otherwise your current plan will simply expire as scheduled.',
                code: 'AUTO_RENEWAL_OFF',
            },
            { status: 409 }
        );
    }

    const currentPlanDoc = await SubscriptionPlan.findOne({ key: previousPlanKey, isActive: true }).lean();
    const currentPrice = currentPlanDoc?.price ?? 0;
    const isUpgrade = plan.price > currentPrice;

    // ── Compute extras: upgrade = bonus carry-over, downgrade = overage guard ──
    let computedExtras: ISubscriptionExtras = { ...ZERO_EXTRAS };
    let extrasReason: 'upgrade_carryover' | 'downgrade_overage_guard' | null = null;

    const currentUsage = await getCurrentUsage(token.id);

    if (isUpgrade) {
        // Carry over unused headroom from the OLD (higher) plan as a
        // temporary bonus on top of the new plan's already-higher limits.
        if (currentUsage) {
            for (const { extrasField, resourceType, usageField } of EXTRAS_RESOURCE_MAP) {
                const effectiveLimit = getEffectiveLimit(profile.subscription, resourceType);
                if (effectiveLimit <= 0) continue;
                const used = (currentUsage as any)[usageField] ?? 0;
                const leftover = Math.max(0, effectiveLimit - used);
                computedExtras[extrasField] = leftover;
            }
            if (Object.values(computedExtras).some(v => v > 0)) extrasReason = 'upgrade_carryover';
        }
    } else {
        // DOWNGRADE: extras are NOT a bonus here — they exist only to cover
        // usage already incurred THIS PERIOD that exceeds the new plan's
        // base limit, so effectiveLimit (new base + extras) never drops
        // below what the user has already legitimately used. If usage is
        // already within the new plan's limit, extras stay 0.
        if (currentUsage) {
            for (const { extrasField, usageField, planLimitField } of EXTRAS_RESOURCE_MAP) {
                const newBaseLimit = (plan as any)[planLimitField] ?? 0;
                const used = (currentUsage as any)[usageField] ?? 0;
                const overage = Math.max(0, used - newBaseLimit);
                computedExtras[extrasField] = overage;
            }
            if (Object.values(computedExtras).some(v => v > 0)) extrasReason = 'downgrade_overage_guard';
        }
    }

    const shouldClearCancellation = resumeAutoBilling || !profile.subscription?.cancelAtPeriodEnd;

    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const itemId = subscription.items.data[0]?.id;
        if (!itemId) {
            return NextResponse.json({ error: 'Subscription has no billable item' }, { status: 500 });
        }

        let updated: Stripe.Subscription;

        if (isUpgrade) {
            // UPGRADE: reset billing cycle, charge full new price immediately.
            updated = await stripe.subscriptions.update(subscriptionId, {
                items: [{ id: itemId, price: plan.stripePriceId }],
                billing_cycle_anchor: 'now',
                proration_behavior: 'none',
                payment_behavior: 'error_if_incomplete',
                ...(shouldClearCancellation ? { cancel_at_period_end: false } : {}),
                metadata: { userId: token.id, planKey },
                expand: ['latest_invoice.payment_intent'],
            });
        } else {
            // DOWNGRADE: proration creates a credit, no immediate charge.
            updated = await stripe.subscriptions.update(subscriptionId, {
                items: [{ id: itemId, price: plan.stripePriceId }],
                proration_behavior: 'create_prorations',
                payment_behavior: 'error_if_incomplete',
                ...(shouldClearCancellation ? { cancel_at_period_end: false } : {}),
                metadata: { userId: token.id, planKey },
                expand: ['latest_invoice.payment_intent'],
            });
        }

        // ── Fresh-period-on-upgrade fix ──────────────────────────────────
        // billing_cycle_anchor:'now' can momentarily echo the OLD item
        // period in the synchronous update() response. Re-fetch once to
        // get settled period data before persisting it.
        let periodSource: Stripe.Subscription = updated;
        if (isUpgrade) {
            try {
                periodSource = await stripe.subscriptions.retrieve(subscriptionId);
            } catch (err) {
                console.warn(
                    `[switch] Could not re-fetch subscription ${subscriptionId} after upgrade ` +
                    `to confirm settled period dates; using the update() response as-is.`,
                    err
                );
            }
        }

        const { start: currentPeriodStart, end: currentPeriodEnd } = resolveStripeSubscriptionPeriod(periodSource);

        if (
            isUpgrade &&
            currentPeriodStart &&
            profile.subscription?.currentPeriodStart &&
            new Date(profile.subscription.currentPeriodStart).getTime() === currentPeriodStart.getTime()
        ) {
            console.warn(
                `[switch] Upgrade for user ${token.id} produced a period identical to the ` +
                `pre-switch period even after re-fetch — billing_cycle_anchor reset may not ` +
                `have settled yet. The webhook (customer.subscription.updated) should correct ` +
                `this shortly.`
            );
        }

        const hasAnyExtras = Object.values(computedExtras).some(v => v > 0);
        const extrasExpiresAt = hasAnyExtras ? (currentPeriodEnd ?? undefined) : undefined;

        // Wallet credit from proration (downgrade only — Stripe generates a credit note)
        let walletCredit = 0;
        if (!isUpgrade) {
            const latestInvoiceId = typeof updated.latest_invoice === 'string'
                ? updated.latest_invoice
                : updated.latest_invoice?.id;
            if (latestInvoiceId) {
                const invoice = await stripe.invoices.retrieve(latestInvoiceId);
                if (invoice.amount_remaining < 0) {
                    walletCredit = -invoice.amount_remaining;
                }
            }
        }

        // Build Mongo update
        const updateSet: any = {
            'subscription.planKey': planKey,
            'subscription.status': updated.status,
            'subscription.cancelAtPeriodEnd': updated.cancel_at_period_end ?? false,
            'subscription.listingQuota': plan.listingQuota,
            'subscription.applicantLimit': plan.applicantLimit,
            'subscription.manualPostLimit': plan.manualPostLimit,
            'subscription.autoPostLimit': plan.autoPostLimit,
            'subscription.postVisibilityDays': plan.postVisibilityDays,
            'subscription.jobBankRequestLimit': (plan as any).jobBankRequestLimit ?? 5,
            'subscription.currentPeriodStart': currentPeriodStart,
            'subscription.currentPeriodEnd': currentPeriodEnd,
            'subscription.extras': hasAnyExtras ? computedExtras : ZERO_EXTRAS,
            'subscription.extrasExpiresAt': hasAnyExtras && extrasExpiresAt ? extrasExpiresAt : null,
            // Stamp so subsequent webhook events are correctly ordered
            // against this write, regardless of which code path wrote last.
            'subscription.lastWebhookEventAt': Math.floor(Date.now() / 1000),
        };

        const updateOps: any = { $set: updateSet };
        if (walletCredit > 0) {
            updateOps.$inc = { 'subscription.walletBalance': walletCredit };
        }

        await UserProfile.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(token.id) },
            updateOps
        );

        await BillingHistory.create({
            userId: new mongoose.Types.ObjectId(token.id),
            stripeCustomerId: typeof updated.customer === 'string' ? updated.customer : updated.customer.id,
            eventType: 'plan_change',
            amountPaid: isUpgrade ? plan.price : 0,
            currency: (updated.currency ?? 'usd').toLowerCase(),
            previousPlanKey,
            newPlanKey: planKey,
            periodStart: currentPeriodStart ?? undefined,
            periodEnd: currentPeriodEnd ?? undefined,
        });

        return NextResponse.json({
            success: true,
            planKey,
            status: updated.status,
            currentPeriodStart,
            currentPeriodEnd,
            extras: hasAnyExtras ? computedExtras : null,
            extrasReason,
            extrasExpiresAt: hasAnyExtras ? extrasExpiresAt : null,
            walletCredit: walletCredit > 0 ? walletCredit : undefined,
        });
    } catch (err: any) {
        // 3DS / SCA recovery path
        const isRequiresAction =
            err?.code === 'subscription_payment_intent_requires_action' ||
            err?.raw?.payment_intent?.status === 'requires_action' ||
            err?.payment_intent?.status === 'requires_action';

        if (isRequiresAction) {
            let portalUrl: string | undefined;
            try {
                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: profile.subscription!.stripeCustomerId!,
                    return_url: `${SITE_URL}/dashboard/billing`,
                });
                portalUrl = portalSession.url;
            } catch (portalErr) {
                console.error('[switch] Failed to create recovery portal session:', portalErr);
            }

            return NextResponse.json(
                {
                    error: 'Your bank requires additional verification to complete this charge. Your plan was not changed yet.',
                    code: 'REQUIRES_ACTION',
                    portalUrl,
                },
                { status: 402 }
            );
        }

        if (err?.type === 'StripeCardError') {
            return NextResponse.json(
                {
                    error: `Payment failed: ${err.message || 'your card was declined.'} Your plan was not changed.`,
                    code: 'CARD_ERROR',
                },
                { status: 402 }
            );
        }

        console.error('[switch] Unexpected error:', err);
        return NextResponse.json(
            { error: err?.message || 'Could not switch plans. Your plan was not changed. Please try again.' },
            { status: 500 }
        );
    }
}
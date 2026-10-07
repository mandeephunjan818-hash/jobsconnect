/**
 * app/api/webhooks/stripe/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';
import { SubscriptionPlan } from '@/modal/SubscriptionPlan';
import { BillingHistory } from '@/modal/BillingHistory';
import { SubscriptionUsage } from '@/modal/SubscriptionUsage';
import { ProcessedWebhookEvent } from '@/modal/ProcessedWebhookEvent';
import { resolveStripeSubscriptionPeriod } from '@/lib/stripe-period';
import { topUpWallet } from '@/lib/credits';
import mongoose from 'mongoose';
import { Redis } from '@upstash/redis';


const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-08-26.dahlia',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// ── Helpers ─────────────────────────────────────────────────

function mapStripeStatus(status: Stripe.Subscription['status']): 'active' | 'canceled' | 'past_due' | 'trialing' {
    switch (status) {
        case 'active': return 'active';
        case 'trialing': return 'trialing';
        case 'past_due': return 'past_due';
        case 'canceled':
        case 'incomplete':
        case 'incomplete_expired':
        case 'unpaid':
        default: return 'canceled';
    }
}

async function resolvePlanByPriceId(priceId: string) {
    const plan = await SubscriptionPlan.findOne({ stripePriceId: priceId }).lean();
    if (!plan) {
        throw new Error(
            `[webhook] No SubscriptionPlan mapped for Stripe priceId="${priceId}". ` +
            `Fix the plan mapping or ensure planKey metadata is present.`
        );
    }
    console.log(`[webhook] Plan resolved by price ID: ${plan.key} (priceId: ${priceId})`);
    return plan;
}

async function resolvePlanByKey(planKey: string) {
    const plan = await SubscriptionPlan.findOne({ key: planKey }).lean();
    if (plan) {
        console.log(`[webhook] Plan resolved by key: ${planKey}`);
    } else {
        console.warn(`[webhook] Plan with key="${planKey}" not found in DB`);
    }
    return plan;
}

async function syncSubscriptionToProfile(
    stripeCustomerId: string,
    stripeSub: Stripe.Subscription,
    eventCreated: number,
    previousPlanKeyOverride?: string,
    planKeyOverride?: string
) {
    console.log(`[webhook] syncSubscriptionToProfile called for customer ${stripeCustomerId}`);
    console.log(`[webhook]   planKeyOverride = ${planKeyOverride || '(none)'}`);
    console.log(`[webhook]   subscription id = ${stripeSub.id}`);
    const priceId = stripeSub.items.data[0]?.price?.id;
    console.log(`[webhook]   price ID from subscription = ${priceId || '(none)'}`);

    let plan;
    if (planKeyOverride) plan = await resolvePlanByKey(planKeyOverride);
    if (!plan && priceId) plan = await resolvePlanByPriceId(priceId);
    if (!plan) {
        console.error(`[webhook] Could not resolve a plan for customer ${stripeCustomerId}. Skipping sync.`);
        return;
    }

    const status = mapStripeStatus(stripeSub.status);
    const { start: currentPeriodStart, end: currentPeriodEnd } = resolveStripeSubscriptionPeriod(stripeSub);

    if (!currentPeriodStart || !currentPeriodEnd) {
        console.warn(
            `[webhook] Could not resolve period dates for subscription ${stripeSub.id}. ` +
            `The dashboard will show "Activating…" until a later event provides them.`
        );
    }

    const cancelAtPeriodEnd = Boolean((stripeSub as any).cancel_at_period_end);

    console.log(`[webhook] Resolved plan: ${plan.key}, status: ${status}, periodEnd: ${currentPeriodEnd?.toISOString() ?? '(none)'}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}`);

    const existingProfile = await UserProfile.findOne({
        'subscription.stripeCustomerId': stripeCustomerId,
    }).lean();

    if (!existingProfile) {
        console.error(`[webhook] No profile for stripeCustomerId=${stripeCustomerId}`);
        return;
    }

    const lastEventAt = (existingProfile.subscription as any)?.lastWebhookEventAt as number | undefined;
    if (lastEventAt && eventCreated < lastEventAt) {
        console.warn(
            `[webhook] Ignoring stale event for stripeCustomerId=${stripeCustomerId}: ` +
            `event.created=${eventCreated} < lastWebhookEventAt=${lastEventAt}`
        );
        return;
    }

    const previousPlanKey = previousPlanKeyOverride ?? existingProfile.subscription?.planKey;

    const updateSet: any = {
        'subscription.planKey': plan.key,
        'subscription.status': status,
        'subscription.stripeSubscriptionId': stripeSub.id,
        'subscription.cancelAtPeriodEnd': cancelAtPeriodEnd,
        'subscription.listingQuota': plan.listingQuota,
        'subscription.applicantLimit': plan.applicantLimit,
        'subscription.manualPostLimit': plan.manualPostLimit,
        'subscription.autoPostLimit': plan.autoPostLimit,
        'subscription.postVisibilityDays': plan.postVisibilityDays,
        'subscription.lastWebhookEventAt': eventCreated,
        'subscription.currentPeriodStart': currentPeriodStart,
        'subscription.currentPeriodEnd': currentPeriodEnd,
    };

    const profile = await UserProfile.findOneAndUpdate(
        {
            'subscription.stripeCustomerId': stripeCustomerId,
            $or: [
                { 'subscription.lastWebhookEventAt': { $exists: false } },
                { 'subscription.lastWebhookEventAt': { $lte: eventCreated } },
            ],
        },
        { $set: updateSet },
        { returnDocument: 'after' }
    ).lean();

    if (!profile) {
        console.warn(`[webhook] syncSubscriptionToProfile write skipped/raced for stripeCustomerId=${stripeCustomerId}`);
        return;
    }

    if (profile) {
        await redis.set(`wallet-ready:${profile.userId}`, '1', { ex: 120 });
    }

    console.log(`[webhook] Successfully updated profile for user ${profile.userId}`);

    if (previousPlanKey && previousPlanKey !== plan.key) {
        console.log(`[webhook] Plan changed from ${previousPlanKey} to ${plan.key} – recording history.`);

        const billingData: any = {
            userId: profile.userId,
            stripeCustomerId,
            eventType: 'plan_change',
            amountPaid: 0,
            currency: (stripeSub as any).currency ?? 'usd',
            previousPlanKey,
            newPlanKey: plan.key,
        };

        if (currentPeriodStart) billingData.periodStart = currentPeriodStart;
        if (currentPeriodEnd) billingData.periodEnd = currentPeriodEnd;

        await BillingHistory.create(billingData);

        if (currentPeriodStart && currentPeriodEnd) {
            await SubscriptionUsage.findOneAndUpdate(
                { userId: profile.userId, periodStart: currentPeriodStart, periodEnd: currentPeriodEnd },
                { $set: { planKey: plan.key } }
            );
        } else {
            console.warn('[webhook] Skipping SubscriptionUsage update because period dates are missing.');
        }
    }

    return profile;
}

async function downgradeToFree(stripeCustomerId: string, eventCreated: number) {
    console.log(`[webhook] Downgrading customer ${stripeCustomerId} to free.`);
    const freePlan = await SubscriptionPlan.findOne({ key: 'free' }).lean();
    if (!freePlan) {
        console.error('[webhook] Free plan not found in DB!');
        return;
    }

    const existingProfile = await UserProfile.findOne({
        'subscription.stripeCustomerId': stripeCustomerId,
    }).lean();
    if (!existingProfile) {
        console.error(`[webhook] downgradeToFree: no profile for stripeCustomerId=${stripeCustomerId}`);
        return;
    }

    const lastEventAt = (existingProfile.subscription as any)?.lastWebhookEventAt as number | undefined;
    if (lastEventAt && eventCreated < lastEventAt) {
        console.warn(`[webhook] Ignoring stale deletion event for stripeCustomerId=${stripeCustomerId}`);
        return;
    }

    const profile = await UserProfile.findOneAndUpdate(
        {
            'subscription.stripeCustomerId': stripeCustomerId,
            $or: [
                { 'subscription.lastWebhookEventAt': { $exists: false } },
                { 'subscription.lastWebhookEventAt': { $lte: eventCreated } },
            ],
        },
        {
            $set: {
                'subscription.planKey': 'free',
                'subscription.status': 'canceled',
                'subscription.listingQuota': freePlan.listingQuota,
                'subscription.applicantLimit': freePlan.applicantLimit,
                'subscription.manualPostLimit': freePlan.manualPostLimit,
                'subscription.autoPostLimit': freePlan.autoPostLimit,
                'subscription.postVisibilityDays': freePlan.postVisibilityDays,
                'subscription.currentPeriodStart': null,
                'subscription.currentPeriodEnd': null,
                'subscription.cancelAtPeriodEnd': false,
                'subscription.extras': {
                    listingQuota: 0, applicantLimit: 0, manualPostLimit: 0,
                    autoPostLimit: 0, jobBankRequestLimit: 0,
                },
                'subscription.extrasExpiresAt': null,
                'subscription.lastWebhookEventAt': eventCreated,
            },
        },
        { new: true }
    ).lean();

    if (profile) {
        console.log(`[webhook] Downgrade successful for user ${profile.userId}`);
        await BillingHistory.create({
            userId: profile.userId,
            stripeCustomerId,
            eventType: 'cancellation',
            amountPaid: 0,
            currency: 'usd',
            previousPlanKey: existingProfile.subscription?.planKey ?? 'unknown',
        });
    } else {
        console.warn(`[webhook] downgradeToFree write skipped/raced for stripeCustomerId=${stripeCustomerId}`);
    }
}

// ── Credit bundle purchase handler ───────────────────────────────────────────

async function handleCreditBundlePurchase(session: Stripe.Checkout.Session): Promise<void> {
    const meta = session.metadata as Record<string, string> | null;

    if (!meta) {
        console.error('[webhook] credit_bundle_purchase: session has no metadata — cannot top up wallet.');
        return;
    }

    const {
        userId,
        stripeCustomerId,
        bundleKey,
        bundleName,
        credits,
        listingsPerCredit,
        creditExpiryDays,
        bundleId,
    } = meta;

    if (!userId || !stripeCustomerId || !bundleKey || !credits) {
        console.error('[webhook] credit_bundle_purchase: missing required metadata fields', meta);
        return;
    }

    // Retrieve the payment intent to get the confirmed amount & currency
    // (safer than trusting metadata for financial figures).
    let amountPaid = 0;
    let currency = 'usd';

    if (session.payment_intent) {
        try {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            amountPaid = pi.amount_received;
            currency = pi.currency;
        } catch (err) {
            console.warn('[webhook] credit_bundle_purchase: could not retrieve payment intent, falling back to session total', err);
            amountPaid = session.amount_total ?? 0;
            currency = session.currency ?? 'usd';
        }
    } else {
        amountPaid = session.amount_total ?? 0;
        currency = session.currency ?? 'usd';
    }

    console.log(
        `[webhook] credit_bundle_purchase: topping up wallet for userId=${userId}, ` +
        `bundle=${bundleKey}, credits=${credits}, amountPaid=${amountPaid} ${currency}`
    );

    await topUpWallet({
        userId,
        stripeCustomerId,
        bundleKey,
        bundleName: bundleName ?? bundleKey,
        credits: parseInt(credits, 10),
        listingsPerCredit: parseInt(listingsPerCredit ?? '1', 10),
        creditExpiryDays: parseInt(creditExpiryDays ?? '365', 10),
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string | undefined,
        amountPaid,
        currency,
    });

    await redis.set(`wallet-ready:${userId}`, '1', { ex: 120 });
    console.log(`[webhook] credit_bundle_purchase: wallet topped up successfully for userId=${userId}`);
}

// ── Main handler ──────────────────────────────────────────

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        console.error(
            '[webhook] Request received with NO stripe-signature header. Check that the endpoint ' +
            'URL in the Stripe Dashboard points exactly at this route.'
        );
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
    } catch (err) {
        console.error(
            '[webhook] Signature verification FAILED. STRIPE_WEBHOOK_SECRET in this deployment ' +
            'does not match the signing secret for this endpoint in the Stripe Dashboard ' +
            '(Developers > Webhooks > select endpoint > Signing secret).',
            err
        );
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[webhook] Received event ${event.id} of type ${event.type}`);

    await connectToDatabase();

    // Idempotency guard
    try {
        await ProcessedWebhookEvent.create({ eventId: event.id, eventType: event.type });
    } catch (err: any) {
        if (err?.code === 11000) {
            console.log(`[webhook] Duplicate event ${event.id} skipped.`);
            return NextResponse.json({ received: true, duplicate: true });
        }
        throw err;
    }

    try {
        switch (event.type) {

            // ── Checkout completed ─────────────────────────────────────────────
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const meta = session.metadata as Record<string, string> | null;
                const sessionType = meta?.type;

                console.log(`[webhook] checkout.session.completed — type=${sessionType ?? '(none)'}`);

                if (sessionType === 'credit_bundle_purchase') {
                    // ✅ Credit top-up — handled here, NOT as a subscription event
                    await handleCreditBundlePurchase(session);
                } else {
                    // Subscription checkout
                    const customerId = session.customer as string;
                    const subscriptionId = session.subscription as string;

                    if (!customerId || !subscriptionId) {
                        console.warn('[webhook] Missing customer or subscription in checkout session');
                        break;
                    }

                    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
                    const planKey = meta?.planKey as string | undefined;
                    console.log(`[webhook] checkout.session.completed (subscription) — planKey from metadata: ${planKey || '(none)'}`);
                    await syncSubscriptionToProfile(customerId, stripeSub, event.created, undefined, planKey);
                }
                break;
            }

            // ── Invoice created ────────────────────────────────────────────────
            case 'invoice.created': {
                const invoice = event.data.object as Stripe.Invoice;
                if (invoice.billing_reason === 'subscription_cycle' && invoice.status === 'draft') {
                    const customerId = invoice.customer as string;
                    const profile = await UserProfile.findOne({ 'subscription.stripeCustomerId': customerId }).lean();
                    const walletBalance = profile?.subscription?.walletBalance ?? 0;

                    if (walletBalance > 0) {
                        const invoiceTotal = invoice.total ?? 0;
                        const creditToApply = Math.min(walletBalance, Math.max(0, invoiceTotal));
                        const remainder = walletBalance - creditToApply;

                        if (creditToApply > 0) {
                            await stripe.invoiceItems.create({
                                customer: customerId,
                                amount: -creditToApply,
                                currency: invoice.currency,
                                description: 'Wallet balance applied',
                            });
                        }

                        await UserProfile.updateOne(
                            { 'subscription.stripeCustomerId': customerId },
                            { $set: { 'subscription.walletBalance': remainder } }
                        );
                        console.log(
                            `[webhook] Applied wallet credit ${creditToApply} to invoice ${invoice.id}, ` +
                            `remainder: ${remainder}`
                        );
                    }
                }
                break;
            }

            // ── Subscription updated ───────────────────────────────────────────
            case 'customer.subscription.updated': {
                const stripeSub = event.data.object as Stripe.Subscription;
                const customerId = stripeSub.customer as string;
                const planKey = (stripeSub.metadata as any)?.planKey as string | undefined;
                console.log(`[webhook] subscription.updated — planKey=${planKey || '(none)'}, status=${stripeSub.status}`);
                await syncSubscriptionToProfile(customerId, stripeSub, event.created, undefined, planKey);
                break;
            }

            // ── Subscription deleted ───────────────────────────────────────────
            case 'customer.subscription.deleted': {
                const stripeSub = event.data.object as Stripe.Subscription;
                const customerId = stripeSub.customer as string;
                console.log(`[webhook] subscription.deleted for customer ${customerId} — downgrading to free`);
                await downgradeToFree(customerId, event.created);
                break;
            }

            // ── Invoice payment ────────────────────────────────────────────────
            case 'invoice.payment_failed':
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;
                console.log(`[webhook] Processing invoice ${invoice.id} (${event.type})`);

                const profile = await UserProfile.findOne({ 'subscription.stripeCustomerId': customerId }).lean();
                const userId = profile?.userId;

                const isPaid = event.type === 'invoice.payment_succeeded';
                const status = isPaid ? 'paid' : (invoice.status ?? 'open');
                const amountPaid = isPaid ? invoice.amount_paid : 0;

                await BillingHistory.findOneAndUpdate(
                    { stripeInvoiceId: invoice.id },
                    {
                        $set: {
                            userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
                            stripeCustomerId: customerId,
                            eventType: 'invoice',
                            amountPaid,
                            currency: invoice.currency,
                            status,
                            invoiceUrl: invoice.hosted_invoice_url ?? undefined,
                            invoicePdf: invoice.invoice_pdf ?? undefined,
                            periodStart: new Date(invoice.period_start * 1000),
                            periodEnd: new Date(invoice.period_end * 1000),
                        },
                    },
                    { upsert: true, new: true }
                );


                if (isPaid) {
                    const subscriptionId = (invoice as any).subscription as string;
                    if (subscriptionId) {
                        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
                        const planKey = (stripeSub.metadata as any)?.planKey as string | undefined;
                        console.log(`[webhook] invoice.paid — planKey from sub metadata: ${planKey || '(none)'}`);
                        await syncSubscriptionToProfile(
                            customerId,
                            stripeSub,
                            event.created,
                            profile?.subscription?.planKey,
                            planKey
                        );
                    }
                }
                break;
            }

            default:
                console.log(`[webhook] Unhandled event type: ${event.type}`);
        }
    } catch (err) {
        console.error(`[webhook] Handler error for ${event.type}:`, err);
        await ProcessedWebhookEvent.deleteOne({ eventId: event.id }).catch(() => { });
        return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
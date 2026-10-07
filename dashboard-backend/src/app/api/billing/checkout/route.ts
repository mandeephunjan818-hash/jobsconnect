/**
 * app/api/billing/checkout/route.ts
 *
 * CHANGES FROM ORIGINAL:
 *
 * 1. GUARD AGAINST DUPLICATE ACTIVE SUBSCRIPTIONS: the original had no
 *    check for an existing active/trialing subscription before creating a
 *    new Checkout Session. A user could open two tabs, or double-click,
 *    or come back to an old bookmark/link, and start a second Stripe
 *    Checkout while already subscribed — resulting in two live Stripe
 *    subscriptions billing the same customer. Fix: if the profile already
 *    has a stripeSubscriptionId AND status is active/trialing/past_due
 *    (past_due is included because the right move there is the billing
 *    PORTAL, not a brand new subscription), we reject with a clear error
 *    pointing at the portal instead.
 *
 * 2. SAME-PLAN GUARD: if the requested planKey matches the user's current
 *    planKey and they have an active subscription, reject — there's
 *    nothing to check out for ("you're already on this plan").
 *
 * 3. Everything else (customer creation/persistence-before-payment,
 *    metadata threading) is unchanged — that part was already correct.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';
import { SubscriptionPlan } from '@/modal/SubscriptionPlan';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-08-26.dahlia',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export async function POST(req: NextRequest) {
    // ── Auth ───────────────────────────────────────────────────────────────
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    let planKey: string;
    try {
        const body = await req.json();
        planKey = body.planKey;
        if (!planKey || typeof planKey !== 'string') throw new Error();
    } catch {
        return NextResponse.json({ error: 'planKey is required' }, { status: 400 });
    }

    await connectToDatabase();

    // ── Resolve plan ───────────────────────────────────────────────────────
    const plan = await SubscriptionPlan.findOne({ key: planKey, isActive: true }).lean();
    if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    if (!plan.stripePriceId) {
        return NextResponse.json(
            { error: 'This plan has no payment price attached' },
            { status: 400 }
        );
    }

    // ── Fetch profile ──────────────────────────────────────────────────────
    const profile = await UserProfile.findOne({
        userId: new mongoose.Types.ObjectId(token.id),
    }).lean();

    if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // ── Guard: already has an active/trialing/past_due subscription ────────
    const hasLiveSubscription =
        !!profile.subscription?.stripeSubscriptionId &&
        ACTIVE_STATUSES.has(profile.subscription?.status ?? '');

    if (hasLiveSubscription) {
        if (profile.subscription?.planKey === planKey) {
            return NextResponse.json(
                { error: `You're already subscribed to the ${plan.name} plan.` },
                { status: 409 }
            );
        }
        return NextResponse.json(
            {
                error:
                    'You already have an active subscription. Use the billing portal to switch plans instead of starting a new checkout.',
                code: 'ALREADY_SUBSCRIBED',
            },
            { status: 409 }
        );
    }

    // ── Get or create Stripe customer ──────────────────────────────────────
    let stripeCustomerId = profile.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: token.email as string,
            name: profile.name,
            metadata: { userId: token.id },
        });
        stripeCustomerId = customer.id;

        // Persist immediately so the webhook can match even if the user
        // abandons the checkout and comes back later.
        await UserProfile.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(token.id) },
            { $set: { 'subscription.stripeCustomerId': stripeCustomerId } }
        );
    }

    // ── Create Checkout Session ────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: `${SITE_URL}/dashboard/wallet-payments/wallet?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/dashboard/wallet-payments/credits?canceled=true`,
        metadata: { userId: token.id, planKey },
        subscription_data: {
            metadata: { userId: token.id, planKey },
        },
        allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
}
/**
 * app/api/employer/credits/checkout/route.ts
 *
 * POST — create a Stripe Checkout Session for a credit bundle purchase.
 *
 * The session metadata carries everything the webhook needs to top up
 * the wallet without any extra DB lookup:
 *   type, userId, stripeCustomerId, bundleKey, bundleName,
 *   credits, listingsPerCredit, creditExpiryDays, bundleId
 *
 * On success Stripe redirects to /dashboard/wallet?purchased=true&session_id={CHECKOUT_SESSION_ID}
 * On cancel  Stripe redirects to /dashboard/credits?cancelled=true
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { CreditBundle } from '@/modal/CreditBundle';
import { getCreditSystemConfig } from '@/modal/CreditSystemConfig';
import { UserProfile } from '@/modal/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    let body: { bundleId: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.bundleId) {
        return NextResponse.json({ error: 'bundleId is required' }, { status: 400 });
    }

    await connectToDatabase();

    // ── Load bundle ───────────────────────────────────────────
    const bundle = await CreditBundle.findById(body.bundleId).lean();
    if (!bundle || !bundle.isActive) {
        return NextResponse.json({ error: 'Bundle not found or inactive' }, { status: 404 });
    }

    // ── Load config for exchange rate ─────────────────────────
    const config = await getCreditSystemConfig();

    // ── Resolve or create Stripe Customer ────────────────────
    const profile = await UserProfile.findOne({ userId }).lean();
    if (!profile) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    let stripeCustomerId = profile.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: session.user.email ?? undefined,
            name: session.user.name ?? undefined,
            metadata: { userId },
        });
        stripeCustomerId = customer.id;

        await UserProfile.updateOne(
            { userId },
            { $set: { 'subscription.stripeCustomerId': stripeCustomerId } }
        );
    }

    // ── Build metadata ────────────────────────────────────────
    // Everything the webhook needs — self-contained so no extra DB call.
    // type='credit_bundle_purchase' tells the webhook handler to call
    // topUpWallet instead of syncSubscriptionToProfile.
    const metadata: Record<string, string> = {
        type: 'credit_bundle_purchase',
        userId: String(userId),
        stripeCustomerId,
        bundleId: String(bundle._id),
        bundleKey: bundle.key,
        bundleName: bundle.name,
        credits: String(bundle.credits),
        listingsPerCredit: String(config.listingsPerCredit),
        creditExpiryDays: String(config.creditExpiryDays),
    };

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    // ── Create Checkout Session ───────────────────────────────
    const checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
            {
                price: bundle.stripePriceId,
                quantity: 1,
            },
        ],
        metadata,
        payment_intent_data: { metadata },
        // ✅ Fixed: points to /dashboard/wallet (not /employer/credits/wallet)
        success_url: `${baseUrl}/dashboard/wallet-payments/wallet?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
        // ✅ Fixed: cancel returns to /dashboard/credits
        cancel_url: `${baseUrl}/dashboard/wallet-payments/credits?cancelled=true`,
        customer_update: {
            address: 'auto',
        },
    });

    return NextResponse.json({ url: checkoutSession.url });
}
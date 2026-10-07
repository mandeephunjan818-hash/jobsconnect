/**
 * app/api/billing/cancel/route.ts
 *
 * FIXES:
 * 1. Updates UserProfile.subscription.cancelAtPeriodEnd = true in DB
 *    immediately after Stripe confirms, so the frontend's update() call
 *    gets fresh data without waiting for the webhook.
 * 2. Proper try/catch with a clean error message if Stripe fails.
 * 3. Validates the subscription is actually active before trying to cancel.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-08-26.dahlia',
});

const CANCELABLE_STATUSES = new Set(['active', 'trialing']);

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const profile = await UserProfile.findOne({
        userId: new mongoose.Types.ObjectId(token.id as string),
    }).lean();

    if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const subscriptionId = profile.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
        return NextResponse.json(
            { error: 'No active subscription to cancel.' },
            { status: 400 }
        );
    }

    // Guard: only cancel if status makes sense
    const currentStatus = profile.subscription?.status ?? '';
    if (!CANCELABLE_STATUSES.has(currentStatus)) {
        return NextResponse.json(
            { error: `Subscription cannot be cancelled in its current state (${currentStatus}).` },
            { status: 400 }
        );
    }

    // Already pending cancellation
    if (profile.subscription?.cancelAtPeriodEnd) {
        return NextResponse.json(
            { error: 'Subscription is already set to cancel at period end.' },
            { status: 409 }
        );
    }

    try {
        // Tell Stripe to cancel at period end
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
    } catch (err: any) {
        console.error('[cancel] Stripe error:', err);
        return NextResponse.json(
            { error: err?.message ?? 'Failed to cancel subscription. Please try again.' },
            { status: 502 }
        );
    }

    // FIX: Update DB immediately so update() call in the frontend
    // gets the new cancelAtPeriodEnd = true without waiting for the webhook.
    // The webhook will also fire and update this — that's fine, it's idempotent.
    await UserProfile.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(token.id as string) },
        { $set: { 'subscription.cancelAtPeriodEnd': true } }
    );

    return NextResponse.json({ success: true });
}
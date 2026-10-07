import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-08-26.dahlia',
});

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const profile = await UserProfile.findOne({
        userId: new mongoose.Types.ObjectId(token.id),
    }).lean();

    if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const subscriptionId = profile?.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
        return NextResponse.json(
            { error: 'No active subscription to resume.' },
            { status: 400 }
        );
    }

    if (!profile.subscription?.cancelAtPeriodEnd) {
        return NextResponse.json(
            { error: 'Subscription is not set to cancel — nothing to resume.' },
            { status: 409 }
        );
    }

    try {
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });
    } catch (err: any) {
        console.error('[resume] Stripe error:', err);
        return NextResponse.json(
            { error: err?.message ?? 'Failed to resume subscription.' },
            { status: 502 }
        );
    }

    // Mirror the change to DB immediately (webhook will confirm later)
    await UserProfile.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(token.id) },
        { $set: { 'subscription.cancelAtPeriodEnd': false } }
    );

    return NextResponse.json({ success: true });
}
/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session so employers can manage or
 * cancel their subscription without contacting support.
 * Requires the employer to have a stripeCustomerId (i.e. has purchased before).
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function POST(req: NextRequest) {
    // ── Auth ───────────────────────────────────────────────────────────────
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

    const stripeCustomerId = profile.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
        return NextResponse.json(
            { error: 'No billing account found. Please subscribe to a plan first.' },
            { status: 404 }
        );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${SITE_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
}
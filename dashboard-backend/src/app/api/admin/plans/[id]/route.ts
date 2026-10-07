import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongooes';
import { SubscriptionPlan } from '@/modal/SubscriptionPlan';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-08-26.dahlia',
});

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // TODO: Add admin authentication check here!
    const { id } = await params;
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    let body: Partial<{
        name: string;
        stripePriceId: string;
        listingQuota: number;
        applicantLimit: number;
        manualPostLimit: number;
        autoPostLimit: number;
        postVisibilityDays: number;
        price: number;
        isActive: boolean;
    }>;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        name,
        stripePriceId,
        listingQuota,
        applicantLimit,
        manualPostLimit,
        autoPostLimit,
        postVisibilityDays,
        price,
        isActive,
    } = body;

    // ── Verify Stripe price ID if provided and non-empty ──
    if (stripePriceId !== undefined && stripePriceId !== '') {
        try {
            await stripe.prices.retrieve(stripePriceId);
        } catch (err: any) {
            return NextResponse.json(
                { error: `Stripe price ID "${stripePriceId}" does not exist or is invalid.` },
                { status: 400 }
            );
        }
    }

    const update: Record<string, any> = {};

    if (name !== undefined) update.name = name;
    if (stripePriceId !== undefined) {
        update.stripePriceId = stripePriceId === '' ? null : stripePriceId;
    }
    if (listingQuota !== undefined) update.listingQuota = listingQuota;
    if (applicantLimit !== undefined) update.applicantLimit = applicantLimit;
    if (manualPostLimit !== undefined) update.manualPostLimit = manualPostLimit;
    if (autoPostLimit !== undefined) update.autoPostLimit = autoPostLimit;
    if (postVisibilityDays !== undefined) update.postVisibilityDays = postVisibilityDays;
    if (price !== undefined) update.price = price;
    if (isActive !== undefined) update.isActive = isActive;

    const plan = await SubscriptionPlan.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true, runValidators: true }
    ).lean();

    if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // TODO: Add admin authentication check here!
    const { id } = await params;
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const plan = await SubscriptionPlan.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
    ).lean();

    if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Plan deactivated', plan });
}
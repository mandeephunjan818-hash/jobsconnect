import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongooes';
import { SubscriptionPlan } from '@/modal/SubscriptionPlan';

// Reuse the same Stripe instance as the webhook
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

export async function GET() {
    await connectToDatabase();
    const plans = await SubscriptionPlan.find({}).sort({ price: 1 }).lean();
    return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
    // TODO: Add admin authentication check here!
    await connectToDatabase();

    let body: {
        key: string;
        name: string;
        stripePriceId?: string;
        listingQuota: number;
        applicantLimit: number;
        manualPostLimit: number;
        autoPostLimit: number;
        postVisibilityDays: number;
        price: number;
        isActive?: boolean;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        key,
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

    // Validation
    if (
        !key ||
        !name ||
        listingQuota == null ||
        applicantLimit == null ||
        manualPostLimit == null ||
        autoPostLimit == null ||
        postVisibilityDays == null ||
        price == null
    ) {
        return NextResponse.json(
            { error: 'key, name, listingQuota, applicantLimit, manualPostLimit, autoPostLimit, postVisibilityDays, and price are required' },
            { status: 400 }
        );
    }

    // ── NEW: Verify the Stripe price ID if one was provided ──
    if (stripePriceId) {
        try {
            await stripe.prices.retrieve(stripePriceId);
        } catch (err: any) {
            return NextResponse.json(
                { error: `Stripe price ID "${stripePriceId}" does not exist or is invalid.` },
                { status: 400 }
            );
        }
    }

    const existing = await SubscriptionPlan.findOne({ key });
    if (existing) {
        return NextResponse.json(
            { error: `Plan with key "${key}" already exists` },
            { status: 409 }
        );
    }

    const plan = await SubscriptionPlan.create({
        key,
        name,
        stripePriceId: stripePriceId || undefined,
        listingQuota,
        applicantLimit,
        manualPostLimit,
        autoPostLimit,
        postVisibilityDays,
        price,
        isActive: isActive ?? true,
    });

    return NextResponse.json({ plan }, { status: 201 });
}
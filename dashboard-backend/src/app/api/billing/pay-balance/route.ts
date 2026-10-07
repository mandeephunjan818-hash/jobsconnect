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

    const customerId = profile?.subscription?.stripeCustomerId;
    if (!customerId) {
        return NextResponse.json(
            { error: 'No billing account found.' },
            { status: 404 }
        );
    }

    try {
        // Find all open invoices for this customer
        const openInvoices = await stripe.invoices.list({
            customer: customerId,
            status: 'open',
            limit: 100,
        });

        if (openInvoices.data.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No outstanding balance.',
                paid: 0,
            });
        }

        const results = await Promise.allSettled(
            openInvoices.data.map((inv) => stripe.invoices.pay(inv.id))
        );

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed > 0 && succeeded === 0) {
            return NextResponse.json(
                { error: 'Payment failed — please update your payment method and try again.' },
                { status: 402 }
            );
        }

        return NextResponse.json({
            success: true,
            paid: succeeded,
            failed,
            message: failed > 0
                ? `${succeeded} invoice(s) paid, ${failed} failed. Check your payment method.`
                : `${succeeded} invoice(s) paid successfully.`,
        });
    } catch (err: any) {
        if (err?.type === 'StripeCardError') {
            return NextResponse.json(
                { error: `Card declined: ${err.message}` },
                { status: 402 }
            );
        }
        console.error('[pay-balance] error:', err);
        return NextResponse.json(
            { error: err?.message ?? 'Failed to process payment.' },
            { status: 500 }
        );
    }
}
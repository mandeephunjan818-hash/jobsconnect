import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile } from '@/modal/User';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-08-26.dahlia',
});

export async function GET(req: NextRequest) {
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
        return NextResponse.json({ totalDue: 0, invoiceCount: 0, invoices: [] });
    }

    try {
        const openInvoices = await stripe.invoices.list({
            customer: customerId,
            status: 'open',
            limit: 100,
        });

        const totalDue = openInvoices.data.reduce((sum, inv) => sum + inv.amount_due, 0);
        const currency = openInvoices.data[0]?.currency ?? 'usd';

        return NextResponse.json({
            totalDue,
            currency,
            invoiceCount: openInvoices.data.length,
            invoices: openInvoices.data.map(inv => ({
                id: inv.id,
                amountDue: inv.amount_due,
                currency: inv.currency,
                created: inv.created,
                hostedUrl: inv.hosted_invoice_url,
            })),
        });
    } catch (err: any) {
        console.error('[outstanding] error:', err);
        return NextResponse.json({ totalDue: 0, invoiceCount: 0, invoices: [] });
    }
}
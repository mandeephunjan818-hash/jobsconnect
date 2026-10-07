/**
 * app/api/billing/account/route.ts
 *
 * CHANGES IN THIS PASS:
 *
 * 1. UPCOMING INVOICE FIX: the old code wrapped `stripe.invoices.createPreview`
 *    in a bare try/catch that swallowed ALL errors silently, returning
 *    `upcomingInvoice: null` whether there was genuinely nothing to preview
 *    OR the call failed outright (wrong method name for this SDK version,
 *    transient Stripe error, etc). An active, auto-renewing subscription
 *    with a real upcoming charge looked identical in the UI to "nothing to
 *    show." Now: feature-detects the correct method name for the installed
 *    stripe-node version, and only silently no-ops on Stripe's specific
 *    "nothing to preview" error code — anything else is logged loudly.
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
        return NextResponse.json({ paymentMethod: null, upcomingInvoice: null });
    }

    const [customer, paymentMethods] = await Promise.all([
        stripe.customers.retrieve(customerId, { expand: ['invoice_settings.default_payment_method'] }),
        stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 }),
    ]);

    let paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null = null;

    if (!('deleted' in customer)) {
        const defaultPm = (customer as any).invoice_settings?.default_payment_method;
        const pm = (defaultPm && typeof defaultPm === 'object') ? defaultPm : paymentMethods.data[0];
        if (pm?.card) {
            paymentMethod = {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
            };
        }
    }

    // ── Upcoming invoice — robust fetch ─────────────────────────────────────
    let upcomingInvoice: { amountDue: number; currency: string; nextPaymentAttempt: number | null } | null = null;

    try {
        const subscriptionId = profile?.subscription?.stripeSubscriptionId;
        if (subscriptionId) {
            const invoicesApi = stripe.invoices as any;
            let preview: any = null;

            if (typeof invoicesApi.createPreview === 'function') {
                preview = await invoicesApi.createPreview({
                    customer: customerId,
                    subscription: subscriptionId,
                });
            } else if (typeof invoicesApi.retrieveUpcoming === 'function') {
                preview = await invoicesApi.retrieveUpcoming({
                    customer: customerId,
                    subscription: subscriptionId,
                });
            } else {
                console.error(
                    '[billing/account] No upcoming-invoice method found on stripe.invoices ' +
                    '(checked createPreview and retrieveUpcoming) — check the installed stripe-node ' +
                    'package version against the pinned API version.'
                );
            }

            if (preview) {
                upcomingInvoice = {
                    amountDue: preview.amount_due,
                    currency: preview.currency,
                    nextPaymentAttempt: preview.next_payment_attempt ?? null,
                };
            }
        }
    } catch (err: any) {
        // Stripe's genuine "nothing to preview" case (e.g. a subscription set
        // to cancel at period end with nothing further to bill) throws a
        // specific error code — that's expected and fine to swallow quietly.
        // Anything else is a real failure and should be visible in logs,
        // since silently returning null here makes a real upcoming charge
        // indistinguishable from "there genuinely isn't one."
        if (err?.code !== 'invoice_upcoming_none') {
            console.error('[billing/account] Failed to fetch upcoming invoice:', err);
        }
        upcomingInvoice = null;
    }

    return NextResponse.json({ paymentMethod, upcomingInvoice });
}
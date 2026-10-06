/**
 * app/api/admin/credit-bundles/route.ts
 *
 * GET  — list all bundles sorted by price
 * POST — create a new bundle
 *
 * Stripe coupling (updated):
 *   Product metadata now includes the current exchange rate at creation time:
 *     bundleKey, type, listingsPerCredit, creditExpiryDays
 *   Price metadata also carries credits + exchange rate.
 *
 * Audit trail:
 *   POST writes an AdminAuditLog entry with every Stripe object created.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongooes';
import { CreditBundle } from '@/modal/CreditBundle';
import { getCreditSystemConfig } from '@/modal/CreditSystemConfig';
import { writeAuditLog, bundleSnapshot, getAdminUserId } from '@/lib/admin-audit';
import { IStripeOperation } from '@/modal/AdminAuditLog';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

// ── GET ───────────────────────────────────────────────────────

export async function GET() {
    await connectToDatabase();
    const bundles = await CreditBundle.find({}).sort({ price: 1 }).lean();
    return NextResponse.json({ bundles });
}

// ── POST ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    // TODO: Replace getAdminUserId with your real session check
    const adminUserId = await getAdminUserId(req);
    await connectToDatabase();

    // ── 1. Parse + validate ───────────────────────────────────
    let body: {
        key: string;
        name: string;
        credits: number;
        price: number;       // major units from the form e.g. dollars
        currency?: string;
        isActive?: boolean;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { key, name, credits, price, currency, isActive } = body;

    if (!key || !name || credits == null || price == null) {
        return NextResponse.json(
            { error: 'key, name, credits, and price are required' },
            { status: 400 }
        );
    }
    if (credits <= 0) {
        return NextResponse.json({ error: 'credits must be greater than 0' }, { status: 400 });
    }
    if (price < 0) {
        return NextResponse.json({ error: 'price cannot be negative' }, { status: 400 });
    }
    if (!/^[a-z0-9_-]+$/.test(key)) {
        return NextResponse.json(
            { error: 'key must contain only lowercase letters, numbers, hyphens, underscores' },
            { status: 400 }
        );
    }

    const existing = await CreditBundle.findOne({ key });
    if (existing) {
        return NextResponse.json(
            { error: `Bundle with key "${key}" already exists` },
            { status: 409 }
        );
    }

    // ── 2. Load current exchange rate config ──────────────────
    // We embed the exchange rate at creation time so the Stripe Product
    // is a self-contained record of what was true when this bundle was made.
    const config = await getCreditSystemConfig();
    const { listingsPerCredit, creditExpiryDays } = config;

    const unitAmount = Math.round(price * 100);
    const resolvedCurrency = (currency || 'usd').toLowerCase();

    // ── 3. Create Stripe Product + Price ──────────────────────
    const stripeOperations: IStripeOperation[] = [];

    const productMetadata: Record<string, string> = {
        bundleKey: key,
        type: 'credit_bundle',
        credits: String(credits),
        listingsPerCredit: String(listingsPerCredit),
        creditExpiryDays: String(creditExpiryDays),
    };

    const priceMetadata: Record<string, string> = {
        bundleKey: key,
        credits: String(credits),
        listingsPerCredit: String(listingsPerCredit),
        creditExpiryDays: String(creditExpiryDays),
    };

    let stripeProduct: Stripe.Product;
    let stripePrice: Stripe.Price;

    try {
        stripeProduct = await stripe.products.create({
            name: `${name} (Credit Bundle)`,
            metadata: productMetadata,
        });

        stripeOperations.push({
            action: 'product.create',
            objectType: 'product',
            stripeId: stripeProduct.id,
            metadataSnapshot: productMetadata,
        });

        stripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: unitAmount,
            currency: resolvedCurrency,
            metadata: priceMetadata,
        });

        stripeOperations.push({
            action: 'price.create',
            objectType: 'price',
            stripeId: stripePrice.id,
            metadataSnapshot: priceMetadata,
        });
    } catch (err: any) {
        console.error('[credit-bundles] Stripe product/price creation failed:', err);
        return NextResponse.json(
            { error: `Stripe error: ${err.message ?? 'unknown error'}` },
            { status: 502 }
        );
    }

    // ── 4. Write to DB ────────────────────────────────────────
    try {
        const bundle = await CreditBundle.create({
            key,
            name,
            stripePriceId: stripePrice.id,
            stripeProductId: stripeProduct.id,
            credits,
            price: stripePrice.unit_amount ?? unitAmount,
            currency: stripePrice.currency,
            isActive: isActive ?? true,
        });

        // ── 5. Write audit log ────────────────────────────────
        await writeAuditLog({
            req,
            adminUserId,
            action: 'bundle.create',
            targetType: 'credit_bundle',
            targetId: String(bundle._id),
            before: null,
            after: bundleSnapshot(bundle.toObject() as unknown as Record<string, unknown>),
            stripeOperations,
        });

        return NextResponse.json({ bundle }, { status: 201 });
    } catch (err: any) {
        // DB write failed — roll back Stripe objects
        console.error('[credit-bundles] DB write failed after Stripe creation, rolling back:', err);
        try {
            await stripe.prices.update(stripePrice.id, { active: false });
            await stripe.products.update(stripeProduct.id, { active: false });
        } catch (rollbackErr) {
            console.error('[credit-bundles] Stripe rollback also failed:', rollbackErr);
        }
        return NextResponse.json(
            { error: err.message ?? 'Failed to save bundle' },
            { status: 500 }
        );
    }
}
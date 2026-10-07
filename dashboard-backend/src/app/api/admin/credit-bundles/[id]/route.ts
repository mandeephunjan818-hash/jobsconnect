/**
 * app/api/admin/credit-bundles/[id]/route.ts
 *
 * PUT    — edit name / credits / isActive, or reprice (creates new Stripe Price)
 * DELETE — soft-deactivate (never hard-delete)
 *
 * Stripe coupling (updated):
 *   - Edit:       updates Stripe Product metadata (name, credits, rate)
 *   - Reprice:    creates new Stripe Price + retires old one; new Price also
 *                 carries full metadata including current exchange rate
 *   - Reactivate: re-activates Stripe Product + current active Price
 *   - Deactivate: archives Stripe Product + Price
 *
 * Audit trail:
 *   Every mutating call writes an AdminAuditLog entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongooes';
import { CreditBundle } from '@/modal/CreditBundle';
import { getCreditSystemConfig } from '@/modal/CreditSystemConfig';
import { writeAuditLog, bundleSnapshot, getAdminUserId } from '@/lib/admin-audit';
import { IStripeOperation } from '@/modal/AdminAuditLog';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-08-26.dahlia',
});

// ── PUT ───────────────────────────────────────────────────────

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminUserId = await getAdminUserId(req);
    const { id } = await params;
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Invalid bundle ID' }, { status: 400 });
    }

    let body: Partial<{
        name: string;
        credits: number;
        isActive: boolean;
        newPrice: number; // major units — explicit reprice trigger
    }>;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, credits, isActive, newPrice } = body;

    const bundle = await CreditBundle.findById(id);
    if (!bundle) {
        return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    const beforeSnapshot = bundleSnapshot(bundle.toObject() as unknown as Record<string, unknown>);
    const stripeOperations: IStripeOperation[] = [];
    let auditAction: 'bundle.edit' | 'bundle.reprice' | 'bundle.reactivate' = 'bundle.edit';
    let partialFailure: string | undefined;

    // Load current exchange rate to embed in updated metadata
    const config = await getCreditSystemConfig();
    const { listingsPerCredit, creditExpiryDays } = config;

    // ── Reprice flow ──────────────────────────────────────────
    if (newPrice !== undefined) {
        auditAction = 'bundle.reprice';

        if (newPrice < 0) {
            return NextResponse.json({ error: 'newPrice cannot be negative' }, { status: 400 });
        }

        const newUnitAmount = Math.round(newPrice * 100);

        if (newUnitAmount !== bundle.price) {
            const priceMetadata: Record<string, string> = {
                bundleKey: bundle.key,
                credits: String(credits ?? bundle.credits),
                listingsPerCredit: String(listingsPerCredit),
                creditExpiryDays: String(creditExpiryDays),
            };

            try {
                const newStripePrice = await stripe.prices.create({
                    product: bundle.stripeProductId,
                    unit_amount: newUnitAmount,
                    currency: bundle.currency,
                    metadata: priceMetadata,
                });

                stripeOperations.push({
                    action: 'price.create',
                    objectType: 'price',
                    stripeId: newStripePrice.id,
                    metadataSnapshot: priceMetadata,
                });

                await stripe.prices.update(bundle.stripePriceId, { active: false });

                stripeOperations.push({
                    action: 'price.archive',
                    objectType: 'price',
                    stripeId: bundle.stripePriceId,
                });

                // Mirror from Stripe — never trust raw input
                bundle.stripePriceId = newStripePrice.id;
                bundle.price = newStripePrice.unit_amount ?? newUnitAmount;
                bundle.currency = newStripePrice.currency;
            } catch (err: any) {
                console.error('[credit-bundles] Reprice failed:', err);
                return NextResponse.json(
                    { error: `Stripe reprice error: ${err.message ?? 'unknown'}` },
                    { status: 502 }
                );
            }
        }
    } else {
        // ── Verify live Stripe price hasn't drifted ───────────
        try {
            const livePrice = await stripe.prices.retrieve(bundle.stripePriceId);
            if (
                livePrice.unit_amount !== bundle.price ||
                livePrice.currency !== bundle.currency
            ) {
                console.warn(
                    `[credit-bundles] Drift detected for bundle ${bundle.key}: ` +
                    `DB=${bundle.price} ${bundle.currency}, ` +
                    `Stripe=${livePrice.unit_amount} ${livePrice.currency}. Re-syncing.`
                );
                bundle.price = livePrice.unit_amount ?? bundle.price;
                bundle.currency = livePrice.currency;
            }
        } catch (err) {
            console.error(
                `[credit-bundles] Could not verify live price for ${bundle.key}:`,
                err
            );
        }
    }

    // ── Reactivation — sync Stripe active state ───────────────
    if (isActive === true && !bundle.isActive) {
        auditAction = 'bundle.reactivate';
        try {
            await stripe.products.update(bundle.stripeProductId, { active: true });
            stripeOperations.push({
                action: 'product.update',
                objectType: 'product',
                stripeId: bundle.stripeProductId,
                metadataSnapshot: { active: 'true' },
            });

            await stripe.prices.update(bundle.stripePriceId, { active: true });
            stripeOperations.push({
                action: 'price.update',
                objectType: 'price',
                stripeId: bundle.stripePriceId,
                metadataSnapshot: { active: 'true' },
            });
        } catch (err: any) {
            console.error('[credit-bundles] Stripe reactivation failed:', err);
            partialFailure = `Stripe reactivation failed: ${err.message ?? 'unknown'}`;
        }
    }

    // ── Update Stripe Product metadata (name / credits / rate) ─
    // Always keep Product metadata in sync on any edit so Stripe reflects
    // the current bundle state at all times.
    const updatedName = name ?? bundle.name;
    const updatedCredits = credits ?? bundle.credits;

    const productMetadata: Record<string, string> = {
        bundleKey: bundle.key,
        type: 'credit_bundle',
        credits: String(updatedCredits),
        listingsPerCredit: String(listingsPerCredit),
        creditExpiryDays: String(creditExpiryDays),
    };

    try {
        await stripe.products.update(bundle.stripeProductId, {
            name: `${updatedName} (Credit Bundle)`,
            metadata: productMetadata,
        });

        stripeOperations.push({
            action: 'product.update',
            objectType: 'product',
            stripeId: bundle.stripeProductId,
            metadataSnapshot: productMetadata,
        });
    } catch (err: any) {
        console.error('[credit-bundles] Product metadata update failed:', err);
        partialFailure = partialFailure
            ? `${partialFailure} | Product metadata update failed: ${err.message}`
            : `Product metadata update failed: ${err.message ?? 'unknown'}`;
    }

    // ── Apply DB field updates ────────────────────────────────
    if (name !== undefined) bundle.name = name;
    if (credits !== undefined) {
        if (credits <= 0) {
            return NextResponse.json({ error: 'credits must be > 0' }, { status: 400 });
        }
        bundle.credits = credits;
    }
    if (isActive !== undefined) bundle.isActive = isActive;

    await bundle.save();

    const afterSnapshot = bundleSnapshot(bundle.toObject() as unknown as Record<string, unknown>);

    // ── Write audit log ───────────────────────────────────────
    await writeAuditLog({
        req,
        adminUserId,
        action: auditAction,
        targetType: 'credit_bundle',
        targetId: id,
        before: beforeSnapshot,
        after: afterSnapshot,
        stripeOperations,
        partialFailure,
    });

    return NextResponse.json({
        bundle: bundle.toObject(),
        ...(partialFailure ? { warning: partialFailure } : {}),
    });
}

// ── DELETE (soft deactivate) ──────────────────────────────────

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminUserId = await getAdminUserId(req);
    const { id } = await params;
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Invalid bundle ID' }, { status: 400 });
    }

    const bundle = await CreditBundle.findById(id);
    if (!bundle) {
        return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    const beforeSnapshot = bundleSnapshot(bundle.toObject() as unknown as Record<string, unknown>);
    const stripeOperations: IStripeOperation[] = [];
    let partialFailure: string | undefined;

    // ── Archive in Stripe ─────────────────────────────────────
    try {
        await stripe.prices.update(bundle.stripePriceId, { active: false });
        stripeOperations.push({
            action: 'price.archive',
            objectType: 'price',
            stripeId: bundle.stripePriceId,
        });
    } catch (err: any) {
        console.warn(`[credit-bundles] Could not archive Stripe price ${bundle.stripePriceId}:`, err);
        partialFailure = `Stripe price archive failed: ${err.message ?? 'unknown'}`;
    }

    try {
        await stripe.products.update(bundle.stripeProductId, { active: false });
        stripeOperations.push({
            action: 'product.archive',
            objectType: 'product',
            stripeId: bundle.stripeProductId,
        });
    } catch (err: any) {
        console.warn(`[credit-bundles] Could not archive Stripe product ${bundle.stripeProductId}:`, err);
        partialFailure = partialFailure
            ? `${partialFailure} | Stripe product archive failed: ${err.message}`
            : `Stripe product archive failed: ${err.message ?? 'unknown'}`;
    }

    // ── Soft-delete in DB ─────────────────────────────────────
    bundle.isActive = false;
    await bundle.save();

    const afterSnapshot = bundleSnapshot(bundle.toObject() as unknown as Record<string, unknown>);

    // ── Write audit log ───────────────────────────────────────
    await writeAuditLog({
        req,
        adminUserId,
        action: 'bundle.deactivate',
        targetType: 'credit_bundle',
        targetId: id,
        before: beforeSnapshot,
        after: afterSnapshot,
        stripeOperations,
        partialFailure,
    });

    return NextResponse.json({
        message: 'Bundle deactivated',
        bundle: bundle.toObject(),
        ...(partialFailure ? { warning: partialFailure } : {}),
    });
}
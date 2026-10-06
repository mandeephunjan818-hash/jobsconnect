/**
 * app/api/admin/credit-settings/route.ts
 *
 * GET  — return the singleton CreditSystemConfig
 * PUT  — update listingsPerCredit / creditExpiryDays
 *
 * Stripe coupling (added):
 *   1. On first PUT: create a dedicated Stripe Product that anchors the
 *      exchange rate on the Stripe side ("Credit System — Exchange Rate Config").
 *   2. On every PUT: update that product's metadata to mirror the new values.
 *   3. On every PUT: update metadata on ALL active bundle Stripe Products
 *      so every bundle also carries the current rate at Stripe level.
 *
 * Audit trail:
 *   Every PUT writes an AdminAuditLog entry capturing before/after state
 *   and every Stripe object touched.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/mongooes';
import { getCreditSystemConfig, CreditSystemConfig } from '@/modal/CreditSystemConfig';
import { CreditBundle } from '@/modal/CreditBundle';
import { writeAuditLog, configSnapshot, getAdminUserId } from '@/lib/admin-audit';
import { IStripeOperation } from '@/modal/AdminAuditLog';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

// ── GET ───────────────────────────────────────────────────────

export async function GET() {
    await connectToDatabase();
    const config = await getCreditSystemConfig();
    return NextResponse.json({ config });
}

// ── PUT ───────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
    // TODO: Replace getAdminUserId with your real session check
    const adminUserId = await getAdminUserId(req);
    await connectToDatabase();

    // ── 1. Parse + validate body ──────────────────────────────
    let body: Partial<{ listingsPerCredit: number; creditExpiryDays: number }>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { listingsPerCredit, creditExpiryDays } = body;

    if (listingsPerCredit !== undefined) {
        if (!Number.isInteger(listingsPerCredit) || listingsPerCredit < 1) {
            return NextResponse.json(
                { error: 'listingsPerCredit must be an integer ≥ 1' },
                { status: 400 }
            );
        }
    }
    if (creditExpiryDays !== undefined) {
        if (!Number.isInteger(creditExpiryDays) || creditExpiryDays < 1) {
            return NextResponse.json(
                { error: 'creditExpiryDays must be an integer ≥ 1' },
                { status: 400 }
            );
        }
    }

    // ── 2. Load current config (creates singleton if missing) ─
    const currentConfig = await getCreditSystemConfig();
    const beforeSnapshot = configSnapshot(currentConfig.toObject() as Record<string, unknown>);

    // Build the new values (fall back to current if not provided)
    const newListingsPerCredit = listingsPerCredit ?? currentConfig.listingsPerCredit;
    const newCreditExpiryDays = creditExpiryDays ?? currentConfig.creditExpiryDays;

    const newStripeMetadata: Record<string, string> = {
        type: 'system_config',
        listingsPerCredit: String(newListingsPerCredit),
        creditExpiryDays: String(newCreditExpiryDays),
    };

    const stripeOperations: IStripeOperation[] = [];
    let partialFailure: string | undefined;

    // ── 3. Stripe: create or update the dedicated config product ─
    let stripeConfigProductId = currentConfig.stripeConfigProductId;

    if (!stripeConfigProductId) {
        // First-time setup — create the anchor product
        try {
            const configProduct = await stripe.products.create({
                name: 'Credit System — Exchange Rate Config',
                description:
                    'Internal anchor product. Records the canonical exchange rate ' +
                    '(listings per credit) and credit expiry period on the Stripe side. ' +
                    'Do not attach prices or sell this product.',
                metadata: newStripeMetadata,
                // Not purchasable — mark it clearly
                active: true,
            });

            stripeConfigProductId = configProduct.id;

            stripeOperations.push({
                action: 'product.create',
                objectType: 'product',
                stripeId: configProduct.id,
                metadataSnapshot: newStripeMetadata,
            });

            console.log(
                `[credit-settings] Created Stripe config product: ${configProduct.id}`
            );
        } catch (err: any) {
            console.error('[credit-settings] Failed to create Stripe config product:', err);
            // Don't abort the DB update over this — record as partial failure
            partialFailure = `Stripe config product creation failed: ${err.message ?? 'unknown'}`;
        }
    } else {
        // Update the existing config product's metadata
        try {
            await stripe.products.update(stripeConfigProductId, {
                metadata: newStripeMetadata,
            });

            stripeOperations.push({
                action: 'product.update',
                objectType: 'product',
                stripeId: stripeConfigProductId,
                metadataSnapshot: newStripeMetadata,
            });

            console.log(
                `[credit-settings] Updated Stripe config product ${stripeConfigProductId} metadata`
            );
        } catch (err: any) {
            console.error(
                `[credit-settings] Failed to update Stripe config product ${stripeConfigProductId}:`,
                err
            );
            partialFailure = `Stripe config product update failed: ${err.message ?? 'unknown'}`;
        }
    }

    // ── 4. Stripe: sync new rate onto ALL active bundle products ─
    const activeBundles = await CreditBundle.find({ isActive: true }).lean();

    const bundleStripeMetadata: Record<string, string> = {
        listingsPerCredit: String(newListingsPerCredit),
        creditExpiryDays: String(newCreditExpiryDays),
    };

    const bundleSyncErrors: string[] = [];

    await Promise.allSettled(
        activeBundles.map(async (bundle) => {
            try {
                await stripe.products.update(bundle.stripeProductId, {
                    metadata: bundleStripeMetadata,
                });

                stripeOperations.push({
                    action: 'product.update',
                    objectType: 'product',
                    stripeId: bundle.stripeProductId,
                    metadataSnapshot: {
                        bundleKey: bundle.key,
                        ...bundleStripeMetadata,
                    },
                });

                console.log(
                    `[credit-settings] Synced rate to bundle product ${bundle.stripeProductId} (${bundle.key})`
                );
            } catch (err: any) {
                const msg = `Bundle ${bundle.key} (${bundle.stripeProductId}): ${err.message ?? 'unknown'}`;
                bundleSyncErrors.push(msg);
                console.error(`[credit-settings] Failed to sync rate to bundle product:`, err);
            }
        })
    );

    if (bundleSyncErrors.length > 0) {
        const bundleFailMsg = `Some bundle products failed to sync: ${bundleSyncErrors.join('; ')}`;
        partialFailure = partialFailure
            ? `${partialFailure} | ${bundleFailMsg}`
            : bundleFailMsg;
    }

    // ── 5. Write to DB ────────────────────────────────────────
    const dbUpdate: Record<string, unknown> = {
        listingsPerCredit: newListingsPerCredit,
        creditExpiryDays: newCreditExpiryDays,
    };

    if (stripeConfigProductId && !currentConfig.stripeConfigProductId) {
        dbUpdate.stripeConfigProductId = stripeConfigProductId;
    }

    const updatedConfig = await CreditSystemConfig.findByIdAndUpdate(
        'credit_system_config',
        { $set: dbUpdate },
        { new: true, runValidators: true }
    ).lean();

    const afterSnapshot = configSnapshot(updatedConfig as unknown as Record<string, unknown>);

    // ── 6. Write audit log ────────────────────────────────────
    await writeAuditLog({
        req,
        adminUserId,
        action: 'settings.update',
        targetType: 'credit_system_config',
        targetId: 'credit_system_config',
        before: beforeSnapshot,
        after: afterSnapshot,
        stripeOperations,
        partialFailure,
    });

    return NextResponse.json({
        config: updatedConfig,
        stripeOperations: stripeOperations.length,
        ...(partialFailure ? { warning: partialFailure } : {}),
    });
}
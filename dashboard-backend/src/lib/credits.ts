/**
 * lib/credits.ts
 *
 * Core credit wallet utilities — every credit movement is mirrored to
 * Stripe Customer Balance so Stripe is always the second source of truth.
 *
 * Stripe Customer Balance transactions use NEGATIVE amounts for credits added
 * (because Stripe interprets a negative balance as "Stripe owes the customer",
 * which is conceptually correct — the customer has pre-paid for listings).
 *
 * Mirror map:
 *   topUpWallet    → stripe.customers.createBalanceTransaction  (negative = credits in)
 *   spendCredits   → stripe.customers.createBalanceTransaction  (positive = credits consumed)
 *   sweepExpired   → stripe.customers.createBalanceTransaction  (positive = credits voided)
 *
 * If the Stripe mirror call fails we LOG but do NOT throw — the MongoDB
 * record is the authoritative state; Stripe is the audit mirror. A failed
 * mirror is surfaced in logs for reconciliation but must never block the user.
 */

import mongoose from 'mongoose';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { CreditWallet, ICreditBatch, ICreditWalletDocument } from '@/modal/CreditWallet';
import { CreditTransaction } from '@/modal/CreditTransaction';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

// ─────────────────────────────────────────────────────────────
// Stripe mirror helper
// ─────────────────────────────────────────────────────────────

/**
 * Mirror a credit event to Stripe Customer Balance.
 *
 * Stripe amount convention (in the SMALLEST currency unit, e.g. pence/cents):
 *   NEGATIVE → funds added to customer balance  (top-up / refund)
 *   POSITIVE → funds removed from customer balance (spend / expiry)
 *
 * We store credits (not money) so we pass the credit count directly and
 * use a dedicated currency of "usd" with amount = credits × 1 (1 cent per
 * credit as a symbolic unit — Stripe requires a real ISO currency but the
 * monetary value here is informational only; real money moved via Checkout).
 *
 * Returns the Stripe balance transaction ID, or null on failure.
 */
async function mirrorToStripe(
    stripeCustomerId: string,
    creditDelta: number,        // positive = credits added, negative = credits removed
    description: string,
    metadata: Record<string, string>
): Promise<string | null> {
    try {
        // Stripe convention: negative balance = customer has credits
        // So credits ADDED   → negative amount  (customer gains balance)
        //    credits REMOVED → positive amount  (customer loses balance)
        const amount = -creditDelta;   // flip sign to match Stripe convention

        const tx = await stripe.customers.createBalanceTransaction(stripeCustomerId, {
            amount,
            currency: 'usd',
            description,
            metadata,
        });

        console.log(
            `[credits:stripe] Mirrored to Stripe Customer Balance: ` +
            `customerId=${stripeCustomerId} amount=${amount} txId=${tx.id}`
        );

        return tx.id;
    } catch (err) {
        // Non-fatal — log for reconciliation, never block the user
        console.error(
            `[credits:stripe] MIRROR FAILED for customerId=${stripeCustomerId}: ` +
            `description="${description}"`,
            err
        );
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// Get or create wallet
// ─────────────────────────────────────────────────────────────

export async function getOrCreateWallet(
    userId: string,
    stripeCustomerId: string
): Promise<ICreditWalletDocument> {
    const oid = new mongoose.Types.ObjectId(userId);

    let wallet = await CreditWallet.findOne({ userId: oid });
    if (!wallet) {
        wallet = await CreditWallet.create({
            userId: oid,
            stripeCustomerId,
            totalAvailable: 0,
            batches: [],
            totalPurchased: 0,
            totalSpent: 0,
            totalExpired: 0,
        });
    }
    return wallet;
}

// ─────────────────────────────────────────────────────────────
// Recompute totalAvailable from live batches
// ─────────────────────────────────────────────────────────────

export function recomputeTotal(batches: ICreditBatch[]): number {
    const now = new Date();
    return batches
        .filter((b) => b.status === 'active' && b.expiresAt > now && b.creditsRemaining > 0)
        .reduce((sum, b) => sum + b.creditsRemaining, 0);
}

// ─────────────────────────────────────────────────────────────
// Top up wallet after purchase
// ─────────────────────────────────────────────────────────────

export interface TopUpParams {
    userId: string;
    stripeCustomerId: string;
    bundleKey: string;
    bundleName: string;
    credits: number;
    listingsPerCredit: number;
    creditExpiryDays: number;
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    amountPaid: number;    // pence/cents
    currency: string;
    stripeCustomerBalanceTxId?: string;
}

export async function topUpWallet(params: TopUpParams): Promise<ICreditWalletDocument> {
    const wallet = await getOrCreateWallet(params.userId, params.stripeCustomerId);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + params.creditExpiryDays * 24 * 60 * 60 * 1000);

    const batch: ICreditBatch = {
        batchId: nanoid(12),
        bundleKey: params.bundleKey,
        bundleName: params.bundleName,
        stripeSessionId: params.stripeSessionId,
        stripePaymentIntentId: params.stripePaymentIntentId,
        creditsPurchased: params.credits,
        creditsRemaining: params.credits,
        listingsPerCredit: params.listingsPerCredit,
        creditExpiryDays: params.creditExpiryDays,
        purchasedAt: now,
        expiresAt,
        status: 'active',
        amountPaid: params.amountPaid,
        currency: params.currency,
        stripeCustomerBalanceTxId: params.stripeCustomerBalanceTxId,
    };

    // Insert batch sorted by expiresAt ASC (nearest expiry first for FIFO spend)
    wallet.batches.push(batch);
    wallet.batches.sort(
        (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    );

    wallet.totalPurchased += params.credits;
    wallet.totalAvailable = recomputeTotal(wallet.batches);

    await wallet.save();

    // ── Mirror to Stripe Customer Balance ─────────────────────────────────────
    // Negative amount = credits added (customer gains balance on Stripe)
    const stripeMirrorTxId = await mirrorToStripe(
        params.stripeCustomerId,
        +params.credits,   // positive delta = credits IN
        `Credit top-up: ${params.bundleName} (${params.credits} credits, expires ${expiresAt.toDateString()})`,
        {
            event: 'top_up',
            batchId: batch.batchId,
            bundleKey: params.bundleKey,
            credits: String(params.credits),
            stripeSessionId: params.stripeSessionId,
            expiresAt: expiresAt.toISOString(),
        }
    );

    // ── Write MongoDB transaction record ──────────────────────────────────────
    await CreditTransaction.create({
        userId: wallet.userId,
        stripeCustomerId: params.stripeCustomerId,
        eventType: 'purchase',
        creditsIn: params.credits,
        creditsOut: 0,
        balanceAfter: wallet.totalAvailable,
        affectedBatches: [
            {
                batchId: batch.batchId,
                creditsConsumed: 0,
                remainingAfter: batch.creditsRemaining,
            },
        ],
        bundleKey: params.bundleKey,
        bundleName: params.bundleName,
        stripeSessionId: params.stripeSessionId,
        stripePaymentIntentId: params.stripePaymentIntentId,
        amountPaid: params.amountPaid,
        currency: params.currency,
        // Store whichever Stripe tx ID we have — prefer the mirror tx,
        // fall back to the one passed in from the webhook (PaymentIntent level)
        stripeBalanceTxId: stripeMirrorTxId ?? params.stripeCustomerBalanceTxId,
    });

    console.log(
        `[credits] topUpWallet: userId=${params.userId} +${params.credits} credits ` +
        `(batch ${batch.batchId}, expires ${expiresAt.toISOString()}, stripeMirror=${stripeMirrorTxId ?? 'FAILED'})`
    );

    return wallet;
}

// ─────────────────────────────────────────────────────────────
// Spend credits — FIFO (nearest expiry first)
// ─────────────────────────────────────────────────────────────

export interface SpendParams {
    userId: string;
    stripeCustomerId: string;
    creditsToSpend: number;
    listingId: string;
    listingTitle?: string;
}

export interface SpendResult {
    success: boolean;
    message: string;
    creditsSpent: number;
    balanceAfter: number;
}

export async function spendCredits(params: SpendParams): Promise<SpendResult> {
    const oid = new mongoose.Types.ObjectId(params.userId);
    const wallet = await CreditWallet.findOne({ userId: oid });

    if (!wallet) {
        return { success: false, message: 'No credit wallet found.', creditsSpent: 0, balanceAfter: 0 };
    }

    // Sweep expired batches inline before spending
    await sweepExpiredBatches(wallet);

    const available = recomputeTotal(wallet.batches);

    if (available < params.creditsToSpend) {
        return {
            success: false,
            message: `Insufficient credits. Need ${params.creditsToSpend}, have ${available}.`,
            creditsSpent: 0,
            balanceAfter: available,
        };
    }

    // FIFO: consume from nearest-expiry-first active batches
    let remaining = params.creditsToSpend;
    const affectedBatches: { batchId: string; creditsConsumed: number; remainingAfter: number }[] = [];
    const now = new Date();

    for (const batch of wallet.batches) {
        if (remaining <= 0) break;
        if (batch.status !== 'active') continue;
        if (batch.expiresAt <= now) continue;
        if (batch.creditsRemaining <= 0) continue;

        const take = Math.min(remaining, batch.creditsRemaining);
        batch.creditsRemaining -= take;
        remaining -= take;

        affectedBatches.push({
            batchId: batch.batchId,
            creditsConsumed: take,
            remainingAfter: batch.creditsRemaining,
        });

        if (batch.creditsRemaining === 0) {
            batch.status = 'exhausted';
        }
    }

    wallet.totalSpent += params.creditsToSpend;
    wallet.totalAvailable = recomputeTotal(wallet.batches);
    await wallet.save();

    // ── Mirror to Stripe Customer Balance ─────────────────────────────────────
    // Positive amount = credits removed (customer loses balance on Stripe)
    const batchSummary = affectedBatches
        .map((b) => `${b.batchId}(-${b.creditsConsumed})`)
        .join(', ');

    const stripeMirrorTxId = await mirrorToStripe(
        params.stripeCustomerId,
        -params.creditsToSpend,   // negative delta = credits OUT
        `Credit spend: ${params.listingTitle ?? params.listingId} (${params.creditsToSpend} credit${params.creditsToSpend !== 1 ? 's' : ''})`,
        {
            event: 'spend',
            listingId: params.listingId,
            listingTitle: params.listingTitle ?? '',
            creditsSpent: String(params.creditsToSpend),
            batches: batchSummary,
            balanceAfter: String(wallet.totalAvailable),
        }
    );

    // ── Write MongoDB transaction record ──────────────────────────────────────
    await CreditTransaction.create({
        userId: wallet.userId,
        stripeCustomerId: params.stripeCustomerId,
        eventType: 'spend',
        creditsIn: 0,
        creditsOut: params.creditsToSpend,
        balanceAfter: wallet.totalAvailable,
        affectedBatches,
        listingId: params.listingId,
        listingTitle: params.listingTitle,
        stripeBalanceTxId: stripeMirrorTxId ?? undefined,
    });

    console.log(
        `[credits] spendCredits: userId=${params.userId} -${params.creditsToSpend} credits ` +
        `for listing ${params.listingId}, balance now ${wallet.totalAvailable}, ` +
        `stripeMirror=${stripeMirrorTxId ?? 'FAILED'}`
    );

    return {
        success: true,
        message: 'Credits spent successfully.',
        creditsSpent: params.creditsToSpend,
        balanceAfter: wallet.totalAvailable,
    };
}

// ─────────────────────────────────────────────────────────────
// Sweep expired batches — run by cron or inline before spend
// ─────────────────────────────────────────────────────────────

export async function sweepExpiredBatches(
    wallet: ICreditWalletDocument
): Promise<number> {
    const now = new Date();
    let expiredCredits = 0;
    const expiredBatchIds: string[] = [];

    for (const batch of wallet.batches) {
        if (batch.status === 'active' && batch.expiresAt <= now && batch.creditsRemaining > 0) {
            expiredCredits += batch.creditsRemaining;
            expiredBatchIds.push(batch.batchId);
            batch.creditsRemaining = 0;
            batch.status = 'expired';
        }
    }

    if (expiredCredits > 0) {
        wallet.totalExpired += expiredCredits;
        wallet.totalAvailable = recomputeTotal(wallet.batches);
        await wallet.save();

        // ── Mirror to Stripe Customer Balance ─────────────────────────────────
        // Positive amount = credits voided (customer loses balance on Stripe)
        const stripeMirrorTxId = await mirrorToStripe(
            wallet.stripeCustomerId,
            -expiredCredits,   // negative delta = credits OUT (expiry)
            `Credit expiry: ${expiredCredits} credit${expiredCredits !== 1 ? 's' : ''} across ${expiredBatchIds.length} batch${expiredBatchIds.length !== 1 ? 'es' : ''} expired`,
            {
                event: 'expiry',
                expiredBatchIds: expiredBatchIds.join(','),
                expiredCredits: String(expiredCredits),
                balanceAfter: String(wallet.totalAvailable),
            }
        );

        // ── Write MongoDB transaction record ──────────────────────────────────
        await CreditTransaction.create({
            userId: wallet.userId,
            stripeCustomerId: wallet.stripeCustomerId,
            eventType: 'expired',
            creditsIn: 0,
            creditsOut: expiredCredits,
            balanceAfter: wallet.totalAvailable,
            affectedBatches: expiredBatchIds.map((id) => ({
                batchId: id,
                creditsConsumed: 0,
                remainingAfter: 0,
            })),
            expiredBatchIds,
            stripeBalanceTxId: stripeMirrorTxId ?? undefined,
        });

        console.log(
            `[credits] sweepExpiredBatches: userId=${wallet.userId} ` +
            `swept ${expiredCredits} expired credits across ${expiredBatchIds.length} batches, ` +
            `stripeMirror=${stripeMirrorTxId ?? 'FAILED'}`
        );
    }

    return expiredCredits;
}

// ─────────────────────────────────────────────────────────────
// Get available credits for a user (safe — sweeps first)
// ─────────────────────────────────────────────────────────────

export async function getAvailableCredits(userId: string): Promise<number> {
    const oid = new mongoose.Types.ObjectId(userId);
    const wallet = await CreditWallet.findOne({ userId: oid });
    if (!wallet) return 0;
    await sweepExpiredBatches(wallet);
    return recomputeTotal(wallet.batches);
}

// ─────────────────────────────────────────────────────────────
// Admin: manual credit adjustment (grant or deduction)
// ─────────────────────────────────────────────────────────────

export interface AdjustParams {
    userId: string;
    stripeCustomerId: string;
    creditDelta: number;       // positive = grant, negative = deduct
    reason: string;
    adminUserId: string;
}

export interface AdjustResult {
    success: boolean;
    message: string;
    balanceAfter: number;
}

/**
 * Admin-only manual credit adjustment.
 * Grants add a synthetic batch (no purchase, no Stripe Checkout).
 * Deductions consume FIFO from existing batches.
 * Both are mirrored to Stripe Customer Balance.
 */
export async function adjustCredits(params: AdjustParams): Promise<AdjustResult> {
    const oid = new mongoose.Types.ObjectId(params.userId);
    const wallet = await CreditWallet.findOne({ userId: oid });

    if (!wallet) {
        return { success: false, message: 'No credit wallet found.', balanceAfter: 0 };
    }

    await sweepExpiredBatches(wallet);

    const affectedBatches: { batchId: string; creditsConsumed: number; remainingAfter: number }[] = [];
    let creditsIn = 0;
    let creditsOut = 0;

    if (params.creditDelta > 0) {
        // ── Grant: add a synthetic non-expiring batch ─────────────────────────
        const grantBatch: ICreditBatch = {
            batchId: nanoid(12),
            bundleKey: 'admin_grant',
            bundleName: 'Admin Grant',
            stripeSessionId: `admin_${nanoid(8)}`,
            creditsPurchased: params.creditDelta,
            creditsRemaining: params.creditDelta,
            listingsPerCredit: 1,
            creditExpiryDays: 36500,   // 100 years — effectively never expires
            purchasedAt: new Date(),
            expiresAt: new Date(Date.now() + 36500 * 24 * 60 * 60 * 1000),
            status: 'active',
            amountPaid: 0,
            currency: 'usd',
        };

        wallet.batches.push(grantBatch);
        wallet.batches.sort(
            (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
        );
        wallet.totalPurchased += params.creditDelta;
        creditsIn = params.creditDelta;

        affectedBatches.push({
            batchId: grantBatch.batchId,
            creditsConsumed: 0,
            remainingAfter: grantBatch.creditsRemaining,
        });
    } else {
        // ── Deduct: FIFO consume from existing batches ────────────────────────
        const toDeduct = Math.abs(params.creditDelta);
        const available = recomputeTotal(wallet.batches);

        if (available < toDeduct) {
            return {
                success: false,
                message: `Cannot deduct ${toDeduct} credits — only ${available} available.`,
                balanceAfter: available,
            };
        }

        let remaining = toDeduct;
        const now = new Date();

        for (const batch of wallet.batches) {
            if (remaining <= 0) break;
            if (batch.status !== 'active') continue;
            if (batch.expiresAt <= now) continue;
            if (batch.creditsRemaining <= 0) continue;

            const take = Math.min(remaining, batch.creditsRemaining);
            batch.creditsRemaining -= take;
            remaining -= take;

            affectedBatches.push({
                batchId: batch.batchId,
                creditsConsumed: take,
                remainingAfter: batch.creditsRemaining,
            });

            if (batch.creditsRemaining === 0) batch.status = 'exhausted';
        }

        wallet.totalSpent += toDeduct;
        creditsOut = toDeduct;
    }

    wallet.totalAvailable = recomputeTotal(wallet.batches);
    await wallet.save();

    // ── Mirror to Stripe Customer Balance ─────────────────────────────────────
    const direction = params.creditDelta > 0 ? 'grant' : 'deduction';
    const stripeMirrorTxId = await mirrorToStripe(
        params.stripeCustomerId,
        params.creditDelta,   // positive = grant (credits in), negative = deduction (credits out)
        `Admin credit ${direction}: ${Math.abs(params.creditDelta)} credit${Math.abs(params.creditDelta) !== 1 ? 's' : ''} — ${params.reason}`,
        {
            event: 'adjustment',
            direction,
            creditDelta: String(params.creditDelta),
            adminUserId: params.adminUserId,
            reason: params.reason,
            balanceAfter: String(wallet.totalAvailable),
        }
    );

    // ── Write MongoDB transaction record ──────────────────────────────────────
    await CreditTransaction.create({
        userId: wallet.userId,
        stripeCustomerId: params.stripeCustomerId,
        eventType: 'adjustment',
        creditsIn,
        creditsOut,
        balanceAfter: wallet.totalAvailable,
        affectedBatches,
        adjustedBy: params.adminUserId,
        adjustmentReason: params.reason,
        stripeBalanceTxId: stripeMirrorTxId ?? undefined,
    });

    console.log(
        `[credits] adjustCredits: userId=${params.userId} delta=${params.creditDelta} ` +
        `by admin=${params.adminUserId}, reason="${params.reason}", ` +
        `balance now ${wallet.totalAvailable}, stripeMirror=${stripeMirrorTxId ?? 'FAILED'}`
    );

    return {
        success: true,
        message: `Credits ${params.creditDelta > 0 ? 'granted' : 'deducted'} successfully.`,
        balanceAfter: wallet.totalAvailable,
    };
}
/**
 * lib/webhook-credit-handler.ts
 *
 * Handles the 'checkout.session.completed' webhook event for
 * credit bundle purchases (metadata.type === 'credit_bundle_purchase').
 *
 * Import and call this from your existing webhook route's switch statement:
 *
 *   case 'checkout.session.completed': {
 *     const session = event.data.object as Stripe.Checkout.Session;
 *
 *     if (session.metadata?.type === 'credit_bundle_purchase') {
 *       await handleCreditBundlePurchase(session, stripe);
 *       break;
 *     }
 *
 *     // ... existing subscription checkout handling below ...
 *   }
 */

import Stripe from 'stripe';
import { topUpWallet } from '@/lib/credits';
import { UserProfile } from '@/modal/User';

export async function handleCreditBundlePurchase(
    session: Stripe.Checkout.Session,
    stripe: Stripe
): Promise<void> {
    const meta = session.metadata as Record<string, string>;

    // ── Validate all required metadata fields ─────────────────
    const required = [
        'userId', 'stripeCustomerId', 'bundleKey', 'bundleName',
        'credits', 'listingsPerCredit', 'creditExpiryDays',
    ];

    for (const field of required) {
        if (!meta[field]) {
            console.error(
                `[webhook/credit] Missing required metadata field "${field}" ` +
                `in checkout session ${session.id}. Cannot top up wallet.`
            );
            return;
        }
    }

    const userId = meta.userId;
    const stripeCustomerId = meta.stripeCustomerId;
    const credits = parseInt(meta.credits, 10);
    const listingsPerCredit = parseInt(meta.listingsPerCredit, 10);
    const creditExpiryDays = parseInt(meta.creditExpiryDays, 10);

    if (isNaN(credits) || credits <= 0) {
        console.error(`[webhook/credit] Invalid credits value in session ${session.id}: "${meta.credits}"`);
        return;
    }

    // ── Check user profile exists ─────────────────────────────
    const profile = await UserProfile.findOne({ userId }).lean();
    if (!profile) {
        console.error(
            `[webhook/credit] No UserProfile for userId=${userId}. ` +
            `Session ${session.id} — wallet NOT topped up.`
        );
        return;
    }

    // ── Resolve payment intent ID ─────────────────────────────
    let stripePaymentIntentId: string | undefined;
    if (typeof session.payment_intent === 'string') {
        stripePaymentIntentId = session.payment_intent;
    }

    // ── Resolve amount paid ───────────────────────────────────
    const amountPaid = session.amount_total ?? 0;
    const currency = session.currency ?? 'usd';

    // ── Create Stripe Customer Balance transaction ─────────────
    // Records the credit grant on Stripe's side for auditability.
    // This is informational — it does NOT affect what Stripe charges.
    let stripeCustomerBalanceTxId: string | undefined;
    try {
        const balanceTx = await stripe.customers.createBalanceTransaction(
            stripeCustomerId,
            {
                amount: -(credits * 100), // negative = credit to customer
                currency,
                description:
                    `Credit grant: ${credits} credits from bundle "${meta.bundleName}" ` +
                    `(session ${session.id})`,
                metadata: {
                    type: 'credit_grant',
                    bundleKey: meta.bundleKey,
                    credits: meta.credits,
                    sessionId: session.id,
                    userId,
                },
            }
        );
        stripeCustomerBalanceTxId = balanceTx.id;
        console.log(
            `[webhook/credit] Created Stripe balance tx ${balanceTx.id} ` +
            `for ${credits} credits, session ${session.id}`
        );
    } catch (err) {
        // Don't block the wallet top-up if the Stripe balance tx fails —
        // the wallet is the source of truth for credit balances.
        console.error(
            `[webhook/credit] Failed to create Stripe balance transaction for session ${session.id}:`,
            err
        );
    }

    // ── Top up the wallet ─────────────────────────────────────
    try {
        const wallet = await topUpWallet({
            userId,
            stripeCustomerId,
            bundleKey: meta.bundleKey,
            bundleName: meta.bundleName,
            credits,
            listingsPerCredit,
            creditExpiryDays,
            stripeSessionId: session.id,
            stripePaymentIntentId,
            amountPaid,
            currency,
            stripeCustomerBalanceTxId,
        });

        console.log(
            `[webhook/credit] Wallet topped up for userId=${userId}: ` +
            `+${credits} credits, new balance=${wallet.totalAvailable}, session=${session.id}`
        );
    } catch (err) {
        console.error(
            `[webhook/credit] topUpWallet FAILED for userId=${userId}, session=${session.id}:`,
            err
        );
        // Re-throw so the webhook returns 500 and Stripe retries
        throw err;
    }
}
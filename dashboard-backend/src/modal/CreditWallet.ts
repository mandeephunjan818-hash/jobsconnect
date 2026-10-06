/**
 * modal/CreditWallet.ts
 *
 * One document per user.
 * Credits are stored as BATCHES, not a single number.
 * Each purchase = one batch with its own expiresAt.
 * Spending always consumes from the earliest-expiring batch first (FIFO).
 *
 * totalAvailable is a denormalized cache — always recomputed from
 * non-expired, non-exhausted batches. Never trust it without verifying
 * against the batches array if precision matters.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ─────────────────────────────────────────────────────────────
// Credit Batch — one entry per purchase
// ─────────────────────────────────────────────────────────────

export interface ICreditBatch {
    batchId: string;               // nanoid — stable reference in transactions
    bundleKey: string;             // which bundle was bought e.g. 'starter-10'
    bundleName: string;            // display name at time of purchase
    stripeSessionId: string;       // checkout.session.completed session id
    stripePaymentIntentId?: string;
    creditsPurchased: number;      // original credits in this batch
    creditsRemaining: number;      // decremented on each spend
    listingsPerCredit: number;     // rate locked at purchase time
    creditExpiryDays: number;      // expiry window locked at purchase time
    purchasedAt: Date;
    expiresAt: Date;               // purchasedAt + creditExpiryDays
    status: 'active' | 'exhausted' | 'expired';
    amountPaid: number;            // pence/cents — from Stripe
    currency: string;
    stripeCustomerBalanceTxId?: string; // Stripe Customer Balance transaction ID
}

const CreditBatchSchema = new Schema<ICreditBatch>(
    {
        batchId: { type: String, required: true },
        bundleKey: { type: String, required: true },
        bundleName: { type: String, required: true },
        stripeSessionId: { type: String, required: true },
        stripePaymentIntentId: { type: String },
        creditsPurchased: { type: Number, required: true, min: 1 },
        creditsRemaining: { type: Number, required: true, min: 0 },
        listingsPerCredit: { type: Number, required: true, min: 1 },
        creditExpiryDays: { type: Number, required: true, min: 1 },
        purchasedAt: { type: Date, required: true },
        expiresAt: { type: Date, required: true, index: true },
        status: {
            type: String,
            enum: ['active', 'exhausted', 'expired'],
            default: 'active',
            index: true,
        },
        amountPaid: { type: Number, required: true, min: 0 },
        currency: { type: String, required: true, default: 'usd' },
        stripeCustomerBalanceTxId: { type: String },
    },
    { _id: false }
);

// ─────────────────────────────────────────────────────────────
// CreditWallet document
// ─────────────────────────────────────────────────────────────

export interface ICreditWalletDocument extends Document {
    userId: mongoose.Types.ObjectId;
    stripeCustomerId: string;

    // Denormalized total — sum of creditsRemaining across active, non-expired batches.
    // Updated on every purchase and every spend. Use recomputeTotal() to sync.
    totalAvailable: number;

    // All batches — oldest first.
    // Sorted by expiresAt ASC so FIFO spend is always batches[0].
    batches: ICreditBatch[];

    // Lifetime stats
    totalPurchased: number;  // sum of all creditsPurchased ever
    totalSpent: number;      // sum of all credits ever debited
    totalExpired: number;    // sum of credits that expired unused

    createdAt: Date;
    updatedAt: Date;
}

const CreditWalletSchema = new Schema<ICreditWalletDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        stripeCustomerId: {
            type: String,
            required: true,
            index: true,
        },
        totalAvailable: {
            type: Number,
            default: 0,
            min: 0,
        },
        batches: {
            type: [CreditBatchSchema],
            default: [],
        },
        totalPurchased: { type: Number, default: 0, min: 0 },
        totalSpent: { type: Number, default: 0, min: 0 },
        totalExpired: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

// Compound index for the expiry sweep job:
// "find wallets that have active batches expiring before now"
CreditWalletSchema.index({ 'batches.expiresAt': 1, 'batches.status': 1 });
CreditWalletSchema.index({ 'batches.stripeSessionId': 1 });
CreditWalletSchema.index({ 'batches.batchId': 1 });

export const CreditWallet: Model<ICreditWalletDocument> =
    mongoose.models.CreditWallet ||
    mongoose.model<ICreditWalletDocument>('CreditWallet', CreditWalletSchema);
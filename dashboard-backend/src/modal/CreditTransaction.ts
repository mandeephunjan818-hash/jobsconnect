/**
 * modal/CreditTransaction.ts
 *
 * Immutable audit log of every credit movement for a user.
 * One document per event — never updated, only created.
 *
 * eventType:
 *   'purchase'  — credits added after successful Stripe payment
 *   'spend'     — credits consumed when a listing is posted
 *   'expired'   — credits swept away by the expiry job
 *   'refund'    — credits restored after a Stripe refund
 *   'adjustment'— manual admin credit grant or deduction
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type CreditEventType =
    | 'purchase'
    | 'spend'
    | 'expired'
    | 'refund'
    | 'adjustment';

export interface ICreditTransactionDocument extends Document {
    userId: mongoose.Types.ObjectId;
    stripeCustomerId: string;

    eventType: CreditEventType;

    // Always positive — direction is determined by eventType.
    // purchase/refund/adjustment(+) → credits added
    // spend/expired/adjustment(-)   → credits removed
    creditsIn: number;   // credits added in this event (0 if none)
    creditsOut: number;  // credits removed in this event (0 if none)

    // Wallet state AFTER this transaction
    balanceAfter: number;

    // Which batch(es) were affected — batchId references from CreditWallet
    affectedBatches: {
        batchId: string;
        creditsConsumed: number;   // how many credits taken from this batch
        remainingAfter: number;    // batch.creditsRemaining after this tx
    }[];

    // Context for spend events
    listingId?: string;
    listingTitle?: string;

    // Context for purchase events
    bundleKey?: string;
    bundleName?: string;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    amountPaid?: number;    // pence/cents
    currency?: string;

    // Context for expiry events
    expiredBatchIds?: string[];

    // Context for adjustment events
    adjustedBy?: string;    // adminUserId
    adjustmentReason?: string;

    // Stripe reference for any Stripe-side record created for this event
    stripeBalanceTxId?: string;

    createdAt: Date;
}

const AffectedBatchSchema = new Schema(
    {
        batchId: { type: String, required: true },
        creditsConsumed: { type: Number, required: true, min: 0 },
        remainingAfter: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const CreditTransactionSchema = new Schema<ICreditTransactionDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        stripeCustomerId: { type: String, required: true, index: true },

        eventType: {
            type: String,
            enum: ['purchase', 'spend', 'expired', 'refund', 'adjustment'],
            required: true,
            index: true,
        },

        creditsIn: { type: Number, required: true, default: 0, min: 0 },
        creditsOut: { type: Number, required: true, default: 0, min: 0 },
        balanceAfter: { type: Number, required: true, min: 0 },

        affectedBatches: { type: [AffectedBatchSchema], default: [] },

        // Spend context
        listingId: { type: String, index: true },
        listingTitle: { type: String },

        // Purchase context
        bundleKey: { type: String },
        bundleName: { type: String },
        stripeSessionId: { type: String, index: true },
        stripePaymentIntentId: { type: String },
        amountPaid: { type: Number, min: 0 },
        currency: { type: String },

        // Expiry context
        expiredBatchIds: [{ type: String }],

        // Adjustment context
        adjustedBy: { type: String },
        adjustmentReason: { type: String },

        // Stripe reference
        stripeBalanceTxId: { type: String },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// For the activity page: all events for a user, newest first
CreditTransactionSchema.index({ userId: 1, createdAt: -1 });
// For filtering by type on the activity page
CreditTransactionSchema.index({ userId: 1, eventType: 1, createdAt: -1 });

export const CreditTransaction: Model<ICreditTransactionDocument> =
    mongoose.models.CreditTransaction ||
    mongoose.model<ICreditTransactionDocument>('CreditTransaction', CreditTransactionSchema);
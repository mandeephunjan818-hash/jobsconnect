import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICreditBundleDocument extends Document {
    key: string;
    name: string;
    stripePriceId: string;
    stripeProductId: string;
    credits: number;            // how many credits this bundle grants
    price: number;              // in pence/cents — MIRRORED from Stripe, never hand-edited independently
    currency: string;           // mirrored from Stripe price object
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CreditBundleSchema = new Schema<ICreditBundleDocument>(
    {
        key: {
            type: String,
            required: [true, 'Bundle key is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Bundle name is required'],
            trim: true,
        },
        // Unlike SubscriptionPlan, stripePriceId is REQUIRED here.
        // Credit bundles are always paid, one-off purchases — there's no
        // "free tier" equivalent, so every bundle must map to a real Stripe Price.
        stripePriceId: {
            type: String,
            required: [true, 'stripePriceId is required for credit bundles'],
            unique: true,
        },
        // Stored so that if the admin changes the price later, we know which
        // Stripe Product to attach the new Price to (Stripe prices are
        // immutable — editing price means creating a new Price under the
        // same Product and swapping the pointer, see PUT route).
        stripeProductId: {
            type: String,
            required: [true, 'stripeProductId is required for credit bundles'],
        },
        credits: {
            type: Number,
            required: true,
            min: [1, 'credits must be at least 1'],
        },
        // This field is NEVER set directly from admin input. It is always
        // pulled from stripe.prices.retrieve()/create() at write time, so
        // the DB can never disagree with Stripe about what something costs.
        price: {
            type: Number,
            required: true,
            min: [0, 'price cannot be negative'],
        },
        currency: {
            type: String,
            required: true,
            default: 'usd',
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

CreditBundleSchema.index({ price: 1 });
CreditBundleSchema.index({ isActive: 1, price: 1 });

export const CreditBundle: Model<ICreditBundleDocument> =
    mongoose.models.CreditBundle ||
    mongoose.model<ICreditBundleDocument>('CreditBundle', CreditBundleSchema);
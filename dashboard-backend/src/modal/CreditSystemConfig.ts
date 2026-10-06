import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * modal/CreditSystemConfig.ts
 *
 * Singleton document — there is exactly ONE row in this collection,
 * always at _id = 'credit_system_config'.
 *
 * ADDED: stripeConfigProductId
 *   On the first PUT to /api/admin/credit-settings we create a dedicated
 *   Stripe Product whose sole job is to be the Stripe-side anchor for the
 *   exchange rate.  Its metadata always mirrors this document:
 *
 *     {
 *       type:                "system_config",
 *       listingsPerCredit:   "5",
 *       creditExpiryDays:    "365"
 *     }
 *
 *   We store the product ID here so we can update it on every subsequent
 *   settings change without having to search for it.
 */

export interface ICreditSystemConfigDocument extends Document<string> {
    _id: string;                      // always 'credit_system_config'
    listingsPerCredit: number;
    creditExpiryDays: number;
    stripeConfigProductId: string | null; // null until first PUT creates it
    updatedAt: Date;
    createdAt: Date;
}

const CreditSystemConfigSchema = new Schema<ICreditSystemConfigDocument>(
    {
        _id: {
            type: String,
            default: 'credit_system_config',
        },
        listingsPerCredit: {
            type: Number,
            required: true,
            min: [1, 'listingsPerCredit must be at least 1'],
            default: 1,
        },
        creditExpiryDays: {
            type: Number,
            required: true,
            min: [1, 'creditExpiryDays must be at least 1'],
            default: 365,
        },
        // Populated on first PUT — null until then.
        stripeConfigProductId: {
            type: String,
            default: null,
        },
    },
    { timestamps: true, _id: false }
);

export const CreditSystemConfig: Model<ICreditSystemConfigDocument> =
    mongoose.models.CreditSystemConfig ||
    mongoose.model<ICreditSystemConfigDocument>('CreditSystemConfig', CreditSystemConfigSchema);

/**
 * Always use this instead of CreditSystemConfig.findById() directly.
 * Creates the singleton row with defaults on first read so the rest
 * of the app never has to null-check "what if the config doesn't exist yet."
 */
export async function getCreditSystemConfig(): Promise<ICreditSystemConfigDocument> {
    let config = await CreditSystemConfig.findById('credit_system_config');
    if (!config) {
        config = await CreditSystemConfig.create({ _id: 'credit_system_config' });
    }
    return config;
}
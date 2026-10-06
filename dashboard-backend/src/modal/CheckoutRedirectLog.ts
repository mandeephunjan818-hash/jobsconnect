// models/CheckoutRedirectLog.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICheckoutRedirectLogDocument extends Document {
    userId: mongoose.Types.ObjectId;
    checkoutSessionId: string;           // from ?session_id=cs_...
    status: 'success' | 'canceled';      // parsed from the query
    queryParams: Record<string, any>;    // full raw query string (for any future debugging)
    pendingPlanKey?: string;             // if you pass it back from the client (see note below)
    userAgent?: string;                  // optional: detect bot / browser
    ip?: string;
    createdAt: Date;
}

const CheckoutRedirectLogSchema = new Schema<ICheckoutRedirectLogDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        checkoutSessionId: { type: String, required: true },
        status: { type: String, enum: ['success', 'canceled'], required: true },
        queryParams: { type: Schema.Types.Mixed, default: {} },
        pendingPlanKey: { type: String },
        userAgent: { type: String },
        ip: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Index for fast lookups by userId and date
CheckoutRedirectLogSchema.index({ userId: 1, createdAt: -1 });
// Also index by session ID to quickly find the log later
CheckoutRedirectLogSchema.index({ checkoutSessionId: 1 });

export const CheckoutRedirectLog: Model<ICheckoutRedirectLogDocument> =
    mongoose.models.CheckoutRedirectLog ||
    mongoose.model<ICheckoutRedirectLogDocument>('CheckoutRedirectLog', CheckoutRedirectLogSchema);
import mongoose, { Schema, Document, Model } from 'mongoose';

export type BillingEventType = 'invoice' | 'plan_change' | 'cancellation';

export interface IBillingHistoryDocument extends Document {
    userId: mongoose.Types.ObjectId;
    stripeCustomerId: string;
    stripeInvoiceId?: string;             // only for invoices
    eventType: BillingEventType;
    amountPaid: number;                  // 0 for plan changes / cancellations
    currency: string;
    status?: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft'; // invoices only
    invoiceUrl?: string;
    invoicePdf?: string;
    periodStart?: Date;
    periodEnd?: Date;
    previousPlanKey?: string;            // for plan_change / cancellation
    newPlanKey?: string;                 // for plan_change
    createdAt: Date;
}

const BillingHistorySchema = new Schema<IBillingHistoryDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        stripeCustomerId: {
            type: String,
            required: true,
            index: true,
        },
        stripeInvoiceId: {
            type: String,
            unique: true,
            sparse: true,               // allow null for non-invoice events
        },
        eventType: {
            type: String,
            enum: ['invoice', 'plan_change', 'cancellation'],
            required: true,
        },
        amountPaid: { type: Number, required: true },
        currency: { type: String, required: true, default: 'usd' },
        status: {
            type: String,
            enum: ['paid', 'open', 'void', 'uncollectible', 'draft'],
        },
        invoiceUrl: { type: String },
        invoicePdf: { type: String },
        periodStart: { type: Date },
        periodEnd: { type: Date },
        previousPlanKey: { type: String },
        newPlanKey: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

BillingHistorySchema.index({ userId: 1, createdAt: -1 });

export const BillingHistory: Model<IBillingHistoryDocument> =
    mongoose.models.BillingHistory ||
    mongoose.model<IBillingHistoryDocument>('BillingHistory', BillingHistorySchema);
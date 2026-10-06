import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionUsageDocument extends Document {
    userId: mongoose.Types.ObjectId;
    periodStart: Date;
    periodEnd: Date;
    planKey: string;               // snapshot of plan at start of period
    listingsUsed: number;          // count of active listings (or submitted)
    manualPostsUsed: number;       // listings submitted manually
    autoPostsUsed: number;         // auto/feed posts
    jobBankRequestsUsed: number;   // job bank ID requests
    applicantsUsed: number;        // applications received
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionUsageSchema = new Schema<ISubscriptionUsageDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },
        planKey: { type: String, required: true },
        listingsUsed: { type: Number, default: 0 },
        manualPostsUsed: { type: Number, default: 0 },
        autoPostsUsed: { type: Number, default: 0 },
        jobBankRequestsUsed: { type: Number, default: 0 },
        applicantsUsed: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Ensure only one usage doc per user per period
SubscriptionUsageSchema.index({ userId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

export const SubscriptionUsage: Model<ISubscriptionUsageDocument> =
    mongoose.models.SubscriptionUsage ||
    mongoose.model<ISubscriptionUsageDocument>('SubscriptionUsage', SubscriptionUsageSchema);
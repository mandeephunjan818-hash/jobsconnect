import mongoose, { Schema, Document, Model } from 'mongoose';

export type ResourceType = 'listing' | 'manual_post' | 'auto_post' | 'job_bank_request' | 'applicant';

export interface ISubscriptionUsageEventDocument extends Document {
    userId: mongoose.Types.ObjectId;
    resourceType: ResourceType;
    change: number;                // renamed from increment
    metadata?: Record<string, any>;
    timestamp: Date;
}

const SubscriptionUsageEventSchema = new Schema<ISubscriptionUsageEventDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        resourceType: {
            type: String,
            enum: ['listing', 'manual_post', 'auto_post', 'job_bank_request', 'applicant'],
            required: true,
        },
        change: { type: Number, required: true },   // renamed
        metadata: { type: Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false }
);

SubscriptionUsageEventSchema.index({ userId: 1, timestamp: -1 });

export const SubscriptionUsageEvent: Model<ISubscriptionUsageEventDocument> =
    mongoose.models.SubscriptionUsageEvent ||
    mongoose.model<ISubscriptionUsageEventDocument>('SubscriptionUsageEvent', SubscriptionUsageEventSchema);
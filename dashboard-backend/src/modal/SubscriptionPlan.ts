import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionPlanDocument extends Document {
    key: string;
    name: string;
    stripePriceId?: string;
    listingQuota: number;          // max active listings
    applicantLimit: number;        // max applicants allowed via website
    manualPostLimit: number;       // max manual posts per period
    autoPostLimit: number;         // max auto/feed posts per period
    postVisibilityDays: number;    // days a post remains visible
    price: number;                 // in pence/cents
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlanDocument>(
    {
        key: {
            type: String,
            required: [true, 'Plan key is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Plan name is required'],
            trim: true,
        },
        stripePriceId: {
            type: String,
            default: null,
        },
        listingQuota: {
            type: Number,
            required: true,
            min: [0, 'listingQuota cannot be negative'],
            default: 1,
        },
        applicantLimit: {
            type: Number,
            required: true,
            min: [0, 'applicantLimit cannot be negative'],
            default: 0,
        },
        manualPostLimit: {
            type: Number,
            required: true,
            min: [0, 'manualPostLimit cannot be negative'],
            default: 0,
        },
        autoPostLimit: {
            type: Number,
            required: true,
            min: [0, 'autoPostLimit cannot be negative'],
            default: 0,
        },
        postVisibilityDays: {
            type: Number,
            required: true,
            min: [0, 'postVisibilityDays cannot be negative'],
            default: 30,
        },
        price: {
            type: Number,
            required: true,
            min: [0, 'price cannot be negative'],
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// Indexes for common queries
SubscriptionPlanSchema.index({ price: 1 });
SubscriptionPlanSchema.index({ isActive: 1, price: 1 });
SubscriptionPlanSchema.index({ stripePriceId: 1 }, { unique: true, sparse: true });

export const SubscriptionPlan: Model<ISubscriptionPlanDocument> =
    mongoose.models.SubscriptionPlan ||
    mongoose.model<ISubscriptionPlanDocument>('SubscriptionPlan', SubscriptionPlanSchema);
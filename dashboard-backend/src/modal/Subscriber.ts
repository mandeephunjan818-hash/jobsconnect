import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES, SiteId } from '@/lib/sites';

export interface ISubscriber extends Document {
    email: string;
    name?: string;
    siteId: SiteId;
    status: 'active' | 'unsubscribed';
    preferences: {
        blogs: boolean;
        jobs: boolean;
    };
    unsubscribeToken: string;
    subscribedAt: Date;
    unsubscribedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
    {
        email: {
            type: String,
            required: true,
            // unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
        },
        siteId: {
            type: String,
            required: true,
            enum: KNOWN_SITES,
        },
        status: {
            type: String,
            enum: ['active', 'unsubscribed'],
            default: 'active',
        },
        preferences: {
            blogs: { type: Boolean, default: true },
            jobs: { type: Boolean, default: true },
        },
        unsubscribeToken: {
            type: String,
            required: true,
            unique: true,
        },
        subscribedAt: {
            type: Date,
            default: Date.now,
        },
        unsubscribedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

SubscriberSchema.index({ email: 1, siteId: 1 }, { unique: true });

export default mongoose.models.Subscriber ||
    mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
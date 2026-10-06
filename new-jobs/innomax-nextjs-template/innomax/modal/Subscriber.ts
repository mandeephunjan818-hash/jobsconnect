import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriber extends Document {
    email: string;
    name?: string;
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
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
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

export default mongoose.models.Subscriber ||
    mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
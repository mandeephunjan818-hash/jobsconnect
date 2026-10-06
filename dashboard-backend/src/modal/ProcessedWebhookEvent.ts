import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessedWebhookEventDocument extends Document {
    eventId: string;      // Stripe event.id — unique
    eventType: string;    // e.g. 'checkout.session.completed'
    processedAt: Date;
}

const ProcessedWebhookEventSchema = new Schema<IProcessedWebhookEventDocument>(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        eventType: { type: String, required: true },
        processedAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

// Auto-expire records after 30 days — Stripe never retries that old
ProcessedWebhookEventSchema.index(
    { processedAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

export const ProcessedWebhookEvent: Model<IProcessedWebhookEventDocument> =
    mongoose.models.ProcessedWebhookEvent ||
    mongoose.model<IProcessedWebhookEventDocument>(
        'ProcessedWebhookEvent',
        ProcessedWebhookEventSchema
    );
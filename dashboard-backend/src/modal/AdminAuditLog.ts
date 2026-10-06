import mongoose, { Schema, Document, Model } from 'mongoose';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AdminAuditAction =
    | 'bundle.create'
    | 'bundle.edit'
    | 'bundle.reprice'
    | 'bundle.deactivate'
    | 'bundle.reactivate'
    | 'settings.update'
    | 'settings.stripe_config_product.create'
    | 'settings.stripe_all_bundles.sync';

export type AdminAuditTargetType = 'credit_bundle' | 'credit_system_config';

export type StripeAction =
    | 'product.create'
    | 'product.update'
    | 'product.archive'
    | 'price.create'
    | 'price.update'
    | 'price.archive';

export interface IStripeOperation {
    action: StripeAction;
    objectType: 'product' | 'price';
    stripeId: string;          // product_xxx or price_xxx
    metadataSnapshot?: Record<string, string>; // what was written to Stripe
}

export interface IAdminAuditLogDocument extends Document {
    // Who did it
    adminUserId: string;       // from session — always populated
    ip: string;
    userAgent: string;

    // What they did
    action: AdminAuditAction;
    targetType: AdminAuditTargetType;
    targetId: string;          // bundle _id or 'credit_system_config'

    // State diff
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;

    // Every Stripe object touched in this operation
    stripeOperations: IStripeOperation[];

    // Summary of the error if the operation partially failed
    partialFailure?: string;

    createdAt: Date;
    updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────

const StripeOperationSchema = new Schema<IStripeOperation>(
    {
        action: {
            type: String,
            enum: [
                'product.create',
                'product.update',
                'product.archive',
                'price.create',
                'price.update',
                'price.archive',
            ],
            required: true,
        },
        objectType: {
            type: String,
            enum: ['product', 'price'],
            required: true,
        },
        stripeId: { type: String, required: true },
        metadataSnapshot: { type: Map, of: String, default: {} },
    },
    { _id: false }
);

const AdminAuditLogSchema = new Schema<IAdminAuditLogDocument>(
    {
        adminUserId: { type: String, required: true, index: true },
        ip: { type: String, default: 'unknown' },
        userAgent: { type: String, default: 'unknown' },

        action: {
            type: String,
            enum: [
                'bundle.create',
                'bundle.edit',
                'bundle.reprice',
                'bundle.deactivate',
                'bundle.reactivate',
                'settings.update',
                'settings.stripe_config_product.create',
                'settings.stripe_all_bundles.sync',
            ],
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: ['credit_bundle', 'credit_system_config'],
            required: true,
        },
        targetId: { type: String, required: true, index: true },

        before: { type: Schema.Types.Mixed, default: null },
        after: { type: Schema.Types.Mixed, default: null },

        stripeOperations: { type: [StripeOperationSchema], default: [] },

        partialFailure: { type: String },
    },
    { timestamps: true }
);

// Compound index for admin dashboard queries: "all actions on this bundle"
// and "all actions by this admin in the last 30 days"
AdminAuditLogSchema.index({ targetId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ adminUserId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });

// ─────────────────────────────────────────────────────────────
// Model
// ─────────────────────────────────────────────────────────────

export const AdminAuditLog: Model<IAdminAuditLogDocument> =
    mongoose.models.AdminAuditLog ||
    mongoose.model<IAdminAuditLogDocument>('AdminAuditLog', AdminAuditLogSchema);
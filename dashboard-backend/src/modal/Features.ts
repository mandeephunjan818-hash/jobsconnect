import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
    icon: string;      // flaticon class name
    title: string;
    text: string;
    imageUrl: string;
    link: string;  // URL to the feature image
    order: number;     // for sorting
}

const FeaturesSchema = new Schema<IService>(
    {
        icon: { type: String, required: true },
        title: { type: String, required: true },
        text: { type: String, required: true },
        imageUrl: { type: String, required: true },
        link: { type: String, required: true },
        order: { type: Number, required: true, index: true },
    },
    {
        timestamps: true,       // adds createdAt and updatedAt
    }
);

// Create a compound index if needed, e.g., for unique numbers
// ServiceSchema.index({ number: 1 }, { unique: true });

export default mongoose.models.Features || mongoose.model<IService>('Features', FeaturesSchema);
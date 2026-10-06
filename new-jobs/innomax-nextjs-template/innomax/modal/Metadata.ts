import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES } from '../lib/sites';

export interface IMetadata extends Document {
    urlPattern: string;
    siteId: string;
    title: string;
    logo?: string;
    logoAlt?: string;
    logoTitle?: string;
    description: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    ogImageTitle?: string;
    canonicalUrl?: string;
    robots?: string;
    isActive: boolean;
}

const MetadataSchema = new Schema<IMetadata>(
    {
        urlPattern: {
            type: String, required: true,
            //  unique: true
        },
        siteId: {
            type: String,
            required: true,
            default: '*',
            validate: {
                validator: (v: string) =>
                    v === '*' || (KNOWN_SITES as readonly string[]).includes(v),
                message: 'Invalid siteId',
            },
        },
        title: { type: String, required: true },
        logo: { type: String },
        logoAlt: { type: String },
        logoTitle: { type: String },
        description: { type: String, required: true },
        keywords: { type: String },
        ogTitle: { type: String },
        ogDescription: { type: String },
        ogImage: { type: String },
        ogImageAlt: { type: String },
        ogImageTitle: { type: String },
        canonicalUrl: { type: String },
        robots: { type: String, default: 'index, follow' },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

MetadataSchema.index({ urlPattern: 1, siteId: 1 }, { unique: true });

export default mongoose.models.Metadata || mongoose.model<IMetadata>('Metadata', MetadataSchema);
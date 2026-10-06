import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES } from '../lib/sites';

export interface ISiteConfig extends Document {
    siteId: string;
    // Branding
    logoUrl?: string;
    logoAlt?: string;
    faviconUrl?: string;
    // Contact
    contactEmail?: string;
    phone?: string;
    address?: string;
    // Open Graph
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    // Meta
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const SiteConfigSchema = new Schema<ISiteConfig>(
    {
        siteId: {
            type: String,
            required: true,
            unique: true,
            validate: {
                validator: (v: string) =>
                    v === '*' || (KNOWN_SITES as readonly string[]).includes(v),
                message: (props: { value: string }) => `"${props.value}" is not a valid siteId`,
            },
        },
        // Branding
        logoUrl: { type: String, trim: true },
        logoAlt: { type: String, trim: true },
        faviconUrl: { type: String, trim: true },
        // Contact
        contactEmail: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        address: { type: String, trim: true },
        // Open Graph
        ogTitle: { type: String, trim: true },
        ogDescription: { type: String, trim: true },
        ogImageUrl: { type: String, trim: true },
        // Meta
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.models.SiteConfig ||
    mongoose.model<ISiteConfig>('SiteConfig', SiteConfigSchema);
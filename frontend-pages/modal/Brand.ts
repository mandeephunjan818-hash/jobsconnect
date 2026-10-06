/**
 * Brand.ts
 *
 * One document per partner/brand company.
 *
 * Visibility rule:
 *   A brand appears on a site when:
 *     1. isActive === true
 *     2. visibleOnSites contains that site's slug
 *
 *   There is NO "one per site" constraint — many brands can be
 *   active on the same site simultaneously (that's the whole point
 *   of the slider).
 *
 * Import rule:
 *   ✅  import FROM sharedListing (for KNOWN_SITES / SiteSlug)
 *   ❌  never import from Listing.ts or ListingDraft.ts
 */

import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES } from './sharedListing';

// ─────────────────────────────────────────────────────────────
// Company address  (embedded sub-document)
// ─────────────────────────────────────────────────────────────
export interface ICompanyAddress {
    street?: string;
    city?: string;
    province?: string;
    country?: string;
    postalCode?: string;
}

const CompanyAddressSchema = new Schema<ICompanyAddress>(
    {
        street: { type: String },
        city: { type: String },
        province: { type: String },
        country: { type: String },
        postalCode: { type: String },
    },
    { _id: false },
);

// ─────────────────────────────────────────────────────────────
// Brand document
// ─────────────────────────────────────────────────────────────
export interface IBrand extends Document {
    // ── Company identity ──────────────────────────────────────
    /**
     * Full legal / display name of the company.
     * e.g. "Maple Leaf Foods Inc."
     */
    name: string;

    /**
     * Industry / sector label.
     * e.g. "Food & Beverage", "Technology", "Healthcare"
     */
    companyType: string;

    /**
     * One-paragraph description shown in admin / partner portal.
     * NOT rendered in the public slider — logo only there.
     */
    description: string;

    address: ICompanyAddress;

    // ── Logo ──────────────────────────────────────────────────
    /**
     * CDN / uploaded URL for the logo image.
     * Rendered as <Image src={logoUrl} /> in the slider.
     */
    logoUrl: string;

    /**
     * Alt text for the logo — for accessibility.
     * Defaults to the company name if not supplied.
     */
    logoAlt: string;

    /**
     * Optional click-through URL for the logo in the slider.
     * Leave empty to render a non-clickable logo.
     */
    websiteUrl?: string;

    // ── Display ───────────────────────────────────────────────
    /**
     * Controls position in the slider (lower = appears earlier).
     */
    order: number;

    // ── Visibility ────────────────────────────────────────────
    /**
     * Which site slugs this brand appears on.
     * A brand can appear on any number of sites simultaneously.
     * e.g. ["new-jobs-fawn.vercel.app", "jobsrefugee.ca"]
     */
    visibleOnSites: string[];

    /**
     * Global on/off toggle.
     * false = hidden everywhere regardless of visibleOnSites.
     */
    isActive: boolean;

    // ── Timestamps ────────────────────────────────────────────
    createdAt: Date;
    updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────
const BrandSchema = new Schema<IBrand>(
    {
        // ── Company identity ──────────────────────────────────
        name: { type: String, required: true },
        companyType: { type: String, required: true },
        description: { type: String, required: true },
        address: { type: CompanyAddressSchema, default: () => ({}) },

        // ── Logo ──────────────────────────────────────────────
        logoUrl: { type: String, required: true },
        logoAlt: { type: String, default: '' },   // pre-save fills from name
        websiteUrl: { type: String },

        // ── Display ───────────────────────────────────────────
        order: { type: Number, required: true, default: 0, index: true },

        // ── Visibility ────────────────────────────────────────
        visibleOnSites: {
            type: [String],
            default: [],
            enum: KNOWN_SITES,
            index: true,
        },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────

// Fast lookup: "all active brands for site X, ordered"
BrandSchema.index({ visibleOnSites: 1, isActive: 1, order: 1 });

// ─────────────────────────────────────────────────────────────
// Pre-save: default logoAlt to company name if not provided
// ─────────────────────────────────────────────────────────────
BrandSchema.pre('save', function () {
    if (!this.logoAlt && this.name) {
        this.logoAlt = this.name;
    }
});

export default mongoose.models.Brand ||
    mongoose.model<IBrand>('Brand', BrandSchema);
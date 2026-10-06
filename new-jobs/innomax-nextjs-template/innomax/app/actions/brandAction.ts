'use server';

/**
 * brandAction.ts
 *
 * Fetches all active brands visible on a given site, ordered for
 * the infinite-scroll slider.
 *
 * Cache tagged so it can be purged on-demand when an admin
 * adds / removes / reorders a brand:
 *   revalidateTag('brands')                        → bust all sites
 *   revalidateTag('brands-new-jobs-fawn.vercel.app')     → bust one site
 */
import connectToDatabase from '../../lib/mongooes';
import Brand from '../../modal/Brand';
import type { SiteSlug } from '../../modal/sharedListing';

// ─────────────────────────────────────────────────────────────
// Public shape consumed by the UI component
// Only the fields the slider actually needs — keeps the payload
// lean (company info stays server-side only).
// ─────────────────────────────────────────────────────────────
export interface BrandSliderItem {
    _id: string;
    logoUrl: string;
    logoAlt: string;
    websiteUrl?: string;
    order: number;
}

// ─────────────────────────────────────────────────────────────
// Core fetcher
// ─────────────────────────────────────────────────────────────
export async function getActiveBrandsForSite(
    site: SiteSlug,
): Promise<BrandSliderItem[]> {
    try {
        await connectToDatabase();

        const brands = await Brand.find({
            visibleOnSites: site,   // array contains this site slug
            isActive: true,
        })
            .sort({ order: 1 })     // respect admin-defined display order
            .select('logoUrl logoAlt websiteUrl order') // only slider fields
            .lean();

        return brands.map((b: any) => ({
            _id: b._id.toString(),
            logoUrl: b.logoUrl,
            logoAlt: b.logoAlt || b.name,
            websiteUrl: b.websiteUrl,
            order: b.order,
        }));

    } catch (error) {
        console.error('getActiveBrandsForSite error:', error);
        return [];
    }
}
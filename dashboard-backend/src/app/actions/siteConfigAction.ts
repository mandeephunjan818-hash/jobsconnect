"use server";

import connectToDatabase from "@/lib/mongooes";
import SiteConfig from "@/modal/SiteConfig";

export interface SiteConfigData {
    siteId: string;
    logoUrl?: string;
    logoAlt?: string;
    faviconUrl?: string;
    contactEmail?: string;
    phone?: string;
    address?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
}

/**
 * Fetch the site configuration for a given site.
 * - If a specific config exists for `site`, it's returned.
 * - Otherwise, falls back to global config (siteId = '*').
 * - If neither exists, returns null.
 */
export const getSiteConfig = async (
    site?: string
): Promise<SiteConfigData | null> => {
    try {
        await connectToDatabase();

        let config = null;
        if (site) {
            config = await SiteConfig.findOne({ siteId: site, isActive: true }).lean();
        }
        if (!config) {
            config = await SiteConfig.findOne({ siteId: "*", isActive: true }).lean();
        }
        if (!config) return null;

        return {
            siteId: config.siteId,
            logoUrl: config.logoUrl,
            logoAlt: config.logoAlt,
            faviconUrl: config.faviconUrl,
            contactEmail: config.contactEmail,
            phone: config.phone,
            address: config.address,
            ogTitle: config.ogTitle,
            ogDescription: config.ogDescription,
            ogImageUrl: config.ogImageUrl,
        };
    } catch (error) {
        console.error("getSiteConfig error:", error);
        return null;
    }
};
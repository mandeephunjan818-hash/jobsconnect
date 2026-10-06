// lib/fetchPageMetadata.ts
import connectToDatabase from './mongooes';
import MetadataModel from '../modal/Metadata';
import SiteConfigModel from '../modal/SiteConfig';
import { MetadataItem } from '../hooks/useMetadata';  // adjust import as needed

// Cloudinary helper – unchanged
function toJpgOgImage(url: string | undefined): string | undefined {
    if (!url) return undefined;
    if (
        url.includes('res.cloudinary.com') &&
        (url.endsWith('.svg') || url.endsWith('.png') || url.endsWith('.webp'))
    ) {
        return url
            .replace('/upload/', '/upload/w_1200,h_630,c_pad,b_white,f_jpg/')
            .replace(/\.(svg|png|webp)$/, '.jpg');
    }
    return url;
}

export async function fetchPageMetadata(
    url: string,
    site?: string
): Promise<MetadataItem | null> {
    try {
        const resolvedSite = site ?? process.env.NEXT_PUBLIC_SITE_ID ?? '*';
        await connectToDatabase();

        // 1. Fetch metadata for this URL and site (priority: site-specific, then global)
        let metadataDoc = await MetadataModel.findOne({
            siteId: resolvedSite,
            urlPattern: url,
            isActive: true,
        }).lean();

        if (!metadataDoc) {
            metadataDoc = await MetadataModel.findOne({
                siteId: '*',
                urlPattern: url,
                isActive: true,
            }).lean();
        }

        // 2. Fetch site config (fallback)
        let siteConfig = await SiteConfigModel.findOne({
            siteId: resolvedSite,
            isActive: true,
        }).lean();

        if (!siteConfig) {
            siteConfig = await SiteConfigModel.findOne({
                siteId: '*',
                isActive: true,
            }).lean();
        }

        // 3. If there's no data at all, return null
        if (!metadataDoc && !siteConfig) {
            return null;
        }

        // 4. Merge into a complete MetadataItem
        const merged = mergeData(metadataDoc, siteConfig, resolvedSite, url);

        // 5. Post-process ogImage
        if (merged.ogImage) {
            merged.ogImage = toJpgOgImage(merged.ogImage);
        }

        console.log('[fetchPageMetadata] Final merged result:', merged);
        return merged;
    } catch (error) {
        console.error('[fetchPageMetadata] Error:', error);
        return null;
    }
}

function mergeData(
    metadata: Record<string, any> | null,
    siteConfig: Record<string, any> | null,
    resolvedSite: string,
    url: string
): MetadataItem {
    // Base object with all required fields from MetadataItem
    const merged: MetadataItem = {
        id: metadata?._id?.toString() || '',                 // document ID or empty
        urlPattern: metadata?.urlPattern || url,             // pattern or the requested URL
        isActive: true,                                      // we only fetched active records
        siteId: resolvedSite,
        title: '',
        description: '',
        keywords: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        logo: '',
        logoAlt: '',
        logoTitle: '',
        ogImageAlt: '',
        ogImageTitle: '',
        canonicalUrl: '',
        robots: 'index, follow',
    };

    // Apply metadata overrides (if exists)
    if (metadata) {
        merged.title = metadata.title ?? '';
        merged.description = metadata.description ?? '';
        merged.keywords = metadata.keywords ?? '';
        merged.logo = metadata.logo ?? '';
        merged.logoAlt = metadata.logoAlt ?? '';
        merged.logoTitle = metadata.logoTitle ?? '';
        merged.ogTitle = metadata.ogTitle ?? '';
        merged.ogDescription = metadata.ogDescription ?? '';
        merged.ogImage = metadata.ogImage ?? '';
        merged.ogImageAlt = metadata.ogImageAlt ?? '';
        merged.ogImageTitle = metadata.ogImageTitle ?? '';
        merged.canonicalUrl = metadata.canonicalUrl ?? '';
        merged.robots = metadata.robots ?? 'index, follow';
        // Preserve the original siteId from metadata, unless it's '*'
        if (metadata.siteId !== '*') {
            merged.siteId = metadata.siteId;
        }
    }

    // Fallbacks from SiteConfig
    if (siteConfig) {
        if (!merged.ogTitle && siteConfig.ogTitle) merged.ogTitle = siteConfig.ogTitle;
        if (!merged.ogDescription && siteConfig.ogDescription) merged.ogDescription = siteConfig.ogDescription;
        if (!merged.ogImage && siteConfig.ogImageUrl) merged.ogImage = siteConfig.ogImageUrl;
        // Fallback ogImage to logo if still missing
        if (!merged.ogImage && siteConfig.logoUrl) merged.ogImage = siteConfig.logoUrl;

        // Logo fallback
        if (!merged.logo && siteConfig.logoUrl) {
            merged.logo = siteConfig.logoUrl;
            merged.logoAlt = merged.logoAlt || siteConfig.logoAlt || '';
            merged.logoTitle = merged.logoTitle || siteConfig.logoAlt || '';
        }

        // Title / Description fallback
        if (!merged.title && siteConfig.ogTitle) merged.title = siteConfig.ogTitle;
        if (!merged.description && siteConfig.ogDescription) merged.description = siteConfig.ogDescription;
    }

    // Final safety: ensure required strings are not undefined
    merged.title = merged.title || '';
    merged.description = merged.description || '';
    merged.keywords = merged.keywords || '';

    return merged;
}
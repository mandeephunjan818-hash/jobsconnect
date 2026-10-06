// src/app/actions/jobSearchData.ts
'use server';

import connectToDatabase from '../../../lib/mongooes';
import Listing from '../../../modal/Listing';
import type { SiteSlug } from '../../../modal/sharedListing';

export interface JobSearchIndex {
    titles: string[];
    locations: string[];
}

// Reuses the same site-window visibility logic as jobListAction
function isListingVisibleOnSite(
    listing: { siteWindows?: { site: string; startAt: Date | string; endAt: Date | string }[] },
    site: string,
): boolean {
    if (!listing.siteWindows || listing.siteWindows.length === 0) return true;
    const now = new Date();
    const window = listing.siteWindows.find(w => w.site === site);
    if (!window) return false;
    return new Date(window.startAt) <= now && now <= new Date(window.endAt);
}

function resolveSite(): SiteSlug | undefined {
    const envSite = process.env.NEXT_PUBLIC_SITE_ID;
    return envSite ? (envSite as SiteSlug) : undefined;
}

export async function getJobSearchIndex(): Promise<JobSearchIndex> {
    const effectiveSite = resolveSite();

    try {
        await connectToDatabase();

        const listings = await Listing.find({
            status: 'approved',
            isActive: true,
        })
            .select('title slots siteWindows')
            .lean();

        const result = effectiveSite
            ? listings.filter((l: any) => isListingVisibleOnSite(l, effectiveSite))
            : listings;

        const titleSet = new Set<string>();
        const locationSet = new Set<string>();

        (result as any[]).forEach(l => {
            if (l.title) titleSet.add(l.title);
            (l.slots ?? []).forEach((s: any) => {
                if (s.city && s.province) {
                    locationSet.add(`${s.city}, ${s.province}`);
                }
            });
        });

        return {
            titles: Array.from(titleSet).sort(),
            locations: Array.from(locationSet).sort(),
        };
    } catch (error) {
        console.error('getJobSearchIndex error:', error);
        return { titles: [], locations: [] };
    }
}
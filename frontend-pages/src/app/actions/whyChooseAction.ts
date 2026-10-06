'use server';

/**
 * whyChooseAction.ts
 *
 * Fetches the single active WhyChooseUs document for a given site.
 * Uses Next.js unstable_cache for ISR-style caching (60 s revalidation).
 *
 * Cache is tagged so it can be purged on-demand when an admin
 * publishes / deactivates a document:
 *   revalidateTag('why-choose-us')
 */
import connectToDatabase from '../../../lib/mongooes';
import WhyChooseUs from '../../../modal/WhyChooseUs';
import type { SiteSlug } from '../../../modal/sharedWhyChoose';

// ─────────────────────────────────────────────────────────────
// Public shape consumed by the UI component
// ─────────────────────────────────────────────────────────────
export interface SkillBarItem {
    label: string;
    percentage: number;
    order: number;
}

export interface WhyChooseUsData {
    // Section text
    tagline: string;
    title: string;
    paragraph: string;

    // Skill bars (sorted by order asc)
    skillBars: SkillBarItem[];

    // Video
    youtubeId: string;
    thumbnailUrl: string;
    playButtonImageUrl: string;
}

// ─────────────────────────────────────────────────────────────
// Core fetcher  (not cached — called by the cached wrapper)
// ─────────────────────────────────────────────────────────────
export async function getActiveWhyChooseUs(
    site: SiteSlug,
): Promise<WhyChooseUsData | null> {
    try {
        await connectToDatabase();

        const doc = await WhyChooseUs.findOne({
            site,
            status: 'approved',
            isActive: true,
        }).lean();

        if (!doc) return null;

        return {
            // Section text
            tagline: doc.sectionText.tagline,
            title: doc.sectionText.title,
            paragraph: doc.sectionText.paragraph,

            // Skill bars — sort by order so admin controls display sequence
            skillBars: [...doc.skillBars].sort((a, b) => a.order - b.order),

            // Video
            youtubeId: doc.video.youtubeId,
            thumbnailUrl: doc.video.thumbnailUrl,
            playButtonImageUrl: doc.video.playButtonImageUrl,
        };
    } catch (error) {
        console.error('getActiveWhyChooseUs error:', error);
        return null;
    }
}
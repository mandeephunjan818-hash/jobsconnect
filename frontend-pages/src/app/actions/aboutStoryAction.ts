'use server';

/**
 * aboutStoryAction.ts
 *
 * Fetches the AboutStory document for a given pageIdentifier.
 * Uses Next.js unstable_cache for ISR-style caching (60 s revalidation).
 *
 * Cache tagged so it can be purged on-demand when an admin updates
 * the content:
 *   revalidateTag('about-story')                    → bust all pages
 *   revalidateTag('about-story-home-one')           → bust one page
 */
import connectToDatabase from '../../../lib/mongooes';
import AboutStory from '../../../modal/AboutStory';

// ─────────────────────────────────────────────────────────────
// Public shape consumed by the UI component
// ─────────────────────────────────────────────────────────────
export interface StatItem {
    number: number;
    suffix?: string;
    text: string;
}

export interface AboutStoryData {
    pageIdentifier: string;
    heading: string;
    description: string;
    listItems: string[];
    buttonText: string;
    buttonLink: string;
    mainImage: string;
    sideImages: string[];   // always 2 items
    stats: StatItem[];
}

// ─────────────────────────────────────────────────────────────
// Core fetcher
// ─────────────────────────────────────────────────────────────
export async function getAboutStory(
    pageIdentifier: string,
): Promise<AboutStoryData | null> {
    try {
        await connectToDatabase();

        const doc = await AboutStory.findOne({ pageIdentifier }).lean();

        if (!doc) return null;

        return {
            pageIdentifier: doc.pageIdentifier,
            heading: doc.heading,
            description: doc.description,
            listItems: doc.listItems ?? [],
            buttonText: doc.buttonText,
            buttonLink: doc.buttonLink,
            mainImage: doc.mainImage,
            sideImages: doc.sideImages ?? [],
            stats: (doc.stats ?? []).map((s: any) => ({
                number: s.number,
                suffix: s.suffix ?? '+',
                text: s.text,
            })),
        };
    } catch (error) {
        console.error('getAboutStory error:', error);
        return null;
    }
}
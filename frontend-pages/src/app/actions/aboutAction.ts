'use server';

import connectToDatabase from '../../../lib/mongooes';
import About from '../../../modal/About';

export interface AboutItem {
    id: string;
    pageIdentifier: string;
    imageUrl: string;
    subtitle: string;
    title: string;
    paragraphs: string[];
    listItems: string[];
    buttonText: string;
    buttonLink: string;
    order: number;
}

/**
 * Fetch a single About section by pageIdentifier.
 * Returns null if not found or on error — never throws.
 */
export async function getAboutByPageIdentifier(
    pageIdentifier: string
): Promise<AboutItem | null> {
    if (!pageIdentifier || typeof pageIdentifier !== 'string') {
        console.warn('getAboutByPageIdentifier: invalid identifier', pageIdentifier);
        return null;
    }

    try {
        await connectToDatabase();

        const doc = await About.findOne({ pageIdentifier }).lean();

        if (!doc) return null;


        console.log(doc);

        return {
            id: doc._id.toString(),
            pageIdentifier: doc.pageIdentifier,
            imageUrl: doc.imageUrl ?? '/fallback-about.jpg',
            subtitle: doc.subtitle ?? '',
            title: doc.title ?? 'Untitled',
            paragraphs: Array.isArray(doc.paragraphs) ? doc.paragraphs : [],
            listItems: Array.isArray(doc.listItems) ? doc.listItems : [],
            buttonText: doc.buttonText ?? 'Learn More',
            buttonLink: doc.buttonLink ?? '/',
            order: typeof doc.order === 'number' ? doc.order : 999,
        };
    } catch (error) {
        console.error(`getAboutByPageIdentifier error for "${pageIdentifier}":`, error);
        return null;
    }
}
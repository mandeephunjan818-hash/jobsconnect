// src/app/actions/faqActions.ts
'use server';

import connectToDatabase from '../../../lib/mongooes';
import Faq from '../../../modal/FAQ';

export interface FaqItem {
    id: number;          // sequential number inside the section (1‑based)
    question: string;
    answer: string;
    _dbId: string;       // real MongoDB _id
}

export interface FaqSection {
    id: string;          // section slug (e.g. "faqs")
    title: string;       // display title
    questions: FaqItem[];
}

/**
 * Fetch FAQs, optionally filtered by a specific site.
 * - If `site` is provided, returns only FAQs that are either global (`sites` contains '*')
 *   or explicitly assigned to that site.
 * - If `site` is omitted, returns ALL FAQs (e.g., for admin use or global view).
 */
export async function getFaqs(site?: string): Promise<FaqSection[]> {
    try {
        await connectToDatabase();

        // Build filter – if a site is given, match docs whose sites array contains the site or '*'
        const filter: any = {};
        if (site) {
            filter.sites = { $in: [site, '*'] };
        }

        const docs = await Faq.find(filter).sort({ order: 1 }).lean();

        console.log("FAQ from the backend", docs);

        // Build a single section
        const section: FaqSection = {
            id: 'faqs',
            title: 'FAQs',
            questions: docs.map((faq: any, idx: number) => ({
                id: idx + 1,
                question: faq.question,
                answer: faq.answer,
                _dbId: faq._id.toString(),
            })),
        };

        return docs.length > 0 ? [section] : [];
    } catch (error) {
        console.error('getFaqs error:', error);
        return [];
    }
}
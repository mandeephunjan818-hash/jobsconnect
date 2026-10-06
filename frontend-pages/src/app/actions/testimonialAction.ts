// src/app/actions/testimonialActions.ts
'use server';

import connectToDatabase from '../../../lib/mongooes';
import Testimonial from '../../../modal/Testimonial';
import type { SiteSlug } from '../../../modal/sharedListing';

export interface TestimonialItem {
    id: string;
    name: string;
    role: string;
    text: string;
    rating: number;
    imageUrl?: string;
    order: number;
    sites: string[];                   // ✅ now an array
}

/**
 * Fetch testimonials, optionally filtered by a specific site.
 * - If `site` is provided, returns testimonials that are either global (`sites` contains '*')
 *   or explicitly assigned to that site.
 * - If `site` is omitted, returns ALL testimonials (e.g., for admin use or global view).
 */
export async function getAllTestimonials(site?: SiteSlug): Promise<TestimonialItem[]> {
    try {
        await connectToDatabase();

        const filter: any = {};

        if (site === '*') {
            // Only those marked as global
            filter.sites = { $in: ['*'] };
        } else if (site) {
            // Specific site + global
            filter.sites = { $in: [site, '*'] };
        }
        // else no filter → return everything

        const docs = await Testimonial.find(filter)
            .sort({ order: 1 })
            .lean();

        if (!docs || docs.length === 0) return [];

        return docs.map((doc: any) => ({
            id: doc._id.toString(),
            name: doc.name,
            role: doc.role,
            text: doc.text,
            rating: doc.rating,
            imageUrl: doc.imageUrl ?? undefined,
            order: doc.order,
            sites: doc.sites ?? ['*'],
        }));
    } catch (error) {
        console.error('getAllTestimonials error:', error);
        return [];
    }
}
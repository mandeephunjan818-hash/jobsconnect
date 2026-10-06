'use server';

import { unstable_cache } from 'next/cache';
import connectToDatabase from '../../../lib/mongooes';
import Service from '../../../modal/Service';
import Listing from '../../../modal/Listing';

export interface CategoryItem {
    name: string;
    imageUrl: string;
    count: number;
    order: number;
    link: string;
}

export async function getTopCategories(): Promise<CategoryItem[]> {
    try {
        await connectToDatabase();

        // 1. Fetch all published/active services (categories)
        const services = await Service.find({ status: 'published', isActive: true })
            .sort({ order: 1 })
            .lean<{ title: string; imageUrl: string; order: number; link: string }[]>();

        if (!services.length) return [];

        // 2. Single aggregation — count approved + active listings by categories
        //    One round-trip instead of N separate countDocuments calls.
        const countsByType = await Listing.aggregate<{ _id: string[]; count: number }>([
            { $match: { status: 'approved', isActive: true } },
            { $group: { _id: '$categories', count: { $sum: 1 } } },
        ]);

        const countMap = new Map<string, number>(
            countsByType.flatMap(({ _id, count }) =>
                _id.map((category) => [category, count])
            )
        );

        // 3. Merge counts into service records
        const withCounts: CategoryItem[] = services.map((service) => ({
            name: service.title,
            imageUrl: service.imageUrl,
            count: countMap.get(service.title) ?? 0,
            order: service.order,
            link: service.link,
        }));

        // 4. Sort by count descending, return top 5 only
        return withCounts
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);

    } catch (error) {
        console.error('getTopCategories error:', error);
        return [];
    }
}

// ─── ISR cached version ───────────────────────────────────────
export const getCachedTopCategories = unstable_cache(
    () => getTopCategories(),
    ['top-categories'],
    {revalidate: 1, tags: ['categories', 'listings'] }
);
// src/app/api/brands/route.ts
// Public route — active brands only, optionally filtered by site, cached.
import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Brand from '@/modal/Brand';
import { cachedQuery, cachedJsonResponse, uncachedJsonResponse } from '@/lib/cache';
import { toBrandItem, BrandApiResponse } from '@/modal/Brand.helpers';

// ─── Default cache: all active brands ordered by `order` ──────
const getActiveBrands = cachedQuery(
    async () => {
        await connectToDatabase();
        return Brand.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 })
            .lean();
    },
    { tags: ['brands'] },
);

export async function GET(req: NextRequest) {
    try {
        const sp = req.nextUrl.searchParams;
        const site = sp.get('site') || '';
        const isActive = sp.get('isActive');
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

        // If any filter is applied we skip the shared cache and query directly
        const hasFilters = site || (isActive !== null && isActive !== '') || page > 1;

        if (hasFilters) {
            const query: any = { isActive: true }; // public route always enforces isActive
            if (site) query.visibleOnSites = site;
            if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';

            await connectToDatabase();
            const skip = (page - 1) * perPage;
            const [docs, total] = await Promise.all([
                Brand.find(query).sort({ order: 1, createdAt: -1 }).skip(skip).limit(perPage).lean(),
                Brand.countDocuments(query),
            ]);

            return uncachedJsonResponse({
                data: docs.map(toBrandItem),
                total, page, perPage,
                totalPages: Math.ceil(total / perPage),
            } satisfies BrandApiResponse);
        }

        // Fast path: fully-cached global list, sliced in memory
        const all = await getActiveBrands();
        const skip = (page - 1) * perPage;

        return cachedJsonResponse({
            data: all.slice(skip, skip + perPage).map(toBrandItem),
            total: all.length, page, perPage,
            totalPages: Math.ceil(all.length / perPage),
        } satisfies BrandApiResponse, { tags: ['brands'] });

    } catch (err) {
        console.error('[GET /api/brands]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}
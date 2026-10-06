// src/app/api/why-choose-us/route.ts
// Public route — only approved + active docs, cached.
import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import WhyChooseUs from '@/modal/WhyChooseUs';
import { cachedQuery, cachedJsonResponse, uncachedJsonResponse } from '@/lib/cache';
import { toWhyChooseItem, WhyChooseApiResponse } from '@/modal/WhyChooseUs.helpers';

const getActiveWhyChooseDocs = cachedQuery(
    async () => {
        await connectToDatabase();
        return WhyChooseUs.find({ status: 'approved', isActive: true })
            .sort({ createdAt: -1 }).lean();
    },
    { tags: ['why-choose-us'] },
);

export async function GET(req: NextRequest) {
    try {
        const sp = req.nextUrl.searchParams;
        const site = sp.get('site') || '';
        const status = sp.get('status') || '';
        const isActive = sp.get('isActive');
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

        const hasFilters = site || status || (isActive !== null && isActive !== '') || page > 1;

        if (hasFilters) {
            const query: any = {};
            if (site) query.site = site;
            if (status) query.status = status;
            if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';

            await connectToDatabase();
            const skip = (page - 1) * perPage;
            const [docs, total] = await Promise.all([
                WhyChooseUs.find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
                WhyChooseUs.countDocuments(query),
            ]);
            return uncachedJsonResponse({
                data: docs.map(toWhyChooseItem), total, page, perPage,
                totalPages: Math.ceil(total / perPage),
            } satisfies WhyChooseApiResponse);
        }

        const all = await getActiveWhyChooseDocs();
        const skip = (page - 1) * perPage;
        return cachedJsonResponse({
            data: all.slice(skip, skip + perPage).map(toWhyChooseItem),
            total: all.length, page, perPage,
            totalPages: Math.ceil(all.length / perPage),
        } satisfies WhyChooseApiResponse, { tags: ['why-choose-us'] });

    } catch (err) {
        console.error('[GET /api/why-choose-us]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}
// src/app/api/services/route.ts
import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Service from '@/modal/Service';
import {
  cachedQuery,
  cachedJsonResponse,
  uncachedJsonResponse,
} from '@/lib/cache';
import { toServiceItem, ServicesApiResponse } from "@/modal/Service";

export interface ServicesApiError { error: string; }

// ─── Cached — only published+active for public pages ──────────
const getPublishedServices = cachedQuery(
  async () => {
    await connectToDatabase();
    return Service.find({ status: 'published', isActive: true })
      .sort({ order: 1 }).lean();
  },
  { tags: ['services'] },
);

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const search = sp.get('search') || '';
    const ids = sp.get('ids')?.split(',').filter(Boolean) ?? [];
    const status = sp.get('status') || '';
    const isActive = sp.get('isActive');
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));

    const hasFilters = search || ids.length || status || isActive !== null || page > 1;

    if (hasFilters) {
      const query: any = {};
      if (search) query.$or = [
        { number: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
      if (ids.length) query._id = { $in: ids };
      if (status) query.status = status;
      if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';

      await connectToDatabase();
      const skip = (page - 1) * perPage;
      const [docs, total] = await Promise.all([
        Service.find(query).sort({ order: 1 }).skip(skip).limit(perPage).lean(),
        Service.countDocuments(query),
      ]);
      return uncachedJsonResponse({
        data: docs.map(toServiceItem), total, page, perPage,
        totalPages: Math.ceil(total / perPage),
      } satisfies ServicesApiResponse);
    }

    // Bare request — served from cache (published+active only)
    const all = await getPublishedServices();
    const skip = (page - 1) * perPage;
    return cachedJsonResponse({
      data: all.slice(skip, skip + perPage).map(toServiceItem),
      total: all.length, page, perPage,
      totalPages: Math.ceil(all.length / perPage),
    } satisfies ServicesApiResponse, { tags: ['services'] });

  } catch (err) {
    console.error('[GET /api/services]', err);
    return uncachedJsonResponse({ error: 'Internal server error' } satisfies ServicesApiError, 500);
  }
}
// src/app/api/admin/brands/route.ts
// Admin route — paginated list of ALL brands + create + bulk delete.
import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Brand from '@/modal/Brand';
import { uploadImage } from '@/lib/cloudinary';
import { uncachedJsonResponse, withCacheInvalidation } from '@/lib/cache';
import { revalidatePath, revalidateTag } from 'next/cache';
import { toBrandItem, BrandApiResponse } from '@/modal/Brand.helpers';

// ─── GET: paginated list (all brands) ─────────────────────────
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const sp = req.nextUrl.searchParams;
        const search = sp.get('search') || '';
        const site = sp.get('site') || '';
        const isActive = sp.get('isActive');
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));
        const sortBy = sp.get('sortBy') || 'createdAt';
        const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;

        const query: any = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { companyType: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        if (site) query.visibleOnSites = site;
        if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';

        const skip = (page - 1) * perPage;
        const [docs, total] = await Promise.all([
            Brand.find(query).sort({ [sortBy]: sortOrder }).skip(skip).limit(perPage).lean(),
            Brand.countDocuments(query),
        ]);

        return uncachedJsonResponse({
            data: docs.map(toBrandItem),
            total, page, perPage,
            totalPages: Math.ceil(total / perPage),
        } satisfies BrandApiResponse);

    } catch (err) {
        console.error('[GET /api/admin/brands]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}

// ─── POST: create ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const fd = await req.formData();

        const name = fd.get('name') as string;
        const companyType = fd.get('companyType') as string;
        const description = fd.get('description') as string;
        const websiteUrl = (fd.get('websiteUrl') as string) || '';
        const logoAlt = (fd.get('logoAlt') as string) || '';
        const order = parseInt((fd.get('order') as string) || '0', 10);
        const isActive = (fd.get('isActive') as string) !== 'false'; // default true

        if (!name || !companyType || !description) {
            return uncachedJsonResponse(
                { error: 'Required: name, companyType, description' }, 400
            );
        }

        // Logo upload
        const logoFile = fd.get('logoFile') as File | null;
        let logoUrl = (fd.get('logoUrl') as string) || '';
        if (logoFile) logoUrl = await uploadImage(logoFile, 'brands/logos');
        if (!logoUrl) return uncachedJsonResponse({ error: 'logoFile or logoUrl required' }, 400);

        // visibleOnSites (JSON array string)
        let visibleOnSites: string[] = [];
        const sitesRaw = fd.get('visibleOnSites') as string | null;
        if (sitesRaw) {
            try { visibleOnSites = JSON.parse(sitesRaw); }
            catch { return uncachedJsonResponse({ error: 'visibleOnSites must be valid JSON array' }, 400); }
        }

        // Address fields (flat → nested)
        const address = {
            street: (fd.get('street') as string) || undefined,
            city: (fd.get('city') as string) || undefined,
            province: (fd.get('province') as string) || undefined,
            country: (fd.get('country') as string) || undefined,
            postalCode: (fd.get('postalCode') as string) || undefined,
        };

        const doc = await withCacheInvalidation(async () => {
            await connectToDatabase();
            return Brand.create({
                name, companyType, description, address,
                logoUrl, logoAlt: logoAlt || name, websiteUrl,
                order, visibleOnSites, isActive,
            });
        }, ['brands']);

        visibleOnSites.forEach(s => revalidateTag(`brands-${s}`));
        revalidateTag('brands');
        revalidatePath('/');

                await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return uncachedJsonResponse({ data: toBrandItem(doc) }, 201);

    } catch (err: any) {
        console.error('[POST /api/admin/brands]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}

// ─── DELETE: bulk ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();
        const { ids } = await req.json();
        if (!Array.isArray(ids) || !ids.length)
            return uncachedJsonResponse({ error: 'No IDs provided' }, 400);

        const docs = await Brand.find({ _id: { $in: ids } }).select('visibleOnSites').lean();
        const sites = [...new Set(docs.flatMap((d: any) => d.visibleOnSites ?? []))];

        await Brand.deleteMany({ _id: { $in: ids } });

        sites.forEach(s => revalidateTag(`brands-${s}`));
        revalidateTag('brands');
        revalidatePath('/');

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return uncachedJsonResponse({ message: 'Deleted', deletedCount: ids.length });
    } catch (err) {
        console.error('[DELETE /api/admin/brands bulk]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}
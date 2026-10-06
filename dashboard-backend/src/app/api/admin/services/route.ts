// src/app/api/admin/services/route.ts
import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import Service from '@/modal/Service';
import { uploadImage } from '@/lib/cloudinary';
import { uncachedJsonResponse, withCacheInvalidation } from '@/lib/cache';
import { revalidatePath } from 'next/cache';
import { scheduleService } from '@/lib/serviceScheduler';
import { toServiceItem, ServicesApiResponse } from "@/modal/Service";

// ─── GET: admin paginated list (ALL statuses) ─────────────────
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const sp = req.nextUrl.searchParams;
        const search = sp.get('search') || '';
        const status = sp.get('status') || '';
        const isActive = sp.get('isActive');
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));
        const sortBy = sp.get('sortBy') || 'order';
        const sortOrder = sp.get('sortOrder') === 'desc' ? -1 : 1;

        const query: any = {};
        if (search) query.$or = [
            { number: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
        if (status) query.status = status;
        if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';

        const skip = (page - 1) * perPage;
        const [docs, total] = await Promise.all([
            Service.find(query).sort({ [sortBy]: sortOrder }).skip(skip).limit(perPage).lean(),
            Service.countDocuments(query),
        ]);

        return uncachedJsonResponse({
            data: docs.map(toServiceItem), total, page, perPage,
            totalPages: Math.ceil(total / perPage),
        } satisfies ServicesApiResponse);
    } catch (err) {
        console.error('[GET /api/admin/services]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}

// ─── POST: create new service ─────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const number = formData.get('number') as string || "00";
        const title = formData.get('title') as string;
        const description = formData.get('description') as string || "";
        const link = formData.get('link') as string || "";
        const order = parseInt(formData.get('order') as string, 10);
        const status = (formData.get('status') as string) || 'published';
        const publishAtStr = formData.get('publishAt') as string | null;

        if (!number || !title || !link || isNaN(order))
            return uncachedJsonResponse({ error: 'Missing required fields' }, 400);

        const imageFile = formData.get('imageFile') as File | null;
        // const shapeImageFile = formData.get('shapeImageFile') as File | null;
        let imageUrl = formData.get('imageUrl') as string || '';
        // let shapeImageUrl = formData.get('shapeImageUrl') as string || '';

        if (imageFile) imageUrl = await uploadImage(imageFile, 'services/main');
        else if (!imageUrl) return uncachedJsonResponse({ error: 'imageFile or imageUrl required' }, 400);
        // if (shapeImageFile) shapeImageUrl = await uploadImage(shapeImageFile, 'services/shape');
        // else if (!shapeImageUrl) return uncachedJsonResponse({ error: 'shapeImageFile or shapeImageUrl required' }, 400);

        const publishAt = publishAtStr ? new Date(publishAtStr) : undefined;
        const isScheduled = status === 'scheduled' && publishAt && publishAt > new Date();
        const isPublished = status === 'published';

        const service = await withCacheInvalidation(async () => {
            await connectToDatabase();
            const existing = await Service.findOne({ number });
            if (existing) throw Object.assign(new Error('Number already exists'), { status: 409 });

            return Service.create({
                number, title, description, imageUrl,
                //  shapeImageUrl,
                  link, order,
                status: isScheduled ? 'scheduled' : isPublished ? 'published' : status,
                isActive: isPublished,
                publishAt: isScheduled ? publishAt : undefined,
                adminNotes: [{
                    message: `Created with status '${status}'.`,
                    type: 'status_change',
                    createdAt: new Date(),
                    createdBy: 'admin',
                }],
            });
        }, ['services', 'admin-services']);

        if (isScheduled && publishAt)
            scheduleService((service as any)._id.toString(), publishAt);

        revalidatePath('/');
        revalidatePath('/categories');
        return uncachedJsonResponse({ data: toServiceItem(service) }, 201);
    } catch (err: any) {
        if (err?.status === 409)
            return uncachedJsonResponse({ error: 'Service with this number already exists' }, 409);
        console.error('[POST /api/admin/services]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}

// ─── DELETE: bulk delete ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();
        const { ids } = await req.json();
        if (!Array.isArray(ids) || !ids.length)
            return uncachedJsonResponse({ error: 'No IDs provided' }, 400);

        // Cancel any scheduled timers first
        const { cancelScheduledService } = await import('@/lib/serviceScheduler');
        ids.forEach((id: string) => cancelScheduledService(id));

        await Service.deleteMany({ _id: { $in: ids } });
        revalidatePath('/');
        revalidatePath('/categories');

        return uncachedJsonResponse({ message: 'Deleted', deletedCount: ids.length });
    } catch (err) {
        console.error('[DELETE /api/admin/services bulk]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}
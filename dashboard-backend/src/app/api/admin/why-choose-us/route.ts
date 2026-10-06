// src/app/api/admin/why-choose-us/route.ts
// Admin route — paginated list of ALL statuses + create + bulk delete.
import { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import WhyChooseUs from '@/modal/WhyChooseUs';
import { uploadImage } from '@/lib/cloudinary';
import { uncachedJsonResponse, withCacheInvalidation } from '@/lib/cache';
import { revalidatePath, revalidateTag } from 'next/cache';
import { toWhyChooseItem, WhyChooseApiResponse } from '@/modal/WhyChooseUs.helpers';

// ─── GET: paginated list (all statuses) ───────────────────────
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const sp = req.nextUrl.searchParams;
        const search = sp.get('search') || '';
        const status = sp.get('status') || '';
        const site = sp.get('site') || '';
        const isActive = sp.get('isActive');
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));
        const sortBy = sp.get('sortBy') || 'createdAt';
        const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;

        const query: any = {};
        if (search) query.$or = [
            { 'sectionText.tagline': { $regex: search, $options: 'i' } },
            { 'sectionText.title': { $regex: search, $options: 'i' } },
            { site: { $regex: search, $options: 'i' } },
        ];
        if (status) query.status = status;
        if (site) query.site = site;
        if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';

        const skip = (page - 1) * perPage;
        const [docs, total] = await Promise.all([
            WhyChooseUs.find(query).sort({ [sortBy]: sortOrder }).skip(skip).limit(perPage).lean(),
            WhyChooseUs.countDocuments(query),
        ]);

        return uncachedJsonResponse({
            data: docs.map(toWhyChooseItem), total, page, perPage,
            totalPages: Math.ceil(total / perPage),
        } satisfies WhyChooseApiResponse);

    } catch (err) {
        console.error('[GET /api/admin/why-choose-us]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}

// ─── POST: create ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const fd = await req.formData();

        const site = fd.get('site') as string;
        const tagline = fd.get('tagline') as string;
        const title = fd.get('title') as string;
        const paragraph = fd.get('paragraph') as string;
        const youtubeId = fd.get('youtubeId') as string;
        const submittedBy = (fd.get('submittedBy') as string) || 'admin';
        const status = (fd.get('status') as string) || 'pending';

        if (!site || !tagline || !title || !paragraph || !youtubeId)
            return uncachedJsonResponse(
                { error: 'Required: site, tagline, title, paragraph, youtubeId' }, 400
            );

        // Thumbnail
        const thumbnailFile = fd.get('thumbnailFile') as File | null;
        let thumbnailUrl = (fd.get('thumbnailUrl') as string) || '';
        if (thumbnailFile) thumbnailUrl = await uploadImage(thumbnailFile, 'why-choose-us/thumbnails');
        if (!thumbnailUrl)
            return uncachedJsonResponse({ error: 'thumbnailFile or thumbnailUrl required' }, 400);

        // Play-button image
        const playBtnFile = fd.get('playButtonFile') as File | null;
        let playBtnUrl = (fd.get('playButtonImageUrl') as string) || '';
        if (playBtnFile) playBtnUrl = await uploadImage(playBtnFile, 'why-choose-us/play-buttons');
        if (!playBtnUrl)
            return uncachedJsonResponse({ error: 'playButtonFile or playButtonImageUrl required' }, 400);

        // Skill bars (JSON string)
        let skillBars: any[] = [];
        const skillBarsRaw = fd.get('skillBars') as string | null;
        if (skillBarsRaw) {
            try { skillBars = JSON.parse(skillBarsRaw); }
            catch { return uncachedJsonResponse({ error: 'skillBars must be valid JSON' }, 400); }
        }

        const doc = await withCacheInvalidation(async () => {
            await connectToDatabase();
            return WhyChooseUs.create({
                site,
                sectionText: { tagline, title, paragraph },
                skillBars,
                video: { youtubeId, thumbnailUrl, playButtonImageUrl: playBtnUrl },
                status,
                isActive: false,
                submittedBy,
                adminNotes: [{
                    message: `Created with status '${status}'.`,
                    type: 'status_change',
                    createdAt: new Date(),
                    createdBy: 'admin',
                }],
            });
        }, ['why-choose-us', `why-choose-us-${site}`]);

        revalidatePath('/');
        revalidateTag('why-choose-us');

        await fetch(`${ process.env.NEXT_PUBLIC_SITE_URL + '/api/frontend/revalidate'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/'] }),
        });

        return uncachedJsonResponse({ data: toWhyChooseItem(doc) }, 201);

    } catch (err: any) {
        console.error('[POST /api/admin/why-choose-us]', err);
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

        const docs = await WhyChooseUs.find({ _id: { $in: ids } }).select('site').lean();
        const sites = [...new Set(docs.map((d: any) => d.site))];

        await WhyChooseUs.deleteMany({ _id: { $in: ids } });

        sites.forEach(s => revalidateTag(`why-choose-us-${s}`));
        revalidateTag('why-choose-us');
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
        console.error('[DELETE /api/admin/why-choose-us bulk]', err);
        return uncachedJsonResponse({ error: 'Internal server error' }, 500);
    }
}
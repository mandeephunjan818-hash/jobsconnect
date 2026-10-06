/**
 * src/app/api/blog/route.ts  (updated for per-site siteWindows)
 *
 * Changes from v1:
 *   - POST create: accepts siteWindows[] instead of publishAt.
 *     Immediately registers start + expiry triggers per site via reconfigureBlogTriggers.
 *   - GET: serializes siteWindows in the response.
 *   - DELETE bulk: calls cancelScheduledBlogPost (cancels all per-site QStash jobs).
 *
 * siteWindows format (sent as JSON string in FormData):
 *   '[{ "site": "new-jobs-fawn.vercel.app", "startAt": "2025-09-01T00:00:00Z", "endAt": "2025-09-30T23:59:59Z" }]'
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BlogPost from '@/modal/BlogPost';
import { uploadImage } from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import {
    reconfigureBlogTriggers,
    cancelScheduledBlogPost,
} from '@/lib/blogScheduler';
import { KNOWN_SITES, daysBetween } from '@/modal/sharedListing';

// ─── Shared response shape ────────────────────────────────────

export interface BlogPostItem {
    id: string;
    title: string;
    excerpt: string;
    imageUrl: string;
    category: string | null | undefined;
    date: string;
    slug: string;
    order: number;
    status: string;
    isActive: boolean;
    /** @deprecated kept for compat — use siteWindows instead */
    publishAt: string | null;
    visibleOnSites: string[];
    siteWindows: Array<{
        site: string;
        startAt: string;
        endAt: string;
        durationDays: number;
    }>;
    adminNotes: { message: string; type: string; createdAt: string; createdBy?: string }[];
    createdAt: string;
    updatedAt: string;
}

function mapDoc(doc: any): BlogPostItem {
    return {
        id: doc._id.toString(),
        title: doc.title,
        excerpt: doc.excerpt,
        imageUrl: doc.imageUrl,
        category: doc.category,
        date: doc.date ? new Date(doc.date).toISOString() : '',
        slug: doc.slug,
        order: doc.order,
        status: doc.status ?? 'draft',
        isActive: doc.isActive ?? false,
        // Legacy compat: derive publishAt from earliest siteWindow
        publishAt: (() => {
            const windows: any[] = doc.siteWindows ?? [];
            if (!windows.length) return null;
            const earliest = Math.min(...windows.map((w: any) => new Date(w.startAt).getTime()));
            return new Date(earliest).toISOString();
        })(),
        visibleOnSites: doc.visibleOnSites ?? [],
        siteWindows: (doc.siteWindows ?? []).map((w: any) => ({
            site: w.site,
            startAt: w.startAt instanceof Date ? w.startAt.toISOString() : w.startAt,
            endAt: w.endAt instanceof Date ? w.endAt.toISOString() : w.endAt,
            durationDays: w.durationDays,
        })),
        adminNotes: doc.adminNotes ?? [],
        createdAt: doc.createdAt?.toISOString?.() ?? '',
        updatedAt: doc.updatedAt?.toISOString?.() ?? '',
    };
}

// ─── Parse + validate siteWindows from a raw JSON string ──────

function parseSiteWindowsFromString(
    raw: string | null,
): { ok: true; windows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> }
    | { ok: false; error: string } {
    if (!raw) return { ok: true, windows: [] };

    let parsed: any[];
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { ok: false, error: 'siteWindows must be valid JSON' };
    }

    if (!Array.isArray(parsed)) {
        return { ok: false, error: 'siteWindows must be an array' };
    }

    const out: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> = [];
    for (const [i, w] of parsed.entries()) {
        if (!(KNOWN_SITES as readonly string[]).includes(w.site)) {
            return { ok: false, error: `siteWindows[${i}].site "${w.site}" is not a known site` };
        }
        const startAt = new Date(w.startAt);
        const endAt = new Date(w.endAt);
        if (isNaN(startAt.getTime())) return { ok: false, error: `siteWindows[${i}].startAt is invalid` };
        if (isNaN(endAt.getTime())) return { ok: false, error: `siteWindows[${i}].endAt is invalid` };
        if (endAt <= startAt) return { ok: false, error: `siteWindows[${i}].endAt must be after startAt` };
        out.push({ site: w.site, startAt, endAt, durationDays: daysBetween(startAt, endAt) });
    }

    return { ok: true, windows: out };
}

// ─── GET: paginated list ──────────────────────────────────────

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const sp = req.nextUrl.searchParams;

        const search = sp.get('search') || '';
        const category = sp.get('category') || '';
        const status = sp.get('status') || '';
        const siteId = sp.get('siteId') || '';
        const dateFrom = sp.get('dateFrom');
        const dateTo = sp.get('dateTo');
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '10', 10)));
        const sortBy = sp.get('sortBy') || 'createdAt';
        const sortOrder = sp.get('sortOrder') === 'asc' ? 1 : -1;

        const query: any = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } },
            ];
        }

        if (category) query.category = { $regex: category, $options: 'i' };
        if (status) query.status = status;

        // Site filter:
        //   posts with visibleOnSites=[] → visible everywhere (legacy)
        //   posts with visibleOnSites=[...] → only on those sites
        //   Also check siteWindows.site for new-format posts
        if (siteId && (KNOWN_SITES as readonly string[]).includes(siteId)) {
            query.$or = [
                { visibleOnSites: { $size: 0 } },
                { visibleOnSites: siteId },
                { 'siteWindows.site': siteId },
            ];
        }

        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) {
                const e = new Date(dateTo);
                e.setHours(23, 59, 59, 999);
                query.date.$lte = e;
            }
        }

        const skip = (page - 1) * perPage;
        const [docs, total] = await Promise.all([
            BlogPost.find(query).sort({ [sortBy]: sortOrder }).skip(skip).limit(perPage).lean(),
            BlogPost.countDocuments(query),
        ]);

        return NextResponse.json({
            data: docs.map(mapDoc),
            total, page, perPage,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        console.error('[GET /api/admin/blog]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── POST: create ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const formData = await req.formData();

        const title = formData.get('title') as string;
        const excerpt = formData.get('excerpt') as string;
        const category = formData.get('category') as string || '';
        const slug = formData.get('slug') as string || "";
        const order = parseInt(formData.get('order') as string, 10);
        const dateStr = formData.get('date') as string;
        const status = (formData.get('status') as string) || 'published';

        // ── siteWindows (new primary scheduling field) ─────────
        const siteWindowsRaw = formData.get('siteWindows') as string | null;
        const swResult = parseSiteWindowsFromString(siteWindowsRaw);
        if (!swResult.ok) {
            return NextResponse.json({ error: swResult.error }, { status: 400 });
        }

        // ── Legacy publishAt fallback ──────────────────────────
        // If no siteWindows provided but publishAt is, we accept it for
        // backward-compat. The pre-save hook will migrate it.
        const publishAtStr = formData.get('publishAt') as string | null;

        if (!title || !excerpt || !slug || isNaN(order)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existing = await BlogPost.findOne({ slug });
        if (existing) {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
        }

        const imageFile = formData.get('imageFile') as File | null;
        let imageUrl = formData.get('imageUrl') as string;
        if (imageFile) imageUrl = await uploadImage(imageFile, 'blog');
        if (!imageUrl) {
            return NextResponse.json({ error: 'Image required' }, { status: 400 });
        }

        const now = new Date();
        const hasWindows = swResult.windows.length > 0;
        const windowsAlreadyActive = swResult.windows.filter(w => w.startAt <= now);
        const windowsFuture = swResult.windows.filter(w => w.startAt > now);

        // Determine status from windows
        let resolvedStatus: string;
        if (!hasWindows) {
            resolvedStatus = status === 'published' ? 'published' : 'draft';
        } else if (windowsAlreadyActive.length > 0) {
            resolvedStatus = 'published';
        } else {
            resolvedStatus = 'scheduled';
        }

        const post = await BlogPost.create({
            title,
            excerpt,
            imageUrl,
            category,
            date: dateStr ? new Date(dateStr) : new Date(),
            slug,
            order,
            status: resolvedStatus,
            isActive: windowsAlreadyActive.length > 0 || status === 'published',
            siteWindows: swResult.windows,
            // Legacy — let pre-save hook handle migration if needed
            publishAt: (!hasWindows && publishAtStr) ? new Date(publishAtStr) : undefined,
            adminNotes: [{
                message: `Created with status '${resolvedStatus}'.`,
                type: 'status_change',
                createdAt: new Date(),
                createdBy: 'admin',
            }],
        });

        // ── Wire up triggers ─────────────────────────────────────
        if (hasWindows) {
            await reconfigureBlogTriggers(post._id.toString(), swResult.windows);
        }

        revalidatePath('/blog');
        revalidatePath(`/blog/${slug}`);
        revalidatePath('/');

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/blog', `/blog/${slug}`] }),
        }).catch(() => { });

        return NextResponse.json({ data: mapDoc(post.toObject()) }, { status: 201 });
    } catch (err) {
        console.error('[POST /api/admin/blog]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE: bulk ─────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();
        const { ids } = await req.json();
        if (!Array.isArray(ids) || !ids.length) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        // Cancel all per-site QStash jobs before deleting
        await Promise.all(ids.map(id => cancelScheduledBlogPost(id)));

        await BlogPost.deleteMany({ _id: { $in: ids } });

        revalidatePath('/blog');
        revalidatePath('/');

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/blog', '/blog/[slug]'] }),
        }).catch(() => { });

        return NextResponse.json({ message: 'Deleted', deletedCount: ids.length });
    } catch (err) {
        console.error('[DELETE /api/admin/blog bulk]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
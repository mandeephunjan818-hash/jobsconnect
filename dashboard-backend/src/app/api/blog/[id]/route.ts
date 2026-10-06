/**
 * src/app/api/blog/[id]/route.ts  (updated for per-site siteWindows)
 *
 * Actions supported (JSON body with `action` field):
 *
 *   publish           — immediately publish on ALL sites (or specific sites
 *                       if siteWindows provided), wires expiry triggers.
 *   schedule          — set/replace siteWindows, wires start + expiry triggers.
 *   archive           — cancels all triggers, marks archived.
 *   toggle-active     — flip isActive flag.
 *   update-sites      — replace visibleOnSites (legacy display flag, no triggers).
 *   update-windows    — replace siteWindows entirely, reconfigures all triggers.
 *   (adminNote)       — append a general note.
 *
 * FormData PUT — field-only updates (title, excerpt, image, etc.), no scheduling.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BlogPost from '@/modal/BlogPost';
import { uploadImage } from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import {
    reconfigureBlogTriggers,
    cancelScheduledBlogPost,
    scheduleBlogPostExpiry,
    qstashScheduleBlogExpiry,
} from '@/lib/blogScheduler';
import { KNOWN_SITES, daysBetween, normalizeSiteWindows } from '@/modal/sharedListing';
import type { ISchedulerRef } from '@/modal/sharedListing';
import type { BlogPostItem } from '../route';

interface Params { params: Promise<{ id: string }> }

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

function parseSiteWindows(
    raw: any[],
): { ok: true; windows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> }
    | { ok: false; error: string } {
    if (!Array.isArray(raw)) return { ok: false, error: 'siteWindows must be an array' };
    const out: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> = [];
    for (const [i, w] of raw.entries()) {
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

async function revalidate(slug: string) {
    revalidatePath(`/blog/${slug}`);
    revalidatePath('/blog');
    revalidatePath('/');
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
        },
        body: JSON.stringify({ paths: ['/', '/blog', `/blog/${slug}`] }),
    }).catch(() => { });
}

// ─── PUT: update or action ────────────────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const contentType = req.headers.get('content-type') ?? '';

        // ── JSON actions ──────────────────────────────────────────
        if (contentType.includes('application/json')) {
            const body = await req.json();
            const {
                action,
                isActive,
                adminNote,
                visibleOnSites,
                siteWindows: rawSiteWindows,
            } = body;

            const post = await BlogPost.findById(id);
            if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            const pushNote = (message: string) =>
                post.adminNotes.push({
                    message,
                    type: 'status_change',
                    createdAt: new Date(),
                    createdBy: 'admin',
                });

            // ════════════════════════════════════════════════════
            // ACTION: publish immediately
            // Publishes on all currently-configured sites right now.
            // If siteWindows provided, replaces and publishes those sites.
            // ════════════════════════════════════════════════════
            if (action === 'publish') {
                await cancelScheduledBlogPost(id);

                const now = new Date();

                if (Array.isArray(rawSiteWindows) && rawSiteWindows.length > 0) {
                    // Publish on specified sites with explicit windows
                    const parsed = parseSiteWindows(rawSiteWindows);
                    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

                    post.siteWindows = parsed.windows as any;
                    post.status = 'published';
                    post.isActive = true;
                    pushNote(`Published immediately on: ${parsed.windows.map(w => w.site).join(', ')}.`);
                    await post.save();

                    // Register only expiry triggers (start is now)
                    const activeWindows = parsed.windows.filter(w => w.endAt > now);
                    if (activeWindows.length > 0) {
                        scheduleBlogPostExpiry(
                            post.slug,
                            activeWindows.map(w => ({ site: w.site, endAt: w.endAt })),
                        );
                        const expiryMsgIds = await qstashScheduleBlogExpiry(
                            post.slug,
                            activeWindows.map(w => ({ site: w.site, endAt: w.endAt })),
                        );
                        const newRefs: Record<string, ISchedulerRef> = {};
                        for (const w of activeWindows) {
                            newRefs[w.site] = { expiryMsgId: expiryMsgIds[w.site] };
                        }
                        post.schedulerRefs = newRefs;
                        post.markModified('schedulerRefs');
                        await post.save();
                    }

                } else if (post.siteWindows?.length) {
                    // Publish immediately on already-configured sites
                    post.status = 'published';
                    post.isActive = true;

                    // Clear all startMsgIds (they no longer fire) — keep expiryMsgIds
                    const refs: Record<string, ISchedulerRef> = post.schedulerRefs ?? {};
                    for (const site of Object.keys(refs)) {
                        delete refs[site].startMsgId;
                    }
                    post.schedulerRefs = refs;
                    post.markModified('schedulerRefs');

                    // Re-register expiry triggers for windows that haven't ended yet
                    const windowsStillActive = normalizeSiteWindows(post.siteWindows as any[]).filter(
                        w => w.endAt > now,
                    );
                    if (windowsStillActive.length > 0) {
                        scheduleBlogPostExpiry(
                            post.slug,
                            windowsStillActive.map(w => ({ site: w.site, endAt: w.endAt })),
                        );
                        const expiryMsgIds = await qstashScheduleBlogExpiry(
                            post.slug,
                            windowsStillActive.map(w => ({ site: w.site, endAt: w.endAt })),
                        );
                        const newRefs: Record<string, ISchedulerRef> = {};
                        for (const w of windowsStillActive) {
                            newRefs[w.site] = { expiryMsgId: expiryMsgIds[w.site] };
                        }
                        post.schedulerRefs = newRefs;
                        post.markModified('schedulerRefs');
                    }

                    pushNote(`Published immediately on all configured sites.`);
                    await post.save();

                } else {
                    // No windows — plain publish with no expiry
                    post.status = 'published';
                    post.isActive = true;
                    post.schedulerRefs = {};
                    pushNote('Published immediately (no site windows configured).');
                    await post.save();
                }

                await revalidate(post.slug);
                return NextResponse.json({ data: mapDoc(post.toObject()) });
            }

            // ════════════════════════════════════════════════════
            // ACTION: schedule — replace siteWindows, rewire triggers
            // ════════════════════════════════════════════════════
            if (action === 'schedule' && Array.isArray(rawSiteWindows)) {
                if (rawSiteWindows.length === 0) {
                    return NextResponse.json(
                        { error: 'siteWindows must not be empty for action=schedule' },
                        { status: 400 },
                    );
                }

                const parsed = parseSiteWindows(rawSiteWindows);
                if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

                // Determine status from the new windows
                const now = new Date();
                const hasActiveNow = parsed.windows.some(w => w.startAt <= now);

                post.siteWindows = parsed.windows as any;
                post.status = hasActiveNow ? 'published' : 'scheduled';
                post.isActive = hasActiveNow;
                pushNote(
                    `Scheduled on sites: ${parsed.windows.map(w => `${w.site} (${w.startAt.toISOString()} → ${w.endAt.toISOString()})`).join('; ')}.`,
                );
                await post.save();

                // reconfigureBlogTriggers cancels old triggers + registers new ones
                await reconfigureBlogTriggers(id, parsed.windows);

                await revalidate(post.slug);
                return NextResponse.json({ data: mapDoc(post.toObject()) });
            }

            // ════════════════════════════════════════════════════
            // ACTION: update-windows — same as schedule but clearer intent
            // ════════════════════════════════════════════════════
            if (action === 'update-windows' && Array.isArray(rawSiteWindows)) {
                const parsed = parseSiteWindows(rawSiteWindows);
                if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

                const now = new Date();
                const hasActiveNow = parsed.windows.some(w => w.startAt <= now);

                post.siteWindows = parsed.windows as any;
                if (parsed.windows.length === 0) {
                    post.status = 'draft';
                    post.isActive = false;
                } else {
                    post.status = hasActiveNow ? 'published' : 'scheduled';
                    post.isActive = hasActiveNow;
                }

                pushNote(
                    parsed.windows.length === 0
                        ? 'All site windows removed. Post moved to draft.'
                        : `Site windows updated: ${parsed.windows.map(w => w.site).join(', ')}.`,
                );
                await post.save();

                await reconfigureBlogTriggers(id, parsed.windows);
                await revalidate(post.slug);
                return NextResponse.json({ data: mapDoc(post.toObject()) });
            }

            // ════════════════════════════════════════════════════
            // ACTION: archive
            // ════════════════════════════════════════════════════
            if (action === 'archive') {
                await cancelScheduledBlogPost(id);
                post.status = 'archived';
                post.isActive = false;
                post.siteWindows = [] as any;
                post.schedulerRefs = {};
                pushNote('Archived. All site windows cleared.');
                await post.save();

                await revalidate(post.slug);
                return NextResponse.json({ data: mapDoc(post.toObject()) });
            }

            // ════════════════════════════════════════════════════
            // ACTION: toggle-active
            // ════════════════════════════════════════════════════
            if (action === 'toggle-active') {
                post.isActive = isActive !== undefined ? isActive : !post.isActive;
                pushNote(`Visibility toggled to ${post.isActive ? 'visible' : 'hidden'}.`);
                await post.save();
                revalidatePath('/blog');
                return NextResponse.json({ data: mapDoc(post.toObject()) });
            }

            // ════════════════════════════════════════════════════
            // ACTION: update-sites (legacy visibleOnSites flag only — no triggers)
            // ════════════════════════════════════════════════════
            if (action === 'update-sites' && Array.isArray(visibleOnSites)) {
                post.visibleOnSites = visibleOnSites.filter(
                    s => (KNOWN_SITES as readonly string[]).includes(s),
                );
                pushNote(
                    post.visibleOnSites.length === 0
                        ? 'Visible on all sites (no site restriction).'
                        : `Restricted to sites: ${post.visibleOnSites.join(', ')}.`,
                );
                await post.save();
                return NextResponse.json({ data: mapDoc(post.toObject()) });
            }

            // ════════════════════════════════════════════════════
            // Admin note
            // ════════════════════════════════════════════════════
            if (adminNote) {
                post.adminNotes.push({
                    message: adminNote,
                    type: 'general',
                    createdAt: new Date(),
                    createdBy: 'admin',
                });
                await post.save();
                return NextResponse.json({ data: mapDoc(post.toObject()) });
            }

            return NextResponse.json({ error: 'No valid action' }, { status: 400 });
        }

        // ── FormData: field-only updates (no scheduling) ──────────
        const formData = await req.formData();
        const post = await BlogPost.findById(id);
        if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const oldSlug = post.slug;

        const title = formData.get('title') as string | null;
        const excerpt = formData.get('excerpt') as string | null;
        const category = formData.get('category') as string | null;
        const slug = formData.get('slug') as string | null;
        const order = formData.get('order') as string | null;
        const dateStr = formData.get('date') as string | null;

        if (title) post.title = title;
        if (excerpt) post.excerpt = excerpt;
        if (category) post.category = category;
        if (order) post.order = parseInt(order, 10);
        if (dateStr) post.date = new Date(dateStr);

        // siteWindows update via FormData
        const siteWindowsRaw = formData.get('siteWindows') as string | null;
        if (siteWindowsRaw !== null) {
            try {
                const parsed = JSON.parse(siteWindowsRaw);
                if (Array.isArray(parsed)) {
                    const result = parseSiteWindows(parsed);
                    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
                    post.siteWindows = result.windows as any;
                    // Reconfigure triggers after save
                }
            } catch { /**/ }
        }

        // Legacy visibleOnSites field (display only)
        const visibleOnSitesRaw = formData.get('visibleOnSites') as string | null;
        if (visibleOnSitesRaw !== null) {
            try {
                const parsed = JSON.parse(visibleOnSitesRaw);
                if (Array.isArray(parsed)) {
                    post.visibleOnSites = parsed.filter(
                        s => (KNOWN_SITES as readonly string[]).includes(s),
                    );
                }
            } catch { /**/ }
        }

        if (slug && slug !== post.slug) {
            const conflict = await BlogPost.findOne({ slug });
            if (conflict && conflict._id.toString() !== id) {
                return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
            }
            post.slug = slug;
        }

        const imageFile = formData.get('imageFile') as File | null;
        if (imageFile) {
            post.imageUrl = await uploadImage(imageFile, 'blog');
        } else {
            const imageUrl = formData.get('imageUrl') as string | null;
            if (imageUrl) post.imageUrl = imageUrl;
        }

        await post.save();

        // If siteWindows changed, reconfigure triggers
        if (siteWindowsRaw !== null) {
            const newWindows = normalizeSiteWindows(post.siteWindows as any[]);
            await reconfigureBlogTriggers(id, newWindows);
        }

        revalidatePath('/blog');
        revalidatePath(`/blog/${oldSlug}`);
        if (post.slug !== oldSlug) revalidatePath(`/blog/${post.slug}`);
        revalidatePath('/');

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({
                paths: ['/', '/blog', `/blog/${oldSlug}`, `/blog/${post.slug}`],
            }),
        }).catch(() => { });

        return NextResponse.json({ data: mapDoc(post.toObject()) });
    } catch (err) {
        console.error('[PUT /api/admin/blog/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE ───────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();
        const { id } = await params;

        // Cancel all per-site QStash jobs + in-memory timers
        await cancelScheduledBlogPost(id);

        const post = await BlogPost.findByIdAndDelete(id);
        if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        revalidatePath('/blog');
        revalidatePath(`/blog/${post.slug}`);
        revalidatePath('/');

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', `/blog/${post.slug}`, '/blog'] }),
        }).catch(() => { });

        return NextResponse.json({ message: 'Deleted' });
    } catch (err) {
        console.error('[DELETE /api/admin/blog/:id]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
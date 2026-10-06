/**
 * src/app/api/blog/import/route.ts  (updated for per-site siteWindows)
 *
 * Accepts items with:
 *   siteWindows: [{ site, startAt, endAt }]  — new format (preferred)
 *   publishAt + visibleOnSites               — legacy format (migrated automatically)
 *
 * On upsert: cancels old triggers, then registers fresh ones.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import BlogPost from '@/modal/BlogPost';
import { revalidatePath } from 'next/cache';
import {
    cancelScheduledBlogPost,
    scheduleBlogPostStart,
    qstashScheduleBlogStart,
    scheduleBlogPostExpiry,
    qstashScheduleBlogExpiry,
} from '@/lib/blogScheduler';
import { KNOWN_SITES, daysBetween } from '@/modal/sharedListing';
import type { ISchedulerRef } from '@/modal/sharedListing';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { items } = await req.json();

        if (!Array.isArray(items) || !items.length) {
            return NextResponse.json({ error: 'No items' }, { status: 400 });
        }

        let inserted = 0, updated = 0, errors = 0;

        for (const item of items) {
            try {
                if (!item.title || !item.slug) { errors++; continue; }

                const { _id, id, ...data } = item;

                // ── Resolve siteWindows ─────────────────────────────
                // Priority: siteWindows[] > (publishAt + visibleOnSites) > publishAt alone
                let siteWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> = [];

                if (Array.isArray(data.siteWindows) && data.siteWindows.length > 0) {
                    // New format
                    siteWindows = data.siteWindows
                        .filter((w: any) => (KNOWN_SITES as readonly string[]).includes(w.site))
                        .map((w: any) => {
                            const startAt = new Date(w.startAt);
                            const endAt = new Date(w.endAt);
                            return {
                                site: w.site,
                                startAt,
                                endAt,
                                durationDays: isNaN(startAt.getTime()) || isNaN(endAt.getTime())
                                    ? 1
                                    : daysBetween(startAt, endAt),
                            };
                        })
                        .filter((w: any) => w.endAt > w.startAt);

                } else if (data.publishAt) {
                    // Legacy: migrate publishAt → siteWindows for specified sites (or all)
                    const startAt = new Date(data.publishAt);
                    const endAt = new Date(startAt.getTime() + 365 * 24 * 60 * 60 * 1000);

                    let targetSites: string[] = [];
                    if (Array.isArray(data.visibleOnSites) && data.visibleOnSites.length > 0) {
                        targetSites = data.visibleOnSites.filter(
                            (s: string) => (KNOWN_SITES as readonly string[]).includes(s),
                        );
                    } else if (typeof data.visibleOnSites === 'string' && data.visibleOnSites) {
                        targetSites = data.visibleOnSites
                            .split('|')
                            .map((s: string) => s.trim())
                            .filter((s: string) => (KNOWN_SITES as readonly string[]).includes(s));
                    } else {
                        targetSites = [...KNOWN_SITES];
                    }

                    if (!isNaN(startAt.getTime())) {
                        siteWindows = targetSites.map(site => ({
                            site,
                            startAt,
                            endAt,
                            durationDays: 365,
                        }));
                    }
                    // Clear legacy fields from payload
                    delete data.publishAt;
                    delete data.schedulerMsgId;
                }

                // ── Derive status from windows ──────────────────────
                const now = new Date();
                const windowsActive = siteWindows.filter(w => w.startAt <= now && w.endAt > now);
                const windowsFuture = siteWindows.filter(w => w.startAt > now);

                if (!data.status) {
                    if (siteWindows.length === 0) {
                        data.status = 'draft';
                    } else if (windowsActive.length > 0) {
                        data.status = 'published';
                    } else {
                        data.status = 'scheduled';
                    }
                }
                data.isActive = windowsActive.length > 0;
                data.siteWindows = siteWindows;
                data.visibleOnSites = [...new Set(siteWindows.map(w => w.site))];
                data.schedulerRefs = {}; // will be filled below

                // ── Upsert ──────────────────────────────────────────
                const existing = await BlogPost.findOne({ slug: item.slug });
                let doc: any;

                if (existing) {
                    // Cancel existing triggers before overwriting
                    await cancelScheduledBlogPost(existing._id.toString());
                    Object.assign(existing, data);
                    await existing.save();
                    doc = existing;
                    updated++;
                } else {
                    doc = await BlogPost.create(data);
                    inserted++;
                }

                // ── Wire up triggers ─────────────────────────────────
                if (siteWindows.length > 0) {
                    const newRefs: Record<string, ISchedulerRef> = {};

                    // Start triggers for future windows
                    if (windowsFuture.length > 0) {
                        for (const w of windowsFuture) {
                            scheduleBlogPostStart(doc._id.toString(), w.site, w.startAt);
                        }
                        const startMsgIds = await qstashScheduleBlogStart(
                            doc._id.toString(),
                            windowsFuture.map(w => ({ site: w.site, startAt: w.startAt })),
                        );
                        for (const w of windowsFuture) {
                            newRefs[w.site] = { startMsgId: startMsgIds[w.site] };
                        }
                    }

                    // Expiry triggers for all windows (active + future)
                    const windowsNeedingExpiry = siteWindows.filter(w => w.endAt > now);
                    if (windowsNeedingExpiry.length > 0) {
                        scheduleBlogPostExpiry(
                            doc.slug,
                            windowsNeedingExpiry.map(w => ({ site: w.site, endAt: w.endAt })),
                        );
                        const expiryMsgIds = await qstashScheduleBlogExpiry(
                            doc.slug,
                            windowsNeedingExpiry.map(w => ({ site: w.site, endAt: w.endAt })),
                        );
                        for (const w of windowsNeedingExpiry) {
                            newRefs[w.site] = { ...newRefs[w.site], expiryMsgId: expiryMsgIds[w.site] };
                        }
                    }

                    doc.schedulerRefs = newRefs;
                    doc.markModified('schedulerRefs');
                    await doc.save();
                }

            } catch (err) {
                console.error('[Blog Import] Error on item:', item?.title, err);
                errors++;
            }
        }

        revalidatePath('/blog');
        revalidatePath('/');

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/blog'] }),
        }).catch(() => { });

        return NextResponse.json({ message: 'Import done', inserted, updated, errors });
    } catch (err) {
        console.error('[POST /api/admin/blog/import]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
/**
 * src/lib/blogScheduler.ts
 *
 * Per-site blog scheduling — mirrors the Listingscheduler pattern exactly.
 *
 * Two layers:
 *   Layer 1 — Draft → Published (start triggers, one per site)
 *     Fires at siteWindow.startAt for each site.
 *     Marks the post as published on that site (sets isActive = true when
 *     at least one window is active).
 *
 *   Layer 2 — Site window expiry (expiry triggers, one per site)
 *     Fires at siteWindow.endAt.
 *     Removes that site from the post's siteWindows.
 *     If no windows remain, moves status back to 'draft'.
 *
 * Two paths per layer:
 *   setTimeout  — local dev / warm-process fallback (in-memory only)
 *   QStash      — durable path for Vercel Hobby
 *
 * schedulerRefs shape (same as Listing):
 *   { [siteSlug]: { startMsgId?, expiryMsgId? } }
 */

import { Client } from '@upstash/qstash';
import connectToDatabase from '@/lib/mongooes';
import BlogPost from '@/modal/BlogPost';
import { normalizeSiteWindows } from '@/modal/sharedListing';
import type { ISchedulerRef } from '@/modal/sharedListing';

// ─────────────────────────────────────────────────────────────
// Module-level state
// ─────────────────────────────────────────────────────────────

export const timers = new Map<string, ReturnType<typeof setTimeout>>();

const qstash = process.env.QSTASH_TOKEN
    ? new Client({ token: process.env.QSTASH_TOKEN })
    : null;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const MAX_SAFE_DELAY = 24 * 60 * 60 * 1000; // 24 h — Node setTimeout cap

// ─────────────────────────────────────────────────────────────
// QStash cancel helpers
// ─────────────────────────────────────────────────────────────

async function cancelQStashMessage(msgId: string | undefined): Promise<void> {
    if (!qstash || !msgId) return;
    try {
        await qstash.messages.delete(msgId);
        console.log(`[BlogScheduler] QStash job ${msgId} cancelled`);
    } catch (err: any) {
        if (err?.status !== 404) {
            console.error(`[BlogScheduler] Failed to cancel QStash job ${msgId}:`, err);
        }
    }
}

async function cancelAllQStashRefs(
    refs: Record<string, ISchedulerRef> | undefined,
): Promise<void> {
    if (!refs) return;
    await Promise.all(
        Object.values(refs).flatMap(ref => [
            cancelQStashMessage(ref.startMsgId),
            cancelQStashMessage(ref.expiryMsgId),
        ]),
    );
}

// ─────────────────────────────────────────────────────────────
// In-memory timer helpers
// ─────────────────────────────────────────────────────────────

export function cancelBlogStartTimers(postId: string): void {
    for (const key of timers.keys()) {
        if (key.startsWith(`blog-start:${postId}:`)) {
            clearTimeout(timers.get(key)!);
            timers.delete(key);
        }
    }
    // Also cancel the legacy single-timer key (compat with old code)
    const legacy = timers.get(postId);
    if (legacy) {
        clearTimeout(legacy);
        timers.delete(postId);
    }
}

export function cancelBlogExpiryTimers(slug: string): void {
    for (const key of timers.keys()) {
        if (key.startsWith(`blog-expiry:${slug}:`)) {
            clearTimeout(timers.get(key)!);
            timers.delete(key);
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Revalidation helper
// ─────────────────────────────────────────────────────────────

async function revalidateBlogPost(slug: string): Promise<void> {
    try {
        await fetch(`${BASE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/blog', `/blog/${slug}`] }),
        });
    } catch (err) {
        console.error(`[BlogScheduler] Revalidation failed for slug="${slug}":`, err);
    }
}

// ─────────────────────────────────────────────────────────────
// Layer 1 — Publish a blog post on a specific site
// Called when siteWindow.startAt arrives (or immediately if past-due).
// ─────────────────────────────────────────────────────────────

export async function publishBlogPostForSite(
    postId: string,
    site: string,
): Promise<void> {
    try {
        await connectToDatabase();

        const post = await BlogPost.findById(postId);
        if (!post) {
            console.warn(`[BlogScheduler] Post ${postId} not found — skipping publish for site="${site}"`);
            return;
        }

        // Check that this site's window still exists and hasn't been removed
        const windowExists = post.siteWindows?.some((w: any) => w.site === site);
        if (!windowExists) {
            console.log(`[BlogScheduler] Post ${postId} site="${site}" window removed — no-op`);
            return;
        }

        if (post.status === 'archived') {
            console.log(`[BlogScheduler] Post ${postId} is archived — skipping`);
            return;
        }

        // Mark as published if it isn't already
        if (post.status !== 'published') {
            post.status = 'published';
        }
        post.isActive = true;

        // Clear the startMsgId for this site — it has fired
        const refs: Record<string, ISchedulerRef> = post.schedulerRefs ?? {};
        if (refs[site]) {
            delete refs[site].startMsgId;
            post.schedulerRefs = refs;
            post.markModified('schedulerRefs');
        }

        post.adminNotes.push({
            message: `Auto-published on site="${site}" at ${new Date().toISOString()}`,
            type: 'status_change',
            createdAt: new Date(),
            createdBy: 'scheduler',
        });

        await post.save();

        // Cancel in-memory start timer for this site
        const timerKey = `blog-start:${postId}:${site}`;
        if (timers.has(timerKey)) {
            clearTimeout(timers.get(timerKey)!);
            timers.delete(timerKey);
        }

        console.log(`[BlogScheduler] Post ${postId} (slug: ${post.slug}) published on site="${site}"`);

        // ── Notify subscribers for this site ──────────────────────
        _notifyBlogSubscribersForSite(post, site).catch(err =>
            console.error('[BlogScheduler] Subscriber notification failed:', err),
        );

        await revalidateBlogPost(post.slug);
    } catch (err) {
        console.error(`[BlogScheduler] Failed to publish post ${postId} on site="${site}":`, err);
    }
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Expire a blog post on a specific site
// Called when siteWindow.endAt arrives.
// ─────────────────────────────────────────────────────────────

export async function expireBlogPostForSite(
    slug: string,
    site: string,
): Promise<void> {
    try {
        await connectToDatabase();

        const post = await BlogPost.findOne({ slug });
        if (!post) {
            console.warn(`[BlogScheduler] Post slug="${slug}" not found for expiry on site="${site}"`);
            return;
        }

        const windowStillExists = post.siteWindows?.some((w: any) => w.site === site);
        if (!windowStillExists) {
            console.log(`[BlogScheduler] slug="${slug}" site="${site}" already removed — no-op`);
            return;
        }

        // Remove this site's window
        post.siteWindows = post.siteWindows.filter((w: any) => w.site !== site) as any;
        post.visibleOnSites = [...new Set(post.siteWindows.map((w: any) => w.site))];

        // Clear scheduler ref for this site
        const refs: Record<string, ISchedulerRef> = post.schedulerRefs ?? {};
        delete refs[site];
        post.schedulerRefs = refs;
        post.markModified('schedulerRefs');

        if (post.siteWindows.length === 0) {
            // All windows ended — move back to draft
            post.status = 'draft';
            post.isActive = false;
            post.adminNotes.push({
                message: `Auto-expired on all sites. Last site="${site}" ended at ${new Date().toISOString()}. Moved back to draft.`,
                type: 'status_change',
                createdAt: new Date(),
                createdBy: 'scheduler',
            });
            console.log(`[BlogScheduler] slug="${slug}" fully expired → back to draft`);
        } else {
            // Check if any window is currently active (startAt ≤ now)
            const now = new Date();
            const hasActiveWindow = post.siteWindows.some(
                (w: any) => new Date(w.startAt) <= now,
            );
            post.isActive = hasActiveWindow;
            post.adminNotes.push({
                message: `Site="${site}" window expired at ${new Date().toISOString()}. ${post.siteWindows.length} window(s) remain.`,
                type: 'status_change',
                createdAt: new Date(),
                createdBy: 'scheduler',
            });
            console.log(
                `[BlogScheduler] slug="${slug}" removed from site="${site}". ` +
                `${post.siteWindows.length} window(s) remain.`,
            );
        }

        post.markModified('siteWindows');
        await post.save();

        await revalidateBlogPost(slug);
    } catch (err) {
        console.error(`[BlogScheduler] Failed to expire slug="${slug}" site="${site}":`, err);
    }
}

// ─────────────────────────────────────────────────────────────
// Layer 1 — Schedule start trigger via setTimeout (local dev)
// ─────────────────────────────────────────────────────────────

export function scheduleBlogPostStart(
    postId: string,
    site: string,
    startAt: Date,
): void {
    const timerKey = `blog-start:${postId}:${site}`;

    // Cancel existing timer for this site
    const existing = timers.get(timerKey);
    if (existing) {
        clearTimeout(existing);
        timers.delete(timerKey);
    }

    const delay = startAt.getTime() - Date.now();

    if (delay <= 0) {
        console.log(
            `[BlogScheduler] Post ${postId} site="${site}" is past due — publishing immediately`,
        );
        publishBlogPostForSite(postId, site);
        return;
    }

    const safeDelay = Math.min(delay, MAX_SAFE_DELAY);

    const handle = setTimeout(() => {
        if (startAt.getTime() > Date.now()) {
            scheduleBlogPostStart(postId, site, startAt); // re-enter
        } else {
            publishBlogPostForSite(postId, site);
        }
    }, safeDelay);

    timers.set(timerKey, handle);
    console.log(
        `[BlogScheduler] Start timer set: post=${postId} site="${site}" ` +
        `in ${Math.round(safeDelay / 1000)}s at ${startAt.toISOString()}`,
    );
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Schedule expiry trigger via setTimeout (local dev)
// ─────────────────────────────────────────────────────────────

export function scheduleBlogPostExpiry(
    slug: string,
    siteWindows: Array<{ site: string; endAt: Date }>,
): void {
    for (const w of siteWindows) {
        const timerKey = `blog-expiry:${slug}:${w.site}`;

        const existing = timers.get(timerKey);
        if (existing) {
            clearTimeout(existing);
            timers.delete(timerKey);
        }

        const endAt = new Date(w.endAt);
        const delay = endAt.getTime() - Date.now();

        if (delay <= 0) {
            console.log(
                `[BlogScheduler] slug="${slug}" site="${w.site}" already ended — expiring now`,
            );
            expireBlogPostForSite(slug, w.site);
            continue;
        }

        const safeDelay = Math.min(delay, MAX_SAFE_DELAY);

        const handle = setTimeout(() => {
            if (endAt.getTime() > Date.now()) {
                scheduleBlogPostExpiry(slug, [{ site: w.site, endAt }]); // re-enter
            } else {
                expireBlogPostForSite(slug, w.site);
            }
        }, safeDelay);

        timers.set(timerKey, handle);
        console.log(
            `[BlogScheduler] Expiry timer set: slug="${slug}" site="${w.site}" ` +
            `in ${Math.round(safeDelay / 1000)}s at ${endAt.toISOString()}`,
        );
    }
}

// ─────────────────────────────────────────────────────────────
// Layer 1 — Queue start trigger via QStash (durable)
// Returns a map of site → startMsgId.
// ─────────────────────────────────────────────────────────────

export async function qstashScheduleBlogStart(
    postId: string,
    siteWindows: Array<{ site: string; startAt: Date }>,
): Promise<Record<string, string>> {
    const msgIds: Record<string, string> = {};
    if (!qstash) return msgIds;

    for (const w of siteWindows) {
        const delaySeconds = Math.max(1, Math.floor((new Date(w.startAt).getTime() - Date.now()) / 1000));
        try {
            const res = await qstash.publishJSON({
                url: `${BASE_URL}/api/qstash/blog-publish`,
                delay: delaySeconds,
                body: { postId, site: w.site },
            });
            msgIds[w.site] = res.messageId;
            console.log(
                `[BlogScheduler] QStash start queued: post=${postId} site="${w.site}" ` +
                `in ${delaySeconds}s (msgId: ${res.messageId})`,
            );
        } catch (err) {
            console.error(
                `[BlogScheduler] QStash start failed for post=${postId} site="${w.site}" — setTimeout still active`,
                err,
            );
        }
    }

    return msgIds;
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — Queue expiry trigger via QStash (durable)
// Returns a map of site → expiryMsgId.
// ─────────────────────────────────────────────────────────────

export async function qstashScheduleBlogExpiry(
    slug: string,
    siteWindows: Array<{ site: string; endAt: Date }>,
): Promise<Record<string, string>> {
    const msgIds: Record<string, string> = {};
    if (!qstash) return msgIds;

    for (const w of siteWindows) {
        const delaySeconds = Math.max(1, Math.floor((new Date(w.endAt).getTime() - Date.now()) / 1000));
        try {
            const res = await qstash.publishJSON({
                url: `${BASE_URL}/api/qstash/blog-expire`,
                delay: delaySeconds,
                body: { slug, site: w.site },
            });
            msgIds[w.site] = res.messageId;
            console.log(
                `[BlogScheduler] QStash expiry queued: slug="${slug}" site="${w.site}" ` +
                `in ${delaySeconds}s (msgId: ${res.messageId})`,
            );
        } catch (err) {
            console.error(
                `[BlogScheduler] QStash expiry failed for slug="${slug}" site="${w.site}" — setTimeout still active`,
                err,
            );
        }
    }

    return msgIds;
}

// ─────────────────────────────────────────────────────────────
// reconfigureBlogTriggers
//
// Call this whenever siteWindows change on an existing post.
// (Admin edit, reschedule, etc.)
//
// 1. Cancels ALL existing QStash jobs (start + expiry) for the post.
// 2. Cancels in-memory timers.
// 3. Registers fresh start + expiry triggers for the new window set.
// 4. Persists the new schedulerRefs to the DB.
// 5. Revalidates.
// ─────────────────────────────────────────────────────────────

export async function reconfigureBlogTriggers(
    postId: string,
    newWindows: Array<{ site: string; startAt: Date; endAt: Date }>,
): Promise<void> {
    await connectToDatabase();

    const post = await BlogPost.findById(postId);
    if (!post) {
        console.warn(`[reconfigureBlogTriggers] Post "${postId}" not found`);
        return;
    }

    const slug: string = post.slug;
    const oldRefs: Record<string, ISchedulerRef> = post.schedulerRefs ?? {};

    // ── Step 1: Cancel all existing QStash jobs ──────────────
    await cancelAllQStashRefs(oldRefs);

    // ── Step 2: Cancel in-memory timers ─────────────────────
    cancelBlogStartTimers(postId);
    cancelBlogExpiryTimers(slug);

    if (newWindows.length === 0) {
        post.schedulerRefs = {};
        post.markModified('schedulerRefs');
        await post.save();
        return;
    }

    const now = new Date();
    const newRefs: Record<string, ISchedulerRef> = {};

    const windowsAlreadyStarted = newWindows.filter(w => new Date(w.startAt) <= now);
    const windowsFuture = newWindows.filter(w => new Date(w.startAt) > now);

    // ── Step 3a: Future windows → register start triggers ─────
    if (windowsFuture.length > 0) {
        // setTimeout path — one timer per site
        for (const w of windowsFuture) {
            scheduleBlogPostStart(postId, w.site, new Date(w.startAt));
        }

        // QStash path — one job per site
        const startMsgIds = await qstashScheduleBlogStart(
            postId,
            windowsFuture.map(w => ({ site: w.site, startAt: new Date(w.startAt) })),
        );

        for (const w of windowsFuture) {
            newRefs[w.site] = { startMsgId: startMsgIds[w.site] };
        }
    }

    // ── Step 3b: Already-started windows → register expiry only ─
    if (windowsAlreadyStarted.length > 0) {
        scheduleBlogPostExpiry(
            slug,
            windowsAlreadyStarted.map(w => ({ site: w.site, endAt: new Date(w.endAt) })),
        );

        const expiryMsgIds = await qstashScheduleBlogExpiry(
            slug,
            windowsAlreadyStarted.map(w => ({ site: w.site, endAt: new Date(w.endAt) })),
        );

        for (const w of windowsAlreadyStarted) {
            newRefs[w.site] = {
                ...newRefs[w.site],
                expiryMsgId: expiryMsgIds[w.site],
            };
        }
    }

    // ── Step 4: Persist ──────────────────────────────────────
    post.schedulerRefs = newRefs;
    post.markModified('schedulerRefs');
    await post.save();

    // ── Step 5: Revalidate ───────────────────────────────────
    await revalidateBlogPost(slug);

    console.log(
        `[reconfigureBlogTriggers] post="${postId}" slug="${slug}" ` +
        `— reconfigured ${Object.keys(newRefs).length} trigger(s).`,
    );
}

// ─────────────────────────────────────────────────────────────
// cancelScheduledBlogPost
// Cancels ALL triggers (start + expiry) for a post.
// Called before delete, archive, or full reschedule.
// ─────────────────────────────────────────────────────────────

export async function cancelScheduledBlogPost(postId: string): Promise<void> {
    // Cancel in-memory timers
    cancelBlogStartTimers(postId);

    try {
        await connectToDatabase();
        const post = await BlogPost.findById(postId).select('slug schedulerRefs').lean();
        if (!post) return;

        // Cancel expiry timers
        cancelBlogExpiryTimers((post as any).slug);

        // Cancel QStash jobs
        const refs: Record<string, ISchedulerRef> = (post as any).schedulerRefs ?? {};
        await cancelAllQStashRefs(refs);

        // Clear refs in DB
        await BlogPost.findByIdAndUpdate(postId, {
            $set: { schedulerRefs: {} },
        });
    } catch (err) {
        console.error(`[BlogScheduler] Failed to cancel triggers for post ${postId}:`, err);
    }
}

// ─────────────────────────────────────────────────────────────
// Subscriber notification helper (per-site)
// ─────────────────────────────────────────────────────────────

async function _notifyBlogSubscribersForSite(post: any, site: string): Promise<void> {
    const { default: Subscriber } = await import('@/modal/Subscriber');
    const { sendNewBlogNotificationEmail } = await import('@/utils/email');

    const SITE_META: Record<string, { name: string; url: string }> = {
        'jobs-connect.vercel.app': { name: 'Jobs Connect', url: 'https://jobs-connect.vercel.app' },
        'new-jobs-fawn.vercel.app': { name: 'New in Canada Jobs', url: 'https://new-jobs-fawn.vercel.app' },
        'jobsrefugee.ca': { name: 'Jobs for Refugees', url: 'https://jobsrefugee.ca' },
        'vulnerableyouthsjobs.ca': { name: 'Vulnerable Youths Jobs', url: 'https://vulnerableyouthsjobs.ca' },
        'accesscareers.ca': { name: 'Access Careers', url: 'https://accesscareers.ca' },
        'indigenouspeoplesjobs.ca': { name: 'Indigenous Peoples Jobs', url: 'https://indigenouspeoplesjobs.ca' },
    };

    const meta = SITE_META[site];
    if (!meta) return;

    const subscribers = await Subscriber.find({
        siteId: site,
        status: 'active',
        'preferences.blogs': true,
    })
        .select('email name unsubscribeToken')
        .lean();

    if (!subscribers.length) return;

    console.log(
        `[BlogScheduler] Sending blog alert to ${subscribers.length} subscriber(s) on site="${site}"`,
    );

    const BATCH = 10;
    for (let i = 0; i < subscribers.length; i += BATCH) {
        await Promise.all(
            subscribers.slice(i, i + BATCH).map((sub: any) =>
                sendNewBlogNotificationEmail(
                    sub.email,
                    sub.name ?? '',
                    meta.name,
                    meta.url,
                    sub.unsubscribeToken,
                    {
                        title: post.title,
                        excerpt: post.excerpt,
                        slug: post.slug,
                        category: post.category,
                        imageUrl: post.imageUrl,
                    },
                ).catch(err =>
                    console.error(`[BlogScheduler] Email failed for ${sub.email}:`, err),
                ),
            ),
        );
    }
}

// ─────────────────────────────────────────────────────────────
// Boot — restore timers for scheduled/published posts
// Only meaningful in long-running Node (local dev / self-hosted).
// On Vercel, QStash jobs are already queued and fire independently.
// ─────────────────────────────────────────────────────────────

export async function initBlogScheduler(): Promise<void> {
    try {
        await connectToDatabase();

        // Find all posts that are scheduled or published (may have active/future windows)
        const posts = await BlogPost.find({
            status: { $in: ['scheduled', 'published'] },
            'siteWindows.0': { $exists: true },
        }).lean();

        if (!posts.length) {
            console.log('[BlogScheduler] No scheduled/published posts on boot');
            return;
        }

        console.log(`[BlogScheduler] Restoring triggers for ${posts.length} post(s)`);

        const now = new Date();

        for (const post of posts) {
            const id = (post as any)._id.toString();
            const slug = (post as any).slug;
            const windows = normalizeSiteWindows((post as any).siteWindows ?? []);

            for (const w of windows) {
                if (w.startAt > now) {
                    // Future start — restore start timer
                    scheduleBlogPostStart(id, w.site, w.startAt);
                } else if (w.endAt <= now) {
                    // Already expired during downtime — expire now
                    console.log(
                        `[BlogScheduler] Post slug="${slug}" site="${w.site}" expired during downtime — expiring now`,
                    );
                    expireBlogPostForSite(slug, w.site);
                } else {
                    // Currently active — restore expiry timer only
                    scheduleBlogPostExpiry(slug, [{ site: w.site, endAt: w.endAt }]);
                }
            }
        }
    } catch (err) {
        console.error('[BlogScheduler] Init failed:', err);
    }
}

// ─────────────────────────────────────────────────────────────
// Legacy compat export — old code calling scheduleBlogPost(id, date)
// is redirected to the new per-site flow using all KNOWN_SITES.
// Remove once all call sites are updated.
// ─────────────────────────────────────────────────────────────

/** @deprecated Use reconfigureBlogTriggers with explicit siteWindows instead. */
export async function scheduleBlogPost(postId: string, publishAt: Date): Promise<void> {
    const { KNOWN_SITES } = await import('@/modal/sharedListing');
    const endAt = new Date(publishAt.getTime() + 365 * 24 * 60 * 60 * 1000);
    const windows = KNOWN_SITES.map(site => ({ site, startAt: publishAt, endAt }));
    await reconfigureBlogTriggers(postId, windows);
}

/** @deprecated Use qstashScheduleBlogStart instead. */
export async function qstashScheduleBlogPost(
    postId: string,
    publishAt: Date,
): Promise<string | undefined> {
    // This is now handled inside reconfigureBlogTriggers — return undefined
    // so old callers that store the msgId don't crash (schedulerRefs handles it now).
    return undefined;
}
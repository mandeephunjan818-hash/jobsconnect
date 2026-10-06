/**
 * app/api/admin/listings/create/route.ts
 *
 * POST /api/admin/listings/create
 *
 * Admin-only: create a listing directly.
 *
 * Flow:
 *   → Always creates in ListingDraft with status='approved'
 *   → If siteWindows are provided:
 *       - Windows already active now  → scheduler promotes immediately on next tick
 *       - All windows in the future   → draft stays until first startAt fires
 *       - Mix of both                 → immediate promotion for active ones,
 *                                       draft kept for future ones
 *   → If no siteWindows, draft sits at 'approved' until admin adds a schedule later
 *
 * Why draft-first even for admins?
 *   Keeps the invariant: Live = visible on ≥ 1 site right now.
 *   The scheduler is the single place that moves listings into the live collection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import Listing from '@/modal/Listing';
import ListingDraft from '@/modal/Listingdraft';
import { KNOWN_SITES, daysBetween, deriveCampaignWindow } from '@/modal/sharedListing';
import type { ISchedulerRef } from '@/modal/sharedListing';
import {
    scheduleListingDraft,
    qstashScheduleDraft,
    qstashScheduleExpiry,
    scheduleListingExpiry,
} from '@/lib/Listingscheduler ';
import { revalidatePath } from 'next/cache';

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/**
 * Returns a clean slug, and only appends "-2", "-3", etc. if the base
 * slug is already taken by another draft or live listing. No timestamps,
 * no random suffixes — the slug always matches the title unless there's
 * a real name collision.
 */
async function generateUniqueSlug(title: string): Promise<string> {
    const base = generateSlug(title) || 'listing';
    let candidate = base;
    let attempt = 1;

    while (true) {
        const [draftExists, listingExists] = await Promise.all([
            ListingDraft.exists({ slug: candidate }),
            Listing.exists({ slug: candidate }),
        ]);
        if (!draftExists && !listingExists) return candidate;

        attempt++;
        candidate = `${base}-${attempt}`;
    }
}

function isValidSlot(slot: any): boolean {
    if (!slot || typeof slot !== 'object') return false;
    const { location, province, city, jobPay } = slot;
    if (
        typeof location !== 'string' || !location.trim() ||
        typeof province !== 'string' || !province.trim() ||
        typeof city !== 'string' || !city.trim() ||
        typeof jobPay !== 'number' || isNaN(jobPay)
    ) return false;
    if (slot.shifts) {
        if (!Array.isArray(slot.shifts)) return false;
        for (const sh of slot.shifts) {
            if (!sh || typeof sh.label !== 'string' || !sh.label.trim()) return false;
        }
    }
    return true;
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const session = await getServerSession(authOptions);
        const adminEmail = session?.user?.id || 'admin';

        const body = await req.json();
        const {
            title, companyName, overview, description, applyEmail,
            highlights = [], benefits = [], categories = [],
            jobBankId, jobMode, jobType,
            slots,
            siteWindows,
        } = body;

        // ── Required field validation ───────────────────────────
        const missing: string[] = [];
        if (!title?.trim()) missing.push('title');
        if (!overview?.trim()) missing.push('overview');
        if (!description?.trim()) missing.push('description');
        if (!applyEmail?.trim()) missing.push('applyEmail');
        if (!jobMode?.trim()) missing.push('jobMode');
        if (!Array.isArray(slots) || slots.length === 0 || !slots.every(isValidSlot))
            missing.push('slots (non-empty array with valid location, province, city, jobPay)');
        if (missing.length)
            return NextResponse.json({ error: 'Missing or invalid required fields', missing }, { status: 400 });

        // ── Validate siteWindows if provided ────────────────────
        let parsedWindows: Array<{ site: string; startAt: Date; endAt: Date; durationDays: number }> = [];
        if (siteWindows !== undefined) {
            if (!Array.isArray(siteWindows))
                return NextResponse.json({ error: 'siteWindows must be an array' }, { status: 400 });

            for (const [i, w] of siteWindows.entries()) {
                if (!KNOWN_SITES.includes(w.site))
                    return NextResponse.json(
                        { error: `siteWindows[${i}].site "${w.site}" is not a known site` },
                        { status: 400 },
                    );
                const startAt = new Date(w.startAt);
                const endAt = new Date(w.endAt);
                if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt)
                    return NextResponse.json(
                        { error: `siteWindows[${i}]: startAt must be before endAt` },
                        { status: 400 },
                    );
                parsedWindows.push({ site: w.site, startAt, endAt, durationDays: daysBetween(startAt, endAt) });
            }
        }

        // ── Unique slug ─────────────────────────────────────────
        const slug = await generateUniqueSlug(title);

        // ── Normalise slots ─────────────────────────────────────
        const normalisedSlots = slots.map((s: any) => ({
            location: s.location.trim(),
            province: s.province.trim(),
            city: s.city.trim(),
            jobPay: s.jobPay,
            jobVacancy: s.jobVacancy || undefined,
            jobStartingTime: s.jobStartingTime || undefined,
            shifts: s.shifts || [],
            isActive: s.isActive !== undefined ? Boolean(s.isActive) : true,
        }));

        const now = new Date();
        const windowsAlreadyActive = parsedWindows.filter(w => w.startAt <= now);
        const windowsFuture = parsedWindows.filter(w => w.startAt > now);

        // ── Determine draft status ──────────────────────────────
        // 'approved' means the admin has signed off — the scheduler will
        // promote it as soon as any window opens.
        // 'scheduled' is used when all windows are still future-dated.
        const draftStatus = parsedWindows.length > 0 && windowsAlreadyActive.length === 0
            ? 'scheduled'
            : 'approved';

        const campaignWindow = parsedWindows.length > 0
            ? deriveCampaignWindow('Hiring Campaign', parsedWindows)
            : undefined;

        // ── Create the draft ────────────────────────────────────
        const draft = await ListingDraft.create({
            title: title.trim(),
            companyName,
            slug,
            overview,
            description,
            applyEmail,
            highlights,
            benefits,
            categories,
            jobBankId: jobBankId?.trim() || '',
            jobMode: jobMode.trim(),
            jobType: jobType || undefined,
            slots: normalisedSlots,
            siteWindows: parsedWindows,
            visibleOnSites: parsedWindows.map(w => w.site),
            campaignWindow,
            status: draftStatus,
            submittedBy: adminEmail,
            schedulerRefs: {},
            adminNotes: [
                {
                    message: `Listing created directly by admin (${adminEmail})`,
                    type: 'status_change' as const,
                    createdAt: new Date(),
                    createdBy: adminEmail,
                },
            ],
            updateRequested: false,
        });

        const draftId = draft._id.toString();

        // ── Wire up triggers ────────────────────────────────────
        const newRefs: Record<string, ISchedulerRef> = {};

        if (windowsAlreadyActive.length > 0) {
            // These windows are open right now — promote immediately
            // (promoteDraftToListing will handle expiry scheduling after promotion)
            const earliestActive = new Date(
                Math.min(...windowsAlreadyActive.map(w => w.startAt.getTime())),
            );
            scheduleListingDraft(draftId, earliestActive); // fires almost immediately (delay ≤ 0)
            const startMsgId = await qstashScheduleDraft(draftId, earliestActive);
            for (const w of windowsAlreadyActive) {
                newRefs[w.site] = { startMsgId };
            }
        }

        if (windowsFuture.length > 0) {
            const earliestFuture = new Date(
                Math.min(...windowsFuture.map(w => w.startAt.getTime())),
            );
            scheduleListingDraft(draftId, earliestFuture);
            const startMsgId = await qstashScheduleDraft(draftId, earliestFuture);
            for (const w of windowsFuture) {
                newRefs[w.site] = { startMsgId };
            }
        }

        // Pre-register expiry jobs for ALL windows so the IDs are ready
        // when the draft is promoted.  They fire at endAt regardless of
        // when the listing goes live, which is correct (endAt is absolute).
        if (parsedWindows.length > 0) {
            const expiryMsgIds = await qstashScheduleExpiry(
                slug,
                parsedWindows.map(w => ({ site: w.site, endAt: w.endAt })),
            );
            scheduleListingExpiry(slug, parsedWindows.map(w => ({ site: w.site, endAt: w.endAt })));
            for (const w of parsedWindows) {
                newRefs[w.site] = { ...newRefs[w.site], expiryMsgId: expiryMsgIds[w.site] };
            }
        }

        // Persist the refs
        draft.schedulerRefs = newRefs;
        draft.markModified('schedulerRefs');
        try {
            await draft.save();
        } catch (err: any) {
            // Expected when the window was already active: the immediate
            // promotion (scheduleListingDraft) can race ahead of this save
            // and move the doc from ListingDraft → Listing before we get here.
            // That's not a failure — the listing did go live either way.
            if (err?.name !== 'DocumentNotFoundError') throw err;
        }

        revalidatePath(`/dashboard/listings/${draft._id}`);
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
            },
            body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/${slug}`] }),
        }).catch(() => { });

        return NextResponse.json(
            {
                success: true,
                id: draft._id.toString(),
                jobId: draft.jobId,
                slug: draft.slug,
                status: draft.status,
                message: parsedWindows.length > 0
                    ? 'Listing created and scheduled. It will go live when the first site window opens.'
                    : 'Listing created. Add a schedule to publish it.',
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('[POST /api/admin/listings/create]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
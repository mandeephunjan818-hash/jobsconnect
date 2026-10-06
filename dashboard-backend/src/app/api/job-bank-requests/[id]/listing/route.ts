/**
 * src/app/api/admin/job-bank-requests/[id]/listing/route.ts
 *
 * Admin-only route: create a ListingDraft on behalf of the user
 * who submitted the Job Bank request.
 *
 * KEY DIFFERENCE from /api/listings/submit:
 *   - submittedBy is set to the REQUEST's userId (not the admin's session userId)
 *   - listingId validation is bypassed — admin sets status manually
 *   - No future-date requirement on siteWindows (admin can backdate or schedule freely)
 *   - jobBankId is pre-filled from the request
 *
 * On success:
 *   1. Creates the ListingDraft
 *   2. Updates the JobBankRequest with:
 *        listingId, listingCollection: 'ListingDraft', status: 'fulfilled'
 *
 * Accepts multipart/form-data (same shape as /api/listings/submit).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';
import JobBankRequest from '@/modal/JobBankRequest';
import { revalidatePath } from 'next/cache';
import { KNOWN_SITES, daysBetween, deriveCampaignWindow } from '@/modal/sharedListing';
import { sendJobBankRequestStatusChangeEmail } from '@/utils/email';
import { User, UserProfile } from '@/modal/User';

interface Params {
    params: Promise<{ id: string }>;
}

// ─── Auth guard ───────────────────────────────────────────────
function isAdmin(session: any): boolean {
    const role = session?.user?.role ?? 'user';
    return role === 'admin' || role === 'sub-admin';
}

// ─── Slug generator ───────────────────────────────────────────
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

// ─── Parse slots ─────────────────────────────────────────────
function parseSlots(
    raw: string | null,
): { ok: true; slots: any[] } | { ok: false; error: string } {
    if (!raw) return { ok: true, slots: [] };
    let parsed: any[];
    try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'slots must be valid JSON' }; }
    if (!Array.isArray(parsed)) return { ok: false, error: 'slots must be an array' };
    try {
        const slots = parsed.map((s, i) => {
            if (!s.location || !s.province || !s.city)
                throw new Error(`Slot ${i}: location, province, and city are required`);
            const pay = parseFloat(s.jobPay);
            if (isNaN(pay)) throw new Error(`Slot ${i}: jobPay must be a number`);
            return {
                location: String(s.location),
                province: String(s.province),
                city: String(s.city),
                jobPay: pay,
                jobVacancy: s.jobVacancy ? String(s.jobVacancy) : undefined,
                jobStartingTime: s.jobStartingTime ? String(s.jobStartingTime) : undefined,
                isActive: s.isActive !== false,
                shifts: Array.isArray(s.shifts)
                    ? s.shifts.map((sh: any) => ({
                        label: String(sh.label ?? 'Shift'),
                        startTime: sh.startTime ? String(sh.startTime) : undefined,
                        endTime: sh.endTime ? String(sh.endTime) : undefined,
                        days: Array.isArray(sh.days) ? sh.days.map(String) : [],
                    }))
                    : [],
            };
        });
        return { ok: true, slots };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

// ─── Parse siteWindows (admin: no future-date restriction) ────
function parseSiteWindowsAdmin(
    raw: string | null,
): { ok: true; windows: any[] } | { ok: false; error: string } {
    if (!raw) return { ok: true, windows: [] };
    let parsed: any[];
    try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'siteWindows must be valid JSON' }; }
    if (!Array.isArray(parsed)) return { ok: false, error: 'siteWindows must be an array' };

    const windows: any[] = [];
    for (const [i, w] of parsed.entries()) {
        if (!KNOWN_SITES.includes(w.site))
            return { ok: false, error: `siteWindows[${i}].site "${w.site}" is not a known site` };
        const startAt = new Date(w.startAt);
        const endAt = new Date(w.endAt);
        if (isNaN(startAt.getTime())) return { ok: false, error: `siteWindows[${i}].startAt is invalid` };
        if (isNaN(endAt.getTime())) return { ok: false, error: `siteWindows[${i}].endAt is invalid` };
        if (endAt <= startAt) return { ok: false, error: `siteWindows[${i}].endAt must be after startAt` };
        windows.push({ site: w.site, startAt, endAt, durationDays: daysBetween(startAt, endAt) });
    }
    const deduped = Object.values(Object.fromEntries(windows.map(w => [w.site, w])));
    return { ok: true, windows: deduped };
}

// ─── POST: create listing on behalf of user ───────────────────
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !isAdmin(session)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: requestId } = await params;
        await connectToDatabase();

        // ── Load the Job Bank request ────────────────────────────
        const jbRequest = await JobBankRequest.findById(requestId);
        if (!jbRequest) {
            return NextResponse.json({ error: 'Job Bank request not found' }, { status: 404 });
        }

        // ── submittedBy = the USER who made the request (not admin) ─
        const submittedBy = jbRequest.userId.toString();

        const formData = await req.formData();

        // ── Required top-level fields ────────────────────────────
        const title = formData.get('title') as string;
        const companyName = formData.get('companyName') as string;
        const overview = formData.get('overview') as string;
        const jobMode = formData.get('jobMode') as string;

        if (!title || !overview || !jobMode) {
            return NextResponse.json(
                { error: 'title, overview, and jobMode are required' },
                { status: 400 },
            );
        }

        // ── Optional top-level fields ────────────────────────────
        const jobType = formData.get('jobType') as string | null;

        // ── Job Bank ID: use request's value, allow override ────
        const jobBankId = (formData.get('jobBankId') as string | null)?.trim()
            || jbRequest.jobBankId;

        // ── Arrays ───────────────────────────────────────────────
        let highlights: string[] = [];
        let benefits: string[] = [];
        let categories: string[] = [];
        try { highlights = JSON.parse(formData.get('highlights') as string ?? '[]'); } catch { /**/ }
        try { benefits = JSON.parse(formData.get('benefits') as string ?? '[]'); } catch { /**/ }
        try {
            const raw = formData.get('categories') as string ?? '[]';
            const p = JSON.parse(raw.replace(/'/g, '"'));
            if (Array.isArray(p)) categories = p.map(String);
        } catch { /**/ }

        // ── Slots ─────────────────────────────────────────────────
        const slotsResult = parseSlots(formData.get('slots') as string | null);
        if (!slotsResult.ok) return NextResponse.json({ error: slotsResult.error }, { status: 400 });
        if (slotsResult.slots.length === 0)
            return NextResponse.json({ error: 'At least one slot (location) is required' }, { status: 400 });

        // ── Site windows ──────────────────────────────────────────
        const swResult = parseSiteWindowsAdmin(formData.get('siteWindows') as string | null);
        if (!swResult.ok) return NextResponse.json({ error: swResult.error }, { status: 400 });

        // ── Campaign window ───────────────────────────────────────
        let campaignWindow: any | undefined;
        let visibleOnSites: string[] = [];

        if (swResult.windows.length > 0) {
            visibleOnSites = [...new Set(swResult.windows.map((w: any) => w.site))];
            const cwLabel = (formData.get('campaignLabel') as string | null) ?? 'Hiring Campaign';
            campaignWindow = deriveCampaignWindow(cwLabel, swResult.windows);
        } else {
            try { visibleOnSites = JSON.parse(formData.get('visibleOnSites') as string ?? '[]'); } catch { /**/ }
        }

        // ── Admin-only: initial status override ───────────────────
        // Admin can force 'approved' directly; default is 'pending' or 'scheduled'
        const statusOverride = formData.get('status') as string | null;
        const validStatuses = ['pending', 'scheduled', 'approved', 'rejected'];
        const derivedStatus = campaignWindow ? 'scheduled' : 'pending';
        const status = (statusOverride && validStatuses.includes(statusOverride))
            ? statusOverride
            : derivedStatus;

        // ── Unique slug ───────────────────────────────────────────
        const slug = generateSlug(title);
        const [draftExists, listingExists] = await Promise.all([
            ListingDraft.findOne({ slug }),
            Listing.findOne({ slug }),
        ]);
        if (draftExists || listingExists) {
            return NextResponse.json(
                { error: 'A listing with a similar title already exists. Please use a more specific title.' },
                { status: 409 },
            );
        }

        // ── Create the draft — submittedBy = request owner ────────
        const draft = await ListingDraft.create({
            title,
            companyName,
            overview,
            highlights,
            benefits,
            categories,
            jobBankId,
            slug,
            visibleOnSites,
            siteWindows: swResult.windows,
            jobMode,
            jobType: jobType || undefined,
            slots: slotsResult.slots,
            submittedBy,           // ← the user who made the JB request
            status,
            campaignWindow,
        });

        // ── Update the Job Bank request ────────────────────────────
        jbRequest.listingId = draft._id.toString();
        jbRequest.listingCollection = 'ListingDraft';
        jbRequest.status = 'fulfilled';
        jbRequest.reviewedBy = (session.user as any).id;
        jbRequest.reviewedAt = new Date();
        await jbRequest.save();

        // ── Cache invalidation ─────────────────────────────────────
        revalidatePath(`/admin/job-bank-requests`);
        revalidatePath(`/admin/job-bank-requests/${requestId}`);
        revalidatePath(`/dashboard/listings/${draft._id}`);

        try {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
                },
                body: JSON.stringify({ paths: ['/', '/jobs'] }),
            });
        } catch { /* non-fatal */ }

        // Fetch the original requestor's email and name
        const [userDoc, userProfile] = await Promise.all([
            User.findById(jbRequest.userId).select('email').lean(),
            UserProfile.findOne({ userId: jbRequest.userId }).select('name').lean(),
        ]);

        const userEmail = userDoc?.email;
        const userName = userProfile?.name || 'User';

        if (userEmail) {
            sendJobBankRequestStatusChangeEmail(
                userEmail,
                userName,
                jbRequest.jobBankId,
                'fulfilled',
            ).catch(err => console.error('Status change email failed:', err));
        }

        return NextResponse.json(
            {
                success: true,
                listingId: draft._id.toString(),
                jobId: draft.jobId,
                slug: draft.slug,
                jobBankRequestId: requestId,
                message: 'Listing draft created and request marked as fulfilled.',
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('[POST /api/admin/job-bank-requests/:id/listing]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
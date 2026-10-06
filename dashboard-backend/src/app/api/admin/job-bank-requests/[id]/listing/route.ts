import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import JobBankRequest from '@/modal/JobBankRequest';
import Listing from '@/modal/Listing';
import { Types } from 'mongoose';
import { generateJobId } from '@/modal/sharedListing';
import { revalidatePath } from 'next/cache';
import { normalizeSiteWindows, deriveCampaignWindow } from '@/modal/sharedListing';
import ListingDraft from '@/modal/Listingdraft';
const { scheduleListingDraft, qstashScheduleDraft, scheduleListingExpiry, qstashScheduleExpiry, reconfigureTriggers  } = await import('@/lib/Listingscheduler ');

interface Params {
    params: Promise<{ id: string }>;
}

function isAdmin(session: any): boolean {
    const role = session?.user?.role ?? 'user';
    return role === 'admin' || role === 'sub-admin';
}

/** Convert a job title to a URL-safe slug. No external deps. */
function toSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Build a unique slug — appends a timestamp if the base already exists. */
async function buildUniqueSlug(title: string): Promise<string> {
    const base = toSlug(title);
    const clash = await Listing.findOne({ slug: base }).select('_id').lean();
    return clash ? `${base}-${Date.now()}` : base;
}

/** Safely parse a JSON FormData field; return fallback on any failure. */
function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
    if (!raw || typeof raw !== 'string') return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// ─── POST ──────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
    try {
        // 1. Auth guard
        const session = await getServerSession(authOptions);
        if (!session?.user || !isAdmin(session)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        await connectToDatabase();

        // 2. Load the JobBankRequest — we need the owner's userId
        const jobBankRequest = await JobBankRequest.findById(id);
        if (!jobBankRequest) {
            return NextResponse.json({ error: 'Job Bank request not found' }, { status: 404 });
        }

        const ownerUserId: string = jobBankRequest.userId?.toString();
        if (!ownerUserId) {
            return NextResponse.json(
                { error: 'This request has no associated user' },
                { status: 422 },
            );
        }

        // 3. Parse multipart form data
        const fd = await req.formData();

        const title = (fd.get('title') as string)?.trim() ?? '';
        const companyName = (fd.get('companyName') as string)?.trim() ?? '';
        const overview = (fd.get('overview') as string)?.trim() ?? '';
        const description = (fd.get('description') as string)?.trim() ?? '';
        const applyEmail = (fd.get('applyEmail') as string)?.trim() ?? '';
        const jobBankId = (fd.get('jobBankId') as string)?.trim() ?? '';
        const jobMode = (fd.get('jobMode') as string)?.trim() ?? '';
        const jobType = (fd.get('jobType') as string)?.trim() || undefined;
        const listingStatus = (fd.get('status') as string)?.trim() || 'pending';

        const highlights = parseJson<string[]>(fd.get('highlights'), []);
        const benefits = parseJson<string[]>(fd.get('benefits'), []);
        const categories = parseJson<string[]>(fd.get('categories'), []);
        const slotsRaw = parseJson<any[]>(fd.get('slots'), []);
        const siteWindowsRaw = parseJson<any[]>(fd.get('siteWindows'), []);

        // 4. Required-field validation
        const missing: string[] = [];
        if (!title) missing.push('title');
        if (!overview) missing.push('overview');
        if (!description) missing.push('description');
        if (!applyEmail) missing.push('applyEmail');
        if (!jobBankId) missing.push('jobBankId');
        if (!jobMode) missing.push('jobMode');
        if (!slotsRaw.length) missing.push('slots (at least one location is required)');

        if (missing.length) {
            return NextResponse.json(
                { error: `Missing required fields: ${missing.join(', ')}` },
                { status: 400 },
            );
        }

        // 5. Validate listing status against the Listing schema enum
        const VALID_STATUSES = ['pending', 'scheduled', 'approved', 'rejected'] as const;
        type ListingStatus = typeof VALID_STATUSES[number];

        if (!VALID_STATUSES.includes(listingStatus as ListingStatus)) {
            return NextResponse.json(
                { error: `Invalid status "${listingStatus}". Must be one of: ${VALID_STATUSES.join(', ')}` },
                { status: 400 },
            );
        }

        // 6. Normalise slots  (mirrors ISlot in sharedListing.ts)
        const slots = slotsRaw.map((s: any, idx: number) => {
            if (!s.location) throw new Error(`Slot ${idx + 1}: location is required`);
            if (!s.city) throw new Error(`Slot ${idx + 1}: city is required`);
            if (!s.province) throw new Error(`Slot ${idx + 1}: province is required`);

            return {
                location: String(s.location),
                province: String(s.province),
                city: String(s.city),
                jobPay: parseFloat(s.jobPay) || 0,
                jobVacancy: s.jobVacancy ? String(s.jobVacancy) : undefined,
                jobStartingTime: s.jobStartingTime ? String(s.jobStartingTime) : undefined,
                isActive: s.isActive !== false,
                // shifts → IShift[]
                shifts: Array.isArray(s.shifts)
                    ? s.shifts.map((sh: any) => ({
                        label: sh.label || 'Shift',
                        startTime: sh.startTime || undefined,
                        endTime: sh.endTime || undefined,
                        days: Array.isArray(sh.days) ? sh.days : [],
                    }))
                    : [],
            };
        });

        // 7. Normalise siteWindows  (mirrors ISiteWindow in sharedListing.ts)
        //    durationDays is intentionally omitted — the pre-save hook computes it.
        const siteWindows = siteWindowsRaw.map((w: any, idx: number) => {
            const startDate = new Date(w.startAt);
            const endDate = new Date(w.endAt);

            if (isNaN(startDate.getTime())) throw new Error(`siteWindow ${idx + 1}: invalid startAt`);
            if (isNaN(endDate.getTime())) throw new Error(`siteWindow ${idx + 1}: invalid endAt`);
            if (endDate <= startDate) throw new Error(`siteWindow ${idx + 1}: endAt must be after startAt`);

            return {
                site: String(w.site),
                startAt: startDate,
                endAt: endDate,
                durationDays: 1,
            };
        });

        // 8. Build a unique slug from the title
        const slug = await buildUniqueSlug(title);

        // Check for slug collisions in both collections
        const [draftClash, listingClash] = await Promise.all([
            ListingDraft.findOne({ slug }).select('_id').lean(),
            Listing.findOne({ slug }).select('_id').lean(),
        ]);
        const finalSlug = (draftClash || listingClash) ? `${slug}-${Date.now()}` : slug;

        if (listingStatus === 'approved') {
            // ── Publish immediately as a live Listing ──────────────────
            const listing = new Listing({
                title, companyName ,slug: finalSlug, overview, description, applyEmail,
                jobBankId, jobMode, jobType, highlights, benefits, categories,
                slots, siteWindows, status: 'approved', isActive: true,
                submittedBy: ownerUserId, adminNotes: [], updateRequested: false,
            });

            if (!listing.jobId) {
                let candidate: string;
                let attempts = 0;
                do {
                    candidate = generateJobId();
                    const clash = await Listing.findOne({ jobId: candidate }).lean();
                    if (!clash) break;
                    attempts++;
                } while (attempts < 5);
                listing.jobId = candidate!;
            }

            const doc = await listing.save();

            // Schedule expiry for each site window
            const normalizedWindows = normalizeSiteWindows(doc.siteWindows ?? []);
            const expiryWindows = normalizedWindows.map((w: any) => ({ site: w.site, endAt: w.endAt }));
            scheduleListingExpiry(doc.slug, expiryWindows);
            await qstashScheduleExpiry(doc.slug, expiryWindows);

            // Mark request fulfilled
            jobBankRequest.status = 'fulfilled';
            jobBankRequest.listingId = (doc._id as any).toString();
            jobBankRequest.listingCollection = 'Listing';
            jobBankRequest.reviewedBy = new Types.ObjectId((session.user as any).id);
            jobBankRequest.reviewedAt = new Date();
            await jobBankRequest.save();

            revalidatePath(`/dashboard/listings/${doc._id}`);
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/frontend/revalidate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': process.env.REVALIDATE_SECRET! },
                body: JSON.stringify({ paths: ['/', '/jobs', `/jobs/${doc.slug}`] }),
            });

            return NextResponse.json({
                message: 'Listing created and published. Request marked as fulfilled.',
                jobId: doc.jobId, listingId: (doc._id as any).toString(),
                slug: doc.slug, status: doc.status,
            }, { status: 201 });

        } else {
            // ── Create as a ListingDraft (pending or scheduled) ────────
            // The scheduler will promote it to a live Listing at startAt.
            const campaignLabel = 'Hiring Campaign';
            const campaignWindow = siteWindows.length > 0
                ? deriveCampaignWindow(campaignLabel, siteWindows)
                : undefined;

            const draft = new ListingDraft({
                title, companyName ,slug: finalSlug, overview, description, applyEmail,
                jobBankId, jobMode, jobType, highlights, benefits, categories,
                slots, siteWindows,
                status: siteWindows.length > 0 ? 'scheduled' : 'pending',
                campaignWindow,
                submittedBy: ownerUserId,
                adminNotes: [{
                    message: `Draft created by admin (${session.user?.email}) from Job Bank request #${jobBankId}`,
                    type: 'status_change' as const,
                    createdAt: new Date(),
                    createdBy: session.user?.email ?? 'admin',
                }],
                updateRequested: false,
            });

            const doc = await draft.save(); // pre-save hook generates jobId, durationDays, visibleOnSites

            // Schedule publish at the earliest siteWindow.startAt
            if (siteWindows.length > 0) {
                const earliestStartAt = new Date(
                    Math.min(...siteWindows.map((w: any) => new Date(w.startAt).getTime()))
                );
                const draftId = (doc._id as any).toString();
                scheduleListingDraft(draftId, earliestStartAt);       // local dev / warm process
                await qstashScheduleDraft(draftId, earliestStartAt);  // durable / Vercel
            }

            // Mark request fulfilled
            jobBankRequest.status = 'fulfilled';
            jobBankRequest.listingId = (doc._id as any).toString();
            jobBankRequest.listingCollection = 'ListingDraft';       // ← correct collection
            jobBankRequest.reviewedBy = new Types.ObjectId((session.user as any).id);
            jobBankRequest.reviewedAt = new Date();
            await jobBankRequest.save();

            return NextResponse.json({
                message: `Draft created and scheduled. Request marked as fulfilled.`,
                jobId: doc.jobId, listingId: (doc._id as any).toString(),
                slug: doc.slug, status: doc.status,
            }, { status: 201 });
        }

    } catch (err: any) {
        console.error('[POST /api/admin/job-bank-requests/:id/listing]', err);

        // Surface schema / validation errors as 400
        if (
            err.name === 'ValidationError' ||
            err.message?.startsWith('Slot ') ||
            err.message?.startsWith('siteWindow ')
        ) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
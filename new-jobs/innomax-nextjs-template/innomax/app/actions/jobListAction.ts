'use server';

import connectToDatabase from '../../lib/mongooes';
import Listing from '../../modal/Listing';
import type { SiteSlug } from '../../modal/sharedListing';

// ── Site‑prefix mapping (same as in the PDF report) ───────
const SITE_ID_PREFIXES: Record<string, string> = {
    'jobs-connect.vercel.app': 'JC',
    'new-jobs-fawn.vercel.app': 'NIC',
    'jobsrefugee.ca': 'REF',
    'vulnerableyouthsjobs.ca': 'VYJ',
    'accesscareers.ca': 'AC',
    'indigenouspeoplesjobs.ca': 'IPJ',
};

/**
 * Derives the site‑specific job ID by replacing the original
 * prefix with the one assigned to the given site.
 *
 * - If no jobId, returns an empty string.
 * - If no site is provided, returns the raw jobId unchanged.
 * - If the jobId doesn't follow the expected `XXX‑NNN‑NNN`
 *   format, it is returned as‑is.
 */
function deriveJobIdForSite(
    jobId: string | null | undefined,
    site?: SiteSlug,
): string {
    if (!jobId) return '';
    if (!site) return jobId;

    const parts = jobId.split('-');
    if (parts.length !== 3) return jobId;

    const prefix = SITE_ID_PREFIXES[site] ?? parts[0];
    return `${prefix}-${parts[1]}-${parts[2]}`;
}

// ── Local helper – determines if a listing is currently visible
// on a specific site based on its time windows.
function isListingVisibleOnSite(
    listing: {
        siteWindows?: { site: string; startAt: Date | string; endAt: Date | string }[];
    },
    site: string,
): boolean {
    // Legacy listings without windows are visible everywhere
    if (!listing.siteWindows || listing.siteWindows.length === 0) return true;

    const now = new Date();
    const window = listing.siteWindows.find(w => w.site === site);
    if (!window) return false;

    const start = new Date(window.startAt);
    const end = new Date(window.endAt);
    return start <= now && now <= end;
}

// ── Helper: resolves the effective site from the optional argument
// and the environment variable.
function resolveSite(site?: SiteSlug): SiteSlug | undefined {
    if (site) return site;
    // Use the env variable as fallback; if it's empty/undefined, no filtering is applied
    const envSite = process.env.NEXT_PUBLIC_SITE_ID;
    return envSite ? (envSite as SiteSlug) : undefined;
}

// ── Public shapes ─────────────────────────────────────────
export interface JobPreviewItem {
    _id: string;
    title: string;
    companyName: string;
    overview: string;
    description: string;
    applyEmail: string;
    categories: string[];
    /** Primary/first location — kept for backward compat. */
    location: string;
    /** All distinct "City, Province" locations across every slot. */
    locations: string[];
    jobMode: string;
    jobType: string;
    slug: string;
    createdAt: string;
}

export interface JobListingItem {
    _id: string;
    title: string;
    companyName: string;
    overview: string;
    description: string;
    applyEmail: string;
    slug: string;
    jobMode: string;
    jobType: string;
    jobId: string;
    categories: string[];
    location: string;
    locations: string[];
    province: string;
    city: string;
    jobPay: number;
    payMin: number;
    payMax: number;
    slotsCount: number;
    createdAt: string;
}

export interface JobDetailItem {
    _id: string;
    title: string;
    companyName: string;
    slug: string;
    jobId: string;
    overview: string;
    description: string;
    applyEmail: string;
    highlights: string[];
    benefits: string[];
    categories: string[];
    jobMode: string;
    jobType: string;
    slots: {
        _id: string;
        location: string;
        province: string;
        city: string;
        jobPay: number;
        jobVacancy?: string;
        jobStartingTime?: string;
        shifts: {
            label: string;
            startTime?: string;
            endTime?: string;
            days?: string[];
        }[];
    }[];
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// 1. Homepage previews (top 6) – requires an explicit site
// ─────────────────────────────────────────────────────────────
export async function getHomepageJobPreviews(
    site: SiteSlug,
): Promise<JobPreviewItem[]> {
    try {
        await connectToDatabase();

        const listings = await Listing.find({
            status: 'approved',
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .select(
                // NOTE: 'location' was being selected as a top-level field that
                // doesn't exist on the schema (location lives per-slot on ISlot).
                // Select 'slots' instead and derive it below.
                'title overview companyName jobMode description slots categories applyEmail jobType slug siteWindows createdAt',
            )
            .lean();

        const visible = listings.filter((l: any) =>
            isListingVisibleOnSite(l, site),
        );

        const top6 = visible.slice(0, 5);

        return top6.map((l: any) => {
            const firstSlot = l.slots?.[0];
            const allLocations: string[] = Array.from(
                new Set(
                    (l.slots ?? [])
                        .filter((s: any) => s?.city || s?.province)
                        .map((s: any) => `${s.city}, ${s.province}`)
                )
            );

            return {
                _id: l._id.toString(),
                title: l.title,
                companyName: l.companyName,
                overview: l.overview,
                categories: l.categories ?? [],
                location: firstSlot
                    ? `${firstSlot.city}, ${firstSlot.province}`
                    : 'Location not specified',
                locations: allLocations.length
                    ? allLocations
                    : ['Location not specified'],
                description: l.description || '',
                applyEmail: l.applyEmail || '',
                jobMode: l.jobMode,
                jobType: l.jobType ?? 'Full-time',
                slug: l.slug,
                createdAt: l.createdAt?.toISOString?.() ?? new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error('getHomepageJobPreviews error:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────
// 2. All jobs list – optional site, falls back to env
// ─────────────────────────────────────────────────────────────
export async function getAllJobListings(
    site?: SiteSlug,
): Promise<JobListingItem[]> {
    const effectiveSite = resolveSite(site);

    try {
        await connectToDatabase();

        const listings = await Listing.find({
            status: 'approved',
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .select(
                'title overview companyName slug jobMode jobType jobId ' +
                'description applyEmail categories slots createdAt siteWindows',
            )
            .lean();

        // Apply site/time filter only if we have a site to check against
        const result = effectiveSite
            ? listings.filter((l: any) => isListingVisibleOnSite(l, effectiveSite))
            : listings;

        return result.map((l: any) => {
            const firstSlot = l.slots?.[0];
            const displayJobId = deriveJobIdForSite(l.jobId, effectiveSite);

            const allLocations: string[] = Array.from(
                new Set(
                    (l.slots ?? [])
                        .filter((s: any) => s?.city || s?.province)
                        .map((s: any) => `${s.city}, ${s.province}`)
                )
            );

            // Pay range across every active slot, not just slots[0]
            const pays: number[] = (l.slots ?? [])
                .map((s: any) => s?.jobPay)
                .filter((p: any) => typeof p === 'number' && p > 0);
            const payMin = pays.length ? Math.min(...pays) : 0;
            const payMax = pays.length ? Math.max(...pays) : 0;

            return {
                _id: l._id.toString(),
                title: l.title,
                companyName: l.companyName,
                overview: l.overview,
                description: l.description,
                applyEmail: l.applyEmail,
                slug: l.slug,
                jobMode: l.jobMode ?? 'On-site',
                jobType: l.jobType ?? 'Full-time',
                jobId: displayJobId,
                categories: l.categories ?? [],
                location: firstSlot
                    ? `${firstSlot.city}, ${firstSlot.province}`
                    : 'Location not specified',
                locations: allLocations.length ? allLocations : ['Location not specified'],
                province: firstSlot?.province ?? '',
                city: firstSlot?.city ?? '',
                jobPay: firstSlot?.jobPay ?? 0,
                payMin,
                payMax,
                slotsCount: l.slots?.length ?? 0,
                createdAt: l.createdAt?.toISOString?.() ?? new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error('getAllJobListings error:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────
// 3. Single job by slug – optional site, falls back to env
// ─────────────────────────────────────────────────────────────
export async function getJobBySlug(
    slug: string,
    site?: SiteSlug,
): Promise<JobDetailItem | null> {
    const effectiveSite = resolveSite(site);

    try {
        await connectToDatabase();

        const listing = await Listing.findOne({
            slug,
            status: 'approved',
            isActive: true,
        })
            .select(
                'title slug jobId overview companyName highlights benefits categories ' +
                'description applyEmail jobMode jobType slots createdAt updatedAt siteWindows',
            )
            .lean();

        if (!listing) return null;

        // Enforce site‑window visibility if a site is known
        if (effectiveSite && !isListingVisibleOnSite(listing as any, effectiveSite)) {
            return null;
        }

        const l = listing as any;
        const displayJobId = deriveJobIdForSite(l.jobId, effectiveSite);

        return {
            _id: l._id.toString(),
            title: l.title,
            companyName: l.companyName,
            slug: l.slug,
            jobId: displayJobId,                    //  ← changed
            overview: l.overview,
            description: l.description ?? '',
            applyEmail: l.applyEmail ?? '',
            highlights: l.highlights ?? [],
            benefits: l.benefits ?? [],
            categories: l.categories ?? [],
            jobMode: l.jobMode ?? 'On-site',
            jobType: l.jobType ?? 'Full-time',
            slots: (l.slots ?? []).map((s: any) => ({
                _id: s._id?.toString() ?? '',
                location: s.location,
                province: s.province,
                city: s.city,
                jobPay: s.jobPay ?? 0,
                jobVacancy: s.jobVacancy,
                jobStartingTime: s.jobStartingTime,
                shifts: (s.shifts ?? []).map((sh: any) => ({
                    label: sh.label,
                    startTime: sh.startTime,
                    endTime: sh.endTime,
                    days: sh.days ?? [],
                })),
            })),
            createdAt: l.createdAt?.toISOString?.() ?? '',
            updatedAt: l.updatedAt?.toISOString?.() ?? '',
        };
    } catch (error) {
        console.error('getJobBySlug error:', error);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// 4. All slugs – for generateStaticParams
// ─────────────────────────────────────────────────────────────
export async function getAllJobSlugs(): Promise<string[]> {
    try {
        await connectToDatabase();
        const docs = await Listing.find({ status: 'approved', isActive: true })
            .select('slug')
            .lean();
        return (docs as any[]).map(d => d.slug);
    } catch {
        return [];
    }
}
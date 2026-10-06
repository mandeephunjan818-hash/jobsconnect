/**
 * app/api/admin/listings/[id]/report/route.ts
 *
 * GET /api/admin/listings/[id]/report?table=live|drafts&site=jobs-connect.vercel.app
 *
 * Generates a styled PDF report for a single listing using @react-pdf/renderer.
 * - Header: site name + logo area + generated date
 * - Footer: site URL + page number
 * - Body: all listing fields, slots, site windows, categories, highlights, benefits
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongooes';
import ListingDraft from '@/modal/Listingdraft';
import Listing from '@/modal/Listing';
import { renderToBuffer } from '@react-pdf/renderer';
import { ListingReportDocument } from '@/components/pdf/ListingReportDocument';

interface Params { params: Promise<{ id: string }> }

const SITE_LABELS: Record<string, string> = {
    'jobs-connect.vercel.app': 'Jobs Connect',
    'new-jobs-fawn.vercel.app': 'New in Canada Jobs',
    'jobsrefugee.ca': 'Jobs for Refugees',
    'vulnerableyouthsjobs.ca': 'Vulnerable Youths Jobs',
    'accesscareers.ca': 'Access Careers',
    'indigenouspeoplesjobs.ca': 'Indigenous Peoples Jobs',
};

const SITE_ID_PREFIXES: Record<string, string> = {
    'jobs-connect.vercel.app': 'JC',
    'new-jobs-fawn.vercel.app': 'NIC',
    'jobsrefugee.ca': 'REF',
    'vulnerableyouthsjobs.ca': 'VYJ',
    'accesscareers.ca': 'AC',
    'indigenouspeoplesjobs.ca': 'IPJ',
};

function deriveJobId(jobId: string | null | undefined, site: string): string {
    if (!jobId) return '—';
    const parts = jobId.split('-');
    if (parts.length !== 3) return jobId;
    const prefix = SITE_ID_PREFIXES[site] ?? parts[0];
    return `${prefix}-${parts[1]}-${parts[2]}`;
}

export async function GET(req: NextRequest, { params }: Params) {
    try {
        await connectToDatabase();

        const { id } = await params;
        const sp = req.nextUrl.searchParams;
        const table = sp.get('table') === 'live' ? 'live' : 'drafts';
        // Optional: scope the report to a specific site context
        const siteContext = sp.get('site') || null;

        const Model = table === 'live' ? Listing : ListingDraft;
        const doc = await (Model as any).findById(id).lean();
        if (!doc) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        const d = doc as any;

        // ── Build a clean data object to pass to the PDF component ──
        const reportData = {
            // Identity
            jobId: d.jobId ?? null,
            title: d.title,
            companyName: d.companyName || '',
            slug: d.slug,
            status: table === 'live' ? (d.isActive ? 'Active' : 'Inactive') : (d.status ?? 'Unknown'),
            table,

            // Content
            overview: d.overview || '',
            description: d.description || '',
            applyEmail: d.applyEmail || '',
            jobMode: d.jobMode || '',
            jobType: d.jobType || '',
            jobBankId: d.jobBankId || '',
            categories: d.categories ?? [],
            highlights: d.highlights ?? [],
            benefits: d.benefits ?? [],

            // Locations
            slots: (d.slots ?? []).map((s: any) => ({
                location: s.location,
                city: s.city,
                province: s.province,
                jobPay: s.jobPay,
                jobVacancy: s.jobVacancy ?? null,
                jobStartingTime: s.jobStartingTime ?? null,
                isActive: s.isActive,
                shifts: (s.shifts ?? []).map((sh: any) => ({
                    label: sh.label,
                    startTime: sh.startTime ?? null,
                    endTime: sh.endTime ?? null,
                    days: sh.days ?? [],
                })),
            })),

            // Sites & Windows
            siteWindows: (d.siteWindows ?? []).map((w: any) => ({
                site: w.site,
                siteLabel: SITE_LABELS[w.site] ?? w.site,
                derivedJobId: deriveJobId(d.jobId, w.site),
                startAt: w.startAt instanceof Date ? w.startAt.toISOString() : w.startAt,
                endAt: w.endAt instanceof Date ? w.endAt.toISOString() : w.endAt,
                durationDays: w.durationDays,
            })),
            visibleOnSites: (d.visibleOnSites ?? []).map((s: string) => SITE_LABELS[s] ?? s),

            // Site context for header/footer
            // If a specific site is requested use that; otherwise use first siteWindow site
            siteContext: siteContext
                ? { slug: siteContext, label: SITE_LABELS[siteContext] ?? siteContext }
                : d.siteWindows?.length
                    ? { slug: d.siteWindows[0].site, label: SITE_LABELS[d.siteWindows[0].site] ?? d.siteWindows[0].site }
                    : { slug: 'jobs-connect.vercel.app', label: 'Jobs Connect' },

            // Dates
            createdAt: d.createdAt?.toISOString() ?? '',
            updatedAt: d.updatedAt?.toISOString() ?? '',

            // Report metadata
            generatedAt: new Date().toISOString(),
        };

        // ── Render PDF ──────────────────────────────────────────────
        const buffer = await renderToBuffer(ListingReportDocument({ data: reportData }));

        const filename = `listing-report-${d.jobId ?? id}-${Date.now()}.pdf`;

        // Convert Node Buffer to a plain Uint8Array (which is a valid BodyInit)
        const uint8 = new Uint8Array(buffer);

        return new NextResponse(uint8, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[GET /api/admin/listings/:id/report]', error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
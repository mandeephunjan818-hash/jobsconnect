import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongooes';
import Listing from '@/modal/Listing';

// ─── Site display labels ───────────────────────────────────────
const SITE_LABELS: Record<string, string> = {
  'new-jobs-fawn.vercel.app': 'New in Canada Jobs',
  'jobsrefugee.ca': 'Jobs for Refugees',
  'vulnerableyouthsjobs.ca': 'Vulnerable Youths Jobs',
  'accesscareers.ca': 'Access Careers',
  'indigenouspeoplesjobs.ca': 'Indigenous Peoples Jobs',
};

// ─── Pay bucket definitions ────────────────────────────────────
const ALL_PAY_BUCKETS = [
  { value: 'under30k', label: 'Under $30K', max: 29_999 },
  { value: '30k60k', label: '$30K – $60K', min: 30_000, max: 59_999 },
  { value: '60k100k', label: '$60K – $100K', min: 60_000, max: 99_999 },
  { value: '100k150k', label: '$100K – $150K', min: 100_000, max: 149_999 },
  { value: '150kplus', label: '$150K+', min: 150_000 },
];

function buildPayBuckets(
  min: number,
  max: number,
): { value: string; label: string; min?: number; max?: number }[] {
  return ALL_PAY_BUCKETS.filter(b => {
    const bucketMin = b.min ?? 0;
    const bucketMax = b.max ?? Infinity;
    return bucketMin <= max && bucketMax >= min;
  });
}

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    const [
      provinces,
      cities,
      jobModes,
      jobTypes,
      categories,
      // Gather sites from both siteWindows (new) and visibleOnSites (legacy)
      siteWindowSites,
      visibleOnSites,
      payStats,
    ] = await Promise.all([
      Listing.distinct('slots.province', { isActive: true }),
      Listing.distinct('slots.city', { isActive: true }),
      Listing.distinct('jobMode', { isActive: true }),
      Listing.distinct('jobType', { isActive: true }),
      Listing.distinct('categories', { isActive: true }),
      Listing.distinct('siteWindows.site', { isActive: true }),
      Listing.distinct('visibleOnSites', { isActive: true }),
      Listing.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$slots' },
        { $match: { 'slots.jobPay': { $gt: 0 } } },
        {
          $group: {
            _id: null,
            minPay: { $min: '$slots.jobPay' },
            maxPay: { $max: '$slots.jobPay' },
          },
        },
      ]),
    ]);

    // Merge + deduplicate site lists
    const allSiteSlugs = [...new Set([...siteWindowSites, ...visibleOnSites].filter(Boolean))].sort();

    const sites = allSiteSlugs.map(slug => ({
      value: slug,
      label: SITE_LABELS[slug] ?? slug,
    }));

    const min = payStats[0]?.minPay ?? 0;
    const max = payStats[0]?.maxPay ?? 500_000;

    return NextResponse.json(
      {
        provinces: provinces.filter(Boolean).sort(),
        cities: cities.filter(Boolean).sort(),
        jobModes: jobModes.filter(Boolean).sort(),
        jobTypes: jobTypes.filter(Boolean).sort(),
        categories: categories.filter(Boolean).sort(),
        sites,
        budgets: buildPayBuckets(min, max),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      },
    );
  } catch (err) {
    console.error('[GET /api/listings/filters]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
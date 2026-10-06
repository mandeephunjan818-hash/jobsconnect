import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongooes';
import Listing from '@/modal/Listing';

const PAY_BUCKETS = [
  { value: 'under30k', max: 29_999 },
  { value: '30k60k', min: 30_000, max: 59_999 },
  { value: '60k100k', min: 60_000, max: 99_999 },
  { value: '100k150k', min: 100_000, max: 149_999 },
  { value: '150kplus', min: 150_000 },
];

function parseList(param: string | null): string[] {
  if (!param?.trim()) return [];
  return param.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

/** Serialize a single Listing document for the public API response */
function serializeListing(doc: any) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    companyName: doc.companyName,
    overview: doc.overview,
    description: doc.description,
    applyEmail: doc.applyEmail,
    highlights: doc.highlights ?? [],
    benefits: doc.benefits ?? [],
    categories: doc.categories ?? [],
    jobBankId: doc.jobBankId ?? "",
    slug: doc.slug,
    visibleOnSites: doc.visibleOnSites ?? [],
    status: doc.status,
    isActive: doc.isActive,

    // ── Job meta ────────────────────────────────────────────
    jobMode: doc.jobMode,
    jobType: doc.jobType ?? null,
    jobId: doc.jobId ?? null,

    // ── Per-site schedule ───────────────────────────────────
    siteWindows: (doc.siteWindows ?? []).map((w: any) => ({
      site: w.site,
      startAt: w.startAt instanceof Date ? w.startAt.toISOString() : w.startAt,
      endAt: w.endAt instanceof Date ? w.endAt.toISOString() : w.endAt,
      durationDays: w.durationDays,
    })),

    // ── Slots (each carries location / shifts / pay) ────────
    slots: (doc.slots ?? []).map((s: any) => ({
      _id: s._id?.toString(),
      location: s.location,
      province: s.province,
      city: s.city,
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
  };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // ── Auth (build token OR session) ──────────────────────
    const authHeader = req.headers.get('authorization');
    const buildToken = process.env.BUILD_SECRET_TOKEN;
    let userId: string | null = null;

    if (buildToken && authHeader === `Bearer ${buildToken}`) {
      userId = '69ce5675e842954c27f9f738';
    } else {
      const session = await getServerSession(authOptions).catch(() => null);
      userId = session
        ? ((session.user as any).id || session.user?.email || null)
        : null;
    }

    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');
    let page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const perPage = Math.max(1, Math.min(50, parseInt(sp.get('perPage') ?? '5', 10)));

    let listings: any[] = [];
    let total = 0;

    if (id) {
      // ── Single listing by ID ─────────────────────────────
      const doc = await Listing.findById(id).lean();
      if (doc) { listings = [doc]; total = 1; }

    } else {
      // ── Filtered list ────────────────────────────────────
      const search = sp.get('search')?.trim() ?? '';
      const types = parseList(sp.get('types'));
      const provinces = parseList(sp.get('provinces'));
      const cities = parseList(sp.get('cities'));
      const budgets = parseList(sp.get('budgets'));
      const jobModes = parseList(sp.get('jobModes'));
      const statuses = parseList(sp.get('statuses'));
      const sites = parseList(sp.get('sites'));
      const categories = parseList(sp.get('categories'));

      // Also support filtering by jobId directly
      const jobId = sp.get('jobId')?.trim() ?? '';

      const filter: any = { isActive: true };

      if (types.length)
        filter.jobType = { $in: types.map(t => new RegExp(`^${t}$`, 'i')) };
      if (jobModes.length)
        filter.jobMode = { $in: jobModes.map(m => new RegExp(`^${m}$`, 'i')) };
      if (statuses.length)
        filter.status = { $in: statuses.map(s => new RegExp(`^${s}$`, 'i')) };

      // Category filter
      if (categories.length) {
        filter.categories = { $in: categories };
      }

      // Site filter: match against siteWindows[].site (primary) or visibleOnSites (fallback)
      if (sites.length) {
        filter.$and = filter.$and ?? [];
        filter.$and.push({
          $or: [
            { 'siteWindows.site': { $in: sites } },
            { visibleOnSites: { $in: sites } },
          ],
        });
      }

      // Slot-level location filters
      if (provinces.length)
        filter['slots.province'] = { $in: provinces.map(p => new RegExp(`^${p}$`, 'i')) };
      if (cities.length)
        filter['slots.city'] = { $in: cities.map(c => new RegExp(`^${c}$`, 'i')) };

      // Pay bucket filter — slot-level
      if (budgets.length) {
        const conditions = budgets
          .map(bk => {
            const opt = PAY_BUCKETS.find(b => b.value === bk);
            if (!opt) return null;
            const c: any = {};
            if (opt.min !== undefined) c.$gte = opt.min;
            if (opt.max !== undefined) c.$lte = opt.max;
            return { 'slots.jobPay': c };
          })
          .filter(Boolean);
        if (conditions.length) {
          filter.$and = filter.$and ?? [];
          filter.$and.push({ $or: conditions });
        }
      }

      // jobId exact match
      if (jobId) filter.jobId = jobId.toUpperCase();

      // Text search
      if (search) {
        const rx = { $regex: search, $options: 'i' };
        const searchOr = [
          { title: rx },
          { overview: rx },
          { jobMode: rx },
          { jobType: rx },
          { jobId: rx },
          { 'slots.location': rx },
          { 'slots.city': rx },
        ];
        filter.$and = filter.$and ?? [];
        filter.$and.push({ $or: searchOr });
      }

      total = await Listing.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      page = Math.min(page, totalPages);

      listings = await Listing
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean();
    }

    const data = listings.map(serializeListing);

    return NextResponse.json(
      { data, total, page, perPage, totalPages: Math.ceil(total / perPage) },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
      },
    );
  } catch (err) {
    console.error('[GET /api/listings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}